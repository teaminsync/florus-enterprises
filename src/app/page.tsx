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
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Your Trusted Partner in Pharmaceutical Distribution
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Florus Enterprises is a leading medicine stockist and dealership, committed to delivering quality pharmaceutical products to healthcare professionals, institutions, and retailers across the region. With an extensive catalog spanning multiple therapeutic categories, we ensure reliable supply and competitive pricing for your practice or business.
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

      {/* Browse by Category */}
      <section className="bg-gray-50 py-16">
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
