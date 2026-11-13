import { UserProfile } from '../types/index.js';

export type MilestoneNumber = 4 | 8 | 12;

export function voucherCountForMilestone(
  profile: Pick<UserProfile, 'voucherSide350Count' | 'voucherSide450Count' | 'voucherMeal850Count'>,
  milestone: MilestoneNumber
): number {
  const count =
    milestone === 4
      ? profile.voucherSide350Count
      : milestone === 8
      ? profile.voucherSide450Count
      : profile.voucherMeal850Count;
  return count || 0;
}

// A milestone slot only reads as REDEEMED once the stamp is reached AND the
// wallet no longer holds a voucher for it, so a fresh milestone never shows as claimed.
export function isMilestoneRedeemed(
  profile: Pick<UserProfile, 'currentStampCount' | 'voucherSide350Count' | 'voucherSide450Count' | 'voucherMeal850Count'>,
  milestone: MilestoneNumber
): boolean {
  return profile.currentStampCount >= milestone && voucherCountForMilestone(profile, milestone) === 0;
}
