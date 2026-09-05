import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { calculateTradePrice } from '@/utils/pricing';

type SearchParams = Promise<{
  category?: string;
  q?: string;
}>;

export default async function MedicinesPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const categorySlug = searchParams.category;
  const searchQuery = searchParams.q;

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

  // Apply category filter
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

  // Apply search filter - case insensitive search on name OR composition
  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,composition.ilike.%${searchQuery}%`);
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

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Header with Search */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Medicines Catalog
          </h1>

          {/* Search Form */}
          <form method="GET" action="/medicines" className="max-w-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by product name or composition..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
              />
              {categorySlug && (
                <input type="hidden" name="category" value={categorySlug} />
              )}
              <button
                type="submit"
                className="px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Active Filters */}
        {(activeCategory || searchQuery) && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            
            {activeCategory && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                <span>Category: {activeCategory.name}</span>
                <Link
                  href={searchQuery ? `/medicines?q=${searchQuery}` : '/medicines'}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Link>
              </div>
            )}

            {searchQuery && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
                <span>Search: &quot;{searchQuery}&quot;</span>
                <Link
                  href={categorySlug ? `/medicines?category=${categorySlug}` : '/medicines'}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Link>
              </div>
            )}

            {(activeCategory || searchQuery) && (
              <Link
                href="/medicines"
                className="text-sm text-[#009EE0] hover:underline"
              >
                Clear all
              </Link>
            )}
          </div>
        )}

        {/* Results Count */}
        <p className="text-sm text-gray-600 mb-6">
          {products?.length || 0} product{products?.length !== 1 ? 's' : ''} found
        </p>

        {/* Product Grid */}
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              // Truncate composition to ~100 characters
              const truncatedComposition = 
                product.composition.length > 100
                  ? product.composition.substring(0, 100) + '...'
                  : product.composition;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {truncatedComposition}
                  </p>

                  {product.pack_size && (
                    <p className="text-sm text-gray-500 mb-3">
                      Pack Size: {product.pack_size}
                    </p>
                  )}

                  {/* Pricing display - trade vs MRP */}
                  {isTradeUser ? (
                    product.sp !== null ? (
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-[#009EE0]">
                          ₹{calculateTradePrice(product.sp).toFixed(2)}
                          <span className="text-xs font-normal text-gray-500 ml-1">
                            (ex-GST)
                          </span>
                        </p>
                        {product.mrp && (
                          <p className="text-sm text-gray-500 line-through">
                            MRP: ₹{product.mrp.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600 font-medium">
                        Pricing coming soon
                      </p>
                    )
                  ) : (
                    product.mrp && (
                      <p className="text-lg font-semibold text-gray-900">
                        ₹{product.mrp.toFixed(2)}
                      </p>
                    )
                  )}

                  {/* Category badge */}
                  {product.categories && typeof product.categories === 'object' && 'name' in product.categories && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {String(product.categories.name)}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">
              No products found matching your criteria.
            </p>
            {(activeCategory || searchQuery) && (
              <Link
                href="/medicines"
                className="text-[#009EE0] hover:underline font-medium"
              >
                View all products
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
