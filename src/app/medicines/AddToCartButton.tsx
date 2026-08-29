'use client';

import { useState } from 'react';

interface AddToCartButtonProps {
  productId: string;
  productName: string;
  onAdd: (productId: string) => Promise<{ success: boolean; error?: string }>;
}

export function AddToCartButton({ productId, productName, onAdd }: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const result = await onAdd(productId);
    setIsLoading(false);

    if (result.success) {
      // Show brief success feedback (could enhance with toast notification)
      alert(`${productName} added to cart!`);
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full mt-3 px-4 py-2 bg-[#009EE0] text-white text-sm font-medium rounded-md hover:bg-[#0088c7] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
