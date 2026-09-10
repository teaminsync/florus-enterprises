import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { getAuthHomeRoute } from '@/utils/auth/get-auth-home-route';
import { SetPasswordForm } from './SetPasswordForm';

export default async function SetPasswordPage() {
  // Check session and password_set status
  const sessionUser = await getSessionUser();
  
  // Case 1: Session exists AND password already set, redirect to correct home
  if (sessionUser && sessionUser.passwordSet) {
    redirect(getAuthHomeRoute({ role: sessionUser.role, password_set: sessionUser.passwordSet }));
  }

  // Case 3: No session at all, redirect to error with specific message
  if (!sessionUser) {
    redirect('/auth/error');
  }

  // Case 2: Session exists but password NOT set, show form (legitimate invite/recovery flow)

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Set Your Password
        </h1>
        <p className="text-gray-600 mb-8">
          Please create a secure password for your account
        </p>

        <SetPasswordForm />
      </div>
    </div>
  );
}
