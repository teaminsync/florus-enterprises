import { ContactForm } from './ContactForm';

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

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Send us a Message
            </h2>
            
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
