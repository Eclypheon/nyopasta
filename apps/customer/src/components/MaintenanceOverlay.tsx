import React from 'react';
import { StoreSettings, getMaintenanceStatus } from '@nyopasta/shared';
import { Wrench, Store, Clock, MapPin } from 'lucide-react';

interface MaintenanceOverlayProps {
  settings: StoreSettings;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({ settings }) => {
  const status = getMaintenanceStatus(settings);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-headline"
      aria-describedby="maintenance-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs pointer-events-auto animate-fade-in"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-gradient-to-b from-white to-[#FDFBF7] border-2 border-amber-300 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-200/40 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-terracotta/10 rounded-full blur-xl pointer-events-none" />

        {/* Icon Header */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 shadow-md mb-2">
            <Wrench className="w-8 h-8 animate-pulse text-amber-700" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-terracotta">
            NYO PASTA · ONLINE SYSTEM
          </span>
        </div>

        {/* Status Pill */}
        <div className="relative z-10 flex justify-center">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full shadow-2xs ${
              status.isOpen
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {status.isOpen ? (
              <>
                <Store className="w-3.5 h-3.5 text-emerald-700" />
                Kitchen Open · Order at Counter
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-rose-700" />
                Shop Closed · Check Google Hours
              </>
            )}
          </span>
        </div>

        {/* Headline & Body Message */}
        <div className="relative z-10 space-y-2">
          <h2
            id="maintenance-headline"
            className="text-base font-black text-navy leading-snug tracking-tight"
          >
            {status.headline}
          </h2>
          <p
            id="maintenance-description"
            className="text-xs text-navy/80 leading-relaxed font-medium"
          >
            {status.subtext}
          </p>
          <p className="text-[11px] text-terracotta font-semibold pt-1">
            {status.isOpen
              ? '系统维护中，请前往柜台直接点餐。'
              : '系统维护中，门店已打烊。请在 Google 确认营业时间，如已开门请到柜台点餐。'}
          </p>
        </div>

        {/* Counter Location Footer */}
        <div className="relative z-10 pt-2 border-t border-amber-200/70 flex items-center justify-center gap-1.5 text-[11px] text-navy/60 font-medium">
          <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
          <span>Toa Payoh Palm Spring #01-54</span>
        </div>
      </div>
    </div>
  );
};
