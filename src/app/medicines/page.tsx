import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { calculateTradePrice } from '@/utils/pricing';
import { MedicineSearchGrid } from './MedicineSearchGrid';

type SearchParams = Promise<{
  category?: string;
  q?: string;
}>;

export default async function MedicinesPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const categorySlug = searchParams.category;
  const searchQuery = searchParams.q || '';

  const supabase = await createClient();
  
  // Check if user is logged in as trade
  const sessionUser = await getSessionUser();
  const isTradeUser = sessionUser?.role === 'trade';

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

  // Apply category filter (search is now client-side)
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

  const { data: products } = await query;

  // Get the active category for display
  let activeCategory = null;
  if (categorySlug) {
    const { data } = await supabase
      .from('categories')
      .select('name, slug')
      .eq('slug', categorySlug)
      .single();
    activeCategory = data;
  }

  // Map products to DisplayProduct format for client component
  const displayProducts = (products || []).map((product) => {
    let priceLabel = '';
    let priceSubLabel: string | null = null;

    if (isTradeUser) {
      if (product.sp !== null) {
        priceLabel = `₹${calculateTradePrice(product.sp).toFixed(2)}`;
        priceSubLabel = '(ex-GST)';
      } else {
        priceLabel = 'Pricing coming soon';
      }
    } else {
      if (product.mrp) {
        priceLabel = `₹${product.mrp.toFixed(2)}`;
      } else {
        priceLabel = 'Price not available';
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
    };
  });

  // Determine clear category href
  const clearCategoryHref = searchQuery ? `/medicines?q=${searchQuery}` : '/medicines';

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Medicines Catalog
          </h1>
        </div>

        <MedicineSearchGrid
          products={displayProducts}
          initialQuery={searchQuery}
          hasActiveCategory={!!activeCategory}
          clearCategoryHref={clearCategoryHref}
        />
      </div>
    </div>
  );
}
