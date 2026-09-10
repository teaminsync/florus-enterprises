import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { getAuthHomeRoute } from '@/utils/auth/get-auth-home-route';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  // Redirect authenticated users to their correct home
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    redirect(getAuthHomeRoute({ role: sessionUser.role, password_set: sessionUser.passwordSet }));
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Sign In
        </h1>
        <p className="text-gray-600 mb-8">
          Access your trade account or admin dashboard
        </p>

        <LoginForm />
      </div>
    </div>
  );
}
