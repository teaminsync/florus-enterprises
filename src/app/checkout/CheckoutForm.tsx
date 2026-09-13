'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitOrderAction, createRazorpayOrderAction } from './actions';

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

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CheckoutForm({ userId }: CheckoutFormProps) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online' | null>(null);
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

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (!selectedFile) {
      setError('Please upload your purchase order');
      return;
    }

    setIsSubmitting(true);

    try {
      if (paymentMethod === 'cod') {
        // COD flow - direct submission
        const formData = new FormData();
        formData.append('poFile', selectedFile);
        formData.append('userId', userId);
        formData.append('paymentMethod', 'cod');

        const result = await submitOrderAction(formData);

        if (result.success && result.orderId) {
          router.push(`/orders/${result.orderId}`);
        } else {
          setError(result.error || 'Failed to submit order');
          setIsSubmitting(false);
        }
      } else {
        // Online payment flow - create Razorpay order first
        const razorpayResult = await createRazorpayOrderAction();

        if (!razorpayResult.success) {
          setError(razorpayResult.error || 'Failed to initiate payment');
          setIsSubmitting(false);
          return;
        }

        // Type guard: success result has required fields
        if (!('razorpayOrderId' in razorpayResult) || !('amountInPaise' in razorpayResult) || !('keyId' in razorpayResult)) {
          setError('Invalid payment initialization response');
          setIsSubmitting(false);
          return;
        }

        const { razorpayOrderId, amountInPaise, keyId } = razorpayResult;

        // Load Razorpay script if not already loaded
        if (!window.Razorpay) {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          document.body.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        // Open Razorpay checkout modal
        const razorpay = new window.Razorpay({
          key: keyId,
          amount: amountInPaise,
          currency: 'INR',
          order_id: razorpayOrderId,
          name: 'Florus Enterprises',
          description: 'Order Payment',
          handler: async function (response: any) {
            // Payment successful - submit order with payment details
            const formData = new FormData();
            formData.append('poFile', selectedFile);
            formData.append('userId', userId);
            formData.append('paymentMethod', 'online');
            formData.append('razorpayOrderId', razorpayOrderId!);
            formData.append('razorpayPaymentId', response.razorpay_payment_id);
            formData.append('razorpaySignature', response.razorpay_signature);

            const result = await submitOrderAction(formData);

            if (result.success && result.orderId) {
              router.push(`/orders/${result.orderId}`);
            } else {
              setError(result.error || 'Failed to submit order after payment');
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              // User closed the payment modal
              setError('Payment cancelled. Your order was not submitted.');
              setIsSubmitting(false);
            },
          },
          theme: {
            color: '#009EE0',
          },
        });

        razorpay.open();
      }
    } catch (err) {
      console.error('Order submission error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Payment Method <span className="text-red-600">*</span>
        </label>
        <div className="space-y-3">
          <label className="flex items-start p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={(e) => setPaymentMethod('cod')}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 text-[#009EE0] focus:ring-[#009EE0]"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-gray-900">
                Cash on Delivery (COD)
              </span>
              <span className="block text-xs text-gray-500 mt-1">
                Pay when you receive your order
              </span>
            </div>
          </label>

          <label className="flex items-start p-4 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="online"
              checked={paymentMethod === 'online'}
              onChange={(e) => setPaymentMethod('online')}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 text-[#009EE0] focus:ring-[#009EE0]"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-gray-900">
                Pay Online
              </span>
              <span className="block text-xs text-gray-500 mt-1">
                Secure payment via Razorpay (Cards, UPI, Net Banking, Wallets)
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* PO Upload Section */}
      <div>
        <label
          htmlFor="poFile"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Upload Purchase Order <span className="text-red-600">*</span>
        </label>
        <p className="text-xs text-gray-600 mb-3">
          A purchase order is required for all orders, regardless of payment method.
        </p>
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
        disabled={!paymentMethod || !selectedFile || isSubmitting}
        className="w-full px-6 py-3 bg-[#009EE0] text-white font-semibold rounded-md hover:bg-[#0088c7] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting
          ? paymentMethod === 'online'
            ? 'Processing Payment...'
            : 'Submitting Order...'
          : paymentMethod === 'online'
          ? 'Proceed to Payment'
          : 'Submit Order'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By submitting this order, you confirm that the purchase order is authentic
        and authorized by your organization.
      </p>
    </form>
  );
}
