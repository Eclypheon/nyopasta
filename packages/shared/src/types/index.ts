export type MenuItemCategory = 'mains' | 'soups' | 'sides' | 'addons';

export interface MenuItem {
  id: string;
  name: string;
  chineseName: string;
  category: MenuItemCategory;
  subcategory?: string;
  price: number;
  isKidOption?: boolean;
  kidPrice?: number;
  description: string;
  chineseDescription?: string;
  tag?: string;
  isSoldOut: boolean;
  imageUrl?: string;
}

export interface AddOnOption {
  id: string;
  name: string;
  chineseName: string;
  price: number;
  category: 'protein' | 'sauce' | 'staple' | 'packaging';
}

export interface SelectedAddOn {
  id: string;
  name: string;
  chineseName: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  chineseName: string;
  category: MenuItemCategory;
  isKidPortion: boolean;
  unitPrice: number;
  quantity: number;
  selectedAddOns: SelectedAddOn[];
  specialInstructions?: string;
  itemTotal: number;
}

export type FulfillmentType = 'dine_in' | 'takeaway';

export type PaymentMethod = 'counter' | 'paynow' | 'stripe';

export type PaymentStatus = 'unpaid' | 'paid';

export type FulfillmentStatus = 'received' | 'preparing' | 'ready' | 'fulfilled' | 'archived' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerContact: string;
  isGuest: boolean;
  items: CartItem[];
  fulfillmentType: FulfillmentType;
  takeawayFee: number;
  subtotal: number;
  discountAmount: number;
  discountDescription?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  mainsCount: number;
  stampsEarned: number;
  redeemedMilestone?: 4 | 8 | 12 | null;
  createdAt: string;
  updatedAt: string;
}

export interface StampEvent {
  id: string;
  type: 'order' | 'manual_migration' | 'redemption';
  stamps: number;
  balanceAfter: number;
  description: string;
  timestamp: string;
}

export interface MilestoneStatus {
  stamp4: boolean;
  stamp8: boolean;
  stamp12: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isGuest?: boolean;
}

export interface UserProfile {
  id: string;
  authUserId: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'customer' | 'admin';
  currentStampCount: number;
  completedCardsCount: number;
  milestoneRedemptions: MilestoneStatus;
  stampHistory: StampEvent[];
  lastOrderId?: string;
  lastOrderSummary?: string;
  lastOrderDate?: string;
  totalOrdersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  open: string;
  close: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DaySchedule {
  day: DayOfWeek;
  dayName: string;
  isOpen: boolean;
  timeSlots: TimeSlot[];
}

export interface StoreSettings {
  id: string;
  isManuallyClosed: boolean;
  manualCloseReason?: string;
  bannerMessage?: string;
  schedule: DaySchedule[];
  enablePayNow?: boolean;
  enableStripe?: boolean;
  enableCounter?: boolean;
  payNowType?: 'mobile' | 'uen';
  payNowUen: string;
  payNowRecipientName: string;
  payNowMobile?: string;
  payNowQrUrl?: string;
  takeawayFeePerItem: number;
  updatedAt: string;
}
