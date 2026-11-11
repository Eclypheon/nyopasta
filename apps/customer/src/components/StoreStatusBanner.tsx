import React from 'react';
import { isStoreCurrentlyOpen, StoreSettings } from '@nyopasta/shared';
import { AlertCircle, Clock } from 'lucide-react';

interface StoreStatusBannerProps {
  settings: StoreSettings;
}

export const StoreStatusBanner: React.FC<StoreStatusBannerProps> = ({ settings }) => {
  const status = isStoreCurrentlyOpen(settings);

  if (status.isOpen) {
    if (settings.bannerMessage && settings.bannerMessage.trim().length > 0) {
      return (
        <div className="bg-pasta-gold/15 border-b border-pasta-gold/30 text-navy text-xs px-4 py-2 font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-pasta-gold shrink-0" />
          <span>{settings.bannerMessage}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-red-500 text-white text-xs px-4 py-2 font-medium flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2 pr-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-white/90" />
        <span className="leading-tight">{status.bannerMessage || status.reason}</span>
      </div>
      <span className="bg-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 tracking-wide">
        Closed
      </span>
    </div>
  );
};
