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
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Your Trusted Partner in Pharmaceutical Distribution
          </h1>
          <p className="mt-6 text-xl text-gray-600 leading-relaxed">
            Florus Enterprises is a leading medicine stockist and dealership, committed to delivering quality pharmaceutical products to healthcare professionals, institutions, and retailers across the region. With an extensive catalog spanning multiple therapeutic categories, we ensure reliable supply and competitive pricing for your practice or business.
          </p>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Browse by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/medicines?category=${category.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
              >
                <h3 className="text-lg font-medium text-gray-900">
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
