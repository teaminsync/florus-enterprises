'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitTradeApplication } from './actions';

type ApplicantType = 'doctor' | 'pharmacy' | 'retailer' | 'hospital';

export default function TradeRegisterPage() {
  const router = useRouter();
  const [applicantType, setApplicantType] = useState<ApplicantType>('doctor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    const result = await submitTradeApplication(formData);
    
    if (result.success) {
      router.push('/trade/register/success');
    } else {
      setError(result.error || 'Failed to submit application. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Trade Account Registration
        </h1>
        <p className="text-gray-600 mb-8">
          Apply for institutional pricing access. Your application will be reviewed by our team.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form action={handleSubmit} className="space-y-6">
          {/* Applicant Type */}
          <div>
            <label htmlFor="applicant_type" className="block text-sm font-medium text-gray-900 mb-2">
              Applicant Type *
            </label>
            <select
              id="applicant_type"
              name="applicant_type"
              value={applicantType}
              onChange={(e) => setApplicantType(e.target.value as ApplicantType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
              required
            >
              <option value="doctor">Doctor</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="retailer">Retailer</option>
              <option value="hospital">Hospital</option>
            </select>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Type-specific fields */}
          {applicantType === 'doctor' && (
            <>
              <div>
                <label htmlFor="registration_number" className="block text-sm font-medium text-gray-900 mb-2">
                  Medical Registration Number *
                </label>
                <input
                  type="text"
                  id="registration_number"
                  name="registration_number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="business_or_clinic_name" className="block text-sm font-medium text-gray-900 mb-2">
                  Hospital/Clinic Name *
                </label>
                <input
                  type="text"
                  id="business_or_clinic_name"
                  name="business_or_clinic_name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
            </>
          )}

          {(applicantType === 'pharmacy' || applicantType === 'retailer') && (
            <>
              <div>
                <label htmlFor="business_or_clinic_name" className="block text-sm font-medium text-gray-900 mb-2">
                  Firm/Business Name *
                </label>
                <input
                  type="text"
                  id="business_or_clinic_name"
                  name="business_or_clinic_name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="licence_number" className="block text-sm font-medium text-gray-900 mb-2">
                  Drug Licence Number *
                </label>
                <input
                  type="text"
                  id="licence_number"
                  name="licence_number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="gst_number" className="block text-sm font-medium text-gray-900 mb-2">
                  GST No. *
                </label>
                <input
                  type="text"
                  id="gst_number"
                  name="gst_number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
            </>
          )}

          {applicantType === 'hospital' && (
            <>
              <div>
                <label htmlFor="business_or_clinic_name" className="block text-sm font-medium text-gray-900 mb-2">
                  Institution/Hospital Name *
                </label>
                <input
                  type="text"
                  id="business_or_clinic_name"
                  name="business_or_clinic_name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="registration_number" className="block text-sm font-medium text-gray-900 mb-2">
                  Hospital Registration Number *
                </label>
                <input
                  type="text"
                  id="registration_number"
                  name="registration_number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="gst_number" className="block text-sm font-medium text-gray-900 mb-2">
                  GST No. *
                </label>
                <input
                  type="text"
                  id="gst_number"
                  name="gst_number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="authorized_signatory" className="block text-sm font-medium text-gray-900 mb-2">
                  Authorized Signatory *
                </label>
                <input
                  type="text"
                  id="authorized_signatory"
                  name="authorized_signatory"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                  required
                />
              </div>
            </>
          )}

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-900 mb-2">
              Address *
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none resize-none"
              required
            />
          </div>

          {/* City, State, Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-2">
                City *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-900 mb-2">
                State *
              </label>
              <input
                type="text"
                id="state"
                name="state"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="pincode" className="block text-sm font-medium text-gray-900 mb-2">
                Pincode *
              </label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                pattern="[0-9]{6}"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
