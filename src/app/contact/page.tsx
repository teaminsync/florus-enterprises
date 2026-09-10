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
            
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Address</h3>
                <p>
                  B-Wing/08, Ground Floor, S.R. CHS Ltd.,<br />
                  Virat Nagar, Chanakya Chawk,<br />
                  Virar (W), Palghar – 401303<br />
                  Maharashtra
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-1">Phone</h3>
                <p>
                  9082246490 / 9320561612<br />
                  <span className="text-sm">(also on WhatsApp)</span>
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-1">Email</h3>
                <p>
                  florusenterprises@gmail.com
                </p>
              </div>

              <div className="pt-4">
                <h3 className="font-medium text-gray-900 mb-1">Business Hours</h3>
                <p>
                  Monday–Friday: 10:00 AM–7:00 PM<br />
                  Saturday: 10:00 AM–5:00 PM<br />
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
