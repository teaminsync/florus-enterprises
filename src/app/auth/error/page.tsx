import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-md text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-8">
          This link may have expired, already been used, or may not be valid. If you&apos;re a Florus trade partner and have an approved account, you can request a new link from our{' '}
          <Link href="/trade/forgot-password" className="text-[#009EE0] hover:underline">
            Forgot Password page
          </Link>
          . If you&apos;re having trouble, contact us at team@florus.in.
        </p>
        <Link
          href="/trade/login"
          className="inline-block px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
