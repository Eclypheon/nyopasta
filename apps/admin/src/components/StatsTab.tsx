import React, { useState, useMemo } from 'react';
import { Order } from '@nyopasta/shared';
import {
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

interface StatsTabProps {
  orders: Order[];
}

export const StatsTab: React.FC<StatsTabProps> = ({ orders }) => {
  // Available months extracted from order history plus current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthKey);

    for (const o of orders) {
      if (o.createdAt) {
        const d = new Date(o.createdAt);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(key);
        }
      }
    }

    return Array.from(monthsSet).sort().reverse();
  }, [orders]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => availableMonths[0] || '');
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Parse selected month into year and month (1-indexed)
  const { year, month } = useMemo(() => {
    if (!selectedMonth) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    const [yStr, mStr] = selectedMonth.split('-');
    return { year: parseInt(yStr, 10), month: parseInt(mStr, 10) };
  }, [selectedMonth]);

  // Days count for selected month (e.g. 28, 30, 31)
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Filter orders belonging to selected month and fulfilled/archived or paid (not cancelled)
  const monthOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return false;
      if (o.fulfillmentStatus === 'cancelled' && o.paymentStatus !== 'paid') return false;
      return o.fulfillmentStatus === 'fulfilled' || o.fulfillmentStatus === 'archived' || o.paymentStatus === 'paid';
    });
  }, [orders, year, month]);

  // Daily statistics bucketed by day of month (1..daysInMonth)
  const dailyStats = useMemo(() => {
    const map = new Map<number, { day: number; revenue: number; ordersCount: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      map.set(d, { day: d, revenue: 0, ordersCount: 0 });
    }

    for (const o of monthOrders) {
      const dayNum = new Date(o.createdAt).getDate();
      const entry = map.get(dayNum);
      if (entry) {
        entry.revenue += o.total;
        entry.ordersCount += 1;
      }
    }

    return Array.from(map.values());
  }, [monthOrders, daysInMonth]);

  // High-level Monthly KPIs
  const totalMonthRevenue = useMemo(() => {
    return monthOrders.reduce((sum, o) => sum + o.total, 0);
  }, [monthOrders]);

  const totalMonthOrders = monthOrders.length;

  const averageOrderValue = useMemo(() => {
    return totalMonthOrders > 0 ? totalMonthRevenue / totalMonthOrders : 0;
  }, [totalMonthRevenue, totalMonthOrders]);

  const peakDay = useMemo(() => {
    if (dailyStats.length === 0) return null;
    let maxEntry = dailyStats[0];
    for (const entry of dailyStats) {
      const val = metric === 'revenue' ? entry.revenue : entry.ordersCount;
      const maxVal = metric === 'revenue' ? maxEntry.revenue : maxEntry.ordersCount;
      if (val > maxVal) {
        maxEntry = entry;
      }
    }
    const val = metric === 'revenue' ? maxEntry.revenue : maxEntry.ordersCount;
    return val > 0 ? maxEntry : null;
  }, [dailyStats, metric]);

  // Chart max scale value with clean rounding
  const chartMax = useMemo(() => {
    const values = dailyStats.map((d) => (metric === 'revenue' ? d.revenue : d.ordersCount));
    const rawMax = Math.max(...values, 0);
    if (rawMax === 0) return metric === 'revenue' ? 100 : 10;

    if (metric === 'revenue') {
      const step = rawMax > 500 ? 100 : rawMax > 200 ? 50 : 25;
      return Math.ceil((rawMax * 1.15) / step) * step;
    } else {
      const step = rawMax > 50 ? 10 : rawMax > 20 ? 5 : 2;
      return Math.ceil((rawMax * 1.2) / step) * step;
    }
  }, [dailyStats, metric]);

  // Y-axis tick markers (3 ticks: max, half, 0)
  const yTicks = useMemo(() => {
    return [
      chartMax,
      Math.round(chartMax / 2),
      0,
    ];
  }, [chartMax]);

  const formatMonthName = (key: string) => {
    const [yStr, mStr] = key.split('-');
    const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return d.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
  };

  const activeDayDetail = selectedDay ? dailyStats.find((d) => d.day === selectedDay) : null;

  return (
    <div className="space-y-2">
      {/* Top Controls Bar: Month Selector & Metric Toggle */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
        {/* Month Selector */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setSelectedDay(null);
            }}
            className="text-xs font-bold pl-2 pr-6 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:border-terracotta cursor-pointer transition-colors"
          >
            {availableMonths.map((mKey) => (
              <option key={mKey} value={mKey}>
                {formatMonthName(mKey)}
              </option>
            ))}
          </select>
          <Calendar className="w-3 h-3 text-gray-500 absolute right-2 top-2 pointer-events-none" />
        </div>

        {/* Metric Pill Toggle */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => {
              setMetric('revenue');
              setSelectedDay(null);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
              metric === 'revenue'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-3 h-3 text-terracotta" />
            Revenue
          </button>
          <button
            type="button"
            onClick={() => {
              setMetric('orders');
              setSelectedDay(null);
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
              metric === 'orders'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="w-3 h-3 text-navy" />
            Orders
          </button>
        </div>
      </div>

      {/* KPI Cards: Single Row 4-Column Strip */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight block truncate">
            Revenue
          </span>
          <p className="text-sm font-black text-terracotta leading-tight truncate mt-0.5">
            ${totalMonthRevenue.toFixed(0)}
          </p>
        </div>

        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight block truncate">
            Orders
          </span>
          <p className="text-sm font-black text-navy leading-tight truncate mt-0.5">
            {totalMonthOrders}
          </p>
        </div>

        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight block truncate">
            Avg Order
          </span>
          <p className="text-sm font-black text-emerald-700 leading-tight truncate mt-0.5">
            ${averageOrderValue.toFixed(1)}
          </p>
        </div>

        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight block truncate">
            Peak Day
          </span>
          <p className="text-sm font-black text-amber-700 leading-tight truncate mt-0.5">
            {peakDay ? `Day ${peakDay.day}` : '-'}
          </p>
        </div>
      </div>

      {/* Vertical Bar Chart Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-2.5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-gray-900 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-terracotta" />
            <span>
              {metric === 'revenue' ? 'Daily Revenue Breakdown' : 'Daily Orders Breakdown'}
            </span>
          </h3>
          <span className="text-[10px] text-gray-400 font-medium">
            Tap a bar to inspect
          </span>
        </div>

        {/* Active Day Detail Banner */}
        {activeDayDetail && (
          <div className="bg-cream/40 border border-cream-dark px-2 py-1 rounded-lg flex items-center justify-between text-[11px] animate-in fade-in duration-100">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-navy px-1.5 py-0.2 bg-white rounded border border-amber-200 text-[10px]">
                Day {activeDayDetail.day}
              </span>
              <span className="font-bold text-gray-900">
                ${activeDayDetail.revenue.toFixed(2)}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">
                {activeDayDetail.ordersCount} {activeDayDetail.ordersCount === 1 ? 'order' : 'orders'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-gray-400 hover:text-gray-600 text-[10px] font-bold px-1.5 py-0.2"
            >
              Clear
            </button>
          </div>
        )}

        {/* Chart Viewport: Fits all 30/31 days on iPhone screen without horizontal scroll */}
        <div className="pt-2">
          <div className="flex">
            {/* Y-axis Labels */}
            <div className="flex flex-col justify-between text-[8px] font-bold text-gray-400 select-none h-36 text-right w-6 shrink-0 pr-1 pb-4">
              {yTicks.map((tick, i) => (
                <span key={i} className="leading-none">
                  {metric === 'revenue' ? `$${tick}` : tick}
                </span>
              ))}
            </div>

            {/* Bars & X-axis Unified Columns Area */}
            <div className="relative flex-1 h-36 border-b border-l border-gray-200 flex flex-col justify-between">
              {/* Horizontal gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-4">
                <div className="w-full border-t border-gray-100" />
                <div className="w-full border-t border-gray-100" />
                <div className="w-full border-t border-transparent" />
              </div>

              {/* Day Columns: Each column holds BOTH the vertical bar and the day number */}
              <div className="relative w-full h-full flex items-end justify-between px-0.5">
                {dailyStats.map((item) => {
                  const val = metric === 'revenue' ? item.revenue : item.ordersCount;
                  const heightPercent = chartMax > 0 ? (val / chartMax) * 100 : 0;
                  const isSelected = selectedDay === item.day;
                  const hasValue = val > 0;

                  return (
                    <div
                      key={item.day}
                      onClick={() => setSelectedDay(item.day === selectedDay ? null : item.day)}
                      className="flex-1 min-w-0 flex flex-col items-center justify-end h-full cursor-pointer group"
                      title={`Day ${item.day}: $${item.revenue.toFixed(2)} (${item.ordersCount} orders)`}
                    >
                      {/* Bar Container Area */}
                      <div className="w-full flex-1 flex items-end justify-center pb-0.5">
                        <div
                          className={`w-full max-w-[5px] sm:max-w-[7px] rounded-t-xs transition-all duration-150 ${
                            isSelected
                              ? 'bg-amber-500 ring-1 ring-amber-300'
                              : hasValue
                              ? metric === 'revenue'
                                ? 'bg-terracotta hover:bg-terracotta-dark'
                                : 'bg-navy hover:bg-navy-light'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          style={{
                            height: hasValue ? `${Math.max(8, Math.min(100, heightPercent))}%` : '2px',
                          }}
                        />
                      </div>

                      {/* Day Label directly beneath bar */}
                      <span
                        className={`text-[8px] font-bold leading-none select-none text-center block pt-0.5 ${
                          isSelected
                            ? 'text-terracotta font-black scale-110'
                            : 'text-gray-400 group-hover:text-gray-700'
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend Row */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1.5 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-xs ${
                  metric === 'revenue' ? 'bg-terracotta' : 'bg-navy'
                }`}
              />
              <span className="font-medium">
                {metric === 'revenue' ? 'Revenue' : 'Orders'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-gray-200" />
              <span className="font-medium">Zero</span>
            </div>
          </div>

          <span className="text-[9px] text-gray-400">
            {formatMonthName(selectedMonth)} • {daysInMonth} days
          </span>
        </div>
      </div>
    </div>
  );
};
