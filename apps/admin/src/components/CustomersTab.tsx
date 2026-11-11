import { useState, useEffect } from 'react';
import { Users, Search, Award, ShoppingBag, Clock, PlusCircle } from 'lucide-react';
import { api, UserProfile } from '@nyopasta/shared';

interface CustomersTabProps {
  onSelectCustomerForCredit?: (userId: string) => void;
}

export function CustomersTab({ onSelectCustomerForCredit }: CustomersTabProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
      if (all && all.length > 0) {
        setProfiles(all);
      } else {
        // Starter sample profiles if none exist
        const sample1 = await api.getUserProfile('usr_tan_ah_kow');
        await api.updateUserStamps('usr_tan_ah_kow', 5, {
          type: 'order',
          description: 'Purchased 2 Mains',
          stamps: 2,
        });
        sample1.name = 'Tan Ah Kow';
        sample1.phone = '91234567';
        sample1.lastOrderSummary = '1x Prawn Cream Pasta, 1x Carbonara';
        sample1.lastOrderDate = new Date(Date.now() - 3600000 * 24).toISOString();
        sample1.totalOrdersCount = 3;

        const sample2 = await api.getUserProfile('usr_emily_lim');
        await api.updateUserStamps('usr_emily_lim', 10, {
          type: 'manual_migration',
          description: 'Physical card transfer',
          stamps: 8,
        });
        sample2.name = 'Emily Lim';
        sample2.phone = '98765432';
        sample2.lastOrderSummary = '1x Burrata Pasta, 1x Truffle Fries';
        sample2.lastOrderDate = new Date(Date.now() - 3600000 * 3).toISOString();
        sample2.totalOrdersCount = 6;

        setProfiles([sample1, sample2]);
      }
    } catch (err) {
      console.warn('Error loading customer profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-terracotta" />
            Customer Loyalty & Analytics
          </h2>
          <p className="text-xs text-gray-500">
            View member profiles, stamp balances, and recent ordering behavior.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, phone, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-xl pl-9 pr-3 py-2 bg-white focus:outline-none focus:border-terracotta shadow-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-400 border">
          Loading customer records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-500 border">
          No customer records match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs hover:border-terracotta/40 transition-colors space-y-3"
            >
              {/* Member Summary Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">{profile.name || 'Member'}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                    {profile.phone && <span>{profile.phone}</span>}
                    {profile.email && <span>{profile.email}</span>}
                    <span className="font-mono text-gray-400">#{profile.authUserId || profile.id}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full border border-amber-200">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    {profile.currentStampCount} / 12 Stamps
                  </span>
                  {profile.completedCardsCount > 0 && (
                    <span className="block text-[10px] text-gray-400 font-bold mt-0.5">
                      {profile.completedCardsCount} card(s) completed
                    </span>
                  )}
                </div>
              </div>

              {/* Order Stats */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-2.5 text-xs border border-gray-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Orders</span>
                  <p className="font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                    {profile.totalOrdersCount || 0}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Last Active</span>
                  <p className="font-semibold text-gray-700 flex items-center gap-1 mt-0.5 truncate text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {profile.lastOrderDate ? new Date(profile.lastOrderDate).toLocaleDateString() : 'Active'}
                  </p>
                </div>
              </div>

              {/* Last Order Summary if present */}
              {profile.lastOrderSummary && (
                <div className="text-[11px] text-gray-500 bg-cream/30 p-2 rounded-lg border border-cream-dark">
                  <span className="font-bold text-navy">Most Recent Order:</span> {profile.lastOrderSummary}
                </div>
              )}

              {/* Quick Action Button */}
              {onSelectCustomerForCredit && (
                <button
                  type="button"
                  onClick={() => onSelectCustomerForCredit(profile.authUserId || profile.id)}
                  className="w-full text-xs font-bold text-navy hover:text-terracotta bg-gray-100 hover:bg-cream py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Credit Stamps to this Member
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
