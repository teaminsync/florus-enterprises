import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export async function Header() {
  const supabase = await createClient();
  
  // Fetch categories for the dropdown menu
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, name')
    .order('display_order');

  // Check session and user role
  const { data: { user } } = await supabase.auth.getUser();
  let userRole: string | null = null;
  let userName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    
    userRole = profile?.role || null;
    userName = profile?.full_name || null;
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
            Florus Enterprises
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-8">
            {/* Medicines dropdown */}
            <div className="relative group">
              <Link 
                href="/medicines"
                className="text-gray-700 hover:text-[#009EE0] transition-colors"
              >
                Medicines
              </Link>
              
              {/* Dropdown menu */}
              <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  {categories?.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/medicines?category=${category.slug}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#009EE0] transition-colors"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link 
              href="/about"
              className="text-gray-700 hover:text-[#009EE0] transition-colors"
            >
              About
            </Link>

            <Link 
              href="/contact"
              className="text-gray-700 hover:text-[#009EE0] transition-colors"
            >
              Contact
            </Link>

            {/* Authenticated user links */}
            {userRole === 'trade' && (
              <>
                <Link 
                  href="/cart"
                  className="text-gray-700 hover:text-[#009EE0] transition-colors"
                >
                  Cart
                </Link>
                <Link 
                  href="/orders"
                  className="text-gray-700 hover:text-[#009EE0] transition-colors"
                >
                  Orders
                </Link>
              </>
            )}

            {userRole === 'admin' && (
              <Link 
                href="/admin"
                className="text-gray-700 hover:text-[#009EE0] transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>

          {/* CTA / User Menu */}
          {!user ? (
            <Link
              href="/trade/register"
              className="px-4 py-2 text-sm font-medium text-[#009EE0] bg-white border border-[#009EE0] rounded-md hover:bg-gray-50 transition-colors"
            >
              Register for Trade Pricing
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {userName || user.email}
              </span>
              <Link
                href={userRole === 'admin' ? '/admin' : '/trade/dashboard'}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {userRole === 'admin' ? 'Dashboard' : 'Account'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
