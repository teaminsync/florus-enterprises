import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { logoutAction } from './actions';

export default async function TradeDashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/trade/login');
  }

  // Get profile to confirm role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, account_type')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'trade') {
    redirect('/trade/login');
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Trade Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {profile.full_name}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Account Information
          </h2>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="text-sm font-medium text-gray-500 w-32">Email:</dt>
              <dd className="text-sm text-gray-900">{user.email}</dd>
            </div>
            <div className="flex">
              <dt className="text-sm font-medium text-gray-500 w-32">Account Type:</dt>
              <dd className="text-sm text-gray-900 capitalize">{profile.account_type}</dd>
            </div>
            <div className="flex">
              <dt className="text-sm font-medium text-gray-500 w-32">Role:</dt>
              <dd className="text-sm text-gray-900 capitalize">{profile.role}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            Your trade account is active. Use the navigation menu to browse products, manage your cart, and view orders.
          </p>
          
          <form action={logoutAction}>
            <button
              type="submit"
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
