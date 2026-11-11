import React, { useState } from 'react';
import { QrCode, Sparkles, History } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface LoyaltyCardProps {
  onOpenQrModal: () => void;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ onOpenQrModal }) => {
  const {
    profile,
    updateStampsDelta,
    redeemMilestoneDirect,
    resetLoyaltyCard,
    isGuest,
    setCustomerInfo,
    customerName,
    customerContact,
  } = useCart();

  const [showHistory, setShowHistory] = useState(false);
  const currentStamps = profile.currentStampCount;
  const milestones = profile.milestoneRedemptions;

  // 12 spots in total: spots 1 to 12
  const spots = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Guest Mode Notice if applicable */}
      {isGuest && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-center justify-between">
          <div>
            <p className="font-bold">You are currently ordering as a Guest.</p>
            <p className="text-[11px] text-amber-800">Switch to Member mode to collect stamps and redeem rewards!</p>
          </div>
          <button
            onClick={() => setCustomerInfo(customerName, customerContact, false)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shrink-0"
          >
            Join / Login
          </button>
        </div>
      )}

      {/* Main Loyalty Card Container matching references/loyalty card.jpg */}
      <div className="bg-gradient-to-b from-[#FFFDF9] to-[#FBF6EC] border-2 border-[#EADFCB] rounded-3xl p-5 shadow-lg relative overflow-hidden">
        {/* Subtle decorative background watermarks */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-terracotta/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-pasta-gold/10 rounded-full pointer-events-none" />

        {/* Card Header */}
        <div className="text-center relative z-10 pb-4 border-b border-[#E8DEC9]">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/logo.jpg" alt="NYO Pasta" className="w-8 h-8 rounded-full border border-terracotta object-cover" />
            <h2 className="text-xl font-black text-terracotta tracking-wider">NYO PASTA</h2>
          </div>
          <p className="text-[11px] font-bold text-navy/70 tracking-wide uppercase">
            Toa Payoh Palm Spring #01-54
          </p>
          <p className="text-xs font-black text-navy mt-1 tracking-tight">
            Collect a stamp for every main purchased!
          </p>
          <p className="text-[11px] text-terracotta font-semibold">
            每购买一份主食即可获得一个印章
          </p>

          <div className="mt-2 inline-flex items-center gap-2 bg-cream px-3 py-1 rounded-full border border-cream-dark">
            <span className="text-[11px] font-bold text-navy">Member: {profile.name}</span>
            <span className="text-[10px] font-mono text-navy/50">({profile.authUserId})</span>
          </div>
        </div>

        {/* 12-Stamp Grid: 3 rows x 4 columns */}
        <div className="py-5 relative z-10">
          <div className="grid grid-cols-4 gap-3 max-w-[340px] mx-auto">
            {spots.map((spotNum) => {
              const isStamped = currentStamps >= spotNum;
              const isMilestone4 = spotNum === 4;
              const isMilestone8 = spotNum === 8;
              const isMilestone12 = spotNum === 12;
              const isMilestone = isMilestone4 || isMilestone8 || isMilestone12;

              let isRedeemed = false;
              let rewardLabel = '';
              let rewardChinese = '';

              if (isMilestone4) {
                isRedeemed = milestones.stamp4;
                rewardLabel = '$3.50';
                rewardChinese = 'Side';
              } else if (isMilestone8) {
                isRedeemed = milestones.stamp8;
                rewardLabel = '$4.50';
                rewardChinese = 'Side';
              } else if (isMilestone12) {
                isRedeemed = milestones.stamp12;
                rewardLabel = '$8.50';
                rewardChinese = 'Main';
              }

              return (
                <div
                  key={spotNum}
                  className="aspect-square relative flex items-center justify-center"
                >
                  {/* Outer circle spot */}
                  <div
                    className={`w-full h-full rounded-full flex flex-col items-center justify-center relative overflow-hidden transition-all shadow-xs ${
                      isMilestone
                        ? isRedeemed
                          ? 'border-2 border-red-400 bg-red-50/40'
                          : isStamped
                          ? 'border-2 border-pasta-gold bg-amber-50/60 ring-2 ring-pasta-gold/30'
                          : 'border-2 border-dashed border-pasta-gold/80 bg-amber-50/30'
                        : isStamped
                        ? 'border-2 border-navy/40 bg-white'
                        : 'border-2 border-dashed border-[#D6C7B2] bg-white/70'
                    }`}
                  >
                    {/* If stamped: show the circular dark blue monochrome stamp */}
                    {isStamped && (
                      <img
                        src="/stamp-darkblue.png"
                        alt={`Stamp ${spotNum}`}
                        className={`absolute inset-0 w-full h-full object-cover p-0.5 filter drop-shadow-xs transition-transform duration-300 ${
                          isRedeemed ? 'opacity-30' : 'opacity-95'
                        }`}
                      />
                    )}

                    {/* Content when NOT stamped */}
                    {!isStamped && (
                      <>
                        {isMilestone ? (
                          <div className="text-center p-0.5 leading-none">
                            <span className="block font-black text-xs text-terracotta leading-none">
                              {rewardLabel}
                            </span>
                            <span className="block font-bold text-[9px] text-navy/80 uppercase mt-0.5">
                              {rewardChinese}
                            </span>
                          </div>
                        ) : (
                          <span className="font-extrabold text-xs text-navy/50">
                            {spotNum}
                          </span>
                        )}
                      </>
                    )}

                    {/* REDEEMED overlay stamp when claimed milestone */}
                    {isRedeemed && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="transform -rotate-12 bg-red-600/90 text-white font-black text-[9px] uppercase px-1.5 py-0.5 rounded border border-white shadow-md tracking-wider text-center leading-tight">
                          REDEEMED
                          <span className="block text-[7px] font-bold">已兑换</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Corner indicator badge for milestone rewards */}
                  {isMilestone && !isRedeemed && isStamped && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pasta-gold text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-xs">
                      ★
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Terms & Rules matching physical card */}
        <div className="pt-3 border-t border-[#E8DEC9] text-[11px] text-navy/70 space-y-1 relative z-10">
          <p className="flex items-start gap-1">
            <span className="text-terracotta font-bold">•</span>
            <span>Every main purchased will earn you 1 stamp. Not applicable with other promotions.</span>
          </p>
          <p className="flex items-start gap-1">
            <span className="text-terracotta font-bold">•</span>
            <span>Rewards: 4 stamps ($3.50 Side), 8 stamps ($4.50 Side), 12 stamps ($8.50 Main).</span>
          </p>
          <p className="flex items-start gap-1">
            <span className="text-terracotta font-bold">•</span>
            <span>Rewards must be redeemed during purchase. Equal or lower to the value.</span>
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-bold text-terracotta">
            <span>Thanks for supporting NYO Pasta!</span>
            {profile.completedCardsCount > 0 && (
              <span className="bg-terracotta/10 px-2 py-0.5 rounded-full text-[10px] text-terracotta">
                🎉 {profile.completedCardsCount} {profile.completedCardsCount === 1 ? 'Card' : 'Cards'} Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Member QR Code Button for In-Person Cashier Scanning */}
      <div className="bg-white rounded-2xl p-4 border border-cream-dark shadow-xs flex items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-navy">Member Cashier QR</h3>
          <p className="text-xs text-navy/60 mt-0.5">
            Present QR to cashier to migrate physical stamps or scan at counter.
          </p>
        </div>

        <button
          onClick={onOpenQrModal}
          className="bg-navy hover:bg-navy-900 active:scale-95 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-transform"
        >
          <QrCode className="w-4 h-4 text-pasta-gold" />
          <span>Show QR</span>
        </button>
      </div>

      {/* Unlocked Rewards Action Section */}
      {(!milestones.stamp4 && currentStamps >= 4) ||
      (!milestones.stamp8 && currentStamps >= 8) ||
      (!milestones.stamp12 && currentStamps >= 12) ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Unlocked Milestone Rewards Ready to Claim</span>
          </div>

          <div className="space-y-1.5">
            {!milestones.stamp4 && currentStamps >= 4 && (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                <span className="font-bold text-xs text-navy">
                  Stamp 4 Reward: $3.50 Side (价值 $3.50 小菜)
                </span>
                <button
                  onClick={() => redeemMilestoneDirect(4)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg"
                >
                  Mark Redeemed
                </button>
              </div>
            )}

            {!milestones.stamp8 && currentStamps >= 8 && (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                <span className="font-bold text-xs text-navy">
                  Stamp 8 Reward: $4.50 Side (价值 $4.50 小菜)
                </span>
                <button
                  onClick={() => redeemMilestoneDirect(8)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg"
                >
                  Mark Redeemed
                </button>
              </div>
            )}

            {!milestones.stamp12 && currentStamps >= 12 && (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                <span className="font-bold text-xs text-navy">
                  Stamp 12 Reward: $8.50 Main (价值 $8.50 主食)
                </span>
                <button
                  onClick={() => redeemMilestoneDirect(12)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1 rounded-lg"
                >
                  Mark Redeemed
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Stamp Activity History Toggle */}
      <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden shadow-xs">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-3 flex items-center justify-between text-xs font-bold text-navy hover:bg-cream-light"
        >
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-terracotta" />
            Stamp History & Activity Log ({profile.stampHistory.length})
          </span>
          <span className="text-[11px] text-terracotta font-semibold">
            {showHistory ? 'Hide' : 'View'}
          </span>
        </button>

        {showHistory && (
          <div className="p-3 pt-0 border-t border-cream-dark/50 space-y-2">
            {profile.stampHistory.length === 0 ? (
              <p className="text-[11px] text-navy/50 py-2 text-center">No stamp activity recorded yet.</p>
            ) : (
              profile.stampHistory.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2 rounded-xl bg-cream-light border border-cream-dark/60 flex items-center justify-between text-[11px]"
                >
                  <div>
                    <p className="font-bold text-navy">{evt.description}</p>
                    <p className="text-[10px] text-navy/50">
                      {new Date(evt.timestamp).toLocaleString('en-SG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black ${
                        evt.stamps > 0 ? 'text-emerald-700' : 'text-navy/70'
                      }`}
                    >
                      {evt.stamps > 0 ? `+${evt.stamps}` : evt.stamps === 0 ? 'Redeemed' : evt.stamps}
                    </span>
                    <span className="block text-[9px] text-navy/50">Bal: {evt.balanceAfter}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Development & Demo Simulation Controls */}
      <div className="bg-cream-light rounded-2xl p-3 border border-cream-dark/70 space-y-2">
        <p className="text-[10px] uppercase font-extrabold text-navy/60 tracking-wider">
          Testing & Cashier Simulation Controls
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => updateStampsDelta(1, 'Simulated +1 main purchase')}
            className="px-2.5 py-1 bg-white border border-cream-dark rounded-lg text-[11px] font-bold text-navy hover:bg-cream"
          >
            +1 Stamp
          </button>
          <button
            onClick={() => updateStampsDelta(3, 'Simulated +3 mains purchase')}
            className="px-2.5 py-1 bg-white border border-cream-dark rounded-lg text-[11px] font-bold text-navy hover:bg-cream"
          >
            +3 Stamps
          </button>
          <button
            onClick={() => redeemMilestoneDirect(4)}
            className="px-2.5 py-1 bg-white border border-cream-dark rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50"
          >
            Redeem 4
          </button>
          <button
            onClick={() => redeemMilestoneDirect(8)}
            className="px-2.5 py-1 bg-white border border-cream-dark rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50"
          >
            Redeem 8
          </button>
          <button
            onClick={() => redeemMilestoneDirect(12)}
            className="px-2.5 py-1 bg-white border border-cream-dark rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50"
          >
            Redeem 12
          </button>
          <button
            onClick={resetLoyaltyCard}
            className="px-2.5 py-1 bg-white border border-cream-dark rounded-lg text-[11px] font-bold text-navy/50 hover:text-red-500"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
