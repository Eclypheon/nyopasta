import React, { useState, useMemo } from 'react';
import { Order } from '@nyopasta/shared';
import {
  BarChart2,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Award,
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
      // Exclude unfulfilled cancelled orders from revenue stats
      if (o.fulfillmentStatus === 'cancelled' && o.paymentStatus !== 'paid') return false;
      // Include fulfilled, archived, or paid orders
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
      // Round up to nice increments: 50, 100, 200, etc.
      const step = rawMax > 500 ? 100 : rawMax > 200 ? 50 : 25;
      return Math.ceil((rawMax * 1.15) / step) * step;
    } else {
      // Round up to nearest integer step
      const step = rawMax > 50 ? 10 : rawMax > 20 ? 5 : 2;
      return Math.ceil((rawMax * 1.2) / step) * step;
    }
  }, [dailyStats, metric]);

  // Y-axis tick markers (4 ticks: max, 2/3, 1/3, 0)
  const yTicks = useMemo(() => {
    return [
      chartMax,
      Math.round((chartMax * 2) / 3),
      Math.round(chartMax / 3),
      0,
    ];
  }, [chartMax]);

  const formatMonthName = (key: string) => {
    const [yStr, mStr] = key.split('-');
    const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return d.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
  };

  const activeDayDetail = selectedDay ? dailyStats.find((d) => d.day === selectedDay) : null;

  return (
    <div className="space-y-4">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-terracotta" />
            Monthly Sales & Orders Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time daily breakdown of revenue and fulfilled order volume.
          </p>
        </div>

        {/* Month Selector Dropdown & Metric Pill Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDay(null);
              }}
              className="text-xs font-bold pl-3 pr-8 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl appearance-none focus:outline-none focus:border-terracotta cursor-pointer transition-colors"
            >
              {availableMonths.map((mKey) => (
                <option key={mKey} value={mKey}>
                  {formatMonthName(mKey)}
                </option>
              ))}
            </select>
            <Calendar className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Metric Pill Toggle */}
          <div className="flex items-center bg-gray-200/90 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMetric('revenue');
                setSelectedDay(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                metric === 'revenue'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-3 h-3 text-terracotta" />
              Revenue ($)
            </button>
            <button
              type="button"
              onClick={() => {
                setMetric('orders');
                setSelectedDay(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                metric === 'orders'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-3 h-3 text-navy" />
              Orders
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Monthly Revenue
          </span>
          <p className="text-xl font-black text-terracotta mt-1">
            ${totalMonthRevenue.toFixed(2)}
          </p>
          <span className="text-[10px] text-gray-500 font-medium">
            Across {totalMonthOrders} fulfilled {totalMonthOrders === 1 ? 'order' : 'orders'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Fulfilled Orders
          </span>
          <p className="text-xl font-black text-navy mt-1">
            {totalMonthOrders}
          </p>
          <span className="text-[10px] text-gray-500 font-medium">
            Total completed in {formatMonthName(selectedMonth)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Avg Order Value
          </span>
          <p className="text-xl font-black text-emerald-700 mt-1">
            ${averageOrderValue.toFixed(2)}
          </p>
          <span className="text-[10px] text-gray-500 font-medium">
            Revenue per order
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Peak Day
          </span>
          <p className="text-xl font-black text-amber-700 mt-1 truncate">
            {peakDay ? `Day ${peakDay.day}` : 'None'}
          </p>
          <span className="text-[10px] text-gray-500 font-medium truncate block">
            {peakDay
              ? metric === 'revenue'
                ? `$${peakDay.revenue.toFixed(2)} (${peakDay.ordersCount} orders)`
                : `${peakDay.ordersCount} orders ($${peakDay.revenue.toFixed(2)})`
              : 'No orders recorded'}
          </span>
        </div>
      </div>

      {/* Vertical Bar Chart Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-terracotta" />
            <span>
              {metric === 'revenue' ? 'Daily Revenue Breakdown' : 'Daily Fulfilled Orders Volume'}
            </span>
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            Tap a bar to view day stats
          </span>
        </div>

        {/* Active Day Popover / Detail Banner */}
        {activeDayDetail && (
          <div className="bg-cream/40 border border-cream-dark p-2.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-navy px-2 py-0.5 bg-white rounded-md border border-amber-200">
                Day {activeDayDetail.day}
              </span>
              <span className="font-bold text-gray-800">
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
              className="text-gray-400 hover:text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded"
            >
              Clear
            </button>
          </div>
        )}

        {/* Chart Viewport */}
        <div className="relative pt-4 pb-2">
          {/* Main Chart Area */}
          <div className="flex">
            {/* Y-axis Labels Column */}
            <div className="flex flex-col justify-between text-[10px] font-bold text-gray-400 pr-2 select-none h-56 text-right w-11 shrink-0">
              {yTicks.map((tick, i) => (
                <span key={i} className="leading-none">
                  {metric === 'revenue' ? `$${tick}` : tick}
                </span>
              ))}
            </div>

            {/* Bars Area with horizontal grid lines */}
            <div className="relative flex-1 h-56 border-b border-l border-gray-200 overflow-x-auto">
              {/* Horizontal gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-t border-gray-100" />
                <div className="w-full border-t border-gray-100" />
                <div className="w-full border-t border-gray-100" />
                <div className="w-full border-t border-transparent" />
              </div>

              {/* Bars Row */}
              <div
                className="relative h-full flex items-end justify-between px-1"
                style={{ minWidth: `${daysInMonth * 22}px` }}
              >
                {dailyStats.map((item) => {
                  const val = metric === 'revenue' ? item.revenue : item.ordersCount;
                  const heightPercent = chartMax > 0 ? (val / chartMax) * 100 : 0;
                  const isSelected = selectedDay === item.day;
                  const hasValue = val > 0;

                  return (
                    <div
                      key={item.day}
                      onClick={() => setSelectedDay(item.day === selectedDay ? null : item.day)}
                      className="group flex-1 flex flex-col items-center justify-end h-full cursor-pointer px-0.5 relative"
                      title={`Day ${item.day}: $${item.revenue.toFixed(2)} (${item.ordersCount} orders)`}
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-10 transition-opacity">
                        {metric === 'revenue' ? `$${item.revenue.toFixed(2)}` : `${item.ordersCount} orders`}
                      </div>

                      {/* Bar Pillar */}
                      <div
                        className={`w-full max-w-[14px] rounded-t-sm transition-all duration-200 ${
                          isSelected
                            ? 'bg-amber-500 ring-2 ring-amber-300'
                            : hasValue
                            ? metric === 'revenue'
                              ? 'bg-terracotta hover:bg-terracotta-dark'
                              : 'bg-navy hover:bg-navy-light'
                            : 'bg-gray-200/80 hover:bg-gray-300'
                        }`}
                        style={{
                          height: hasValue ? `${Math.max(6, Math.min(100, heightPercent))}%` : '3px',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* X-axis Single Digit Date Labels */}
          <div className="flex pl-11 overflow-x-auto">
            <div
              className="flex justify-between w-full px-1 pt-1.5"
              style={{ minWidth: `${daysInMonth * 22}px` }}
            >
              {dailyStats.map((item) => {
                const isSelected = selectedDay === item.day;
                return (
                  <button
                    key={item.day}
                    type="button"
                    onClick={() => setSelectedDay(item.day === selectedDay ? null : item.day)}
                    className={`flex-1 text-center text-[10px] font-bold transition-colors ${
                      isSelected
                        ? 'text-terracotta font-black scale-110'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {item.day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-xs ${
                  metric === 'revenue' ? 'bg-terracotta' : 'bg-navy'
                }`}
              />
              <span className="font-medium">
                {metric === 'revenue' ? 'Daily Revenue ($)' : 'Fulfilled Orders Count'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-gray-200" />
              <span className="font-medium">Zero activity</span>
            </div>
          </div>

          <span className="text-[10px] text-gray-400">
            {formatMonthName(selectedMonth)} • {daysInMonth} days
          </span>
        </div>
      </div>
    </div>
  );
};
