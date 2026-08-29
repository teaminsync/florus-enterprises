'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateCartItemAction, removeCartItemAction } from './actions';

interface CartItemRowProps {
  cartItemId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    pack_size: string | null;
  };
  quantity: number;
  hasPrice: boolean;
  unitPriceExGst: number;
  lineSubtotalExGst: number;
}

export function CartItemRow({
  cartItemId,
  product,
  quantity: initialQuantity,
  hasPrice,
  unitPriceExGst,
  lineSubtotalExGst,
}: CartItemRowProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleUpdateQuantity(newQuantity: number) {
    if (newQuantity < 1 || newQuantity === quantity) return;

    setIsUpdating(true);
    setQuantity(newQuantity);

    const result = await updateCartItemAction(cartItemId, newQuantity);

    if (!result.success) {
      // Revert on error
      setQuantity(quantity);
      alert(result.error || 'Failed to update quantity');
    }

    setIsUpdating(false);
  }

  async function handleRemove() {
    if (!confirm(`Remove ${product.name} from cart?`)) return;

    setIsRemoving(true);

    const result = await removeCartItemAction(cartItemId);

    if (!result.success) {
      setIsRemoving(false);
      alert(result.error || 'Failed to remove item');
    }
    // If successful, page will revalidate and item will disappear
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex gap-6">
        {/* Product Info */}
        <div className="flex-1">
          <Link
            href={`/products/${product.slug}`}
            className="text-lg font-semibold text-gray-900 hover:text-[#009EE0] transition-colors"
          >
            {product.name}
          </Link>
          {product.pack_size && (
            <p className="text-sm text-gray-500 mt-1">Pack Size: {product.pack_size}</p>
          )}

          {!hasPrice && (
            <p className="text-sm text-amber-600 font-medium mt-2">
              ⚠️ Pricing not available for this product
            </p>
          )}
        </div>

        {/* Price & Quantity */}
        <div className="flex flex-col items-end gap-4 min-w-[200px]">
          {hasPrice ? (
            <>
              <div className="text-right">
                <p className="text-sm text-gray-500">Unit Price (ex-GST)</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{unitPriceExGst.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor={`qty-${cartItemId}`} className="text-sm text-gray-600">
                  Qty:
                </label>
                <input
                  id={`qty-${cartItemId}`}
                  type="number"
                  min="1"
                  max="9999"
                  value={quantity}
                  onChange={(e) => {
                    const newQty = Math.max(1, parseInt(e.target.value) || 1);
                    setQuantity(newQty);
                  }}
                  onBlur={(e) => {
                    const newQty = Math.max(1, parseInt(e.target.value) || 1);
                    handleUpdateQuantity(newQty);
                  }}
                  disabled={isUpdating || isRemoving}
                  className="w-20 px-3 py-1 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none disabled:bg-gray-100"
                />
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">Line Total (ex-GST)</p>
                <p className="text-xl font-bold text-[#009EE0]">
                  ₹{(unitPriceExGst * quantity).toFixed(2)}
                </p>
              </div>
            </>
          ) : (
            <div className="text-right text-gray-400">
              <p className="text-sm">Quantity: {quantity}</p>
              <p className="text-sm">Price unavailable</p>
            </div>
          )}

          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:text-gray-400"
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}
