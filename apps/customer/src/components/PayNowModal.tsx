import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode as QrIcon, AlertCircle, ShieldCheck } from 'lucide-react';
import { Order, StoreSettings, generatePayNowPayload, formatPayNowPhone } from '@nyopasta/shared';

interface PayNowModalProps {
  isOpen: boolean;
  order: Order;
  storeSettings: StoreSettings;
  onClose: () => void;
  onConfirmPaid: () => void;
}

export const PayNowModal: React.FC<PayNowModalProps> = ({
  isOpen,
  order,
  storeSettings,
  onClose,
  onConfirmPaid,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedProxy, setCopiedProxy] = useState(false);

  const proxyType = storeSettings.payNowType || (storeSettings.payNowMobile ? 'mobile' : 'uen');
  const proxyValue = proxyType === 'mobile'
    ? (storeSettings.payNowMobile || '92258003')
    : (storeSettings.payNowUen || '202300000A');
  const formattedPhone = proxyType === 'mobile' ? formatPayNowPhone(proxyValue) : proxyValue;
  const merchantName = storeSettings.payNowRecipientName || 'NYO PASTA';

  useEffect(() => {
    if (!isOpen) return;

    try {
      const payload = generatePayNowPayload({
        proxyType: proxyType === 'mobile' ? 'mobile' : 'uen',
        proxyValue,
        amount: order.total,
        reference: order.orderNumber,
        merchantName,
        editable: false,
      });

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#172554', // Dark navy for crisp scanning
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      })
        .then(setQrDataUrl)
        .catch((err) => console.error('Failed to generate PayNow QR code:', err));
    } catch (err) {
      console.error('Error generating PayNow payload:', err);
    }
  }, [isOpen, order, storeSettings, proxyType, proxyValue, merchantName]);

  if (!isOpen) return null;

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(order.orderNumber);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyProxy = () => {
    navigator.clipboard?.writeText(proxyValue);
    setCopiedProxy(true);
    setTimeout(() => setCopiedProxy(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-navy/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div
        className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-cream-dark text-center relative overflow-hidden my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-navy/40 hover:text-navy rounded-full hover:bg-cream-light transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* PayNow Header Banner */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7A1A74]/10 text-[#7A1A74] text-xs font-black tracking-wide uppercase mb-2">
          <QrIcon className="w-3.5 h-3.5" />
          <span>PayNow · FAST Transfer</span>
        </div>

        <h3 className="font-black text-xl text-navy">Scan to Pay 扫码支付</h3>
        <p className="text-xs text-navy/60 mt-0.5">
          Scan using DBS PayLah, OCBC, UOB TMRW, or GrabPay
        </p>

        {/* Dynamic QR Code Frame */}
        <div className="my-3.5 p-3 bg-white rounded-2xl border-2 border-[#7A1A74]/20 shadow-inner flex flex-col items-center relative">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Dynamic PayNow QR Code"
              className="w-56 h-56 rounded-xl object-contain shadow-xs"
            />
          ) : (
            <div className="w-56 h-56 bg-cream-light rounded-xl flex items-center justify-center text-xs text-navy/40 animate-pulse">
              Generating dynamic QR...
            </div>
          )}

          <div className="mt-2 text-[11px] font-bold text-[#7A1A74] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Amount & order reference locked in QR</span>
          </div>
        </div>

        {/* Order Details Breakdown */}
        <div className="bg-cream-light/80 p-3 rounded-2xl border border-cream-dark space-y-2 text-left mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-navy/60">Amount Payable 应付金额</span>
            <span className="font-black text-lg text-terracotta">${order.total.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-cream-dark/60">
            <span className="text-navy/60 font-medium">Order Reference 订单号</span>
            <button
              type="button"
              onClick={handleCopyRef}
              className="font-mono font-black text-navy flex items-center gap-1 hover:text-terracotta transition-colors"
            >
              <span>{order.orderNumber}</span>
              {copiedRef ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-navy/40" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-navy/60 font-medium">
              {proxyType === 'mobile' ? 'Mobile Number 手机号' : 'PayNow UEN'}
            </span>
            <button
              type="button"
              onClick={handleCopyProxy}
              className="font-bold text-navy flex items-center gap-1 hover:text-terracotta transition-colors"
            >
              <span>{proxyType === 'mobile' ? formattedPhone : proxyValue}</span>
              {copiedProxy ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-navy/40" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-navy/60 font-medium">Recipient 接收方</span>
            <span className="font-bold text-navy">{merchantName}</span>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-left flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 leading-snug">
            Please complete the transfer in your banking app before tapping below. The kitchen will verify receipt upon collection.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onConfirmPaid}
            className="w-full bg-[#7A1A74] hover:bg-[#63145e] active:scale-98 text-white font-extrabold text-sm py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>I Have Transferred 我已付款</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-navy/60 hover:text-navy text-xs font-bold py-2 transition-colors"
          >
            Cancel / Change Payment Method
          </button>
        </div>
      </div>
    </div>
  );
};
