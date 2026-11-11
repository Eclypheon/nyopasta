import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Search,
  Award,
  ShoppingBag,
  Clock,
  PlusCircle,
  Ban,
  Ticket,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  Phone,
  Mail,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { api, UserProfile, Order } from '@nyopasta/shared';

interface CustomersTabProps {
  orders?: Order[];
  onSelectCustomerForCredit?: (userId: string) => void;
}

export function CustomersTab({ orders = [], onSelectCustomerForCredit }: CustomersTabProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [longPressUser, setLongPressUser] = useState<UserProfile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Long press timer refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    loadCustomers();
    const unsubOrders = api.subscribeToOrders(() => {
      loadCustomers();
    });
    return () => unsubOrders();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const all = await api.getAllProfiles();
      setProfiles(all || []);
    } catch (err) {
      console.warn('Error loading customer profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblacklist = async (userId: string) => {
    try {
      await api.unblacklistCustomer(userId);
      await loadCustomers();
    } catch (err) {
      console.error('Error unblacklisting customer:', err);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    const id = user.authUserId || user.id;
    const ok = window.confirm(
      `Are you sure you want to permanently delete customer "${user.name || 'Member'}" (#${id})? This will delete all stamps and records.`
    );
    if (!ok) return;

    try {
      await api.deleteCustomerProfile(id);
      if (expandedUserId === id) setExpandedUserId(null);
      setLongPressUser(null);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to delete customer profile:', err);
    }
  };

  // Long press handlers
  const handleTouchStart = (user: UserProfile) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setLongPressUser(user);
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRowClick = (user: UserProfile) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    const id = user.authUserId || user.id;
    setExpandedUserId((prev) => (prev === id ? null : id));
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pre-calculate revenue & orders lookup per user
  const customerStatsMap = useMemo(() => {
    const map = new Map<string, { totalRevenue: number; totalOrders: number; lastActiveDate: string | null }>();

    for (const p of profiles) {
      const pId = p.authUserId || p.id;
      const userOrders = orders.filter((o) => {
        if (o.customerId && (o.customerId === p.authUserId || o.customerId === p.id)) return true;
        if (p.email && o.customerContact && o.customerContact.toLowerCase() === p.email.toLowerCase()) return true;
        if (p.phone && o.customerContact && o.customerContact.replace(/\D/g, '') === p.phone.replace(/\D/g, '')) return true;
        return false;
      });

      const validOrders = userOrders.filter((o) => o.fulfillmentStatus !== 'cancelled');
      const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
      const totalOrders = Math.max(p.totalOrdersCount || 0, userOrders.length);

      let lastActiveDate: string | null = p.lastOrderDate || null;
      if (userOrders.length > 0) {
        const sorted = [...userOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (sorted[0]?.createdAt) {
          lastActiveDate = sorted[0].createdAt;
        }
      }

      map.set(pId, { totalRevenue, totalOrders, lastActiveDate });
    }

    return map;
  }, [profiles, orders]);

  const filtered = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.authUserId && p.authUserId.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-terracotta" />
            Customer Loyalty & Members Directory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Compact member list. Click to expand details, or hold/long-press row for quick actions.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, phone, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-xl pl-9 pr-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:border-terracotta shadow-xs transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-400 border">
          Loading customer records...
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-500 border space-y-2">
          <Users className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="font-bold text-gray-700">No member accounts registered yet</p>
          <p className="text-gray-400 max-w-sm mx-auto">
            Customers who sign up via the customer app or have physical cards migrated using the scanner will appear here with live statistics.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-500 border">
          No customer records match "{searchQuery}".
        </div>
      ) : (
        /* Compact Users Table */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[620px] sm:min-w-full">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider select-none">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-2 text-center w-20">Total Orders</th>
                  <th className="py-2.5 px-2 text-center w-20">3.5 Sides</th>
                  <th className="py-2.5 px-2 text-center w-20">4.5 Sides</th>
                  <th className="py-2.5 px-2 text-center w-20">8.5 Main</th>
                  <th className="py-2.5 px-3 text-center w-24">Current Stamps</th>
                  <th className="py-2.5 px-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filtered.map((profile) => {
                  const pId = profile.authUserId || profile.id;
                  const isExpanded = expandedUserId === pId;
                  const stats = customerStatsMap.get(pId) || {
                    totalRevenue: 0,
                    totalOrders: profile.totalOrdersCount || 0,
                    lastActiveDate: profile.lastOrderDate || null,
                  };
                  const lifetimeStamps = ((profile.completedCardsCount || 0) * 12) + (profile.currentStampCount || 0);

                  return (
                    <React.Fragment key={profile.id}>
                      {/* Compact Single Row per User */}
                      <tr
                        onClick={() => handleRowClick(profile)}
                        onTouchStart={() => handleTouchStart(profile)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        onMouseDown={() => handleTouchStart(profile)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setLongPressUser(profile);
                        }}
                        className={`transition-colors cursor-pointer select-none ${
                          isExpanded
                            ? 'bg-amber-50/70'
                            : profile.isBlacklisted
                            ? 'bg-rose-50/50 hover:bg-rose-100/50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Column 1: Name */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900 text-xs truncate max-w-[150px] sm:max-w-none">
                              {profile.name || 'Member'}
                            </span>
                            {profile.isBlacklisted && (
                              <span className="inline-flex items-center gap-0.5 bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.2 rounded border border-rose-200">
                                <Ban className="w-2.5 h-2.5 text-rose-600" />
                                Blocked
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Column 2: Total Orders */}
                        <td className="py-2 px-2 text-center text-gray-800 font-bold">
                          {stats.totalOrders}
                        </td>

                        {/* Column 3: 3.5 Sides */}
                        <td className="py-2 px-2 text-center text-gray-700 font-medium">
                          {profile.voucherSide350Count ? (
                            <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[11px]">
                              {profile.voucherSide350Count}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Column 4: 4.5 Sides */}
                        <td className="py-2 px-2 text-center text-gray-700 font-medium">
                          {profile.voucherSide450Count ? (
                            <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[11px]">
                              {profile.voucherSide450Count}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Column 5: 8.5 Main */}
                        <td className="py-2 px-2 text-center text-gray-700 font-medium">
                          {profile.voucherMeal850Count ? (
                            <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[11px]">
                              {profile.voucherMeal850Count}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>

                        {/* Column 6: Current Stamp Count (x/12) */}
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 font-black text-xs px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                            <Award className="w-3 h-3 text-amber-600 shrink-0" />
                            {profile.currentStampCount}/12
                          </span>
                        </td>

                        {/* Column 7: Expand Chevron */}
                        <td className="py-2 px-2 text-center text-gray-400">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 mx-auto text-terracotta" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 mx-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Expandable Details Section (2 Additional Rows) */}
                      {isExpanded && (
                        <tr className="bg-amber-50/30 border-b border-amber-100/60">
                          <td colSpan={7} className="p-3 sm:p-4">
                            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-xs">
                              {/* Expanded Row 1: ID, Phone, Email, Revenue, Lifetime Stamps */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pb-2.5 border-b border-gray-100 text-xs">
                                {/* Unique Member ID */}
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Member ID
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono text-[11px] font-semibold text-gray-800 truncate" title={pId}>
                                      #{pId}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyId(e, pId)}
                                      className="p-1 text-gray-400 hover:text-terracotta rounded transition-colors"
                                      title="Copy Member ID"
                                    >
                                      {copiedId === pId ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Phone Number
                                  </span>
                                  <div className="flex items-center gap-1 text-gray-800 font-medium text-[11px]">
                                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span>{profile.phone || 'None registered'}</span>
                                  </div>
                                </div>

                                {/* Email Address */}
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Email Address
                                  </span>
                                  <div className="flex items-center gap-1 text-gray-800 font-medium text-[11px] truncate">
                                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="truncate" title={profile.email}>{profile.email || 'None'}</span>
                                  </div>
                                </div>

                                {/* Total Revenue */}
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Total Revenue
                                  </span>
                                  <div className="flex items-center gap-0.5 text-terracotta font-black text-xs">
                                    <DollarSign className="w-3 h-3 shrink-0" />
                                    <span>${stats.totalRevenue.toFixed(2)}</span>
                                  </div>
                                </div>

                                {/* Lifetime Stamps */}
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                    Lifetime Stamps
                                  </span>
                                  <div className="text-gray-800 font-bold text-[11px]">
                                    <span>{lifetimeStamps} stamps</span>
                                    {profile.completedCardsCount > 0 && (
                                      <span className="text-gray-400 text-[10px] font-medium block">
                                        ({profile.completedCardsCount} cards completed)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Row 2: Last Active, Most Recent Order, Actions */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                                    <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="font-semibold text-gray-500">Last Active:</span>
                                    <span>
                                      {stats.lastActiveDate
                                        ? new Date(stats.lastActiveDate).toLocaleDateString('en-SG', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : 'Active'}
                                    </span>
                                  </div>

                                  {profile.lastOrderSummary && (
                                    <div className="text-[11px] text-gray-600">
                                      <span className="font-semibold text-gray-500">Recent Order: </span>
                                      <span className="italic">{profile.lastOrderSummary}</span>
                                    </div>
                                  )}

                                  {profile.isBlacklisted && (
                                    <div className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                                      Blacklisted: {profile.blacklistReason || 'Uncollected order'}
                                    </div>
                                  )}
                                </div>

                                {/* Row 2 Quick Actions */}
                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                  {onSelectCustomerForCredit && (
                                    <button
                                      type="button"
                                      onClick={() => onSelectCustomerForCredit(pId)}
                                      className="px-3 py-1.5 bg-terracotta hover:bg-terracotta-dark text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      Credit Stamps
                                    </button>
                                  )}

                                  {profile.isBlacklisted && (
                                    <button
                                      type="button"
                                      onClick={() => handleUnblacklist(pId)}
                                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      Remove Blacklist
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(profile)}
                                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                    title="Delete this member record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete User
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Long Press Action Modal */}
      {longPressUser && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={() => setLongPressUser(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl border border-gray-200 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b pb-2.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Member Actions
              </span>
              <h3 className="font-extrabold text-sm text-gray-900 mt-0.5">
                {longPressUser.name || 'Member'}
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                #{longPressUser.authUserId || longPressUser.id}
              </p>
            </div>

            <div className="space-y-2">
              {onSelectCustomerForCredit && (
                <button
                  type="button"
                  onClick={() => {
                    const id = longPressUser.authUserId || longPressUser.id;
                    setLongPressUser(null);
                    onSelectCustomerForCredit(id);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-terracotta text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-terracotta-dark shadow-xs transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Credit Stamps to this Member
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const target = longPressUser;
                  setLongPressUser(null);
                  handleDeleteUser(target);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Member Profile
              </button>

              <button
                type="button"
                onClick={() => setLongPressUser(null)}
                className="w-full py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
