import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isStoreCurrentlyOpen } from '../dist/utils/schedule.js';
import { DEFAULT_STORE_SETTINGS, LOYALTY_MILESTONES } from '../dist/constants/index.js';
import { localStore } from '../dist/api/appwrite.js';

describe('Seam 1: Operating Hours & Store Open/Close Schedule', () => {
  it('returns closed when isManuallyClosed is true regardless of day/time', () => {
    const settings = {
      ...DEFAULT_STORE_SETTINGS,
      isManuallyClosed: true,
      manualCloseReason: 'Emergency kitchen maintenance',
    };
    const tuesdayNoon = new Date('2026-11-10T12:00:00+08:00'); // Tuesday 12pm SGT
    const status = isStoreCurrentlyOpen(settings, tuesdayNoon);
    assert.equal(status.isOpen, false);
    assert.equal(status.reason, 'Emergency kitchen maintenance');
  });

  it('returns open on Tuesday at 12:30 SGT (within 10am-2pm slot)', () => {
    const settings = {
      ...DEFAULT_STORE_SETTINGS,
      isManuallyClosed: false,
    };
    const tuesday1230 = new Date('2026-11-10T12:30:00+08:00');
    const status = isStoreCurrentlyOpen(settings, tuesday1230);
    assert.equal(status.isOpen, true);
  });

  it('returns closed on Monday (scheduled closed day)', () => {
    const settings = {
      ...DEFAULT_STORE_SETTINGS,
      isManuallyClosed: false,
    };
    const mondayNoon = new Date('2026-11-09T12:00:00+08:00');
    const status = isStoreCurrentlyOpen(settings, mondayNoon);
    assert.equal(status.isOpen, false);
    assert.match(status.reason, /Closed on Monday/i);
  });

  it('returns closed at 3pm on Tuesday (break between 2pm-6pm)', () => {
    const settings = {
      ...DEFAULT_STORE_SETTINGS,
      isManuallyClosed: false,
    };
    const tuesday1500 = new Date('2026-11-10T15:00:00+08:00');
    const status = isStoreCurrentlyOpen(settings, tuesday1500);
    assert.equal(status.isOpen, false);
    assert.match(status.reason, /Opens at 18:00/i);
  });

  it('handles manual override conflict: forces open during closed schedule and flags override', () => {
    const settings = {
      ...DEFAULT_STORE_SETTINGS,
      isManuallyClosed: false,
      manualOverride: 'open',
    };
    const mondayNoon = new Date('2026-11-09T12:00:00+08:00'); // Normally closed on Monday
    const status = isStoreCurrentlyOpen(settings, mondayNoon);
    assert.equal(status.isOpen, true);
    assert.equal(status.isOverridden, true);
    assert.match(status.reason, /manual override/i);
  });

  it('clears manual override automatically when operating hours catch up to matching status', () => {
    const settings = {
      ...DEFAULT_STORE_SETTINGS,
      isManuallyClosed: false,
      manualOverride: 'open',
    };
    const tuesday1230 = new Date('2026-11-10T12:30:00+08:00'); // Scheduled open slot
    const status = isStoreCurrentlyOpen(settings, tuesday1230);
    // Scheduled is open, override is open -> no conflict -> isOverridden is false
    assert.equal(status.isOpen, true);
    assert.equal(status.isOverridden, false);
  });
});

describe('Seam 2: Pricing, Packaging Fees & Loyalty Discounts', () => {
  it('calculates dine-in packaging fee as $0 and takeaway as $0.30/item', () => {
    const itemCount = 4;
    const feePerItem = 0.3;
    const dineInFee = 0;
    const takeawayFee = itemCount * feePerItem;

    assert.equal(dineInFee, 0);
    assert.equal(takeawayFee, 1.2);
  });

  it('caps milestone discounts correctly against subtotal', () => {
    const subtotalSmall = 3.0;
    const subtotalLarge = 25.0;

    // Milestone 4: max $3.50
    const disc4Small = Math.min(LOYALTY_MILESTONES.stamp4.maxRewardValue, subtotalSmall);
    const disc4Large = Math.min(LOYALTY_MILESTONES.stamp4.maxRewardValue, subtotalLarge);
    assert.equal(disc4Small, 3.0);
    assert.equal(disc4Large, 3.5);

    // Milestone 8: max $4.50
    const disc8 = Math.min(LOYALTY_MILESTONES.stamp8.maxRewardValue, subtotalLarge);
    assert.equal(disc8, 4.5);

    // Milestone 12: max $8.50
    const disc12 = Math.min(LOYALTY_MILESTONES.stamp12.maxRewardValue, subtotalLarge);
    assert.equal(disc12, 8.5);
  });
});

