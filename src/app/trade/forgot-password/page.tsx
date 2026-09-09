import { ForgotPasswordForm } from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
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
