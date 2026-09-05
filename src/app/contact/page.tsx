export default function ContactPage() {
  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Contact Us
        </h1>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Get in Touch
            </h2>
            
            {/* Placeholder contact details - marked clearly as placeholders */}
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Address</h3>
                <p>
                  {/* PLACEHOLDER */}
                  123 Medical District, Pharmaceutical Hub<br />
                  Mumbai, Maharashtra 400001<br />
                  India
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-1">Phone</h3>
                <p>
                  {/* PLACEHOLDER */}
                  +91 22 1234 5678
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-1">Email</h3>
                <p>
                  {/* PLACEHOLDER */}
                  info@florusenterprises.com
                </p>
              </div>

              <div className="pt-4">
                <h3 className="font-medium text-gray-900 mb-1">Business Hours</h3>
                <p>
                  Monday - Saturday: 9:00 AM - 6:00 PM<br />
                  Sunday: Closed
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form - UI only, no backend submission */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Send us a Message
            </h2>
            
            {/* Note: Form submission is not wired up yet - this is UI only */}
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
