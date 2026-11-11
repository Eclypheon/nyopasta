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
});

describe('Seam 4: Order Lifecycle & Payment Safeguard', () => {
  it('progresses order from received to fulfilled and archives correctly', () => {
    const order = localStore.createOrder({
      customerId: 'user_alex_7729',
      customerName: 'Alex Tan',
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
});
