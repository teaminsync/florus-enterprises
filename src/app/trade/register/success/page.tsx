import Link from 'next/link';

export default function RegistrationSuccessPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Application Received
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Your application has been received. Florus will contact you to verify your details before granting access to institutional pricing.
        </p>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
