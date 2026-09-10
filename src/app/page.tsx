import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  
  // Fetch all categories for the browse section
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, name')
    .order('display_order');

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-[#009EE0] uppercase tracking-wide mb-4">
            Trusted Healthcare Distribution Since 2015
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Reliable Pharmaceutical & Medical Device Distribution for Maharashtra's Healthcare Providers
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            For over a decade, Florus Enterprises has supplied hospitals, pharmacies, clinics, and retailers across Mumbai, Thane, Kalyan, Sindhudurg, and beyond with pharmaceuticals, medical devices, and surgical products. We're a fully licensed wholesale distributor — not a retail pharmacy — built for institutional buyers who need dependable supply, transparent pricing, and a partner who understands healthcare distribution.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="/medicines"
              className="inline-block px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors text-center"
            >
              Browse Catalog
            </Link>
            <Link
              href="/about"
              className="inline-block px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors text-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Florus */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Why Choose Florus
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Proven Track Record
              </h3>
              <p className="text-gray-600">
                Supplying leading hospitals including Nair and Rajawadi, alongside trade chemists, for close to a decade.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Diverse Portfolio
              </h3>
              <p className="text-gray-600">
                A broad range spanning pharmaceuticals, medical devices, surgical products, and specialised formulations.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Compliance You Can Trust
              </h3>
              <p className="text-gray-600">
                Strong compliance standards backed by valid Drug Licences and GST registration.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Customer-First Service
              </h3>
              <p className="text-gray-600">
                Timely delivery and transparent, case-by-case pricing built around your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Browse by Category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/medicines?category=${category.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
