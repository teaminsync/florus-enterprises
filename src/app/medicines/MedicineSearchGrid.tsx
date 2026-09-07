'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface DisplayProduct {
  id: string;
  slug: string;
  name: string;
  composition: string;
  packSize: string | null;
  categoryName: string | null;
  priceLabel: string; // e.g. "₹85.47" or "Pricing coming soon"
  priceSubLabel: string | null; // e.g. "(ex-GST)" or MRP strikethrough text, or null
}

interface MedicineSearchGridProps {
  products: DisplayProduct[];
  initialQuery: string;
  hasActiveCategory: boolean;
  clearCategoryHref: string; // href that clears category but nothing else
}

export function MedicineSearchGrid({
  products,
  initialQuery,
  hasActiveCategory,
  clearCategoryHref,
}: MedicineSearchGridProps) {
  const [query, setQuery] = useState(initialQuery);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.composition.toLowerCase().includes(q)
    );
  }, [query, products]);

  return (
    <div>
      <div className="mb-8">
        <div className="max-w-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name or composition..."
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
          />
        </div>
      </div>

      {(hasActiveCategory || query.trim()) && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {hasActiveCategory && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
              <span>Category filter active</span>
              <Link href={clearCategoryHref} className="text-gray-500 hover:text-gray-700">
                ×
              </Link>
            </div>
          )}
          {query.trim() && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
              <span>Search: &quot;{query}&quot;</span>
              <button
                onClick={() => setQuery('')}
                className="text-gray-500 hover:text-gray-700"
                type="button"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-gray-600 mb-6">
        {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => {
            const truncated =
              product.composition.length > 100
                ? product.composition.substring(0, 100) + '...'
                : product.composition;

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#009EE0] hover:shadow-md transition-all"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{truncated}</p>
                {product.packSize && (
                  <p className="text-sm text-gray-500 mb-3">Pack Size: {product.packSize}</p>
                )}
                <p
                  className={
                    product.priceLabel === 'Pricing coming soon'
                      ? 'text-sm text-amber-600 font-medium'
                      : 'text-lg font-semibold text-[#009EE0]'
                  }
                >
                  {product.priceLabel}
                  {product.priceSubLabel && (
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      {product.priceSubLabel}
                    </span>
                  )}
                </p>
                {product.categoryName && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">{product.categoryName}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
