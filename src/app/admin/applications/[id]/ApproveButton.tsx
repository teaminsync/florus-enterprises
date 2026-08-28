'use client';

import { useState } from 'react';
import { approveApplicationAction } from './actions';

interface ApproveButtonProps {
  applicationId: string;
  adminUserId: string;
}

export function ApproveButton({ applicationId, adminUserId }: ApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleApprove() {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('applicationId', applicationId);
      formData.append('adminUserId', adminUserId);
      
      const result = await approveApplicationAction(formData);
      
      if (result.success && result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
      } else {
        setError(result.error || 'Failed to approve application');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Approval error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard() {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  if (inviteUrl) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            ✓ Application Approved
          </h3>
          <p className="text-sm text-green-800 mb-4">
            The trade account has been created. Share this invite link with the applicant
            to complete their registration:
          </p>
          
          {/* Copyable input field */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 border border-green-300 rounded bg-white text-sm font-mono"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Plain text fallback */}
          <div className="bg-white border border-green-200 rounded p-3">
            <p className="text-xs text-gray-600 mb-1 font-medium">Invite Link:</p>
            <p className="text-xs text-gray-800 break-all font-mono">
              {inviteUrl}
            </p>
          </div>

          <p className="text-xs text-green-700 mt-4">
            <strong>Security Note:</strong> This invite link contains a temporary authentication
            token. Share it securely with the applicant via your established communication channel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={handleApprove}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Approve Application'}
      </button>
    </div>
  );
}
