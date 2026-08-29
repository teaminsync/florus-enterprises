/**
 * Order status transition rules and validation
 * 
 * Defines allowed state transitions for orders:
 * - pending_verification → approved | rejected | needs_revision
 * - needs_revision → pending_verification (via trade user resubmission only)
 * - approved → fulfilled
 * - rejected → (terminal)
 * - fulfilled → (terminal)
 */

export type OrderStatus =
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'needs_revision'
  | 'fulfilled';

/**
 * Admin-actionable transitions from each status
 * needs_revision has no admin actions - trade user must resubmit to move back to pending
 */
export const ADMIN_ACTIONABLE_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending_verification: ['approved', 'rejected', 'needs_revision'],
  approved: ['fulfilled'],
  rejected: [],
  needs_revision: [],
  fulfilled: [],
};

/**
 * Check if an admin can transition an order from one status to another
 */
export function canAdminTransition(from: string, to: string): boolean {
  return ADMIN_ACTIONABLE_STATUSES[from as OrderStatus]?.includes(to as OrderStatus) ?? false;
}

/**
 * Check if a trade user can resubmit an order (only from needs_revision)
 */
export function canTradeUserResubmit(currentStatus: string): boolean {
  return currentStatus === 'needs_revision';
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<OrderStatus, string> = {
    pending_verification: 'Pending Verification',
    approved: 'Approved',
    rejected: 'Rejected',
    needs_revision: 'Needs Revision',
    fulfilled: 'Fulfilled',
  };
  return labels[status as OrderStatus] || status;
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: string): string {
  const colors: Record<OrderStatus, string> = {
    pending_verification: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    needs_revision: 'bg-orange-100 text-orange-800',
    fulfilled: 'bg-blue-100 text-blue-800',
  };
  return colors[status as OrderStatus] || 'bg-gray-100 text-gray-800';
}
