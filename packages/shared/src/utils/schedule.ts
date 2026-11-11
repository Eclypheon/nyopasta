import { DayOfWeek, StoreSettings, TimeSlot } from '../types/index.js';

const DAYS_ORDER: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export interface StoreOpenStatus {
  isOpen: boolean;
  reason: string;
  nextOpenSlot?: string;
  bannerMessage?: string;
}

/**
 * Checks if store is currently open based on settings and current time (default Asia/Singapore).
 */
export function isStoreCurrentlyOpen(settings: StoreSettings, customDate?: Date): StoreOpenStatus {
  if (settings.isManuallyClosed) {
    return {
      isOpen: false,
      reason: settings.manualCloseReason || 'Shop is closed for the day by management.',
      bannerMessage: settings.bannerMessage || 'Notice: The shop is currently closed. Ordering is temporarily paused.',
    };
  }

  const now = customDate || new Date();
  
  // Format to Singapore time components
  const formatter = new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekdayPart = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase();
  const hourPart = parts.find((p) => p.type === 'hour')?.value || '00';
  const minutePart = parts.find((p) => p.type === 'minute')?.value || '00';
  const currentTimeString = `${hourPart.padStart(2, '0')}:${minutePart.padStart(2, '0')}`;

  const currentDayOfWeek = DAYS_ORDER.find((d) => d === weekdayPart) || 'monday';
  const daySchedule = settings.schedule.find((s) => s.day === currentDayOfWeek);

  if (!daySchedule || !daySchedule.isOpen || daySchedule.timeSlots.length === 0) {
    return {
      isOpen: false,
      reason: `Closed on ${daySchedule?.dayName || 'today'}.`,
      bannerMessage: settings.bannerMessage || `We are closed today (${daySchedule?.dayName || 'today'}).`,
    };
  }

  // Check if current time falls within any open slot
  const inSlot = daySchedule.timeSlots.some((slot) => {
    return currentTimeString >= slot.open && currentTimeString <= slot.close;
  });

  if (inSlot) {
    return {
      isOpen: true,
      reason: 'Open for orders.',
    };
  }

  // Find next slot today or later
  const nextSlotToday = daySchedule.timeSlots.find((slot) => slot.open > currentTimeString);
  if (nextSlotToday) {
    return {
      isOpen: false,
      reason: `Opens at ${nextSlotToday.open} today.`,
      nextOpenSlot: `Today at ${nextSlotToday.open}`,
      bannerMessage: settings.bannerMessage || `Currently closed. Opens at ${nextSlotToday.open} today.`,
    };
  }

  return {
    isOpen: false,
    reason: 'Closed for the day.',
    bannerMessage: settings.bannerMessage || 'Shop closed for the day. See you during our next opening hours!',
  };
}
