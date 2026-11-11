/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type OrderStatus =
  | 'Order Received'
  | 'Order Confirmed'
  | 'Preparing Order'
  | 'Ready for Dispatch'
  | 'Ready for Delivery'
  | 'Delivery Agent Assigned'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Delivery Failed'
  | 'Ready for Pickup'
  | 'Ready for Collection'
  | 'Collected by Customer'
  | 'Cancelled';

export interface Product {
  id: string;
  sku?: string;
  barcode?: string;
  nameEn: string;
  nameSi: string;
  category: string;
  categorySi: string;
  unit: string; // e.g. '1 kg', '500 g', '1 Pack', '1 Bottle'
  unitSi: string;
  sellingPrice: number; // LKR
  costPrice?: number;
  availableStock: number;
  minStockLevel?: number;
  targetStockLevel?: number; // Configurable target replenishment level (default 100)
  discountPercent: number; // 0-100
  imageUrl: string;
  imageId?: string;
  imageUpdatedAt?: string;
  imageSource?: 'cloud_storage' | 'cdn' | 'local';
  isActive: boolean;
  descriptionEn?: string;
  descriptionSi?: string;
  badge?: string;
}

export interface CloudProductImage {
  id: string;
  productId: string;
  productNameEn?: string;
  imageUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  dataBase64?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  nameEn: string;
  nameSi: string;
  unit: string;
  quantity: number;
  unitPrice: number; // original price
  discountPercent: number;
  effectivePrice: number; // price after discount
  lineTotal: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy: string; // 'System' | 'Admin' | 'Customer'
}

export interface WhatsAppNotificationRecord {
  id: string;
  messageType: 'order_confirmation' | 'status_update' | 'custom' | 'test';
  recipientPhone: string;
  templateName: string;
  languageCode: 'en' | 'si';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'not_configured';
  metaMessageId?: string;
  errorMessage?: string;
  orderNumber?: string;
  retryCount: number;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  receiptNumber?: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'credit' | 'cheque' | 'other' | 'credit_card';
  paymentDate: string; // ISO string
  date?: string;
  note?: string;
  notes?: string;
  receivedBy?: string;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string; // ISO string
}

export interface DeliveryAgent {
  id: string;
  username?: string;
  passwordHash?: string;
  passwordSalt?: string;
  passwordChangedAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  fullName: string;
  name?: string;
  mobilePhone: string;
  whatsappNumber: string;
  whatsappPhone?: string;
  vehicleType?: string;
  vehicleRegistrationNumber: string; // e.g. WP ND-4512
  vehicleNumber?: string;
  defaultHireCharge: number; // e.g. LKR 350
  address?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  isOnline?: boolean;
  lastActiveAt?: string;
  currentLocation?: GPSCoordinate;
}

export interface DeliveryAssignment {
  agentId: string;
  agentName: string;
  name?: string;
  mobilePhone: string;
  whatsappNumber: string;
  whatsappPhone?: string;
  vehicleType?: string;
  vehicleRegistrationNumber: string;
  vehicleNumber?: string;
  hireCharge: number;
  assignedAt: string;
  deliveryStatus: 'assigned' | 'in_transit' | 'delivered' | 'failed' | string;
  agentPaidStatus: 'unpaid' | 'paid_to_agent';
  hireChargePaymentStatus?: 'unpaid' | 'paid_to_agent';
  agentPaidAt?: string;
  notes?: string;
  isLiveTrackingActive?: boolean;
  lastKnownLocation?: GPSCoordinate;
  trackingStartedAt?: string;
  trackingStoppedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. FL-2026-000001
  trackingToken: string; // cryptographically secure unguessable token
  customerName: string;
  customerPhone: string;
  deliveryArea?: string; // Katuloya | Thawalanthanne | Babaralla | Goomaraya | Thunisgala
  deliveryAddress: string;
  houseNumber?: string;
  streetName?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryLandmark?: string;
  deliveryNotes?: string;
  deliveryType: 'delivery' | 'pickup';
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  deliveryCharge: number;
  deliveryHireCharge?: number; // Optional delivery agent hire charge
  total: number;
  paymentMethod: 'cash_on_delivery' | 'bank_transfer';
  paymentStatus: 'PAID' | 'PARTIALLY PAID' | 'UNPAID' | 'pending' | 'verified' | 'paid';
  amountPaid: number;
  outstandingBalance: number;
  payments: PaymentRecord[];
  deliveryAgent?: DeliveryAssignment;
  assignedDeliveryAgent?: DeliveryAssignment;
  liveLocation?: GPSCoordinate;
  locationHistory?: GPSCoordinate[];
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  whatsappNotifications: WhatsAppNotificationRecord[];
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  source: 'website' | 'whatsapp_intake';
  isTokenRevoked?: boolean;
  stockRestored?: boolean;
}

