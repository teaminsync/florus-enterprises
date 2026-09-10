import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { getAuthHomeRoute } from '@/utils/auth/get-auth-home-route';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default async function ForgotPasswordPage() {
  // Redirect authenticated users to their correct home
  // An already-logged-in user shouldn't see the forgot-password form
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    redirect(getAuthHomeRoute({ role: sessionUser.role, password_set: sessionUser.passwordSet }));
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Forgot Password
        </h1>
        <p className="text-gray-600 mb-8">
          Enter your email address and we'll send you a link to reset your password
        </p>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
