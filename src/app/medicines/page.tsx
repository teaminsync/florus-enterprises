import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { calculateTradePrice } from '@/utils/pricing';
import { MedicineSearchGrid } from './MedicineSearchGrid';
import { DosageFormFilter } from './DosageFormFilter';

type SearchParams = Promise<{
  category?: string;
  brand?: string;
  dosage?: string;
  q?: string;
}>;

export default async function MedicinesPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const categorySlug = searchParams.category;
  const brandParam = searchParams.brand;
  const dosageParam = searchParams.dosage;
  const searchQuery = searchParams.q || '';

  const supabase = await createClient();
  
  // Check if user is logged in as trade
  const sessionUser = await getSessionUser();
  const isTradeUser = sessionUser?.role === 'trade';

  // Fetch all categories for the filter pills
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .order('display_order');

  // Fetch distinct brands and dosage forms for filters (live query to never go stale)
  const { data: brandsData } = await supabase
    .from('products')
    .select('brand_line')
    .eq('is_active', true)
    .not('brand_line', 'is', null);

  const { data: dosageData } = await supabase
    .from('products')
    .select('dosage_form')
    .eq('is_active', true)
    .not('dosage_form', 'is', null);

  // Deduplicate and sort
  const brands = [...new Set(brandsData?.map((p) => p.brand_line).filter(Boolean))].sort();
  const dosageForms = [...new Set(dosageData?.map((p) => p.dosage_form).filter(Boolean))].sort();

  // Build the query - include sp and gst_percent for trade pricing
  let query = supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      composition,
      pack_size,
      mrp,
      sp,
      gst_percent,
      is_upcoming,
      category_id,
      categories (
        name,
        slug
      )
    `)
    .eq('is_active', true)
    .order('name');

  // Apply filters: category, brand, dosage (all combine via AND when present)
  if (categorySlug) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('slug', categorySlug)
      .single();

    if (category) {
      query = query.eq('category_id', category.id);
    }
  }

  if (brandParam) {
    query = query.eq('brand_line', brandParam);
  }

  if (dosageParam) {
    query = query.eq('dosage_form', dosageParam);
  }

  const { data: products } = await query;

  // Map products to DisplayProduct format for client component
  const displayProducts = (products || []).map((product) => {
    let priceLabel = '';
    let priceSubLabel: string | null = null;
    let rawPrice: number | null = null;

    if (isTradeUser) {
      if (product.sp !== null) {
        const tradePrice = calculateTradePrice(product.sp);
        priceLabel = `₹${tradePrice.toFixed(2)}`;
        priceSubLabel = '(ex-GST)';
        rawPrice = tradePrice;
      } else {
        priceLabel = 'Pricing coming soon';
        rawPrice = null;
      }
    } else {
      if (product.mrp) {
        priceLabel = `₹${product.mrp.toFixed(2)}`;
        rawPrice = product.mrp;
      } else {
        priceLabel = 'Price not available';
        rawPrice = null;
      }
    }

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      composition: product.composition,
      packSize: product.pack_size,
      categoryName:
        product.categories && typeof product.categories === 'object' && 'name' in product.categories
          ? String(product.categories.name)
          : null,
      priceLabel,
      priceSubLabel,
      rawPrice,
    };
  });

  // Helper to build filter hrefs preserving all other params
  const buildFilterHref = (updates: {
    category?: string | null;
    brand?: string | null;
    dosage?: string | null;
  }): string => {
    const params = new URLSearchParams();
    
    const finalCategory = updates.category === undefined ? categorySlug : updates.category;
    const finalBrand = updates.brand === undefined ? brandParam : updates.brand;
    const finalDosage = updates.dosage === undefined ? dosageParam : updates.dosage;
    
    if (finalCategory) params.set('category', finalCategory);
    if (finalBrand) params.set('brand', finalBrand);
    if (finalDosage) params.set('dosage', finalDosage);
    if (searchQuery) params.set('q', searchQuery);

    return params.toString() ? `/medicines?${params.toString()}` : '/medicines';
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Medicines Catalog
          </h1>

          {/* Filter Pills and Dropdown */}
          <div className="space-y-4 mb-6">
            {/* Category Filter Pills */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildFilterHref({ category: null })}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    !categorySlug
                      ? 'bg-[#009EE0] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </Link>
                {categories?.map((cat) => {
                  const isActive = categorySlug === cat.slug;
                  
                  return (
                    <Link
                      key={cat.id}
                      href={buildFilterHref({ category: cat.slug })}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                        isActive
                          ? 'bg-[#009EE0] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Brand Filter Pills */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Brand
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildFilterHref({ brand: null })}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    !brandParam
                      ? 'bg-[#009EE0] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Brands
                </Link>
                {brands?.map((brand) => {
                  const isActive = brandParam === brand;
                  
                  return (
                    <Link
                      key={brand}
                      href={buildFilterHref({ brand })}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                        isActive
                          ? 'bg-[#009EE0] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {brand}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Dosage Form Dropdown */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Dosage Form
              </p>
              <div className="max-w-xs">
                <DosageFormFilter
                  dosageForms={dosageForms}
                  currentDosage={dosageParam}
                  currentCategory={categorySlug}
                  currentBrand={brandParam}
                  currentQuery={searchQuery}
                />
              </div>
            </div>
          </div>
        </div>

        <MedicineSearchGrid
          products={displayProducts}
          initialQuery={searchQuery}
        />
      </div>
    </div>
  );
}
