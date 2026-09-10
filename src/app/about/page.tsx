import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          About Florus Enterprises
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Trusted Healthcare Distribution Since 2015
        </p>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <p>
            Florus Enterprises is a healthcare distribution firm serving hospitals, pharmacies, clinics, and retailers with a wide range of pharmaceuticals, medical devices, and surgical products. Founded in 2015 to ensure reliable access to quality medicines, Florus has grown into a trusted supply partner for institutional buyers across Maharashtra.
          </p>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Journey</h2>
            <ul className="space-y-2">
              <li><strong>2015</strong> — Licensed under Drug Licence Form 20B & 21B; began operations in pharmaceutical marketing and distribution.</li>
              <li><strong>2017–2019</strong> — Expanded supply relationships with major hospitals, including Nair Hospital, Sion Hospital, and Rajawadi Hospital, as well as trade chemists across the region.</li>
              <li><strong>2019 onwards</strong> — Leadership transitioned to Mrs. Rupali Sawant, with full continuity under the Florus Enterprises name.</li>
              <li><strong>2024</strong> — Relocated to a new office in Virar West, marking a new phase of growth.</li>
              <li><strong>2025 onwards</strong> — Diversified into medical devices and surgical products, expanding well beyond our pharmaceutical roots.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Legacy in Pharmaceuticals</h2>
            <p>
              Since 2015, Florus has supplied trusted formulations to leading hospitals — including Nair, Sion, and Rajawadi — and trade chemists across the region. Our earlier portfolio included widely-used formulations such as pantoprazole and amoxycillin with clavulanic acid, alongside specialised products including growth hormone therapies, fertility hormones, and Factor VIII for haemophilia care, sourced from established manufacturers including Novo Nordisk.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Florus Today</h2>
            <p>
              Today, Florus has evolved into a trusted distributor of medical devices, surgical products, and essential medical consumables — alongside our established pharmaceutical distribution business. We partner with reputed franchisees to offer a broad portfolio of generic branded medicines, giving our customers access to reliable, fully compliant healthcare solutions under one roof.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Makes Us Different</h2>
            <ol className="space-y-2 list-decimal list-inside">
              <li>A proven track record — supplying leading hospitals including Nair and Rajawadi, alongside trade chemists, for close to a decade.</li>
              <li>A diverse portfolio spanning pharmaceuticals, medical devices, surgical products, and specialised formulations.</li>
              <li>Strong compliance and professional service standards, backed by valid Drug Licences and GST registration.</li>
              <li>A customer-first approach — timely delivery and transparent, case-by-case pricing built around your business.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Who We Serve</h2>
            <p>
              We work with doctors and clinics, pharmacies, hospitals, and retailers and sub-distributors across Mumbai, Thane, Kalyan, Sindhudurg, and private and government hospitals throughout Maharashtra — and we're actively expanding beyond this footprint. Florus is a wholesale distributor: our products are supplied to trade and institutional buyers only, not sold directly to patients.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Credentials</h2>
            <p>
              Drug Licence (Form 20B): MH-PL1-577327<br />
              Drug Licence (Form 21B): MH-PL1-577328<br />
              GST Registration: 27DCBPS0598K1Z1<br />
              MSME/Udyam Registration: UDYAM-MH-19-0169434 (Micro Enterprise)
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center">
              <em>Interested in trade pricing?{' '}</em>
              <Link href="/trade/register" className="text-[#009EE0] hover:underline font-medium">
                Register for a Trade Account →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