export interface StockMovement {
  id: string;
  orderId?: string;
  poId?: string;
  productId: string;
  productNameEn: string;
  quantity: number; // Negative for deductions, positive for restorations or PO arrivals
  previousStock: number;
  newStock: number;
  date: string;
  reason: 'order_placed' | 'order_cancelled' | 'manual_adjustment' | 'purchase_order_received';
  notes?: string;
}

export interface GoodsReceivedItem {
  productId: string;
  nameEn: string;
  quantityReceived: number;
  previousReceived: number;
  orderedQuantity: number;
  remainingQuantity: number;
}

export interface GoodsReceivedRecord {
  id: string;
  poId: string;
  poNumber: string;
  receivedAt: string;
  receivedBy: string;
  notes?: string;
  items: GoodsReceivedItem[];
}

export interface PurchaseOrderItem {
  productId: string;
  nameEn: string;
  nameSi?: string;
  category?: string;
  unit: string;
  currentStock: number;
  targetStockLevel?: number;
  suggestedReorderQuantity?: number;
  reorderQuantity: number;
  receivedQuantity?: number;
  remainingQuantity?: number;
  receivingStatus?: 'Pending' | 'Partially Received' | 'Fully Received';
  unitPrice?: number;
  lineTotal?: number;
  imageUrl?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  supplierName: string;
  supplierContact?: string;
  notes?: string;
  items: PurchaseOrderItem[];
  totalQuantity?: number;
  subtotal?: number;
  grandTotal?: number;
  status: 'draft' | 'issued' | 'received' | 'Pending' | 'Partially Received' | 'Fully Received' | 'Cancelled';
  receivingHistory?: GoodsReceivedRecord[];
  createdAt: string;
  createdByName?: string;
  bankDetails: BankDetails;
}

export interface BankDetails {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
}

