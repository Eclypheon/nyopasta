import React from 'react';
import { AlertTriangle, DollarSign, X } from 'lucide-react';

interface UnpaidWarningModalProps {
  isOpen: boolean;
  orderNumber: string;
  totalAmount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnpaidWarningModal: React.FC<UnpaidWarningModalProps> = ({
  isOpen,
  orderNumber,
  totalAmount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-500 animate-in fade-in zoom-in-95 duration-150"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unpaid-warning-title"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Payment Collection Safeguard</span>
              <h3 id="unpaid-warning-title" className="text-lg font-black text-gray-900 leading-tight">
                Order {orderNumber} is Unpaid
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5">
          <p className="text-sm text-amber-900 font-semibold mb-2">
            Warning: Order is unpaid (Pay at Counter). Please remember to collect payment from the customer before fulfilling.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/80 text-amber-900">
            <span className="text-xs font-medium">Amount to collect:</span>
            <span className="text-xl font-black flex items-center">
              <DollarSign className="w-5 h-5 -mr-0.5" />
              {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Confirming will mark this order as paid and fulfilled in the system. Make sure cash or counter payment has been received.
        </p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-sm text-white shadow-md transition-colors flex items-center justify-center gap-1.5"
          >
            Collected & Fulfill
          </button>
        </div>
      </div>
    </div>
  );
};
