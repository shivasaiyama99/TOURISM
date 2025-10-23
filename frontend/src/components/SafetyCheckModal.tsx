import React, { useEffect } from 'react';
import { X, ShieldCheck, ThumbsUp, AlertTriangle } from 'lucide-react';

interface SafetyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  token: string;
}

const SafetyCheckModal: React.FC<SafetyCheckModalProps> = ({ isOpen, onClose, planId, token }) => {
  if (!isOpen) return null;

  // Auto-alert after 5 minutes if modal is open and no action
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        await fetch((import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000') + `/api/safety/alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId: planId }),
        });
      } finally {
        onClose();
      }
    }, 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, [planId, token, onClose]);

  const handle = async (resp: 'yes' | 'no') => {
    try {
      await fetch((import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000') + `/api/bookings/${planId}/safety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ response: resp }),
      });
      if (resp === 'no') {
        await fetch((import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000') + `/api/safety/alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId: planId }),
        });
      }
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full text-center p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-6 h-6 text-gray-500" />
        </button>
        <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Are you safe?</h3>
        <p className="text-gray-600 mb-6">Please confirm your safety status.</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handle('yes')} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2">
            <ThumbsUp className="w-4 h-4" /> Yes
          </button>
          <button onClick={() => handle('no')} className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" /> No
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyCheckModal;