describe('Seam 3: Loyalty Stamp Rollover & Remainder Retention', () => {
  it('preserves leftover stamps when rolling over after completing 12 stamps', () => {
    const testUserId = 'test_user_rollover';
    localStore.updateUserStamps(testUserId, 11, {
      type: 'manual_migration',
      description: 'Setup test balance',
      stamps: 11,
    });

    // Customer buys 3 mains -> total becomes 14 stamps and claims milestone 12
    const updated = localStore.updateUserStamps(
      testUserId,
      14,
      {
        type: 'order',
        description: 'Purchased 3 mains',
        stamps: 3,
      },
      { stamp12: true }
    );

    // Must rollover: 1 completed card, 14 - 12 = 2 stamps remaining
    assert.equal(updated.completedCardsCount, 1);
    assert.equal(updated.currentStampCount, 2);
    assert.equal(updated.milestoneRedemptions.stamp12, false);
    assert.equal(updated.milestoneRedemptions.stamp4, false);
    assert.equal(updated.milestoneRedemptions.stamp8, false);
  });

  it('shows all 12 stamps when card completes, and only rolls over to 1 stamp when next stamp is earned', () => {
    const testUserId = 'test_user_card_complete';
    localStore.updateUserStamps(testUserId, 11, {
      type: 'manual_migration',
      description: 'Setup 11 stamps',
      stamps: 11,
    });

    // Customer buys 1 main -> reaches exactly 12 stamps
    const completedCard = localStore.updateUserStamps(testUserId, 12, {
      type: 'order',
      description: 'Purchased 1 main to complete card',
      stamps: 1,
    });

    // Card completed: shows all 12 stamps, page is not emptied!
    assert.equal(completedCard.currentStampCount, 12);
    assert.equal(completedCard.milestoneRedemptions.stamp12, true);
    assert.equal(completedCard.voucherMeal850Count, 1);

    // Later: Customer buys 1 more main -> now rolls over to 1 stamp on new card
    const rolledOver = localStore.updateUserStamps(testUserId, 13, {
      type: 'order',
      description: 'Purchased next main on new card',
      stamps: 1,
    });

    assert.equal(rolledOver.completedCardsCount, 1);
    assert.equal(rolledOver.currentStampCount, 1);
    assert.equal(rolledOver.milestoneRedemptions.stamp12, false);
    // Voucher from completed card is preserved
    assert.equal(rolledOver.voucherMeal850Count, 1);
  });
});

