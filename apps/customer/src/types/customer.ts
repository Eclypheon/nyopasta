import { CartItem, Order, FulfillmentType } from '@nyopasta/shared';

export interface CartState {
  items: CartItem[];
  fulfillmentType: FulfillmentType;
  appliedMilestoneReward: 4 | 8 | 12 | null;
  customerName: string;
  customerContact: string;
  isGuest: boolean;
}

export interface StoredOrderHistory {
  orders: Order[];
  lastOrder?: Order;
}
