'use client';

import { useRouter } from 'next/navigation';

interface DosageFormFilterProps {
  dosageForms: string[];
  currentDosage: string | undefined;
  currentCategory: string | undefined;
  currentBrand: string | undefined;
  currentQuery: string;
}

// Helper to capitalize dosage form display labels
function formatDosageLabel(dosage: string): string {
  return dosage
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DosageFormFilter({
  dosageForms,
  currentDosage,
  currentCategory,
  currentBrand,
  currentQuery,
}: DosageFormFilterProps) {
  const router = useRouter();

  const handleDosageChange = (dosage: string) => {
    const params = new URLSearchParams();
    if (currentCategory) params.set('category', currentCategory);
    if (currentBrand) params.set('brand', currentBrand);
    if (dosage) params.set('dosage', dosage);
    if (currentQuery) params.set('q', currentQuery);

    const href = params.toString() ? `/medicines?${params.toString()}` : '/medicines';
    router.push(href);
  };

  return (
    <select
      value={currentDosage || ''}
      onChange={(e) => handleDosageChange(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#009EE0] focus:border-transparent outline-none bg-white"
    >
      <option value="">All Dosage Forms</option>
      {dosageForms.map((dosage) => (
        <option key={dosage} value={dosage}>
          {formatDosageLabel(dosage)}
        </option>
      ))}
    </select>
  );
}
