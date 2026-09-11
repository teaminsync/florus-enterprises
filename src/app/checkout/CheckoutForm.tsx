'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitOrderAction } from './actions';

interface CheckoutFormProps {
  userId: string;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function CheckoutForm({ userId }: CheckoutFormProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean up object URL when file changes or component unmounts
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      
      // Cleanup function
      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError('Please upload a PDF, JPG, or PNG file');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 10MB');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select a purchase order file');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('poFile', selectedFile);
      formData.append('userId', userId);

      const result = await submitOrderAction(formData);

      if (result.success && result.orderId) {
        // Redirect to order confirmation page
        router.push(`/orders/${result.orderId}`);
      } else {
        setError(result.error || 'Failed to submit order');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Order submission error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="poFile"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Upload Purchase Order <span className="text-red-600">*</span>
        </label>
        <input
          type="file"
          id="poFile"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          disabled={isSubmitting}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-medium
            file:bg-[#009EE0] file:text-white
            hover:file:bg-[#0088c7]
            file:cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-2 text-xs text-gray-500">
          Accepted formats: PDF, JPG, PNG (max 10MB)
        </p>
      </div>

      {selectedFile && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-800">
            <strong>Selected file:</strong> {selectedFile.name} (
            {(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-[#009EE0] hover:underline font-medium"
            >
              Preview →
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedFile || isSubmitting}
        className="w-full px-6 py-3 bg-[#009EE0] text-white font-semibold rounded-md hover:bg-[#0088c7] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting Order...' : 'Submit Order'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By submitting this order, you confirm that the purchase order is authentic
        and authorized by your organization.
      </p>
    </form>
  );
}
