'use client';

import { useState } from 'react';
import { addToCartAction } from './actions';

interface AddToCartFormProps {
  productId: string;
  productName: string;
  hasPricing: boolean;
}

export function AddToCartForm({ productId, productName, hasPricing }: AddToCartFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('quantity', quantity.toString());

    const result = await addToCartAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Added to cart!' });
      setQuantity(1); // Reset quantity
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to add to cart' });
    }

    setIsLoading(false);
  }

  if (!hasPricing) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          This product does not have pricing available yet and cannot be ordered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              id="quantity"
              min="1"
              max="9999"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-2 bg-[#009EE0] text-white font-medium rounded-md hover:bg-[#0088c7] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </form>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {message.text}
          </p>
          {message.type === 'success' && (
            <a
              href="/cart"
              className="inline-block mt-2 text-sm text-[#009EE0] hover:underline font-medium"
            >
              View Cart →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
