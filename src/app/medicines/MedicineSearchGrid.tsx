'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

type SortOption = 'name-asc' | 'price-asc' | 'price-desc';

interface DisplayProduct {
  id: string;
  slug: string;
  name: string;
  composition: string;
  packSize: string | null;
  categoryName: string | null;
  priceLabel: string; // e.g. "₹85.47" or "Pricing coming soon"
  priceSubLabel: string | null; // e.g. "(ex-GST)" or MRP strikethrough text, or null
  rawPrice: number | null; // numeric price for sorting, null when no price available
}

interface MedicineSearchGridProps {
  products: DisplayProduct[];
  initialQuery: string;
}

export function MedicineSearchGrid({
  products,
  initialQuery,
}: MedicineSearchGridProps) {
  const [query, setQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // Reset to page 1 when query or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, sortBy]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.composition.toLowerCase().includes(q)
    );
  }, [query, products]);

  const sorted = useMemo(() => {
    const result = [...filtered];

    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'price-asc' || sortBy === 'price-desc') {
      result.sort((a, b) => {
        // Handle null prices - always sort to end
        if (a.rawPrice === null && b.rawPrice === null) return 0;
        if (a.rawPrice === null) return 1;
        if (b.rawPrice === null) return -1;

        // Normal numeric comparison
        return sortBy === 'price-asc'
          ? a.rawPrice - b.rawPrice
          : b.rawPrice - a.rawPrice;
      });
    }

    return result;
  }, [filtered, sortBy]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sorted.slice(start, end);
  }, [sorted, currentPage]);

  // Generate page numbers with truncation for display
  const getPageNumbers = () => {
    if (totalPages <= 10) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1, 2);

    if (currentPage > 4) {
      pages.push('...');
    }

    for (let i = Math.max(3, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (currentPage < totalPages - 3) {
      pages.push('...');
    }

    pages.push(totalPages - 1, totalPages);

    return pages;
  };

  return (
    <div>
      {/* Search Input with Inline Clear and Sort Dropdown */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-2xl relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name or composition..."
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
              type="button"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="sm:w-48">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        {sorted.length} product{sorted.length !== 1 ? 's' : ''} found
      </p>

      {paginated.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((product) => {
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2 flex-wrap">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
                    {page}
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                      currentPage === page
                        ? 'bg-[#009EE0] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
