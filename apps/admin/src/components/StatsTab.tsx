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

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const StatsTab: React.FC<StatsTabProps> = ({ orders }) => {
  // Available months & years extracted from order history plus current date
  const { availableMonths, availableYears } = useMemo(() => {
    const monthsSet = new Set<string>();
    const yearsSet = new Set<number>();
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthKey);
    yearsSet.add(now.getFullYear());

    for (const o of orders) {
      if (o.createdAt) {
        const d = new Date(o.createdAt);
        if (!isNaN(d.getTime())) {
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthsSet.add(mKey);
          yearsSet.add(d.getFullYear());
        }
      }
    }

    return {
      availableMonths: Array.from(monthsSet).sort().reverse(),
      availableYears: Array.from(yearsSet).sort((a, b) => b - a),
    };
  }, [orders]);

  // Monthly State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => availableMonths[0] || '');
  const [monthlyMetric, setMonthlyMetric] = useState<'revenue' | 'orders'>('revenue');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Yearly State
  const [selectedYear, setSelectedYear] = useState<number>(() => availableYears[0] || new Date().getFullYear());
  const [yearlyMetric, setYearlyMetric] = useState<'revenue' | 'orders'>('revenue');
  const [selectedYearMonth, setSelectedYearMonth] = useState<number | null>(null);

  // -------------------------------------------------------------
  // 1. MONTHLY CALCULATIONS
  // -------------------------------------------------------------
  const { year: mYear, month: mMonth } = useMemo(() => {
    if (!selectedMonth) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    const [yStr, mStr] = selectedMonth.split('-');
    return { year: parseInt(yStr, 10), month: parseInt(mStr, 10) };
  }, [selectedMonth]);

  const daysInMonth = useMemo(() => {
    return new Date(mYear, mMonth, 0).getDate();
  }, [mYear, mMonth]);

  const monthOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== mYear || d.getMonth() + 1 !== mMonth) return false;
      if (o.fulfillmentStatus === 'cancelled' && o.paymentStatus !== 'paid') return false;
      return o.fulfillmentStatus === 'fulfilled' || o.fulfillmentStatus === 'archived' || o.paymentStatus === 'paid';
    });
  }, [orders, mYear, mMonth]);

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

  const totalMonthRevenue = useMemo(() => {
    return monthOrders.reduce((sum, o) => sum + o.total, 0);
  }, [monthOrders]);

  const totalMonthOrders = monthOrders.length;

  const averageMonthOrderValue = useMemo(() => {
    return totalMonthOrders > 0 ? totalMonthRevenue / totalMonthOrders : 0;
  }, [totalMonthRevenue, totalMonthOrders]);

  const peakDay = useMemo(() => {
    if (dailyStats.length === 0) return null;
    let maxEntry = dailyStats[0];
    for (const entry of dailyStats) {
      const val = monthlyMetric === 'revenue' ? entry.revenue : entry.ordersCount;
      const maxVal = monthlyMetric === 'revenue' ? maxEntry.revenue : maxEntry.ordersCount;
      if (val > maxVal) maxEntry = entry;
    }
    const val = monthlyMetric === 'revenue' ? maxEntry.revenue : maxEntry.ordersCount;
    return val > 0 ? maxEntry : null;
  }, [dailyStats, monthlyMetric]);

  const monthlyChartMax = useMemo(() => {
    const values = dailyStats.map((d) => (monthlyMetric === 'revenue' ? d.revenue : d.ordersCount));
    const rawMax = Math.max(...values, 0);
    if (rawMax === 0) return monthlyMetric === 'revenue' ? 100 : 10;
    if (monthlyMetric === 'revenue') {
      const step = rawMax > 500 ? 100 : rawMax > 200 ? 50 : 25;
      return Math.ceil((rawMax * 1.15) / step) * step;
    } else {
      const step = rawMax > 50 ? 10 : rawMax > 20 ? 5 : 2;
      return Math.ceil((rawMax * 1.2) / step) * step;
    }
  }, [dailyStats, monthlyMetric]);

  const monthlyYTicks = useMemo(() => {
    return [monthlyChartMax, Math.round(monthlyChartMax / 2), 0];
  }, [monthlyChartMax]);

  // -------------------------------------------------------------
  // 2. YEARLY CALCULATIONS
  // -------------------------------------------------------------
  const yearOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== selectedYear) return false;
      if (o.fulfillmentStatus === 'cancelled' && o.paymentStatus !== 'paid') return false;
      return o.fulfillmentStatus === 'fulfilled' || o.fulfillmentStatus === 'archived' || o.paymentStatus === 'paid';
    });
  }, [orders, selectedYear]);

  const monthlyBreakdownInYear = useMemo(() => {
    const map = new Map<number, { monthNum: number; name: string; revenue: number; ordersCount: number }>();
    for (let m = 1; m <= 12; m++) {
      map.set(m, { monthNum: m, name: MONTH_NAMES_SHORT[m - 1], revenue: 0, ordersCount: 0 });
    }
    for (const o of yearOrders) {
      const mNum = new Date(o.createdAt).getMonth() + 1;
      const entry = map.get(mNum);
      if (entry) {
        entry.revenue += o.total;
        entry.ordersCount += 1;
      }
    }
    return Array.from(map.values());
  }, [yearOrders]);

  const totalYearRevenue = useMemo(() => {
    return yearOrders.reduce((sum, o) => sum + o.total, 0);
  }, [yearOrders]);

  const totalYearOrders = yearOrders.length;

  const averageYearOrderValue = useMemo(() => {
    return totalYearOrders > 0 ? totalYearRevenue / totalYearOrders : 0;
  }, [totalYearRevenue, totalYearOrders]);

  const peakYearMonth = useMemo(() => {
    if (monthlyBreakdownInYear.length === 0) return null;
    let maxEntry = monthlyBreakdownInYear[0];
    for (const entry of monthlyBreakdownInYear) {
      const val = yearlyMetric === 'revenue' ? entry.revenue : entry.ordersCount;
      const maxVal = yearlyMetric === 'revenue' ? maxEntry.revenue : maxEntry.ordersCount;
      if (val > maxVal) maxEntry = entry;
    }
    const val = yearlyMetric === 'revenue' ? maxEntry.revenue : maxEntry.ordersCount;
    return val > 0 ? maxEntry : null;
  }, [monthlyBreakdownInYear, yearlyMetric]);

  const yearlyChartMax = useMemo(() => {
    const values = monthlyBreakdownInYear.map((m) => (yearlyMetric === 'revenue' ? m.revenue : m.ordersCount));
    const rawMax = Math.max(...values, 0);
    if (rawMax === 0) return yearlyMetric === 'revenue' ? 1000 : 50;
    if (yearlyMetric === 'revenue') {
      const step = rawMax > 5000 ? 1000 : rawMax > 1000 ? 500 : 100;
      return Math.ceil((rawMax * 1.15) / step) * step;
    } else {
      const step = rawMax > 200 ? 50 : rawMax > 50 ? 20 : 5;
      return Math.ceil((rawMax * 1.2) / step) * step;
    }
  }, [monthlyBreakdownInYear, yearlyMetric]);

  const yearlyYTicks = useMemo(() => {
    return [yearlyChartMax, Math.round(yearlyChartMax / 2), 0];
  }, [yearlyChartMax]);

  const formatMonthName = (key: string) => {
    const [yStr, mStr] = key.split('-');
    const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return d.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
  };

  const activeDayDetail = selectedDay ? dailyStats.find((d) => d.day === selectedDay) : null;
  const activeYearMonthDetail = selectedYearMonth ? monthlyBreakdownInYear.find((m) => m.monthNum === selectedYearMonth) : null;

  return (
    <div className="space-y-1.5 pb-2">
      {/* ========================================================= */}
      {/* 1. MONTHLY DAILY PERFORMANCE SECTION                      */}
      {/* ========================================================= */}
      <div className="space-y-1 bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
        {/* Controls: Month Dropdown & Metric Toggle */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-terracotta shrink-0" />
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedDay(null);
                }}
                className="text-[11px] font-bold pl-2 pr-5 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md appearance-none focus:outline-none focus:border-terracotta cursor-pointer transition-colors"
              >
                {availableMonths.map((mKey) => (
                  <option key={mKey} value={mKey}>
                    {formatMonthName(mKey)}
                  </option>
                ))}
              </select>
              <Calendar className="w-2.5 h-2.5 text-gray-500 absolute right-1.5 top-1.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center bg-gray-100 p-0.5 rounded-md border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setMonthlyMetric('revenue');
                setSelectedDay(null);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 ${
                monthlyMetric === 'revenue'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-2.5 h-2.5 text-terracotta" />
              Rev
            </button>
            <button
              type="button"
              onClick={() => {
                setMonthlyMetric('orders');
                setSelectedDay(null);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 ${
                monthlyMetric === 'orders'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-2.5 h-2.5 text-navy" />
              Qty
            </button>
          </div>
        </div>

        {/* 4 KPI Cards: Monthly */}
        <div className="grid grid-cols-4 gap-1">
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Rev
            </span>
            <p className="text-xs font-black text-terracotta leading-tight truncate">
              ${totalMonthRevenue.toFixed(0)}
            </p>
          </div>
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Orders
            </span>
            <p className="text-xs font-black text-navy leading-tight truncate">
              {totalMonthOrders}
            </p>
          </div>
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Avg Order
            </span>
            <p className="text-xs font-black text-emerald-700 leading-tight truncate">
              ${averageMonthOrderValue.toFixed(1)}
            </p>
          </div>
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Peak Day
            </span>
            <p className="text-xs font-black text-amber-700 leading-tight truncate">
              {peakDay ? `Day ${peakDay.day}` : '-'}
            </p>
          </div>
        </div>

        {/* Monthly Active Day Banner */}
        {activeDayDetail && (
          <div className="bg-cream/40 border border-cream-dark px-1.5 py-0.5 rounded flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-navy px-1 py-0.2 bg-white rounded border border-amber-200 text-[9px]">
                Day {activeDayDetail.day}
              </span>
              <span className="font-bold text-gray-900">${activeDayDetail.revenue.toFixed(2)}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{activeDayDetail.ordersCount} orders</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-gray-400 hover:text-gray-600 font-bold px-1 text-[9px]"
            >
              Clear
            </button>
          </div>
        )}

        {/* Monthly Chart (30/31 days across 100% width) */}
        <div className="flex pt-1">
          <div className="flex flex-col justify-between text-[7px] font-bold text-gray-400 select-none h-28 text-right w-6 shrink-0 pr-1 pb-3.5">
            {monthlyYTicks.map((tick, i) => (
              <span key={i} className="leading-none">
                {monthlyMetric === 'revenue' ? `$${tick}` : tick}
              </span>
            ))}
          </div>

          <div className="relative flex-1 h-28 border-b border-l border-gray-200 flex flex-col justify-between">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-3.5">
              <div className="w-full border-t border-gray-100" />
              <div className="w-full border-t border-gray-100" />
              <div className="w-full border-t border-transparent" />
            </div>

            <div className="relative w-full h-full flex items-end justify-between px-0.5">
              {dailyStats.map((item) => {
                const val = monthlyMetric === 'revenue' ? item.revenue : item.ordersCount;
                const heightPercent = monthlyChartMax > 0 ? (val / monthlyChartMax) * 100 : 0;
                const isSelected = selectedDay === item.day;
                const hasValue = val > 0;

                return (
                  <div
                    key={item.day}
                    onClick={() => setSelectedDay(item.day === selectedDay ? null : item.day)}
                    className="flex-1 min-w-0 flex flex-col items-center justify-end h-full cursor-pointer group"
                    title={`Day ${item.day}: $${item.revenue.toFixed(2)} (${item.ordersCount} orders)`}
                  >
                    <div className="w-full flex-1 flex items-end justify-center pb-0.5">
                      <div
                        className={`w-full max-w-[5px] sm:max-w-[7px] rounded-t-xs transition-all duration-150 ${
                          isSelected
                            ? 'bg-amber-500 ring-1 ring-amber-300'
                            : hasValue
                            ? monthlyMetric === 'revenue'
                              ? 'bg-terracotta hover:bg-terracotta-dark'
                              : 'bg-navy hover:bg-navy-light'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        style={{
                          height: hasValue ? `${Math.max(8, Math.min(100, heightPercent))}%` : '2px',
                        }}
                      />
                    </div>
                    <span
                      className={`text-[7px] font-bold leading-none select-none text-center block pt-0.5 ${
                        isSelected ? 'text-terracotta font-black scale-110' : 'text-gray-400 group-hover:text-gray-700'
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

      {/* ========================================================= */}
      {/* 2. YEARLY MONTHLY PERFORMANCE SECTION                      */}
      {/* ========================================================= */}
      <div className="space-y-1 bg-white p-2 rounded-xl border border-gray-200 shadow-2xs">
        {/* Controls: Year Dropdown & Metric Toggle */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-navy shrink-0" />
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value, 10));
                  setSelectedYearMonth(null);
                }}
                className="text-[11px] font-bold pl-2 pr-5 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md appearance-none focus:outline-none focus:border-navy cursor-pointer transition-colors"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
              <Calendar className="w-2.5 h-2.5 text-gray-500 absolute right-1.5 top-1.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center bg-gray-100 p-0.5 rounded-md border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setYearlyMetric('revenue');
                setSelectedYearMonth(null);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 ${
                yearlyMetric === 'revenue'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <DollarSign className="w-2.5 h-2.5 text-terracotta" />
              Rev
            </button>
            <button
              type="button"
              onClick={() => {
                setYearlyMetric('orders');
                setSelectedYearMonth(null);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-0.5 ${
                yearlyMetric === 'orders'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-2.5 h-2.5 text-navy" />
              Qty
            </button>
          </div>
        </div>

        {/* 4 KPI Cards: Yearly */}
        <div className="grid grid-cols-4 gap-1">
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Year Rev
            </span>
            <p className="text-xs font-black text-terracotta leading-tight truncate">
              ${totalYearRevenue.toFixed(0)}
            </p>
          </div>
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Year Orders
            </span>
            <p className="text-xs font-black text-navy leading-tight truncate">
              {totalYearOrders}
            </p>
          </div>
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Avg Order
            </span>
            <p className="text-xs font-black text-emerald-700 leading-tight truncate">
              ${averageYearOrderValue.toFixed(1)}
            </p>
          </div>
          <div className="bg-gray-50 px-1.5 py-1 rounded-lg border border-gray-100">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block truncate">
              Peak Month
            </span>
            <p className="text-xs font-black text-amber-700 leading-tight truncate">
              {peakYearMonth ? peakYearMonth.name : '-'}
            </p>
          </div>
        </div>

        {/* Yearly Active Month Banner */}
        {activeYearMonthDetail && (
          <div className="bg-cream/40 border border-cream-dark px-1.5 py-0.5 rounded flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-navy px-1 py-0.2 bg-white rounded border border-amber-200 text-[9px]">
                {activeYearMonthDetail.name}
              </span>
              <span className="font-bold text-gray-900">${activeYearMonthDetail.revenue.toFixed(2)}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{activeYearMonthDetail.ordersCount} orders</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedYearMonth(null)}
              className="text-gray-400 hover:text-gray-600 font-bold px-1 text-[9px]"
            >
              Clear
            </button>
          </div>
        )}

        {/* Yearly Chart (12 months across 100% width) */}
        <div className="flex pt-1">
          <div className="flex flex-col justify-between text-[7px] font-bold text-gray-400 select-none h-28 text-right w-6 shrink-0 pr-1 pb-3.5">
            {yearlyYTicks.map((tick, i) => (
              <span key={i} className="leading-none">
                {yearlyMetric === 'revenue' ? `$${tick}` : tick}
              </span>
            ))}
          </div>

          <div className="relative flex-1 h-28 border-b border-l border-gray-200 flex flex-col justify-between">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-3.5">
              <div className="w-full border-t border-gray-100" />
              <div className="w-full border-t border-gray-100" />
              <div className="w-full border-t border-transparent" />
            </div>

            <div className="relative w-full h-full flex items-end justify-between px-1">
              {monthlyBreakdownInYear.map((item) => {
                const val = yearlyMetric === 'revenue' ? item.revenue : item.ordersCount;
                const heightPercent = yearlyChartMax > 0 ? (val / yearlyChartMax) * 100 : 0;
                const isSelected = selectedYearMonth === item.monthNum;
                const hasValue = val > 0;

                return (
                  <div
                    key={item.monthNum}
                    onClick={() => setSelectedYearMonth(item.monthNum === selectedYearMonth ? null : item.monthNum)}
                    className="flex-1 min-w-0 flex flex-col items-center justify-end h-full cursor-pointer group"
                    title={`${item.name}: $${item.revenue.toFixed(2)} (${item.ordersCount} orders)`}
                  >
                    <div className="w-full flex-1 flex items-end justify-center pb-0.5">
                      <div
                        className={`w-full max-w-[12px] sm:max-w-[18px] rounded-t-xs transition-all duration-150 ${
                          isSelected
                            ? 'bg-amber-500 ring-1 ring-amber-300'
                            : hasValue
                            ? yearlyMetric === 'revenue'
                              ? 'bg-terracotta hover:bg-terracotta-dark'
                              : 'bg-navy hover:bg-navy-light'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        style={{
                          height: hasValue ? `${Math.max(8, Math.min(100, heightPercent))}%` : '2px',
                        }}
                      />
                    </div>
                    <span
                      className={`text-[8px] font-bold leading-none select-none text-center block pt-0.5 ${
                        isSelected ? 'text-terracotta font-black scale-110' : 'text-gray-400 group-hover:text-gray-700'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
