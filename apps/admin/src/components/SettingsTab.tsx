import React, { useState, useEffect } from 'react';
import {
  DaySchedule,
  DayOfWeek,
  StoreSettings,
  TimeSlot,
  DEFAULT_DAY_SCHEDULES,
  DEFAULT_STORE_SETTINGS,
  isStoreCurrentlyOpen,
  api,
} from '@nyopasta/shared';
import {
  Clock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

interface SettingsTabProps {
  storeSettings: StoreSettings;
  onSettingsSaved?: () => void;
}

const DAYS_SEQUENCE: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  storeSettings,
  onSettingsSaved,
}) => {
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => {
    return storeSettings.schedule && storeSettings.schedule.length > 0
      ? storeSettings.schedule
      : DEFAULT_DAY_SCHEDULES;
  });

  const [payNowUen, setPayNowUen] = useState(storeSettings.payNowUen || '202300000A');
  const [payNowRecipientName, setPayNowRecipientName] = useState(
    storeSettings.payNowRecipientName || 'NYO PASTA'
  );
  const [takeawayFee, setTakeawayFee] = useState<number>(
    storeSettings.takeawayFeePerItem ?? 0.3
  );
  const [bannerMessage, setBannerMessage] = useState(
    storeSettings.bannerMessage || ''
  );
  const [isManuallyClosed, setIsManuallyClosed] = useState(
    Boolean(storeSettings.isManuallyClosed)
  );

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Sync with prop changes if updated remotely
  useEffect(() => {
    if (storeSettings.schedule && storeSettings.schedule.length > 0) {
      setSchedule(storeSettings.schedule);
    }
    setPayNowUen(storeSettings.payNowUen || '202300000A');
    setPayNowRecipientName(storeSettings.payNowRecipientName || 'NYO PASTA');
    setTakeawayFee(storeSettings.takeawayFeePerItem ?? 0.3);
    setBannerMessage(storeSettings.bannerMessage || '');
    setIsManuallyClosed(Boolean(storeSettings.isManuallyClosed));
  }, [storeSettings]);

  // Current draft settings object to compute live status
  const currentDraftSettings: StoreSettings = {
    ...storeSettings,
    schedule,
    payNowUen,
    payNowRecipientName,
    takeawayFeePerItem: takeawayFee,
    bannerMessage,
    isManuallyClosed,
  };

  const storeStatus = isStoreCurrentlyOpen(currentDraftSettings);

  // Toggle day open / closed
  const handleToggleDayOpen = (day: DayOfWeek) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.day !== day) return item;
        const willBeOpen = !item.isOpen;
        // If toggling open and no slots exist, supply default reference slot
        let defaultSlots = item.timeSlots;
        if (willBeOpen && item.timeSlots.length === 0) {
          defaultSlots = [
            { open: '10:00', close: '14:00' },
            { open: '18:00', close: '21:00' },
          ];
        }
        return {
          ...item,
          isOpen: willBeOpen,
          timeSlots: willBeOpen ? defaultSlots : [],
        };
      })
    );
  };

  // Add time slot to a day
  const handleAddTimeSlot = (day: DayOfWeek) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.day !== day) return item;
        const newSlot: TimeSlot = { open: '18:00', close: '21:00' };
        return {
          ...item,
          timeSlots: [...item.timeSlots, newSlot],
        };
      })
    );
  };

  // Remove time slot
  const handleRemoveTimeSlot = (day: DayOfWeek, slotIndex: number) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.day !== day) return item;
        const updatedSlots = item.timeSlots.filter((_, idx) => idx !== slotIndex);
        return {
          ...item,
          timeSlots: updatedSlots,
          isOpen: updatedSlots.length > 0 ? item.isOpen : false,
        };
      })
    );
  };

  // Update time slot value
  const handleUpdateSlot = (
    day: DayOfWeek,
    slotIndex: number,
    field: 'open' | 'close',
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.day !== day) return item;
        const updatedSlots = item.timeSlots.map((slot, idx) => {
          if (idx !== slotIndex) return slot;
          return { ...slot, [field]: value };
        });
        return {
          ...item,
          timeSlots: updatedSlots,
        };
      })
    );
  };

  // Reset to default reference schedule
  const handleResetToDefaults = () => {
    if (window.confirm('Reset schedule to reference defaults (Mon/Thu closed, Tue/Wed/Fri 10am-2pm & 6pm-9pm, Sat 9am-2pm & 6pm-9pm, Sun 9am-2pm)?')) {
      setSchedule(DEFAULT_DAY_SCHEDULES);
      setPayNowUen(DEFAULT_STORE_SETTINGS.payNowUen);
      setPayNowRecipientName(DEFAULT_STORE_SETTINGS.payNowRecipientName);
      setTakeawayFee(DEFAULT_STORE_SETTINGS.takeawayFeePerItem);
    }
  };

  // Save changes
  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      await api.updateStoreSettings({
        schedule,
        payNowUen: payNowUen.trim(),
        payNowRecipientName: payNowRecipientName.trim(),
        takeawayFeePerItem: Number(takeawayFee) || 0.3,
        bannerMessage: bannerMessage.trim(),
        isManuallyClosed,
      });
      setSaveStatus('saved');
      onSettingsSaved?.();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to save store settings:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Sort schedule by Monday -> Sunday order
  const orderedSchedule = [...schedule].sort(
    (a, b) => DAYS_SEQUENCE.indexOf(a.day) - DAYS_SEQUENCE.indexOf(b.day)
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Live Store Status Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900 text-base">Current Store Status</h2>
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                storeStatus.isOpen
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {storeStatus.isOpen ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Currently Open
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Currently Closed
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Status reason: <span className="font-medium text-gray-700">{storeStatus.reason}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saveStatus === 'saving'}
          className="px-4 py-2 bg-terracotta hover:bg-terracotta-600 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {saveStatus === 'saving' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          {saveStatus === 'saving' ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {saveStatus === 'saved' && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Store settings and operating schedule updated successfully!
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-red-800 text-xs font-bold animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600" />
          Failed to save settings. Please try again.
        </div>
      )}

      {/* Weekly Operating Schedule Editor */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-navy" />
              Weekly Operating Schedule
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Set store open/closed days and operational shifts (Singapore Time).
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="text-xs font-semibold text-gray-500 hover:text-navy underline flex items-center gap-1"
          >
            Reset to defaults
          </button>
        </div>

        <div className="space-y-3">
          {orderedSchedule.map((dayItem) => (
            <div
              key={dayItem.day}
              className={`p-3.5 rounded-xl border transition-all ${
                dayItem.isOpen
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50/80 border-gray-200/60 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Day name and open toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleDayOpen(dayItem.day)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                      dayItem.isOpen ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                    aria-label={`Toggle ${dayItem.dayName}`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        dayItem.isOpen ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <div>
                    <span className="font-bold text-sm text-gray-900">{dayItem.dayName}</span>
                    <span
                      className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        dayItem.isOpen
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {dayItem.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>

                {/* Time Slots List */}
                {dayItem.isOpen ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {dayItem.timeSlots.map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg"
                      >
                        <input
                          type="time"
                          value={slot.open}
                          onChange={(e) =>
                            handleUpdateSlot(dayItem.day, sIdx, 'open', e.target.value)
                          }
                          className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="time"
                          value={slot.close}
                          onChange={(e) =>
                            handleUpdateSlot(dayItem.day, sIdx, 'close', e.target.value)
                          }
                          className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none"
                        />
                        {dayItem.timeSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeSlot(dayItem.day, sIdx)}
                            className="text-gray-400 hover:text-red-500 p-0.5 ml-1"
                            title="Remove time slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleAddTimeSlot(dayItem.day)}
                      className="text-xs font-bold text-navy hover:text-blue-700 bg-navy/5 hover:bg-navy/10 px-2 py-1 rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Slot
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Closed all day</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PayNow & Store Operational Settings */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2 border-b pb-2">
          <Building2 className="w-4 h-4 text-navy" />
          PayNow & Payment Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              PayNow UEN
            </label>
            <input
              type="text"
              value={payNowUen}
              onChange={(e) => setPayNowUen(e.target.value)}
              placeholder="e.g. 202300000A"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-terracotta"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Displayed on customer PayNow checkout QR screen.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Recipient Name
            </label>
            <input
              type="text"
              value={payNowRecipientName}
              onChange={(e) => setPayNowRecipientName(e.target.value)}
              placeholder="NYO PASTA"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-terracotta"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Verified business entity name for customer PayNow transfers.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
              Takeaway Packaging Fee per Item ($)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              value={takeawayFee}
              onChange={(e) => setTakeawayFee(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-terracotta"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Auto-added to customer cart for takeaway orders (Standard: $0.30).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Store Notice / Announcement Banner
            </label>
            <input
              type="text"
              value={bannerMessage}
              onChange={(e) => setBannerMessage(e.target.value)}
              placeholder="Optional announcement banner displayed on customer app"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-terracotta"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Leaves empty for no banner.
            </p>
          </div>
        </div>

        {/* Save button at bottom of settings */}
        <div className="pt-3 border-t flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2.5 bg-terracotta hover:bg-terracotta-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saveStatus === 'saving' ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
