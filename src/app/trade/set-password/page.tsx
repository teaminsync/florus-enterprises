import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/auth/get-session-user';
import { getAuthHomeRoute } from '@/utils/auth/get-auth-home-route';
import { SetPasswordForm } from './SetPasswordForm';

export default async function SetPasswordPage() {
  // Check session and password_set status
  const sessionUser = await getSessionUser();
  
  // If session exists AND password already set, redirect to correct home
  if (sessionUser && sessionUser.passwordSet) {
    redirect(getAuthHomeRoute({ role: sessionUser.role, password_set: sessionUser.passwordSet }));
  }

  // If session exists but password NOT set, show form (legitimate invite flow)
  // If no session at all, show form (will show error in SetPasswordForm via action)

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
