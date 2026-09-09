'use client';

import { useState } from 'react';
import { requestPasswordResetAction } from './actions';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const result = await requestPasswordResetAction(formData);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Failed to process request');
    }
    
    setIsLoading(false);
  }

  return (
    <>
      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-800">
            If an account exists for this email, we've sent a password reset link. 
            Please check your inbox.
          </p>
          <Link
            href="/trade/login"
            className="mt-4 inline-block text-[#009EE0] hover:underline text-sm"
          >
            Return to login
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/trade/login" className="text-sm text-[#009EE0] hover:underline">
              Back to login
            </Link>
          </div>
        </>
      )}
    </>
  );
}
