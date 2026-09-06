'use client';

import { useState } from 'react';
import { rejectApplicationAction } from './actions';

interface RejectButtonProps {
  applicationId: string;
  adminUserId: string;
}

export function RejectButton({ applicationId, adminUserId }: RejectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRejected, setIsRejected] = useState(false);

  function handleRejectClick() {
    setShowReasonForm(true);
    setError(null);
  }

  function handleCancel() {
    setShowReasonForm(false);
    setRejectionReason('');
    setError(null);
  }

  async function handleConfirmReject() {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('applicationId', applicationId);
      formData.append('adminUserId', adminUserId);
      formData.append('rejectionReason', rejectionReason);

      const result = await rejectApplicationAction(formData);

      if (result.success) {
        setIsRejected(true);
      } else {
        setError(result.error || 'Failed to reject application');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Rejection error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (isRejected) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Application Rejected
        </h3>
        <p className="text-sm text-red-800">
          The application has been rejected. The rejection reason has been saved and will be used
          when notifying the applicant.
        </p>
      </div>
    );
  }

  if (!showReasonForm) {
    return (
      <button
        onClick={handleRejectClick}
        className="w-full px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors"
      >
        Reject Application
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <label htmlFor="rejectionReason" className="block text-sm font-medium text-red-900 mb-2">
          Reason for rejection
          <span className="text-red-600 ml-1">*</span>
        </label>
        <p className="text-xs text-red-800 mb-3">
          This reason will be emailed to the applicant. Write it as something they will read.
        </p>
        <textarea
          id="rejectionReason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
          placeholder="e.g., Your application does not meet our verification requirements. Please ensure all documents are valid and up to date."
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3">
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleConfirmReject}
          disabled={isLoading || !rejectionReason.trim()}
          className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Confirm Reject'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-white text-gray-700 font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