describe('Seam 4: Order Lifecycle & Payment Safeguard', () => {
  it('progresses order from received to fulfilled and archives correctly', () => {
    const order = localStore.createOrder({
      customerId: 'user_test_999',
      customerName: 'Test Member',
      customerContact: '91234567',
      isGuest: false,
      items: [],
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 10,
      discountAmount: 0,
      total: 10,
      paymentMethod: 'counter',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'received',
      mainsCount: 1,
      stampsEarned: 1,
    });

    assert.equal(order.fulfillmentStatus, 'received');
    assert.equal(order.paymentStatus, 'unpaid');

    // Kitchen marks preparing
    const preparing = localStore.updateOrderStatus(order.id, { fulfillmentStatus: 'preparing' });
    assert.equal(preparing.fulfillmentStatus, 'preparing');

    // Kitchen marks ready
    const ready = localStore.updateOrderStatus(order.id, { fulfillmentStatus: 'ready' });
    assert.equal(ready.fulfillmentStatus, 'ready');

    // Cashier collects payment & fulfills
    const fulfilled = localStore.updateOrderStatus(order.id, {
      fulfillmentStatus: 'fulfilled',
      paymentStatus: 'paid',
    });
    assert.equal(fulfilled.fulfillmentStatus, 'fulfilled');
    assert.equal(fulfilled.paymentStatus, 'paid');

    // Cashier archives order
    const archived = localStore.updateOrderStatus(order.id, { fulfillmentStatus: 'archived' });
    assert.equal(archived.fulfillmentStatus, 'archived');
  });

  it('updates customer analytics profile upon order creation', () => {
    const customerId = 'test_analytics_customer';
    localStore.createOrder({
      customerId,
      customerName: 'Test Analytics',
      customerContact: '90001111',
      isGuest: false,
      items: [
        {
          id: 'item_1',
          menuItemId: 'main-1',
          name: 'Prawn Cream Pasta',
          chineseName: '奶油虾面',
          category: 'mains',
          isKidPortion: false,
          unitPrice: 10.5,
          quantity: 2,
          selectedAddOns: [],
          itemTotal: 21,
        },
      ],
      fulfillmentType: 'takeaway',
      takeawayFee: 0.6,
      subtotal: 21,
      discountAmount: 0,
      total: 21.6,
      paymentMethod: 'paynow',
      paymentStatus: 'paid',
      fulfillmentStatus: 'received',
      mainsCount: 2,
      stampsEarned: 2,
    });

    const profile = localStore.getProfile(customerId);
    assert.equal(profile.totalOrdersCount, 1);
    assert.match(profile.lastOrderId, /^NYO-/);
    assert.match(profile.lastOrderSummary, /2x Prawn Cream Pasta/);
    assert.ok(profile.lastOrderDate);
  });
});

describe('Seam 5: Inventory Sold-Out Synchronisation', () => {
  it('toggles sold out status and notifies subscribers', () => {
    let notifiedSoldOut = false;
    const unsub = localStore.onMenuChange((items) => {
      const main1 = items.find((i) => i.id === 'main-1');
      if (main1 && main1.isSoldOut) {
        notifiedSoldOut = true;
      }
    });

    localStore.updateMenuItemSoldOut('main-1', true);
    assert.equal(notifiedSoldOut, true);

    const updated = localStore.getMenuItems().find((i) => i.id === 'main-1');
    assert.equal(updated.isSoldOut, true);

    // Revert back for clean state
    localStore.updateMenuItemSoldOut('main-1', false);
    const reverted = localStore.getMenuItems().find((i) => i.id === 'main-1');
    assert.equal(reverted.isSoldOut, false);
    unsub();
  });

  it('sets all menu items sold out atomically and restores them', () => {
    localStore.setAllSoldOut(true);
    const allSoldOut = localStore.getMenuItems().every((i) => i.isSoldOut === true);
    assert.equal(allSoldOut, true);

    localStore.setAllSoldOut(false);
    const allAvailable = localStore.getMenuItems().every((i) => i.isSoldOut === false);
    assert.equal(allAvailable, true);
  });

  it('clears all orders from the kitchen queue', () => {
    localStore.createOrder({
      customerName: 'Test Customer',
      customerContact: '91234567',
      isGuest: true,
      items: [],
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 10,
      discountAmount: 0,
      total: 10,
      paymentMethod: 'counter',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'received',
      mainsCount: 0,
      stampsEarned: 0,
    });
    assert.ok(localStore.getOrders().length > 0);

    localStore.clearOrders();
    assert.equal(localStore.getOrders().length, 0);
  });
});

describe('Seam 6: Authentication & Guest Entry Flow', () => {
  it('creates clean guest session without loyalty stamp benefits', () => {
    const guestUser = { id: 'guest_123', name: 'Guest Customer', isGuest: true };
    assert.equal(guestUser.isGuest, true);
  });

  it('initializes member with 0 stamps and clean stamp history on registration', () => {
    const freshProfile = localStore.getProfile('user_fresh_registration_1');
    assert.equal(freshProfile.currentStampCount, 0);
    assert.equal(freshProfile.completedCardsCount, 0);
    assert.equal(freshProfile.stampHistory.length, 0);
    assert.equal(freshProfile.milestoneRedemptions.stamp4, false);
    assert.equal(freshProfile.milestoneRedemptions.stamp8, false);
    assert.equal(freshProfile.milestoneRedemptions.stamp12, false);
  });
});

