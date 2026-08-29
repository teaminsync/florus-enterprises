'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_ACTIONABLE_STATUSES } from '@/utils/orders/transitions';
import { approveOrderAction, rejectOrderAction, markNeedsRevisionAction, markFulfilledAction } from './actions';

interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
}

export function OrderActions({ orderId, currentStatus }: OrderActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [error, setError] = useState('');

  const availableActions = ADMIN_ACTIONABLE_STATUSES[currentStatus as keyof typeof ADMIN_ACTIONABLE_STATUSES] || [];

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this order?')) return;
    
    setLoading(true);
    setError('');
    
    const result = await approveOrderAction(orderId);
    
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Failed to approve order');
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    if (!confirm('Are you sure you want to reject this order? This cannot be undone.')) return;
    
    setLoading(true);
    setError('');
    
    const result = await rejectOrderAction(orderId, feedback);
    
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Failed to reject order');
      setLoading(false);
    }
  };

  const handleNeedsRevision = async () => {
    if (!feedback.trim()) {
      setError('Please provide instructions for revision');
      return;
    }
    
    if (!confirm('This will send the order back to the trade user for revision.')) return;
    
    setLoading(true);
    setError('');
    
    const result = await markNeedsRevisionAction(orderId, feedback);
    
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Failed to mark order as needing revision');
      setLoading(false);
    }
  };

  const handleMarkFulfilled = async () => {
    if (!confirm('Mark this order as fulfilled?')) return;
    
    setLoading(true);
    setError('');
    
    const result = await markFulfilledAction(orderId);
    
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Failed to mark order as fulfilled');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Pending verification actions */}
      {currentStatus === 'pending_verification' && (
        <>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Approve Order'}
          </button>

          {!showRevisionForm && !showRejectForm && (
            <button
              onClick={() => setShowRevisionForm(true)}
              disabled={loading}
              className="w-full px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Needs Revision
            </button>
          )}

          {showRevisionForm && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Revision Instructions
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what needs to be corrected..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                disabled={loading}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNeedsRevision}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit
                </button>
                <button
                  onClick={() => {
                    setShowRevisionForm(false);
                    setFeedback('');
                    setError('');
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showRejectForm && !showRevisionForm && (
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reject Order
            </button>
          )}

          {showRejectForm && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Rejection Reason
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain why this order is being rejected..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                disabled={loading}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setFeedback('');
                    setError('');
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Approved -> Fulfilled */}
      {currentStatus === 'approved' && (
        <button
          onClick={handleMarkFulfilled}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : 'Mark as Fulfilled'}
        </button>
      )}
    </div>
  );
}
