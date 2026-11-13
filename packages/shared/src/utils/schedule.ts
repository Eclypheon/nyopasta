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
  isOverridden?: boolean;
  scheduledOpen?: boolean;
}

/**
 * Checks scheduled store open status based purely on configured operating hours schedule.
 */
export function isScheduledStoreOpen(settings: StoreSettings, customDate?: Date): StoreOpenStatus {
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
      bannerMessage: `We are closed today (${daySchedule?.dayName || 'today'}).`,
      scheduledOpen: false,
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
      scheduledOpen: true,
    };
  }

  // Find next slot today or later
  const nextSlotToday = daySchedule.timeSlots.find((slot) => slot.open > currentTimeString);
  if (nextSlotToday) {
    return {
      isOpen: false,
      reason: `Opens at ${nextSlotToday.open} today.`,
      nextOpenSlot: `Today at ${nextSlotToday.open}`,
      bannerMessage: `Currently closed. Opens at ${nextSlotToday.open} today.`,
      scheduledOpen: false,
    };
  }

  return {
    isOpen: false,
    reason: 'Closed for the day.',
    bannerMessage: 'Shop closed for the day. See you during our next opening hours!',
    scheduledOpen: false,
  };
}

/**
 * Checks effective store status considering operating hours and manual overrides.
 * Manual overrides take precedence during conflicts. When time catches up to match
 * the overridden state, the system automatically returns to following the schedule.
 */
export function isStoreCurrentlyOpen(settings: StoreSettings, customDate?: Date): StoreOpenStatus {
  const scheduled = isScheduledStoreOpen(settings, customDate);

  // 1. Manual Open Override: overrides if schedule says closed
  if (settings.manualOverride === 'open') {
    if (!scheduled.isOpen) {
      return {
        isOpen: true,
        reason: 'Open (manual override in place).',
        bannerMessage: settings.bannerMessage || 'Notice: The shop is currently open by manager override.',
        isOverridden: true,
        scheduledOpen: false,
      };
    }
    // Schedule has caught up to open state: conflict resolved, follows schedule
    return {
      ...scheduled,
      isOverridden: false,
      scheduledOpen: true,
    };
  }

  // 2. Manual Close Override: overrides if schedule says open
  if (settings.manualOverride === 'closed' || settings.isManuallyClosed) {
    if (scheduled.isOpen) {
      return {
        isOpen: false,
        reason: settings.manualCloseReason || 'Shop is closed (manual override in place).',
        bannerMessage: settings.bannerMessage || 'Notice: The shop is temporarily closed by manager override.',
        isOverridden: true,
        scheduledOpen: true,
      };
    }
    // Schedule has caught up to closed state: conflict resolved, follows schedule
    return {
      ...scheduled,
      reason: settings.manualCloseReason || scheduled.reason,
      bannerMessage: settings.bannerMessage || scheduled.bannerMessage,
      isOverridden: false,
      scheduledOpen: false,
    };
  }

  // 3. Normal schedule: no override in effect
  return {
    ...scheduled,
    bannerMessage: settings.bannerMessage || scheduled.bannerMessage,
    isOverridden: false,
    scheduledOpen: scheduled.isOpen,
  };
}

export interface MaintenanceStatus {
  isMaintenanceMode: boolean;
  isOpen: boolean;
  headline: string;
  subtext: string;
}

export function getMaintenanceStatus(settings: StoreSettings, now = new Date()): MaintenanceStatus {
  const isMaintenanceMode = Boolean(settings.isMaintenanceMode);
  const status = isStoreCurrentlyOpen(settings, now);
  const isOpen = status.isOpen;

  if (isOpen) {
    return {
      isMaintenanceMode,
      isOpen: true,
      headline: 'Site under maintenance, please order at counter',
      subtext: 'Our kitchen is open. Please approach the counter to place your order.',
    };
  }

  return {
    isMaintenanceMode,
    isOpen: false,
    headline: 'Site under maintenance and shop is closed',
    subtext: 'Please confirm operating hours on Google and order at counter if store is opened.',
  };
}