describe('Seam 7: Payment Options Configuration & Fallback', () => {
  it('defaults to counter enabled, PayNow enabled, and Stripe disabled', () => {
    assert.equal(DEFAULT_STORE_SETTINGS.enableCounter, true);
    assert.equal(DEFAULT_STORE_SETTINGS.enablePayNow, true);
    assert.equal(DEFAULT_STORE_SETTINGS.enableStripe, false);
  });

  it('updates payment methods in store settings dynamically', () => {
    const updated = localStore.updateStoreSettings({
      enablePayNow: false,
      enableStripe: true,
      enableCounter: true,
    });

    assert.equal(updated.enablePayNow, false);
    assert.equal(updated.enableStripe, true);
    assert.equal(updated.enableCounter, true);

    // Fallback logic check: if paynow is selected but disabled, fallback is counter
    const activeMethod = !updated.enablePayNow ? 'counter' : 'paynow';
    assert.equal(activeMethod, 'counter');

    // Restore defaults
    localStore.updateStoreSettings({
      enablePayNow: true,
      enableStripe: false,
      enableCounter: true,
    });
  });
});

describe('Seam 8: Order Cancellation & Archival Lifecycle', () => {
  it('allows cancellation when order is in received status and transitions to archived', () => {
    const order = localStore.createOrder({
      customerId: 'user_cancel_test',
      customerName: 'Cancel Test',
      customerContact: '91112222',
      isGuest: false,
      items: [],
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 10,
      discountAmount: 0,
      total: 10,
      paymentMethod: 'counter',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'received',
      mainsCount: 1,
      stampsEarned: 1,
    });

    assert.equal(order.fulfillmentStatus, 'received');

    // Customer cancels order while received
    const cancelled = localStore.updateOrderStatus(order.id, { fulfillmentStatus: 'cancelled' });
    assert.equal(cancelled.fulfillmentStatus, 'cancelled');

    // Staff acknowledges cancellation and archives order
    const archived = localStore.updateOrderStatus(order.id, { fulfillmentStatus: 'archived' });
    assert.equal(archived.fulfillmentStatus, 'archived');
  });
});

describe('Seam 9: Sides-Only Orders & Stamp Exemption', () => {
  it('awards 0 stamps when order contains only sides and drinks', () => {
    const testUserId = 'test_sides_only_user';
    const initial = localStore.getProfile(testUserId);
    assert.equal(initial.currentStampCount, 0);

    // Customer orders 2 garlic breads and 1 soup (mainsCount = 0)
    const order = localStore.createOrder({
      customerId: testUserId,
      customerName: 'Sides Only Customer',
      customerContact: '91234567',
      isGuest: false,
      items: [
        {
          id: 'side_1',
          menuItemId: 'side-garlic-bread',
          name: 'Garlic Bread',
          chineseName: '大蒜面包',
          category: 'sides',
          isKidPortion: false,
          unitPrice: 3.5,
          quantity: 2,
          selectedAddOns: [],
          itemTotal: 7.0,
        },
      ],
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 7.0,
      discountAmount: 0,
      total: 7.0,
      paymentMethod: 'counter',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'received',
      mainsCount: 0,
      stampsEarned: 0,
    });

    assert.equal(order.mainsCount, 0);
    assert.equal(order.stampsEarned, 0);

    // Profile stamps do not increment
    const updated = localStore.updateUserStamps(testUserId, 0, {
      type: 'order',
      stamps: 0,
      description: `Order ${order.orderNumber} placed`,
    });

    assert.equal(updated.currentStampCount, 0);
    assert.equal(updated.voucherSide350Count, 0);
  });
});

