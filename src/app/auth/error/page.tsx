import Link from 'next/link';

type SearchParams = Promise<{ reason?: string }>;

export default async function AuthErrorPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const reason = searchParams.reason;

  // Specific message for expired/used links
  const message = reason === 'expired_link'
    ? "This link may have expired or already been used. If you received an invitation email from Florus Enterprises, please use the link in that email to set your password. If you're having trouble, contact us at team@florus.in."
    : "The confirmation link was invalid or has expired. Please try logging in again or contact support if the problem persists.";

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-md text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-8">
          {message}
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
