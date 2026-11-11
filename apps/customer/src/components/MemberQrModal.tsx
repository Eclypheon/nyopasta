import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode as QrIcon } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface MemberQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemberQrModal: React.FC<MemberQrModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useCart();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const qrPayload = `NYO-MEMBER:${profile.authUserId || profile.id}`;

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#172554', // Dark navy for crisp scanning
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, qrPayload]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard?.writeText(profile.authUserId || profile.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-cream-dark text-center relative overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-navy/40 hover:text-navy hover:bg-cream transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta">
            <QrIcon className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-lg text-navy">Member Identity QR</h3>
        </div>
        <p className="text-xs text-navy/60 max-w-xs mx-auto">
          Present this high-contrast QR code to the cashier to credit stamps or migrate an old physical card.
        </p>

        {/* High-Contrast QR Code Display */}
        <div className="my-5 p-4 bg-white rounded-2xl border-2 border-navy/10 shadow-inner inline-block">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Member QR Code"
              className="w-56 h-56 mx-auto object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center bg-gray-50 text-navy/40 text-xs">
              Generating high-contrast QR...
            </div>
          )}
        </div>

        {/* Member Details & Copy Button */}
        <div className="bg-cream-light p-3 rounded-2xl border border-cream-dark text-left space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-navy/50">Member Name</span>
            <span className="text-xs font-black text-navy">{profile.name}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-cream-dark/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-navy/50 block">Member ID</span>
              <span className="font-mono font-bold text-xs text-terracotta">{profile.authUserId}</span>
            </div>
            <button
              onClick={handleCopyId}
              className="p-1.5 rounded-lg border border-cream-dark bg-white hover:bg-cream text-navy/70 hover:text-navy flex items-center gap-1 text-[11px] font-semibold"
              title="Copy Member ID"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-cream-dark/60 text-[11px]">
            <span className="text-[10px] uppercase font-bold text-navy/50">Current Balance</span>
            <span className="font-black text-navy">{profile.currentStampCount} / 12 Stamps</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full bg-navy hover:bg-navy-900 active:scale-98 text-white font-bold text-xs py-3 rounded-xl transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
};