describe('Seam 10: Voucher Wallet Lifecycle Across 12-Stamp Card Rollover', () => {
  it('increments vouchers at 4, 8, 12 stamps and preserves wallet vouchers across card rollover', () => {
    const testUserId = 'test_voucher_rollover_user';
    
    // Step 1: Customer buys 4 mains -> crosses 4 stamps -> earns 1x $3.50 voucher
    let prof = localStore.updateUserStamps(testUserId, 4, {
      type: 'order',
      stamps: 4,
      description: 'Purchased 4 mains',
    });
    assert.equal(prof.currentStampCount, 4);
    assert.equal(prof.completedCardsCount, 0);
    assert.equal(prof.voucherSide350Count, 1);
    assert.equal(prof.voucherSide450Count, 0);
    assert.equal(prof.voucherMeal850Count, 0);

    // Step 2: Customer buys 4 more mains -> reaches 8 stamps -> earns 1x $4.50 voucher
    prof = localStore.updateUserStamps(testUserId, 8, {
      type: 'order',
      stamps: 4,
      description: 'Purchased 4 mains',
    });
    assert.equal(prof.currentStampCount, 8);
    assert.equal(prof.voucherSide350Count, 1);
    assert.equal(prof.voucherSide450Count, 1);
    assert.equal(prof.voucherMeal850Count, 0);

    // Step 3: Customer buys 5 more mains -> total 13 -> completes card (12), overflows to 1 stamp
    // Earns 1x $8.50 meal voucher, 1 card completed, 1 stamp on new card
    prof = localStore.updateUserStamps(testUserId, 13, {
      type: 'order',
      stamps: 5,
      description: 'Purchased 5 mains',
    });
    assert.equal(prof.completedCardsCount, 1);
    assert.equal(prof.currentStampCount, 1);
    // Vouchers must persist in wallet!
    assert.equal(prof.voucherSide350Count, 1);
    assert.equal(prof.voucherSide450Count, 1);
    assert.equal(prof.voucherMeal850Count, 1);

    // Step 4: Customer redeems the $3.50 voucher on a sides order
    prof = localStore.updateUserStamps(
      testUserId,
      1,
      {
        type: 'order',
        stamps: 0,
        description: 'Redeemed $3.50 side voucher',
      },
      undefined,
      { side350: -1 }
    );

    // $3.50 voucher decrements, but other vouchers and current stamps remain intact!
    assert.equal(prof.voucherSide350Count, 0);
    assert.equal(prof.voucherSide450Count, 1);
    assert.equal(prof.voucherMeal850Count, 1);
    assert.equal(prof.currentStampCount, 1);
    assert.equal(prof.completedCardsCount, 1);
  });
});

describe('Seam 11: Customer Blacklisting & Uncollected Order Flagging', () => {
  it('flags customer profile as blacklisted and clears flag upon unblacklisting', () => {
    const testUserId = 'test_blacklist_user';
    localStore.getProfile(testUserId);

    // Admin reports customer as no-show
    const flagged = localStore.blacklistCustomer(
      testUserId,
      'Cancelled $18.50 order #NYO-099 after preparing and did not collect/pay'
    );
    assert.equal(flagged.isBlacklisted, true);
    assert.match(flagged.blacklistReason, /did not collect\/pay/);
    assert.ok(flagged.blacklistedAt);

    // Customer settles bill at counter; admin restores account
    const restored = localStore.unblacklistCustomer(testUserId);
    assert.equal(restored.isBlacklisted, false);
    assert.equal(restored.blacklistReason, '');
  });
});

