import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { calculateTradePrice } from '@/utils/pricing';
import { AddToCartForm } from './AddToCartForm';

type Params = Promise<{ slug: string }>;

export default async function ProductPage(props: { params: Params }) {
  const params = await props.params;
  const supabase = await createClient();
  
  // Check if user is logged in as trade
  const sessionUser = await getSessionUser();
  const isTradeUser = sessionUser?.role === 'trade';

  // Fetch the product with category details - include sp and gst_percent for trade pricing
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      slug,
      name,
      composition,
      pack_size,
      case_size,
      mrp,
      sp,
      gst_percent,
      is_upcoming,
      dosage_form,
      manufacturer,
      brand_line,
      sap_code,
      category_id,
      categories (
        name,
        slug
      )
    `)
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Product fetch error:', error);
  }

  // 404 if product doesn't exist or is not active
  if (!product) {
    notFound();
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-[#009EE0]">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/medicines" className="hover:text-[#009EE0]">
            Medicines
          </Link>
          {product.categories && typeof product.categories === 'object' && 'slug' in product.categories && 'name' in product.categories && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/medicines?category=${String(product.categories.slug)}`}
                className="hover:text-[#009EE0]"
              >
                {String(product.categories.name)}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="max-w-4xl">
          {/* Product Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>

            {/* Category Link */}
            {product.categories && typeof product.categories === 'object' && 'slug' in product.categories && 'name' in product.categories && (
              <Link
                href={`/medicines?category=${String(product.categories.slug)}`}
                className="inline-block px-3 py-1 bg-gray-100 text-sm text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {String(product.categories.name)}
              </Link>
            )}
          </div>

          {/* Product Details Grid */}
          <div className="bg-gray-50 rounded-lg p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-2">
                    Composition
                  </h2>
                  <p className="text-gray-900">{product.composition}</p>
                </div>

                {product.dosage_form && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">
                      Dosage Form
                    </h2>
                    <p className="text-gray-900 capitalize">{product.dosage_form}</p>
                  </div>
                )}

                {product.pack_size && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">
                      Pack Size
                    </h2>
                    <p className="text-gray-900">{product.pack_size}</p>
                  </div>
                )}

                {product.case_size && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">
                      Case Size
                    </h2>
                    <p className="text-gray-900">{product.case_size}</p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {product.manufacturer && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">
                      Manufacturer
                    </h2>
                    <p className="text-gray-900">{product.manufacturer}</p>
                  </div>
                )}

                {product.brand_line && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">
                      Brand Line
                    </h2>
                    <p className="text-gray-900">{product.brand_line}</p>
                  </div>
                )}

                {product.sap_code && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 mb-2">
                      SAP Code
                    </h2>
                    <p className="text-gray-900 font-mono">{product.sap_code}</p>
                  </div>
                )}

                {/* Pricing - show trade price for trade users, MRP for everyone */}
                <div>
                  <h2 className="text-sm font-medium text-gray-500 mb-2">
                    {isTradeUser ? 'Trade Price' : 'Maximum Retail Price (MRP)'}
                  </h2>
                  {isTradeUser ? (
                    product.sp !== null ? (
                      <div className="space-y-2">
                        <p className="text-3xl font-bold text-[#009EE0]">
                          ₹{calculateTradePrice(product.sp).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Price shown is GST-exclusive
                        </p>
                        <p className="text-sm text-gray-500">
                          GST: {product.gst_percent}%
                        </p>
                        {product.mrp && (
                          <p className="text-sm text-gray-400 line-through">
                            MRP: ₹{product.mrp.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-lg text-amber-600 font-medium">
                        Pricing coming soon
                      </p>
                    )
                  ) : (
                    product.mrp && (
                      <p className="text-3xl font-bold text-gray-900">
                        ₹{product.mrp.toFixed(2)}
                      </p>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          {isTradeUser ? (
            <div className="bg-green-50 border border-green-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to order?
              </h3>
              <p className="text-gray-600 mb-4">
                Add this product to your cart to place an order at trade pricing.
              </p>
              <AddToCartForm
                productId={product.id}
                productName={product.name}
                hasPricing={product.sp !== null}
              />
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Interested in institutional pricing?
              </h3>
              <p className="text-gray-600 mb-4">
                Healthcare professionals and institutions can access special trade pricing for bulk orders.
              </p>
              <Link
                href="/trade/register"
                className="inline-block px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors"
              >
                Register for Trade Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
