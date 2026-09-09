'use client';

import { useState } from 'react';
import { submitContactForm } from './actions';

const INQUIRY_TYPES = [
  'General Public / Patient',
  'Prospective Trade Partner (Retailer / Pharmacy / Hospital / Doctor)',
  'Existing Trade Customer',
  'Media / Press',
  'Other',
] as const;

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await submitContactForm(formData);

      if (result.success) {
        setSuccess(true);
        // Clear the form
        e.currentTarget.reset();
      } else {
        setError(result.error || 'Failed to submit your message. Please try again.');
      }
    } catch (err) {
      console.error('Contact form submission error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-900 mb-1">
          Full Name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          required
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
          Phone
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Inquiry Type */}
      <div>
        <label htmlFor="inquiryType" className="block text-sm font-medium text-gray-900 mb-1">
          I am contacting as a... <span className="text-red-600">*</span>
        </label>
        <select
          id="inquiryType"
          name="inquiryType"
          required
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Please select --</option>
          {INQUIRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-1">
          Message <span className="text-red-600">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Honeypot field - hidden from humans, visible to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px]"
        aria-hidden="true"
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-800">
            <strong>Message sent successfully!</strong> Thank you for contacting us. We'll get back to you soon.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