export interface PublicTrackingOrder {
  orderNumber: string;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  items: {
    nameEn: string;
    nameSi: string;
    unit: string;
    quantity: number;
    effectivePrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  deliveryCharge: number;
  deliveryHireCharge?: number;
  discountTotal: number;
  total: number;
  amountPaid?: number;
  outstandingBalance?: number;
  deliveryArea?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  customerName?: string;
  customerPhone?: string;
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: 'cash_on_delivery' | 'bank_transfer';
  paymentStatus: string;
  assignedDeliveryAgent?: {
    agentId?: string;
    agentName: string;
    vehicleRegistrationNumber: string;
    vehicleType?: string;
    mobilePhone: string;
    whatsappNumber: string;
    whatsappChatUrl: string;
    deliveryStatus: string;
    isLiveTrackingActive?: boolean;
    lastKnownLocation?: GPSCoordinate;
  };
  liveLocation?: GPSCoordinate;
  createdAt: string;
  estimatedDelivery?: string;
}

export interface StoreConfig {
  storeName: string;
  location: string;
  address: string;
  addressSi?: string;
  phone: string;
  whatsappNumber: string;
  email?: string;
  logoUrl?: string;
  tagline?: string;
  taglineSi?: string;
  deliveryRadiusKm: number;
  deliveryAreas: string[];
  baseDeliveryFee: number;
  freeDeliveryThreshold: number;
  currency: string;
  isOpen: boolean;
  openingHours: string;
  bankDetails?: BankDetails;
}

export interface WhatsAppConfigStatus {
  isConfigured: boolean;
  phoneNumberIdConfigured: boolean;
  businessAccountIdConfigured: boolean;
  accessTokenConfigured: boolean;
  webhookSecretConfigured: boolean;
  apiVersion: string;
  publicBaseUrl: string;
  webhookCallbackUrl: string;
  totalSent: number;
  totalFailed: number;
}

// =============================================================
// STAFF PORTAL: MANAGEMENT REPORTS & ACCOUNTING TYPES
// =============================================================

export type StaffRole = 'Admin' | 'Manager' | 'Staff';

export interface StaffAccount {
  id: string;
  username: string;
  name: string;
  role: StaffRole;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface ReportAuditLog {
  id: string;
  timestamp: string;
  staffUsername?: string;
  staffName: string;
  staffRole?: string;
  reportType?: string;
  filters?: Record<string, any>;
  ipAddress?: string;
  action?: string;
  reportName?: string;
  staffId?: string;
  details?: string;
}

export interface ManagementDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  customerOutstandingBalances: number;
  deliveryHireAccounting: {
    totalFeesCollected: number;
    totalHireExpenses: number;
    totalPaidToAgents: number;
    outstandingAgentPayments: number;
  };
  productsStockSummary: {
    totalProducts: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockUnits: number;
    retailValue: number;
    costValue: number;
  };
  purchaseOrdersSummary: {
    totalPOs: number;
    totalOrderedQty: number;
    totalReceivedQty: number;
    pendingQty: number;
    totalPurchaseCommitment: number;
    outstandingSupplierPayments: number;
  };
  registeredDeliveryAgents: {
    totalAgents: number;
    activeAgents: number;
    totalTripsCompleted: number;
  };
}

export interface CustomerStatementTransaction {
  id: string;
  date: string;
  type: 'ORDER' | 'PAYMENT' | 'PARTIAL_PAYMENT' | 'REFUND' | 'CREDIT_ADJUSTMENT';
  referenceId?: string;
  orderId?: string;
  paymentId?: string;
  orderNumber?: string;
  description: string;
  amount: number;
  orderAmount?: number;
  paymentAmount?: number;
  paymentMethod?: string;
  transactionStatus?: string;
  status?: string;
  receiptNumber?: string;
  balanceAfter: number;
  receivedBy?: string;
}

export interface CustomerAccountLedger {
  customerId: string;
  customerName: string;
  customerPhone: string;
  rawPhone?: string;
  phone?: string;
  deliveryArea: string;
  deliveryAddress?: string;
  totalOrders: number;
  orderCount?: number;
  totalOrdered: number; // Sum of confirmed, completed, and credit customer orders (excludes Cancelled)
  totalPurchases: number; // Alias for backward compatibility
  totalPaid: number;    // Total amount actually received from the customer
  paymentsReceived: number; // Alias for backward compatibility
  partialPaymentsCount: number;
  outstandingBalance: number; // totalOrdered - totalPaid
  totalOutstanding?: number; // Alias for backward compatibility
  lastOrderDate: string;
  lastPaymentDate: string | null;
  lastTransactionDate: string;
  accountStatus: 'Good Standing' | 'Credit Active' | 'Overdue' | 'Settled';
  starPointsBalance?: number;
  loyaltyProfile?: CustomerLoyaltyProfile;
  transactions: CustomerStatementTransaction[];
  orders?: any[];
}

export type StarPointsTransactionType = 'EARN' | 'REDEEM' | 'EXPIRY' | 'REVERSAL' | 'ADJUSTMENT';

export interface StarPointsTransaction {
  id: string;
  customerId: string;
  customerPhone: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  type: StarPointsTransactionType;
  purchaseAmount: number;
  points: number;
  cycle: string;
  date: string;
  expiryDate: string;
  description: string;
  receiptNumber?: string;
  createdBy: string;
  createdAt: string;
}

export type RewardType =
  | 'gift_hamper'
  | 'discount_voucher'
  | 'grocery_package'
  | 'priority_delivery_pass'
  | 'cash_voucher'
  | 'special_benefit'
  | 'custom';

export type RewardStatus =
  | 'Pending'
  | 'Approved'
  | 'Ready for Collection'
  | 'Delivered'
  | 'Rejected';

export interface AnnualRewardRecord {
  id: string;
  cycle: string; // e.g. '2026-2027'
  customerId: string;
  customerName: string;
  customerPhone: string;
  rankAtSelection?: number;
  annualPointsEarned: number;
  annualPurchases: number;
  rewardType: RewardType;
  rewardTitle: string;
  rewardDescription: string;
  rewardValue: number; // LKR estimated retail value
  quantity: number;
  status: RewardStatus;
  voucherCode?: string;
  collectionInstructions?: string;
  distributionDate?: string; // YYYY-MM-DD
  approvedBy: string;
  approvedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnualRewardsAnnouncement {
  id: string;
  cycle: string;
  headline: string;
  headlineSi?: string;
  message: string;
  messageSi?: string;
  isActive: boolean;
  publishedAt?: string;
  publishedBy?: string;
}

export interface AnnualCustomerRankingItem {
  customerId: string;
  customerName: string;
  customerPhone: string;
  rawPhone?: string;
  deliveryArea?: string;
  annualPointsEarned: number;
  currentAvailablePoints: number;
  totalEligiblePurchases: number;
  rank: number;
  cycle: string;
  hasApprovedRewards: boolean;
  rewardsCount: number;
  rewards: AnnualRewardRecord[];
}

export interface AnnualClosingSummaryReport {
  cycle: string;
  period: string;
  totalRegisteredCustomers: number;
  totalEligiblePurchases: number;
  totalStarPointsIssued: number;
  totalStarPointsExpired: number;
  totalApprovedRewards: number;
  totalDistributedRewards: number;
  totalPendingCollections: number;
  totalRewardsValue: number;
  closedAt?: string;
  closedBy?: string;
  rankings: AnnualCustomerRankingItem[];
  rewards: AnnualRewardRecord[];
}

export interface CustomerLoyaltyProfile {
  customerId: string;
  customerPhone: string;
  customerName: string;
  availablePoints: number;
  currentCycleEarnedPoints: number;
  currentCyclePurchases: number;
  totalPointsEarnedAllTime: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  currentCycle: string;
  currentCyclePeriod: string;
  currentCyclePeriodSi: string;
  expiryDate: string;
  expiryDateSi: string;
  pointsExpiringOn17July: number;
  lastEarnedDate: string | null;
  transactions: StarPointsTransaction[];
  annualRank?: number;
  annualRewards?: AnnualRewardRecord[];
  announcement?: AnnualRewardsAnnouncement;
}

export interface CustomerAccountsDashboardStats {
  totalCustomerCredit: number;
  totalOutstandingBalance: number;
  totalPaymentsReceived: number;
  totalCustomerOrders: number;
}

export interface DeliveryHireRecord {
  id: string;
  agentId: string;
  agentName: string;
  vehicleNumber: string;
  orderNumber: string;
  deliveryDate: string;
  deliveryFee: number; // charged to customer
  hirePaymentAmount: number; // expense payable to driver
  amountPaid: number;
  outstandingAmount: number;
  paymentStatus: 'paid_to_agent' | 'unpaid';
  deliveryStatus: string;
  paymentHistory?: { date?: string; note?: string }[];
}

export interface ProductStockReportItem {
  id: string;
  nameEn: string;
  nameSi: string;
  category: string;
  barcode: string;
  sellingPrice: number;
  purchasePrice: number;
  openingStock: number;
  stockReceived: number;
  stockSold: number;
  damagedStock: number;
  currentStock: number;
  stockValue: number; // currentStock * sellingPrice
  costValue: number; // currentStock * purchasePrice
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface PurchaseOrderReportItem {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierContact: string;
  purchaseDate: string;
  productDetails: {
    productId: string;
    productName: string;
    quantityOrdered: number;
    quantityReceived: number;
    pendingQuantity: number;
    estimatedCost: number;
  }[];
  quantitiesOrdered: number;
  quantitiesReceived: number;
  pendingQuantities: number;
  status: string;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  totalPurchaseAmount: number;
  outstandingSupplierPayments: number;
}

export interface DeliveryAgentRegisterItem {
  agentId: string;
  agentName: string;
  contactNumber: string;
  registrationDate: string;
  status: 'Active' | 'Inactive';
  assignedOrders: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  cancelledDeliveries: number;
  totalDeliveryFees: number;
  totalHirePayments: number;
  outstandingPayments: number;
}

export type PromotionalMediaType = 'video' | 'image';

export interface PromotionalMedia {
  id: string;
  type: PromotionalMediaType;
  url: string;
  thumbnailUrl?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  callToActionText?: string;
  callToActionLink?: string;
  isActive: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  durationSeconds?: number;
  mimeType?: string;
  filename?: string;
  size?: number;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}