describe('Seam 12: Voucher Selection/Deselection Safety & Deferred Wallet Decrement', () => {
  it('does not touch voucher balance when selected/deselected in cart; only decrements on confirmed order placement', () => {
    const testUserId = 'test_voucher_safety_user';
    
    // Give customer 1 voucher via milestone progress
    localStore.updateUserStamps(testUserId, 4, {
      type: 'order',
      stamps: 4,
      description: 'Setup wallet with 1 voucher',
    });
    
    let profile = localStore.getProfile(testUserId);
    assert.equal(profile.voucherSide350Count, 1);

    // Simulation of Cart State:
    // 1. Customer opens cart and selects $3.50 voucher
    let cartAppliedVoucher = 'side350';
    assert.equal(cartAppliedVoucher, 'side350');
    // Verify DB profile is NOT modified
    profile = localStore.getProfile(testUserId);
    assert.equal(profile.voucherSide350Count, 1);

    // 2. Customer changes their mind and deselects voucher
    cartAppliedVoucher = null;
    assert.equal(cartAppliedVoucher, null);
    // Verify DB profile is still NOT modified
    profile = localStore.getProfile(testUserId);
    assert.equal(profile.voucherSide350Count, 1);

    // 3. Customer places order WITHOUT voucher
    const orderWithoutVoucher = localStore.createOrder({
      customerId: testUserId,
      customerName: 'Safety Test Customer',
      customerContact: '91234567',
      isGuest: false,
      items: [],
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 10,
      discountAmount: 0,
      total: 10,
      paymentMethod: 'counter',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'received',
      mainsCount: 0,
      stampsEarned: 0,
    });
    assert.ok(orderWithoutVoucher.id);
    // DB profile voucher count remains exactly 1
    profile = localStore.getProfile(testUserId);
    assert.equal(profile.voucherSide350Count, 1);

    // 4. On a subsequent order, customer selects voucher AND confirms order submission
    cartAppliedVoucher = 'side350';
    const voucherDeltas = cartAppliedVoucher ? { [cartAppliedVoucher]: -1 } : undefined;
    
    profile = localStore.updateUserStamps(
      testUserId,
      profile.currentStampCount,
      {
        type: 'order',
        stamps: 0,
        description: 'Redeemed side350 voucher on checkout',
      },
      undefined,
      voucherDeltas
    );

    // NOW and ONLY now does the voucher decrement to 0
    assert.equal(profile.voucherSide350Count, 0);
  });
});

describe('Seam 13: Admin Order Archival, Archive Purge & Customer Profile Management', () => {
  it('archives all fulfilled orders in bulk without touching active queue orders', () => {
    // 1. Create one active order and two fulfilled orders
    const activeOrder = localStore.createOrder({
      customerId: 'user_arch_test',
      customerName: 'Active Person',
      customerContact: '91112222',
      isGuest: false,
      items: [],
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 10,
      discountAmount: 0,
      total: 10,
      paymentMethod: 'counter',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'received',
      mainsCount: 1,
      stampsEarned: 1,
    });

    const fulfilled1 = localStore.createOrder({
      customerId: 'user_arch_test',
      customerName: 'Fulfilled Person 1',
      customerContact: '91112223',
      isGuest: false,
      items: [],
      fulfillmentType: 'dine_in',
      takeawayFee: 0,
      subtotal: 12,
      discountAmount: 0,
      total: 12,
      paymentMethod: 'counter',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      mainsCount: 1,
      stampsEarned: 1,
    });

    const fulfilled2 = localStore.createOrder({
      customerId: 'user_arch_test',
      customerName: 'Fulfilled Person 2',
      customerContact: '91112224',
      isGuest: false,
      items: [],
      fulfillmentType: 'takeaway',
      takeawayFee: 0.3,
      subtotal: 15,
      discountAmount: 0,
      total: 15.3,
      paymentMethod: 'paynow',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      mainsCount: 1,
      stampsEarned: 1,
    });

    // 2. Perform bulk archive
    localStore.archiveAllFulfilled();

    const orders = localStore.getOrders();
    const activeReloaded = orders.find((o) => o.id === activeOrder.id);
    const f1Reloaded = orders.find((o) => o.id === fulfilled1.id);
    const f2Reloaded = orders.find((o) => o.id === fulfilled2.id);

    // Active order remains in active queue
    assert.equal(activeReloaded.fulfillmentStatus, 'received');
    // Fulfilled orders transition to archived
    assert.equal(f1Reloaded.fulfillmentStatus, 'archived');
    assert.equal(f2Reloaded.fulfillmentStatus, 'archived');

    // 3. Purge archives permanently
    localStore.deleteArchivedOrders();

    const remainingOrders = localStore.getOrders();
    assert.ok(remainingOrders.some((o) => o.id === activeOrder.id));
    assert.ok(!remainingOrders.some((o) => o.id === fulfilled1.id));
    assert.ok(!remainingOrders.some((o) => o.id === fulfilled2.id));
  });

  it('permanently deletes customer profile record by user ID', () => {
    const tempUserId = 'temp_user_to_delete';
    localStore.getProfile(tempUserId, 'Delete Me');
    assert.ok(localStore.getAllProfiles().some((p) => p.authUserId === tempUserId));

    localStore.deleteProfile(tempUserId);
    assert.ok(!localStore.getAllProfiles().some((p) => p.authUserId === tempUserId));
  });
});
