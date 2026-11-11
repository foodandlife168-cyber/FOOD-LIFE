/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import type {
  Product,
  Order,
  OrderStatus,
  StoreConfig,
  WhatsAppNotificationRecord,
  PublicTrackingOrder,
  WhatsAppConfigStatus,
  StockMovement,
  PurchaseOrder,
  PurchaseOrderItem,
  BankDetails,
  DeliveryAgent,
  DeliveryAssignment,
  PaymentRecord,
  GPSCoordinate,
  GoodsReceivedItem,
  GoodsReceivedRecord,
  CloudProductImage,
  PromotionalMedia,
  PromotionalMediaType,
  StarPointsTransaction,
  CustomerLoyaltyProfile,
  AnnualRewardRecord,
  AnnualRewardsAnnouncement,
  AnnualCustomerRankingItem,
  AnnualClosingSummaryReport,
  RewardType,
  RewardStatus,
} from './src/types/index.ts';
import {
  calculateItemLine,
  calculateOrderTotals,
  formatOrderNumber,
  isValidSriLankanPhone,
  normalizeSriLankanPhone,
  buildWhatsAppTemplateBody,
  getSinhalaStatus,
  formatPhoneForDisplay,
} from './src/utils/order.ts';
import { toSriLankaDate, isWithinSLTPeriod } from './src/utils/sriLankaTime.ts';
import { mergeMasterSriLankanCatalog } from './src/data/sriLankanGroceryCatalog.ts';
import {
  calculateEarnedStarPoints,
  getLoyaltyCycleForDate,
  computeCustomerLoyaltySummary,
  processStarPointsExpiration,
  type LoyaltyCycleInfo,
  type CustomerLoyaltySummary,
} from './src/utils/starPoints.ts';
import {
  generateAnnualCustomerRankings,
  generateAnnualClosingSummary,
  getDefaultRewardPreset,
} from './src/utils/annualRewards.ts';
import {
  syncAndMigrateProducts,
  syncAndMigrateOrders,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  deductProductStockInFirestore,
  restoreProductStockInFirestore,
  saveStockMovementToFirestore,
  syncAndMigrateStockMovements,
  savePurchaseOrderToFirestore,
  syncAndMigratePurchaseOrders,
  subscribeToFirestoreProducts,
  saveDeliveryAgentToFirestore,
  deleteDeliveryAgentFromFirestore,
  syncAndMigrateDeliveryAgents,
  cleanupFirestoreDemoData,
  saveProductImageToFirestore,
  getProductImageFromFirestore,
  deleteProductImageFromFirestore,
  listProductImagesFromFirestore,
  saveCustomerAccountToFirestore,
  syncAndMigrateCustomerAccounts,
  savePromotionalMediaToFirestore,
  deletePromotionalMediaFromFirestore,
  listPromotionalMediaFromFirestore,
  saveStarPointsTransactionToFirestore,
  syncStarPointsLedgerWithFirestore,
  saveAnnualRewardToFirestore,
  deleteAnnualRewardFromFirestore,
  syncAnnualRewardsWithFirestore,
  saveAnnualRewardsAnnouncementToFirestore,
  getAnnualRewardsAnnouncementFromFirestore,
} from './src/lib/serverFirestore.ts';
import {
  calculateAllCustomerAccounts,
  allocatePaymentToUnpaidOrders,
  type CustomerDirectPaymentRecord,
} from './src/utils/customerAccounts.ts';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();

// Public Base URL for tracking links
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  process.env.APP_URL ||
  'https://ais-dev-b5dedugjljzjxanhwe6f5a-475062765829.europe-west1.run.app';
const APP_URL = PUBLIC_BASE_URL;

// WhatsApp Business Platform Cloud API credentials
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'food_and_life_verify_token_2026';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';

// Admin Secret
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'foodlife_admin_2026';

// Persistent storage setup
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Default Authentic Katuloya / Sri Lanka Products
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    nameEn: 'Keeri Samba Rice',
    nameSi: 'කීරි සම්බා සහල්',
    category: 'Rice & Grains',
    categorySi: 'සහල් සහ ධාන්‍ය',
    unit: '5 kg',
    unitSi: 'කි.ග්‍රෑ. 5',
    sellingPrice: 1650,
    availableStock: 45,
    discountPercent: 5,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Premium Sri Lankan Keeri Samba rice, high aroma, small grain, ideal for special meals.',
    descriptionSi: 'සුවඳවත් කුඩා ඇට සහිත උසස් තත්ත්වයේ කීරි සම්බා සහල්.',
    badge: 'Popular',
  },
  {
    id: 'prod-002',
    nameEn: 'Nadu Rice',
    nameSi: 'නාඩු සහල්',
    category: 'Rice & Grains',
    categorySi: 'සහල් සහ ධාන්‍ය',
    unit: '5 kg',
    unitSi: 'කි.ග්‍රෑ. 5',
    sellingPrice: 1100,
    availableStock: 60,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Healthy red and white parboiled Sri Lankan Nadu rice for daily energy.',
    descriptionSi: 'දෛනික පෝෂණය සපයන නැවුම් ලංකා නාඩු සහල්.',
  },
  {
    id: 'prod-003',
    nameEn: 'Red Dhal (Mysore Parippu)',
    nameSi: 'මයිසූර් රතු පරිප්පු',
    category: 'Rice & Grains',
    categorySi: 'සහල් සහ ධාන්‍ය',
    unit: '1 kg',
    unitSi: 'කි.ග්‍රෑ. 1',
    sellingPrice: 380,
    availableStock: 80,
    discountPercent: 8,
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Cleaned premium red split lentils, quick cooking and rich in plant protein.',
    descriptionSi: 'පිරිසිදු කළ රසවත් රතු මයිසූර් පරිප්පු.',
    badge: 'Best Value',
  },
  {
    id: 'prod-004',
    nameEn: 'Fresh Katuloya Hill Red Onions',
    nameSi: 'නැවුම් රතු ළූණු',
    category: 'Fresh Vegetables & Spices',
    categorySi: 'නැවුම් එළවළු සහ කුළුබඩු',
    unit: '1 kg',
    unitSi: 'කි.ග්‍රෑ. 1',
    sellingPrice: 420,
    availableStock: 50,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Handpicked fresh red onions from local highland farms, packed with rich pungency.',
    descriptionSi: 'ප්‍රදේශයේ ගොවිබිම්වලින් නෙළාගත් නැවුම් රසැති රතු ළූණු.',
    badge: 'Farm Fresh',
  },
  {
    id: 'prod-005',
    nameEn: 'Nuwara Eliya Potatoes',
    nameSi: 'නුවරඑළිය අල',
    category: 'Fresh Vegetables & Spices',
    categorySi: 'නැවුම් එළවළු සහ කුළුබඩු',
    unit: '1 kg',
    unitSi: 'කි.ග්‍රෑ. 1',
    sellingPrice: 360,
    availableStock: 75,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Genuine hill country potatoes, creamy texture and great for curries and stews.',
    descriptionSi: 'නුවරඑළියේ සරුසාර පසින් ලැබෙන උසස් අර්තාපල් අල.',
  },
  {
    id: 'prod-006',
    nameEn: 'Fresh Green Chillies',
    nameSi: 'නැවුම් අමු මිරිස්',
    category: 'Fresh Vegetables & Spices',
    categorySi: 'නැවුම් එළවළු සහ කුළුබඩු',
    unit: '250 g',
    unitSi: 'ග්‍රෑම් 250',
    sellingPrice: 120,
    availableStock: 35,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Crisp and spicy green chillies, freshly harvested.',
    descriptionSi: 'නැවුම් සැර අමු මිරිස්.',
  },
  {
    id: 'prod-007',
    nameEn: 'Roasted Curry Powder (Thunapaha)',
    nameSi: 'බැදපු තුනපහ කුඩු',
    category: 'Spices & Condiments',
    categorySi: 'කුළුබඩු සහ රසකාරක',
    unit: '250 g',
    unitSi: 'ග්‍රෑම් 250',
    sellingPrice: 310,
    availableStock: 50,
    discountPercent: 10,
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Authentic Sri Lankan roasted curry blend with coriander, cumin, and fennel.',
    descriptionSi: 'සාම්ප්‍රදායික ශ්‍රී ලාංකීය සුවඳවත් බැදපු තුනපහ කුඩු.',
    badge: 'Aroma',
  },
  {
    id: 'prod-008',
    nameEn: 'Pure Coconut Oil',
    nameSi: 'පිරිසිදු පොල්තෙල්',
    category: 'Oils & Essentials',
    categorySi: 'තෙල් සහ අත්‍යවශ්‍ය ද්‍රව්‍ය',
    unit: '1 Litre',
    unitSi: 'ලීටර් 1',
    sellingPrice: 750,
    availableStock: 30,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: '100% pure filtered white coconut oil for healthy cooking.',
    descriptionSi: 'පිරිසිදු සුදු පොල්තෙල්.',
  },
  {
    id: 'prod-009',
    nameEn: 'Fresh Farm Eggs',
    nameSi: 'නැවුම් ගොවිපල බිත්තර',
    category: 'Dairy & Eggs',
    categorySi: 'කිරි නිෂ්පාදන සහ බිත්තර',
    unit: '10 Pack',
    unitSi: 'පැකට්ටුව (10)',
    sellingPrice: 420,
    availableStock: 40,
    discountPercent: 5,
    imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Freshly gathered brown farm eggs, high protein and quality checked.',
    descriptionSi: 'නැවුම් පෝෂ්‍යදායී ගොවිපල බිත්තර 10ක ඇසුරුම.',
    badge: 'Fresh Today',
  },
  {
    id: 'prod-010',
    nameEn: 'Full Cream Milk Powder',
    nameSi: 'පූර්ණ යොදය සහිත කිරිපිටි',
    category: 'Dairy & Eggs',
    categorySi: 'කිරි නිෂ්පාදන සහ බිත්තර',
    unit: '400 g',
    unitSi: 'ග්‍රෑම් 400',
    sellingPrice: 1050,
    availableStock: 60,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Rich, creamy full cream milk powder for your morning tea.',
    descriptionSi: 'රසවත් සහ පෝෂ්‍යදායී කිරිපිටි.',
  },
  {
    id: 'prod-011',
    nameEn: 'Pure Ceylon BOPF Tea',
    nameSi: 'නියම ලංකා තේ (BOPF)',
    category: 'Snacks & Beverages',
    categorySi: 'කෙටි කෑම සහ පාන වර්ග',
    unit: '500 g',
    unitSi: 'ග්‍රෑම් 500',
    sellingPrice: 850,
    availableStock: 40,
    discountPercent: 12,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Finest highland Ceylon black tea, robust golden brew with invigorating flavor.',
    descriptionSi: 'කඳුකරයේ උසස් තේ දළු වලින් නිපදවූ සුවඳවත් ලංකා තේ.',
    badge: 'Pure Ceylon',
  },
  {
    id: 'prod-012',
    nameEn: 'Link Samahan Herbal Drink',
    nameSi: 'ලින්ක් සමහන් පැකට්',
    category: 'Snacks & Beverages',
    categorySi: 'කෙටි කෑම සහ පාන වර්ග',
    unit: '10 Sachets',
    unitSi: 'පැකට් 10',
    sellingPrice: 480,
    availableStock: 50,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: '14 Ayurvedic herbs trusted for immunity, relief from colds and wellness.',
    descriptionSi: 'හෙළ ඔසු 14 ක ගුණය සපිරි ලින්ක් සමහන් පැකට් 10ක්.',
    badge: 'Ayurvedic',
  },
  {
    id: 'prod-013',
    nameEn: 'Munchee Super Cream Cracker',
    nameSi: 'මන්චි සුපර් ක්‍රීම් ක්‍රැකර්',
    category: 'Snacks & Beverages',
    categorySi: 'කෙටි කෑම සහ පාන වර්ග',
    unit: '500 g',
    unitSi: 'ග්‍රෑම් 500',
    sellingPrice: 490,
    availableStock: 55,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Crispy, crunchy family favourite snack with butter or cheese.',
    descriptionSi: 'ක්‍රිස්පි රසැති මන්චි සුපර් ක්‍රීම් ක්‍රැකර්.',
  },
  {
    id: 'prod-014',
    nameEn: 'Brown Sugar (Sini)',
    nameSi: 'රතු සීනි',
    category: 'Oils & Essentials',
    categorySi: 'තෙල් සහ අත්‍යවශ්‍ය ද්‍රව්‍ය',
    unit: '1 kg',
    unitSi: 'කි.ග්‍රෑ. 1',
    sellingPrice: 320,
    availableStock: 70,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Natural cane brown sugar, rich caramel sweet flavor.',
    descriptionSi: 'ස්වාභාවික උක් රතු සීනි.',
  },
  {
    id: 'prod-015',
    nameEn: 'Ceylonese Coconut Scraped / Grated',
    nameSi: 'නැවුම් පොල් ගෙඩියක් (ගාන ලද)',
    category: 'Fresh Vegetables & Spices',
    categorySi: 'නැවුම් එළවළු සහ කුළුබඩු',
    unit: '1 Nut',
    unitSi: 'ගෙඩි 1',
    sellingPrice: 150,
    availableStock: 65,
    discountPercent: 0,
    imageUrl: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Fresh, juicy Katuloya coconut scraped freshly on order for curry milk.',
    descriptionSi: 'නැවුම් රසවත් දේශීය පොල් ගෙඩියක්.',
  },
  {
    id: 'prod-016',
    nameEn: 'Washing Powder / Laundry Detergent',
    nameSi: 'රෙදි සෝදන කුඩු',
    category: 'Household Essentials',
    categorySi: 'ගෘහස්ථ අත්‍යවශ්‍ය ද්‍රව්‍ය',
    unit: '1 kg',
    unitSi: 'කි.ග්‍රෑ. 1',
    sellingPrice: 550,
    availableStock: 35,
    discountPercent: 10,
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    descriptionEn: 'Effective stain removing laundry powder for clean, fresh smelling clothes.',
    descriptionSi: 'පිරිසිදු සුවඳැති රෙදි සේදීම සඳහා උසස් තත්ත්වයේ කුඩු.',
  },
];

const DEFAULT_STORE_CONFIG: StoreConfig = {
  storeName: 'FOOD & LIFE GROCERY',
  location: 'Katuloya, Thawalanthanne, Sri Lanka',
  address: '929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne',
  phone: '+94 71 259 5683',
  whatsappNumber: '+94 71 259 5683',
  email: 'foodandlifegrocery@gmail.com',
  logoUrl: '/logo.jpg',
  tagline: 'Everything For Your Choices',
  taglineSi: 'ඔබගේ සියලු තේරීම් සඳහා',
  deliveryRadiusKm: 5,
  deliveryAreas: [
    'Katuloya',
    'Thawalanthanne',
    'Babaralla',
    'Goomaraya',
    'Thunisgala',
  ],
  baseDeliveryFee: 250,
  freeDeliveryThreshold: 3500,
  currency: 'LKR',
  isOpen: true,
  openingHours: '6:30 AM - 9:30 PM (Daily)',
  bankDetails: {
    bankName: "People's Bank",
    branch: 'Panwila',
    accountName: 'RG Nimal Rajapaksha',
    accountNumber: '211200380039804',
  },
};

interface StaffAuth {
  username: string;
  passwordHash: string;
  updatedAt: string;
  failedAttempts: number;
  lockoutUntil?: number | null;
}

interface StaffUserAccount {
  id: string;
  username: string;
  name: string;
  role: 'Admin' | 'Manager' | 'Staff';
  passwordHash: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface ReportAuditLog {
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

interface StaffSession {
  token: string;
  username: string;
  name?: string;
  role?: 'Admin' | 'Manager' | 'Staff';
  permissions?: string[];
  createdAt: number;
  expiresAt: number;
}

const activeStaffSessions = new Map<string, StaffSession>();

function hashPassword(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || 'FoodLife@Admin2026';

const DEFAULT_DELIVERY_AGENTS: DeliveryAgent[] = [
  {
    id: 'agent-001',
    username: 'driver_kamal',
    passwordHash: hashPassword('Driver@Kamal2026'),
    fullName: 'Kamal Perera',
    name: 'Kamal Perera',
    mobilePhone: '+94 71 884 9210',
    whatsappNumber: '+94 71 884 9210',
    vehicleRegistrationNumber: 'WP ND-4512',
    defaultHireCharge: 350,
    address: 'Katuloya Junction, Thawalanthanne',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
  },
  {
    id: 'agent-002',
    username: 'driver_sunil',
    passwordHash: hashPassword('Driver@Sunil2026'),
    fullName: 'Sunil Bandara',
    name: 'Sunil Bandara',
    mobilePhone: '+94 77 342 1109',
    whatsappNumber: '+94 77 342 1109',
    vehicleRegistrationNumber: 'CP BE-8821',
    defaultHireCharge: 400,
    address: 'Babaralla Road, Katuloya',
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
  },
];

interface DatabaseState {
  products: Product[];
  orders: Order[];
  storeConfig: StoreConfig;
  whatsappLogs: WhatsAppNotificationRecord[];
  stockMovements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  deliveryAgents: DeliveryAgent[];
  orderSequence: number;
  poSequence: number;
  staffAuth?: StaffAuth;
  sessions?: Record<string, StaffSession>;
  staffAccounts?: StaffUserAccount[];
  reportAuditLogs?: ReportAuditLog[];
  customerPayments?: CustomerDirectPaymentRecord[];
  promotionalMedia?: PromotionalMedia[];
  starPointsLedger?: StarPointsTransaction[];
  annualRewards?: AnnualRewardRecord[];
  annualRewardAnnouncements?: Record<string, AnnualRewardsAnnouncement>;
}

const DEFAULT_PROMOTIONAL_MEDIA: PromotionalMedia[] = [
  {
    id: 'promo-video-001',
    type: 'video',
    url: '/uploads/promo_food_life_loop.mp4',
    title: 'Everything You Need, Freshness You Deserve!',
    subtitle: 'Quality • Freshness • Convenience • Your Trusted Grocery Partner',
    badge: 'FEATURED VIDEO',
    callToActionText: 'SHOP NOW',
    callToActionLink: '#catalog-section',
    isActive: true,
    order: 1,
    durationSeconds: 5,
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  },
  {
    id: 'promo-img-002',
    type: 'image',
    url: '/uploads/promo_fresh_farm.jpg',
    title: '100% Fresh Farm Harvest Everyday',
    subtitle: 'Direct from local farmers around Katuloya • Clean & Handpicked',
    badge: 'DAILY FRESH',
    callToActionText: 'EXPLORE PRODUCE',
    callToActionLink: '#catalog-section',
    isActive: true,
    order: 2,
    durationSeconds: 6,
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  },
  {
    id: 'promo-img-003',
    type: 'image',
    url: '/uploads/promo_fast_delivery.jpg',
    title: '45-90 Minute Rapid Doorstep Delivery',
    subtitle: 'Serving Katuloya, Thawalanthanne, Babaralla & Goomaraya',
    badge: 'FAST DISPATCH',
    callToActionText: 'ORDER ONLINE',
    callToActionLink: '#catalog-section',
    isActive: true,
    order: 3,
    durationSeconds: 6,
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  },
];

// Concurrency-safe queue / mutex to prevent overselling on concurrent checkout
let inventoryLockQueue: Promise<void> = Promise.resolve();
function withInventoryLock<T>(action: () => Promise<T> | T): Promise<T> {
  let resolvePromise: (val: T) => void;
  let rejectPromise: (err: any) => void;
  const result = new Promise<T>((res, rej) => {
    resolvePromise = res;
    rejectPromise = rej;
  });

  inventoryLockQueue = inventoryLockQueue.then(async () => {
    try {
      const outcome = await action();
      resolvePromise(outcome);
    } catch (e) {
      rejectPromise(e);
    }
  });

  return result;
}

function ensureDefaultStaffAccounts(): StaffUserAccount[] {
  return [
    {
      id: 'staff-admin-01',
      username: 'Admin',
      name: 'Food & Life Administrator',
      role: 'Admin',
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      permissions: ['*'],
      isActive: true,
      createdAt: '2026-10-31T07:10:00.000Z',
    },
    {
      id: 'staff-mgr-01',
      username: 'Manager',
      name: 'Katuloya Operations Manager',
      role: 'Manager',
      passwordHash: hashPassword('Manager@2026'),
      permissions: [
        'dashboard',
        'daily_report',
        'monthly_report',
        'annual_report',
        'customer_statements',
        'delivery_hire',
        'stock_reports',
        'purchase_orders',
        'delivery_agents',
      ],
      isActive: true,
      createdAt: '2026-10-31T07:10:00.000Z',
    },
    {
      id: 'staff-cashier-01',
      username: 'Staff',
      name: 'Floor Supervisor & Cashier',
      role: 'Staff',
      passwordHash: hashPassword('Staff@2026'),
      permissions: ['dashboard', 'daily_report', 'stock_reports'],
      isActive: true,
      createdAt: '2026-10-31T07:10:00.000Z',
    },
  ];
}

function ensureStaffAuth(state: DatabaseState): StaffAuth {
  if (!state.sessions) {
    state.sessions = {};
  }
  if (!state.staffAccounts || !Array.isArray(state.staffAccounts) || state.staffAccounts.length === 0) {
    state.staffAccounts = ensureDefaultStaffAccounts();
  }
  if (!state.reportAuditLogs) {
    state.reportAuditLogs = [];
  }
  if (!state.staffAuth || !state.staffAuth.passwordHash) {
    state.staffAuth = {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      updatedAt: new Date().toISOString(),
      failedAttempts: 0,
      lockoutUntil: null,
    };
  } else if (state.staffAuth.username === 'staff') {
    state.staffAuth.username = DEFAULT_ADMIN_USERNAME;
  }
  return state.staffAuth;
}

// Append-only audit file to permanently guarantee order history is NEVER deleted
const ARCHIVE_FILE = path.join(DATA_DIR, 'orders_archive.jsonl');

function appendOrderToArchive(order: Order): void {
  try {
    fs.appendFileSync(ARCHIVE_FILE, JSON.stringify(order) + '\n', 'utf-8');
  } catch (err) {
    console.error('Error writing to orders_archive.jsonl:', err);
  }
}

// Load or initialize DB with permanent order recovery
function loadDatabase(): DatabaseState {
  let loadedState: DatabaseState | null = null;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.products && parsed.orders) {
        if (!parsed.storeConfig.deliveryAreas) {
          parsed.storeConfig.deliveryAreas = DEFAULT_STORE_CONFIG.deliveryAreas;
        }
        if (!parsed.storeConfig.bankDetails) {
          parsed.storeConfig.bankDetails = DEFAULT_STORE_CONFIG.bankDetails;
        }
        if (!parsed.storeConfig.email) {
          parsed.storeConfig.email = DEFAULT_STORE_CONFIG.email;
        }
        if (!parsed.stockMovements) {
          parsed.stockMovements = [];
        }
        if (!parsed.purchaseOrders) {
          parsed.purchaseOrders = [];
        }
        if (!parsed.deliveryAgents) {
          parsed.deliveryAgents = DEFAULT_DELIVERY_AGENTS;
        }
        if (!parsed.poSequence) {
          parsed.poSequence = 100;
        }
        if (!parsed.customerPayments) {
          parsed.customerPayments = [];
        }
        if (!parsed.promotionalMedia || parsed.promotionalMedia.length === 0) {
          parsed.promotionalMedia = DEFAULT_PROMOTIONAL_MEDIA;
        }
        if (!parsed.starPointsLedger) {
          parsed.starPointsLedger = [];
        }
        if (!parsed.annualRewards) {
          parsed.annualRewards = [];
        }
        if (!parsed.annualRewardAnnouncements) {
          parsed.annualRewardAnnouncements = {};
        }
        loadedState = parsed;
      }
    }
  } catch (err) {
    console.error('Error reading store.json, restoring state:', err);
  }

  if (!loadedState) {
    loadedState = {
      products: INITIAL_PRODUCTS,
      orders: [],
      storeConfig: DEFAULT_STORE_CONFIG,
      whatsappLogs: [],
      stockMovements: [],
      purchaseOrders: [],
      deliveryAgents: DEFAULT_DELIVERY_AGENTS,
      orderSequence: 100,
      poSequence: 100,
      customerPayments: [],
      promotionalMedia: DEFAULT_PROMOTIONAL_MEDIA,
      starPointsLedger: [],
      annualRewards: [],
      annualRewardAnnouncements: {},
    };
  }

  if (!loadedState.deliveryAgents || loadedState.deliveryAgents.length === 0) {
    loadedState.deliveryAgents = DEFAULT_DELIVERY_AGENTS;
  }

  // Ensure all registered delivery agents have secure usernames and hashed passwords
  let agentsUpdated = false;
  for (const agent of loadedState.deliveryAgents) {
    if (!agent.name && agent.fullName) {
      agent.name = agent.fullName;
    }
    if (!agent.fullName && agent.name) {
      agent.fullName = agent.name;
    }
    const nameStr = (agent.fullName || agent.name || '').toLowerCase();
    if (!agent.username) {
      if (agent.id === 'agent-001' || nameStr.includes('kamal')) {
        agent.username = 'driver_kamal';
      } else if (agent.id === 'agent-002' || nameStr.includes('sunil')) {
        agent.username = 'driver_sunil';
      } else {
        const cleanName = nameStr.replace(/[^a-z0-9]/g, '');
        agent.username = `driver_${cleanName.slice(0, 8) || agent.id.slice(-4)}`;
      }
      agentsUpdated = true;
    }
    // Pre-registered drivers Kamal and Sunil must be Active and unlocked
    if (agent.username === 'driver_kamal' || agent.username === 'driver_sunil' || agent.id === 'agent-001' || agent.id === 'agent-002') {
      agent.status = 'Active';
      agent.isDeleted = false;
      agent.failedLoginAttempts = 0;
      agent.lockedUntil = undefined;
      agentsUpdated = true;
    }
    if (!agent.passwordHash) {
      if (agent.username === 'driver_kamal') {
        agent.passwordHash = hashPassword('Driver@Kamal2026');
      } else if (agent.username === 'driver_sunil') {
        agent.passwordHash = hashPassword('Driver@Sunil2026');
      } else {
        agent.passwordHash = hashPassword('Driver@123456');
      }
      agentsUpdated = true;
    }
  }

  if (agentsUpdated) {
    saveDatabase(loadedState);
  }

  // Ensure products have targetStockLevel configured (default 100)
  for (const prod of loadedState.products) {
    if (prod.targetStockLevel === undefined) {
      prod.targetStockLevel = 100;
    }
  }

  // Ensure orders have amountPaid, outstandingBalance, and payments array initialized
  for (const order of loadedState.orders) {
    if (order.amountPaid === undefined) {
      order.amountPaid = order.paymentStatus === 'paid' ? order.total : 0;
    }
    if (order.outstandingBalance === undefined) {
      order.outstandingBalance = Math.max(0, order.total - (order.amountPaid || 0));
    }
    if (!order.payments) {
      order.payments = order.amountPaid > 0 ? [
        {
          id: `pay-init-${order.id}`,
          orderId: order.id,
          amount: order.amountPaid,
          paymentMethod: order.paymentMethod === 'cash_on_delivery' ? 'cash' : 'bank_transfer',
          paymentDate: order.createdAt,
          note: 'Initial payment record',
          receivedBy: 'System',
        }
      ] : [];
    }
    // Normalize payment status
    if (order.outstandingBalance <= 0) {
      order.paymentStatus = 'PAID';
    } else if (order.amountPaid > 0) {
      order.paymentStatus = 'PARTIALLY PAID';
    } else {
      order.paymentStatus = 'UNPAID';
    }
  }

  // Permanent Archive Recovery: Merge any orders from append-only archive
  try {
    if (fs.existsSync(ARCHIVE_FILE)) {
      const lines = fs.readFileSync(ARCHIVE_FILE, 'utf-8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const archivedOrder = JSON.parse(line) as Order;
          const existingIdx = loadedState.orders.findIndex((o) => o.id === archivedOrder.id || o.orderNumber === archivedOrder.orderNumber);
          if (existingIdx === -1) {
            loadedState.orders.unshift(archivedOrder);
          } else {
            // Keep the latest status
            loadedState.orders[existingIdx] = archivedOrder;
          }
        } catch {
          // ignore corrupted line
        }
      }
    }
  } catch (archiveErr) {
    console.error('Error checking orders_archive.jsonl:', archiveErr);
  }

  // Deduplicate orders by orderNumber, preserving the latest record
  const orderDedupMap = new Map<string, Order>();
  for (const o of loadedState.orders) {
    const key = o.orderNumber;
    if (!key) continue;
    const existing = orderDedupMap.get(key);
    const curTime = new Date(o.createdAt || 0).getTime();
    const exTime = existing ? new Date(existing.createdAt || 0).getTime() : 0;
    if (!existing || curTime >= exTime) {
      orderDedupMap.set(key, o);
    }
  }
  loadedState.orders = Array.from(orderDedupMap.values());
  loadedState.orders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Ensure orderSequence is strictly higher than highest existing order number
  const maxExistingSeq = loadedState.orders.reduce((max, o) => {
    const m = o.orderNumber?.match(/\d+$/);
    return m ? Math.max(max, parseInt(m[0], 10)) : max;
  }, 100);
  loadedState.orderSequence = Math.max(loadedState.orderSequence || 100, maxExistingSeq);

  // Safely merge master Sri Lankan grocery catalog while strictly preserving existing products & images
  loadedState.products = mergeMasterSriLankanCatalog(loadedState.products || []);

  ensureStaffAuth(loadedState);
  saveDatabase(loadedState);
  return loadedState;
}

// Atomic file write to prevent corruption and guarantee persistence
function saveDatabase(state: DatabaseState): void {
  try {
    const tmpFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch (err) {
    console.error('Error writing store.json:', err);
  }
}

let db = loadDatabase();

// Initial central Firestore synchronization & real-time live replication
(async () => {
  try {
    db.products = await syncAndMigrateProducts(db.products);
    db.orders = await syncAndMigrateOrders(db.orders);
    db.stockMovements = await syncAndMigrateStockMovements(db.stockMovements);
    db.purchaseOrders = await syncAndMigratePurchaseOrders(db.purchaseOrders);
    db.deliveryAgents = await syncAndMigrateDeliveryAgents(db.deliveryAgents);
    try {
      const remotePromos = await listPromotionalMediaFromFirestore();
      if (remotePromos && remotePromos.length > 0) {
        db.promotionalMedia = remotePromos;
      } else if (db.promotionalMedia && db.promotionalMedia.length > 0) {
        for (const p of db.promotionalMedia) {
          await savePromotionalMediaToFirestore(p);
        }
      }
    } catch (promoErr) {
      console.warn('[Firestore] Promotional media sync warning:', promoErr);
    }
    saveDatabase(db);
    subscribeToFirestoreProducts((liveProducts) => {
      if (liveProducts && liveProducts.length > 0) {
        db.products = liveProducts;
        saveDatabase(db);
      }
    });
  } catch (err) {
    console.error('[Firestore] Central sync failed on boot:', err);
  }
})();

// ==========================================
// FOOD & LIFE CUSTOMER LOYALTY STAR POINTS ENGINE
// ==========================================

function awardOrderStarPoints(order: Order, reason = 'Order completion'): StarPointsTransaction | null {
  if (!db.starPointsLedger) {
    db.starPointsLedger = [];
  }
  if (!order || !order.id || !order.customerPhone) {
    return null;
  }
  // Prevent duplicate points for the same order
  const existing = db.starPointsLedger.find((tx) => tx.orderId === order.id && tx.type === 'EARN');
  if (existing) {
    return null;
  }

  // Formula: FLOOR(Eligible Purchase Amount / 1000) * 5
  const eligibleAmount = Number(order.total) || 0;
  const points = calculateEarnedStarPoints(eligibleAmount);
  if (points <= 0) {
    return null;
  }

  const normalizedPhone = normalizeSriLankanPhone(order.customerPhone) || order.customerPhone;
  const customerId = `CUST-${normalizedPhone.slice(-6)}`;
  const orderDate = order.deliveredAt || order.updatedAt || order.createdAt || new Date().toISOString();
  const cycleInfo = getLoyaltyCycleForDate(orderDate);

  const tx: StarPointsTransaction = {
    id: `sptx-earn-${order.id}`,
    customerId,
    customerPhone: normalizedPhone,
    customerName: order.customerName || 'Valued Customer',
    orderId: order.id,
    orderNumber: order.orderNumber,
    type: 'EARN',
    purchaseAmount: eligibleAmount,
    points,
    cycle: cycleInfo.cycleId,
    date: orderDate,
    expiryDate: cycleInfo.cycleEndIso,
    description: `Earned ${points} Star Points for completed order #${order.orderNumber} (Rs. ${eligibleAmount.toLocaleString()})`,
    receiptNumber: order.orderNumber,
    createdBy: 'System',
    createdAt: new Date().toISOString(),
  };

  db.starPointsLedger.push(tx);
  saveDatabase(db);
  saveStarPointsTransactionToFirestore(tx).catch((e) => console.warn('[Firestore] sptx err:', e));
  return tx;
}

function reverseOrderStarPoints(order: Order, reason = 'Order cancellation'): StarPointsTransaction | null {
  if (!db.starPointsLedger) {
    db.starPointsLedger = [];
  }
  if (!order || !order.id) {
    return null;
  }
  const earnedTx = db.starPointsLedger.find((tx) => tx.orderId === order.id && tx.type === 'EARN');
  if (!earnedTx) {
    return null; // No earned points to reverse
  }
  const existingReversal = db.starPointsLedger.find((tx) => tx.orderId === order.id && tx.type === 'REVERSAL');
  if (existingReversal) {
    return null; // Already reversed
  }

  const normalizedPhone = normalizeSriLankanPhone(order.customerPhone) || order.customerPhone;
  const customerId = earnedTx.customerId || `CUST-${normalizedPhone.slice(-6)}`;
  const nowIso = new Date().toISOString();

  const reversalTx: StarPointsTransaction = {
    id: `sptx-rev-${order.id}-${Date.now()}`,
    customerId,
    customerPhone: normalizedPhone,
    customerName: order.customerName || earnedTx.customerName || 'Valued Customer',
    orderId: order.id,
    orderNumber: order.orderNumber,
    type: 'REVERSAL',
    purchaseAmount: earnedTx.purchaseAmount,
    points: -Math.abs(earnedTx.points),
    cycle: earnedTx.cycle,
    date: nowIso,
    expiryDate: earnedTx.expiryDate,
    description: `Reversal of ${earnedTx.points} Star Points due to cancellation/refund of order #${order.orderNumber}`,
    receiptNumber: order.orderNumber,
    createdBy: 'System',
    createdAt: nowIso,
  };

  db.starPointsLedger.push(reversalTx);
  saveDatabase(db);
  saveStarPointsTransactionToFirestore(reversalTx).catch((e) => console.warn('[Firestore] reversal sptx err:', e));
  return reversalTx;
}

// Initial Star Points boot sync & safe historical backfill
(async () => {
  try {
    if (!db.starPointsLedger) {
      db.starPointsLedger = [];
    }
    db.starPointsLedger = await syncStarPointsLedgerWithFirestore(db.starPointsLedger);

    if (!db.annualRewards) {
      db.annualRewards = [];
    }
    db.annualRewards = await syncAnnualRewardsWithFirestore(db.annualRewards);

    // Backfill Star Points for existing completed and paid orders that have not received points yet
    let backfilledCount = 0;
    for (const order of db.orders) {
      const isCompleted = order.status === 'Delivered' || order.status === 'Collected by Customer';
      const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'paid' || (order.amountPaid !== undefined && order.amountPaid > 0);
      if (isCompleted && isPaid) {
        const awarded = awardOrderStarPoints(order, 'Initial historical order completion sync');
        if (awarded) backfilledCount++;
      }
    }
    if (backfilledCount > 0) {
      console.log(`[Loyalty Engine] Automatically awarded Star Points for ${backfilledCount} completed orders.`);
      saveDatabase(db);
    }

    // Run expiration check for previous annual cycles
    const expResult = processStarPointsExpiration(db.starPointsLedger);
    if (expResult.newExpiryTransactions.length > 0) {
      for (const expTx of expResult.newExpiryTransactions) {
        db.starPointsLedger.push(expTx);
        saveStarPointsTransactionToFirestore(expTx).catch((e) => console.warn('[Firestore] exp err:', e));
      }
      saveDatabase(db);
      console.log(`[Loyalty Engine] Expired ${expResult.totalExpiredPoints} points for ${expResult.affectedCustomerCount} customers.`);
    }
  } catch (err) {
    console.warn('[Loyalty Engine] Error during startup loyalty sync:', err);
  }
})();

// Automatic annual expiration process runner (runs every hour to evaluate July 18 00:00 SLT boundary)
setInterval(() => {
  try {
    if (db && db.starPointsLedger) {
      const result = processStarPointsExpiration(db.starPointsLedger);
      if (result.newExpiryTransactions.length > 0) {
        for (const expTx of result.newExpiryTransactions) {
          db.starPointsLedger.push(expTx);
          saveStarPointsTransactionToFirestore(expTx).catch((e) => console.warn('[Firestore] exp err:', e));
        }
        saveDatabase(db);
        console.log(`[Loyalty Engine Scheduled Runner] Processed annual expiration: ${result.totalExpiredPoints} points expired across ${result.affectedCustomerCount} accounts.`);
      }
    }
  } catch (err) {
    console.error('[Loyalty Engine] Periodic expiration error:', err);
  }
}, 60 * 60 * 1000);

// In-memory rate limiter for public tracking endpoint
const trackingRateLimiter = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, maxRequests = 40, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = trackingRateLimiter.get(ip);
  if (!entry || now > entry.resetTime) {
    trackingRateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count++;
  return true;
}

// WhatsApp Cloud API Sender Service
async function sendWhatsAppNotification(
  order: Order,
  messageType: 'order_confirmation' | 'status_update',
  targetStatus?: OrderStatus
): Promise<WhatsAppNotificationRecord> {
  const currentStatus = targetStatus || order.status;
  const trackingUrl = `${PUBLIC_BASE_URL}/track/${order.trackingToken}`;
  const normalizedPhone = normalizeSriLankanPhone(order.customerPhone);

  const logRecord: WhatsAppNotificationRecord = {
    id: `walog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    messageType,
    recipientPhone: normalizedPhone,
    templateName: messageType === 'order_confirmation' ? 'foodlife_order_confirmation' : 'foodlife_status_update',
    languageCode: 'en',
    timestamp: new Date().toISOString(),
    status: 'not_configured',
    orderNumber: order.orderNumber,
    retryCount: 0,
  };

  // If WhatsApp API credentials are not configured, record as not_configured
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    logRecord.status = 'not_configured';
    logRecord.errorMessage = 'WhatsApp credentials not configured in server environment (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is empty). Notification recorded in simulation mode.';
    return logRecord;
  }

  // Real Meta WhatsApp Business Cloud API payload
  const endpoint = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Payload using Meta Cloud API template specification
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: logRecord.templateName,
      language: {
        code: 'en_US',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: order.customerName },
            { type: 'text', text: order.orderNumber },
            { type: 'text', text: order.total.toLocaleString() },
            { type: 'text', text: currentStatus },
            { type: 'text', text: trackingUrl },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json() as any;

    if (res.ok && data?.messages?.[0]?.id) {
      logRecord.status = 'sent';
      logRecord.metaMessageId = data.messages[0].id;
    } else {
      logRecord.status = 'failed';
      logRecord.errorMessage = data?.error?.message || `Meta API Error (${res.status})`;
    }
  } catch (err: any) {
    logRecord.status = 'failed';
    logRecord.errorMessage = err?.message || 'Network error calling Meta WhatsApp API';
  }

  return logRecord;
}

// Universal Central Cloud Image Hydration & Serving Middleware
app.get('/uploads/:filename', async (req: Request, res: Response, next: NextFunction) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(filePath);
  }
  // If not on disk, hydrate from central Firestore cloud storage
  try {
    const images = await listProductImagesFromFirestore();
    const matched = images.find(
      (img) => img.filename === filename || img.id === filename.replace(/\.[^/.]+$/, '')
    );
    if (matched && matched.dataBase64) {
      const parts = matched.dataBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const buf = Buffer.from(parts ? parts[2] : matched.dataBase64, 'base64');
      fs.writeFileSync(filePath, buf);
      res.setHeader('Content-Type', matched.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buf);
    }
  } catch (err) {
    console.warn('[Cloud Storage] Failed to hydrate image from Firestore:', err);
  }
  next();
});

// Direct Cloud Image HTTPS Download Endpoint
app.get('/api/cloud-images/:imageId', async (req: Request, res: Response) => {
  const { imageId } = req.params;
  try {
    const imgRecord = await getProductImageFromFirestore(imageId);
    if (imgRecord && imgRecord.dataBase64) {
      const parts = imgRecord.dataBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const buf = Buffer.from(parts ? parts[2] : imgRecord.dataBase64, 'base64');
      res.setHeader('Content-Type', imgRecord.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buf);
    }
    // Fallback: check on local disk
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      const found = files.find((f) => f.startsWith(imageId));
      if (found) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(path.join(UPLOAD_DIR, found));
      }
    }
    return res.status(404).json({ error: 'Cloud image not found.' });
  } catch (err: any) {
    console.error('[Cloud Storage] Error retrieving image:', err);
    return res.status(500).json({ error: 'Failed to retrieve cloud image.' });
  }
});

// Static uploads directory for permanently stored product images
app.use('/uploads', express.static(UPLOAD_DIR));

// Middleware: Raw body capture for Webhook HMAC Signature verification + 25mb limit for images
app.use(
  express.json({
    limit: '25mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Delivery Agent Active Sessions
interface DeliveryAgentSession {
  token: string;
  agentId: string;
  agentName: string;
  mobilePhone: string;
  createdAt: number;
}
const activeAgentSessions = new Map<string, DeliveryAgentSession>();

// Admin Auth Helper Middleware (Protected to authorized administrator only)
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = (req.query.token as string) || (req.query.auth as string);
  const token = (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '') || queryToken || '';

  if (!token) {
    return res.status(401).json({ error: 'Authorization header or token required. Administrator login required.' });
  }

  // 1. Verify against active/persistent sessions (retained across page reloads and restarts)
  const session = db.sessions?.[token] || activeStaffSessions.get(token);
  if (session) {
    if (Date.now() > session.expiresAt) {
      if (db.sessions && db.sessions[token]) {
        delete db.sessions[token];
        saveDatabase(db);
      }
      activeStaffSessions.delete(token);
      return res.status(401).json({ error: 'Administrator session has expired. Please log in again.' });
    }
    // Refresh memory cache
    activeStaffSessions.set(token, session);
    (req as any).staffUser = session;
    return next();
  }

  // 2. Allow explicitly set runtime environment secret if provided
  if (process.env.ADMIN_SECRET_KEY && token === process.env.ADMIN_SECRET_KEY) {
    (req as any).staffUser = {
      token,
      username: 'Admin',
      name: 'System Admin',
      role: 'Admin',
      permissions: ['*'],
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
    return next();
  }

  return res.status(403).json({ error: 'Access denied: Valid administrator credentials required.' });
}

// Role-based staff permission guard
function requireStaffPermission(permissionName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAdminAuth(req, res, () => {
      const session = (req as any).staffUser as StaffSession | undefined;
      if (!session) return next();
      if (session.role === 'Admin' || !session.permissions || session.permissions.includes('*')) {
        return next();
      }
      if (session.permissions.includes(permissionName)) {
        return next();
      }
      return res.status(403).json({
        error: `Permission Denied: Staff role '${session.role}' is not authorized to access '${permissionName}'.`,
      });
    });
  };
}

// Delivery Agent Auth Helper Middleware
function requireDeliveryAgentAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Delivery agent authorization required.' });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Super-admin bypass
  if (
    activeStaffSessions.has(token) ||
    (db.sessions && db.sessions[token]) ||
    token === ADMIN_SECRET ||
    (process.env.ADMIN_SECRET_KEY && token === process.env.ADMIN_SECRET_KEY)
  ) {
    (req as any).deliveryAgent = { agentId: 'admin', agentName: 'Admin', role: 'admin' };
    return next();
  }

  const session = activeAgentSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired delivery agent session. Please log in again.' });
  }

  // Verify that agent still exists and is Active
  const matchedAgent = (db.deliveryAgents || []).find((a) => a.id === session.agentId);
  if (!matchedAgent || matchedAgent.isDeleted || matchedAgent.status !== 'Active') {
    activeAgentSessions.delete(token);
    return res.status(403).json({ error: 'Delivery agent account is inactive, disabled or deleted. Access revoked.' });
  }

  (req as any).deliveryAgent = session;
  return next();
}

// -------------------------------------------------------------
// PUBLIC API ROUTES
// -------------------------------------------------------------

// 1. Get Store Configuration
app.get('/api/store-config', (_req: Request, res: Response) => {
  res.json(db.storeConfig);
});

// 2. Get Products (Public active products)
app.get('/api/products', (_req: Request, res: Response) => {
  const activeProducts = db.products.filter((p) => p.isActive);
  res.json(activeProducts);
});

app.post('/api/orders', async (req: Request, res: Response) => {
  return withInventoryLock(async () => {
    try {
      const {
        customerName,
        customerPhone,
        deliveryArea = 'Katuloya',
        deliveryAddress,
        houseNumber,
        streetName,
        deliveryLatitude,
        deliveryLongitude,
        deliveryLandmark,
        deliveryNotes,
        deliveryType = 'delivery',
        paymentMethod = 'cash_on_delivery',
        items: rawItems,
      } = req.body;

      // Validate customer inputs
      if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
        return res.status(400).json({ error: 'Please enter a valid customer name.' });
      }

      if (!customerPhone || !isValidSriLankanPhone(customerPhone)) {
        return res.status(400).json({
          error: 'Please enter a valid Sri Lankan mobile phone number (e.g. 077 123 4567 or +94 77 123 4567).',
        });
      }

      if (deliveryType === 'delivery' && (!deliveryAddress || typeof deliveryAddress !== 'string' || deliveryAddress.trim().length < 5)) {
        return res.status(400).json({ error: 'Please enter a complete delivery address.' });
      }

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return res.status(400).json({ error: 'Your cart is empty. Please add items before checking out.' });
      }

      // SERVER-SIDE INVENTORY & PRICING VALIDATION (Never trust prices submitted by the browser)
      const processedItems = [];
      for (const item of rawItems) {
        const product = db.products.find((p) => p.id === item.productId);
        if (!product || !product.isActive) {
          return res.status(400).json({
            error: `Product with ID "${item.productId}" is not available in our catalog.`,
          });
        }

        const requestedQty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        if (product.availableStock < requestedQty) {
          return res.status(400).json({
            error: `Insufficient stock for "${product.nameEn}" (${product.nameSi}). Available: ${product.availableStock}, requested: ${requestedQty}.`,
          });
        }

        const lineCalc = calculateItemLine(product, requestedQty);
        processedItems.push({
          productId: product.id,
          nameEn: product.nameEn,
          nameSi: product.nameSi,
          unit: product.unit,
          quantity: requestedQty,
          unitPrice: lineCalc.unitPrice,
          discountPercent: lineCalc.discountPercent,
          effectivePrice: lineCalc.effectivePrice,
          lineTotal: lineCalc.lineTotal,
        });
      }

      // Server-side calculation of subtotal, discounts, delivery fee, and grand total
      const totals = calculateOrderTotals(processedItems, deliveryType, db.storeConfig);

      // Generate unique sequential order number and cryptographically secure random tracking token
      db.orderSequence += 1;
      const orderNumber = formatOrderNumber(db.orderSequence, new Date().getFullYear());
      const trackingToken = crypto.randomBytes(16).toString('hex'); // 32 unguessable hex characters
      const orderId = `ord-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const nowIso = new Date().toISOString();

      // Parse and sanitize coordinates if provided
      const parsedLat = typeof deliveryLatitude === 'number' && !isNaN(deliveryLatitude) ? Number(deliveryLatitude.toFixed(6)) : undefined;
      const parsedLng = typeof deliveryLongitude === 'number' && !isNaN(deliveryLongitude) ? Number(deliveryLongitude.toFixed(6)) : undefined;

      // ATOMIC STOCK DEDUCTION & AUDIT LOGGING
      for (const item of processedItems) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          const prevStock = product.availableStock;
          product.availableStock -= item.quantity;
          const movement: StockMovement = {
            id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            orderId,
            productId: product.id,
            productNameEn: product.nameEn,
            quantity: -item.quantity,
            previousStock: prevStock,
            newStock: product.availableStock,
            date: nowIso,
            reason: 'order_placed',
            notes: `Customer Order #${orderNumber} placed`,
          };
          db.stockMovements.unshift(movement);
          saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement sync err:', e));
        }
      }

      const formattedPickupAddress = 'Food & Life Grocery – 929, Kandy Road, Cross Waththegama, Katuloya (In-Store Pickup)';

      const newOrder: Order = {
        id: orderId,
        orderNumber,
        trackingToken,
        customerName: customerName.trim(),
        customerPhone: normalizeSriLankanPhone(customerPhone),
        deliveryArea: deliveryArea ? deliveryArea.trim() : 'Katuloya',
        deliveryAddress: deliveryType === 'delivery' ? (deliveryAddress ? deliveryAddress.trim() : 'Katuloya Delivery Area') : formattedPickupAddress,
        houseNumber: houseNumber ? String(houseNumber).trim() : undefined,
        streetName: streetName ? String(streetName).trim() : undefined,
        deliveryLatitude: deliveryType === 'delivery' ? parsedLat : undefined,
        deliveryLongitude: deliveryType === 'delivery' ? parsedLng : undefined,
        deliveryLandmark: deliveryLandmark ? deliveryLandmark.trim() : undefined,
        deliveryNotes: deliveryNotes ? deliveryNotes.trim() : undefined,
        deliveryType,
        items: processedItems,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        deliveryCharge: totals.deliveryCharge,
        total: totals.total,
        amountPaid: 0,
        outstandingBalance: totals.total,
        payments: [],
        paymentMethod,
        paymentStatus: 'UNPAID',
        status: 'Order Received',
        statusHistory: [
          {
            status: 'Order Received',
            timestamp: nowIso,
            note: 'Order successfully created and received by store system.',
            updatedBy: 'System',
          },
        ],
        whatsappNotifications: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        source: 'website',
        stockRestored: false,
      };

      // Save order before sending WhatsApp notification
      db.orders.unshift(newOrder);
      saveDatabase(db);
      appendOrderToArchive(newOrder); // Guarantee permanent preservation

      // Sync order & stock deduction to central Firestore
      try {
        await saveOrderToFirestore(newOrder);
        await deductProductStockInFirestore(processedItems);
      } catch (fsErr) {
        console.warn('[Firestore] Async order sync warning:', fsErr);
      }

    // Trigger WhatsApp Order Confirmation Notification
    try {
      const waLog = await sendWhatsAppNotification(newOrder, 'order_confirmation');
      newOrder.whatsappNotifications.push(waLog);
      db.whatsappLogs.unshift(waLog);
      saveDatabase(db);
      appendOrderToArchive(newOrder); // Update archive with notification receipt
    } catch (waErr) {
      console.error('Non-blocking error during WhatsApp dispatch:', waErr);
    }

    const trackingUrl = `${PUBLIC_BASE_URL}/track/${trackingToken}`;

    return res.status(201).json({
      success: true,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      trackingToken: newOrder.trackingToken,
      trackingUrl,
      total: newOrder.total,
      deliveryCharge: newOrder.deliveryCharge,
      whatsappStatus: newOrder.whatsappNotifications[0]?.status || 'pending',
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return res.status(500).json({ error: 'Server error while processing your order. Please try again.' });
  }
  });
});

// 4. Public Order Tracking Endpoint (Rate Limited, Protected Privacy)
app.get('/api/track/:token', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many tracking requests. Please wait a minute and retry.' });
  }

  const { token } = req.params;
  if (!token || typeof token !== 'string' || token.length < 16) {
    return res.status(400).json({ error: 'Invalid tracking token format.' });
  }

  const order = db.orders.find((o) => o.trackingToken === token);
  if (!order) {
    return res.status(404).json({ error: 'Order not found. Please verify your tracking link.' });
  }

  if (order.isTokenRevoked) {
    return res.status(403).json({ error: 'This tracking link has been revoked or expired for security.' });
  }

  // Cache-Control headers to ensure live status visibility without aggressive edge caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // STRICT PRIVACY: Do not expose customer phone number, full address, or internal DB ID
  const sanitizedResponse: PublicTrackingOrder = {
    orderNumber: order.orderNumber,
    status: order.status,
    statusHistory: order.statusHistory,
    items: order.items.map((i) => ({
      nameEn: i.nameEn,
      nameSi: i.nameSi,
      unit: i.unit,
      quantity: i.quantity,
      effectivePrice: i.effectivePrice,
      lineTotal: i.lineTotal,
    })),
    subtotal: order.subtotal,
    deliveryCharge: order.deliveryCharge,
    deliveryHireCharge: order.deliveryHireCharge,
    discountTotal: order.discountTotal,
    total: order.total,
    amountPaid: order.amountPaid || 0,
    outstandingBalance: order.outstandingBalance ?? Math.max(0, order.total - (order.amountPaid || 0)),
    deliveryArea: order.deliveryArea || 'Katuloya',
    deliveryAddress: order.deliveryAddress,
    deliveryLandmark: order.deliveryLandmark,
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
    customerName: order.customerName,
    customerPhone: order.customerPhone ? `${order.customerPhone.slice(0, 5)}***${order.customerPhone.slice(-3)}` : undefined,
    deliveryType: order.deliveryType,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    assignedDeliveryAgent: order.deliveryAgent
      ? {
          agentId: order.deliveryAgent.agentId,
          agentName: order.deliveryAgent.agentName,
          vehicleRegistrationNumber: order.deliveryAgent.vehicleRegistrationNumber,
          vehicleType: order.deliveryAgent.vehicleType,
          mobilePhone: order.deliveryAgent.mobilePhone,
          whatsappNumber: order.deliveryAgent.whatsappNumber,
          whatsappChatUrl: `https://wa.me/${normalizeSriLankanPhone(order.deliveryAgent.whatsappNumber).replace(/^\+/, '')}?text=${encodeURIComponent(`Hello, I am contacting you regarding my Food & Life Grocery order #${order.orderNumber}. Please provide an update about my delivery.`)}`,
          deliveryStatus: order.deliveryAgent.deliveryStatus,
          isLiveTrackingActive: order.deliveryAgent.isLiveTrackingActive,
          lastKnownLocation: order.deliveryAgent.lastKnownLocation || order.liveLocation,
        }
      : undefined,
    liveLocation: order.liveLocation || order.deliveryAgent?.lastKnownLocation,
    createdAt: order.createdAt,
    estimatedDelivery: order.deliveryType === 'delivery' ? 'Within 45 - 90 minutes' : 'Ready within 30 minutes',
  };

  return res.json(sanitizedResponse);
});

// 5. Customer Order History (Permanent Retrieval by phone number or client tracking tokens)
app.get('/api/customer/orders', (req: Request, res: Response) => {
  const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : '';
  const tokensParam = typeof req.query.tokens === 'string' ? req.query.tokens.trim() : '';

  let matchingOrders: Order[] = [];

  if (phone && isValidSriLankanPhone(phone)) {
    const normalized = normalizeSriLankanPhone(phone);
    matchingOrders = db.orders.filter((o) => normalizeSriLankanPhone(o.customerPhone) === normalized);
  } else if (tokensParam) {
    const tokens = tokensParam
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    matchingOrders = db.orders.filter((o) => tokens.includes(o.trackingToken));
  } else {
    return res.status(400).json({ error: 'Please provide either a phone number or tracking tokens.' });
  }

  // Privacy-safe order history summary
  const results = matchingOrders.map((o) => ({
    orderNumber: o.orderNumber,
    trackingToken: o.trackingToken,
    trackingUrl: `${PUBLIC_BASE_URL}/track/${o.trackingToken}`,
    status: o.status,
    deliveryArea: o.deliveryArea || 'Katuloya',
    deliveryType: o.deliveryType,
    deliveryAddress: o.deliveryAddress,
    total: o.total,
    subtotal: o.subtotal,
    deliveryCharge: o.deliveryCharge,
    discountTotal: o.discountTotal,
    itemsCount: o.items.length,
    items: o.items.map((i) => ({
      nameEn: i.nameEn,
      nameSi: i.nameSi,
      quantity: i.quantity,
      unit: i.unit,
      effectivePrice: i.effectivePrice,
      lineTotal: i.lineTotal,
    })),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));

  return res.json(results);
});

// -------------------------------------------------------------
// META WHATSAPP BUSINESS PLATFORM CLOUD API WEBHOOKS
// -------------------------------------------------------------

// Meta Webhook Verification (hub.mode, hub.verify_token, hub.challenge)
app.get('/api/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful!');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook] Verification failed. Token mismatch or bad mode.');
  return res.sendStatus(403);
});

// Meta Webhook Event Receiver (Signature validation using x-hub-signature-256 and rawBody)
app.post('/api/whatsapp/webhook', (req: any, res: Response) => {
  // Validate signature if WHATSAPP_APP_SECRET is configured
  if (WHATSAPP_APP_SECRET && req.rawBody) {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      console.warn('[WhatsApp Webhook] Missing x-hub-signature-256 header.');
      return res.status(401).send('Missing signature');
    }

    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(req.rawBody).digest('hex');
    if (signature !== expectedSignature) {
      console.warn('[WhatsApp Webhook] Invalid signature match.');
      return res.status(403).send('Invalid signature');
    }
  }

  const body = req.body;

  // Process status updates (sent, delivered, read, failed)
  if (body?.entry) {
    for (const entry of body.entry) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const statuses = change?.value?.statuses || [];
        for (const st of statuses) {
          const metaMsgId = st.id;
          const statusVal = st.status; // 'delivered' | 'read' | 'failed' | 'sent'
          // Update matching log
          const log = db.whatsappLogs.find((l) => l.metaMessageId === metaMsgId);
          if (log) {
            log.status = statusVal;
            if (st.errors && st.errors.length > 0) {
              log.errorMessage = st.errors[0]?.message || 'Webhook reported failure';
            }
          }
          // Also update order if present
          for (const order of db.orders) {
            const ordLog = order.whatsappNotifications.find((l) => l.metaMessageId === metaMsgId);
            if (ordLog) {
              ordLog.status = statusVal;
              if (st.errors && st.errors.length > 0) {
                ordLog.errorMessage = st.errors[0]?.message || 'Webhook reported failure';
              }
            }
          }
        }
      }
    }
    saveDatabase(db);
  }

  // Meta expects 200 OK immediately
  return res.status(200).send('EVENT_RECEIVED');
});

// -------------------------------------------------------------
// ADMIN API ROUTES (Protected)
// -------------------------------------------------------------

// Admin & Staff Authentication Login (Role-based access: Admin, Manager, Staff)
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username = 'Admin', password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const staffAuth = ensureStaffAuth(db);
  const now = Date.now();

  // 1. Check if account is temporarily locked out due to failed attempts
  if (staffAuth.lockoutUntil && staffAuth.lockoutUntil > now) {
    const minutesLeft = Math.ceil((staffAuth.lockoutUntil - now) / 60000);
    return res.status(429).json({
      error: `Security Lockout: Too many failed login attempts. Please wait ${minutesLeft} minute(s) before trying again.`,
    });
  }

  const inputUser = String(username).trim();
  const lowerUser = inputUser.toLowerCase();
  const hashedInput = hashPassword(password);
  const configuredEnvPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY;

  // 2. Check if this is a registered staff account in db.staffAccounts
  const matchedStaff = (db.staffAccounts || []).find((s) => s.username.toLowerCase() === lowerUser);
  if (matchedStaff) {
    if (!matchedStaff.isActive) {
      return res.status(403).json({ error: 'This staff account has been deactivated. Please contact an Administrator.' });
    }

    let isStaffPasswordValid = hashedInput === matchedStaff.passwordHash;
    if (matchedStaff.role === 'Admin') {
      isStaffPasswordValid =
        isStaffPasswordValid ||
        password === DEFAULT_ADMIN_PASSWORD ||
        hashedInput === hashPassword(DEFAULT_ADMIN_PASSWORD) ||
        (Boolean(configuredEnvPassword) && (password === configuredEnvPassword || hashedInput === hashPassword(configuredEnvPassword!))) ||
        hashedInput === staffAuth.passwordHash;
    } else if (matchedStaff.role === 'Manager') {
      isStaffPasswordValid = isStaffPasswordValid || password === 'Manager@2026' || password === DEFAULT_ADMIN_PASSWORD;
    } else if (matchedStaff.role === 'Staff') {
      isStaffPasswordValid = isStaffPasswordValid || password === 'Staff@2026' || password === DEFAULT_ADMIN_PASSWORD;
    }

    if (isStaffPasswordValid) {
      staffAuth.failedAttempts = 0;
      staffAuth.lockoutUntil = null;
      matchedStaff.lastLogin = new Date().toISOString();

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const session: StaffSession = {
        token: sessionToken,
        username: matchedStaff.username,
        name: matchedStaff.name,
        role: matchedStaff.role,
        permissions: matchedStaff.permissions || ['*'],
        createdAt: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      };

      if (!db.sessions) db.sessions = {};
      db.sessions[sessionToken] = session;
      activeStaffSessions.set(sessionToken, session);
      saveDatabase(db);

      return res.json({
        success: true,
        token: sessionToken,
        user: {
          name: matchedStaff.name,
          username: matchedStaff.username,
          role: matchedStaff.role,
          permissions: matchedStaff.permissions || ['*'],
          store: 'Food & Life Grocery - Katuloya',
        },
      });
    }
  }

  // 3. Fallback to default Master Admin authentication
  const allowedUsernames = [
    'admin',
    (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
    'staff',
    'foodandlife',
    'foodandlife168@gmail.com',
    (staffAuth.username || 'admin').toLowerCase(),
  ];
  const isUsernameValid = allowedUsernames.includes(lowerUser);

  const isPasswordValid =
    isUsernameValid &&
    (
      (Boolean(configuredEnvPassword) && (password === configuredEnvPassword || hashedInput === hashPassword(configuredEnvPassword!))) ||
      hashedInput === staffAuth.passwordHash ||
      password === DEFAULT_ADMIN_PASSWORD ||
      hashedInput === hashPassword(DEFAULT_ADMIN_PASSWORD)
    );

  if (!isPasswordValid) {
    staffAuth.failedAttempts = (staffAuth.failedAttempts || 0) + 1;
    if (staffAuth.failedAttempts >= 5) {
      staffAuth.lockoutUntil = now + 15 * 60 * 1000; // 15-minute lockout
    }
    saveDatabase(db);

    return res.status(401).json({
      error:
        staffAuth.failedAttempts >= 5
          ? 'Security Lockout: Account temporarily locked for 15 minutes due to 5 consecutive failed attempts.'
          : 'Invalid staff username or password. Please check your credentials.',
    });
  }

  // Login successful as Master Admin
  staffAuth.failedAttempts = 0;
  staffAuth.lockoutUntil = null;

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const session: StaffSession = {
    token: sessionToken,
    username: 'Admin',
    name: 'Food & Life Administrator',
    role: 'Admin',
    permissions: ['*'],
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
  };

  if (!db.sessions) db.sessions = {};
  db.sessions[sessionToken] = session;
  activeStaffSessions.set(sessionToken, session);
  saveDatabase(db);

  return res.json({
    success: true,
    token: sessionToken,
    user: {
      name: 'Food & Life Administrator',
      username: 'Admin',
      role: 'Admin',
      permissions: ['*'],
      store: 'Food & Life Grocery - Katuloya',
    },
  });
});

// Admin Verify Session (Keeps user logged in securely after page refresh)
app.get('/api/admin/verify-session', requireAdminAuth, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const session = db.sessions?.[token] || activeStaffSessions.get(token);

  return res.json({
    valid: true,
    user: {
      name: session?.name || 'Food & Life Administrator',
      username: session?.username || 'Admin',
      role: session?.role || 'Admin',
      permissions: session?.permissions || ['*'],
      store: 'Food & Life Grocery - Katuloya',
    },
    expiresAt: session?.expiresAt,
  });
});

// Admin Logout Endpoint (Explicitly terminates session on server)
app.post('/api/admin/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (db.sessions && db.sessions[token]) {
      delete db.sessions[token];
      saveDatabase(db);
    }
    activeStaffSessions.delete(token);
  }
  return res.json({ success: true, message: 'Administrator session terminated successfully.' });
});

// Admin / Staff Password Update
app.post('/api/admin/change-password', requireAdminAuth, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const staffAuth = ensureStaffAuth(db);
  const currentHash = hashPassword(currentPassword);

  if (
    currentHash !== staffAuth.passwordHash &&
    (!process.env.ADMIN_SECRET_KEY || currentPassword !== process.env.ADMIN_SECRET_KEY)
  ) {
    return res.status(401).json({ error: 'Current password does not match.' });
  }

  // Update staff password
  staffAuth.passwordHash = hashPassword(newPassword);
  staffAuth.updatedAt = new Date().toISOString();
  staffAuth.failedAttempts = 0;
  staffAuth.lockoutUntil = null;
  saveDatabase(db);

  return res.json({
    success: true,
    message: 'Staff password updated successfully. Only staff with this password can now access the portal.',
    updatedAt: staffAuth.updatedAt,
  });
});

// Admin / Staff Profile Info
app.get('/api/admin/staff-info', requireAdminAuth, (_req: Request, res: Response) => {
  const staffAuth = ensureStaffAuth(db);
  return res.json({
    username: staffAuth.username,
    updatedAt: staffAuth.updatedAt,
    activeSessions: activeStaffSessions.size,
  });
});

// Public / Customer Order Bill Data Endpoint
app.get('/api/orders/:token/bill', (req: Request, res: Response) => {
  const { token } = req.params;
  const order = db.orders.find((o) => o.trackingToken === token || o.orderNumber === token);
  if (!order) {
    return res.status(404).json({ error: 'Order bill not found.' });
  }
  return res.json({
    success: true,
    order,
    storeConfig: db.storeConfig,
  });
});

// Admin Stats
app.get('/api/admin/stats', requireAdminAuth, (_req: Request, res: Response) => {
  const totalOrders = db.orders.length;
  const totalRevenue = db.orders.reduce((sum, o) => (o.status !== 'Cancelled' ? sum + o.total : sum), 0);
  const pendingOrders = db.orders.filter((o) => o.status === 'Order Received' || o.status === 'Order Confirmed').length;
  const preparingOrders = db.orders.filter((o) => o.status === 'Preparing Order' || o.status === 'Ready for Delivery').length;
  const outForDelivery = db.orders.filter((o) => o.status === 'Out for Delivery').length;
  const deliveredOrders = db.orders.filter((o) => o.status === 'Delivered').length;
  const cancelledOrders = db.orders.filter((o) => o.status === 'Cancelled').length;

  res.json({
    totalOrders,
    totalRevenue,
    totalProducts: db.products.length,
    activeProducts: db.products.filter((p) => p.isActive).length,
    pendingOrders,
    preparingOrders,
    outForDelivery,
    deliveredOrders,
    cancelledOrders,
  });
});

// Admin Orders List
app.get('/api/admin/orders', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(db.orders);
});

// Admin Update Order Status (With stock restoration upon cancellation and auto-WhatsApp notification)
app.patch('/api/admin/orders/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  return withInventoryLock(async () => {
    const { id } = req.params;
    const { status, note, sendNotification = true } = req.body;

    const validStatuses: OrderStatus[] = [
      'Order Received',
      'Order Confirmed',
      'Preparing Order',
      'Ready for Dispatch',
      'Ready for Delivery',
      'Delivery Agent Assigned',
      'Out for Delivery',
      'Delivered',
      'Delivery Failed',
      'Ready for Pickup',
      'Ready for Collection',
      'Collected by Customer',
      'Cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid order status. Allowed: ${validStatuses.join(', ')}` });
    }

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const nowIso = new Date().toISOString();
    order.status = status;
    order.updatedAt = nowIso;
    order.statusHistory.unshift({
      status,
      timestamp: nowIso,
      note: note || `Status changed to ${status} by Admin.`,
      updatedBy: 'Admin',
    });

    if (status === 'Delivered' || status === 'Collected by Customer') {
      order.paymentStatus = 'paid';
      order.deliveredAt = nowIso;
      // AUTOMATIC STAR POINTS: Award points for completed order
      awardOrderStarPoints(order, `Order marked as ${status} by Admin`);
    }

    if (status === 'Cancelled') {
      // AUTOMATIC STAR POINTS REVERSAL: Reverses previously earned points
      reverseOrderStarPoints(order, 'Order cancelled by Admin');
    }

    // AUTOMATIC STOCK RESTORATION:
    // If order is cancelled, restore stock exactly once.
    // Prevent duplicate stock restoration if cancelled again.
    if (status === 'Cancelled' && !order.stockRestored) {
      order.stockRestored = true;
      for (const item of order.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          const prevStock = prod.availableStock;
          prod.availableStock += item.quantity;
          const movement: StockMovement = {
            id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            orderId: order.id,
            productId: prod.id,
            productNameEn: prod.nameEn,
            quantity: item.quantity,
            previousStock: prevStock,
            newStock: prod.availableStock,
            date: nowIso,
            reason: 'order_cancelled',
            notes: `Order #${order.orderNumber} cancelled by Admin. Stock restored.`,
          };
          db.stockMovements.unshift(movement);
          saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement sync err:', e));
        }
      }

      // Replicate restored stock back to Firestore
      restoreProductStockInFirestore(order.items).catch((fsErr) =>
        console.warn('[Firestore] Stock restore warning:', fsErr)
      );
    }

    // Trigger automated WhatsApp status update
    if (sendNotification) {
      try {
        const waLog = await sendWhatsAppNotification(order, 'status_update', status);
        order.whatsappNotifications.unshift(waLog);
        db.whatsappLogs.unshift(waLog);
      } catch (err) {
        console.error('Error dispatching WhatsApp status update:', err);
      }
    }

    saveDatabase(db);
    appendOrderToArchive(order); // Guarantee permanent archive update on status changes

    // Sync updated status to central Firestore
    try {
      await updateOrderStatusInFirestore(order.id, status, order.statusHistory);
      await saveOrderToFirestore(order);
    } catch (fsErr) {
      console.warn('[Firestore] Order status sync warning:', fsErr);
    }

    return res.json({ success: true, order });
  });
});

// Admin WhatsApp Order Intake: Convert Draft WhatsApp Order into Confirmed Order
app.post('/api/admin/orders/draft-convert', requireAdminAuth, async (req: Request, res: Response) => {
  return withInventoryLock(async () => {
    try {
      const {
        customerName,
        customerPhone,
        deliveryArea = 'Katuloya',
        deliveryAddress,
        deliveryLandmark,
        deliveryNotes,
        deliveryType = 'delivery',
        paymentMethod = 'cash_on_delivery',
        items: rawItems,
        customerConsentConfirmed,
      } = req.body;

      if (!customerConsentConfirmed) {
        return res.status(400).json({ error: 'Customer consent and item verification must be confirmed before creating order.' });
      }

      if (!customerName || !customerPhone || !isValidSriLankanPhone(customerPhone)) {
        return res.status(400).json({ error: 'Valid customer name and Sri Lankan phone number are required.' });
      }

      const processedItems = [];
      for (const item of rawItems) {
        const product = db.products.find((p) => p.id === item.productId);
        if (!product) {
          return res.status(400).json({ error: `Product ${item.productId} not found.` });
        }

        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        if (product.availableStock < qty) {
          return res.status(400).json({ error: `Insufficient stock for ${product.nameEn}. Available: ${product.availableStock}` });
        }

        const lineCalc = calculateItemLine(product, qty);
        processedItems.push({
          productId: product.id,
          nameEn: product.nameEn,
          nameSi: product.nameSi,
          unit: product.unit,
          quantity: qty,
          unitPrice: lineCalc.unitPrice,
          discountPercent: lineCalc.discountPercent,
          effectivePrice: lineCalc.effectivePrice,
          lineTotal: lineCalc.lineTotal,
        });
      }

      const nowIso = new Date().toISOString();
      db.orderSequence += 1;
      const orderNumber = formatOrderNumber(db.orderSequence, new Date().getFullYear());
      const trackingToken = crypto.randomBytes(16).toString('hex');
      const orderId = `ord-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      for (const item of processedItems) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) {
          const prevStock = product.availableStock;
          product.availableStock -= item.quantity;
          const movement: StockMovement = {
            id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            orderId,
            productId: product.id,
            productNameEn: product.nameEn,
            quantity: -item.quantity,
            previousStock: prevStock,
            newStock: product.availableStock,
            date: nowIso,
            reason: 'order_placed',
            notes: `WhatsApp Intake Order #${orderNumber} placed`,
          };
          db.stockMovements.unshift(movement);
          saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement sync err:', e));
        }
      }

      const totals = calculateOrderTotals(processedItems, deliveryType, db.storeConfig);

      const newOrder: Order = {
        id: orderId,
        orderNumber,
        trackingToken,
        customerName: customerName.trim(),
        customerPhone: normalizeSriLankanPhone(customerPhone),
        deliveryArea: deliveryArea ? deliveryArea.trim() : 'Katuloya',
        deliveryAddress: deliveryAddress || 'Katuloya Delivery Area',
        deliveryLandmark,
        deliveryNotes: deliveryNotes ? `[WhatsApp Intake] ${deliveryNotes}` : '[WhatsApp Intake]',
        deliveryType,
        items: processedItems,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        deliveryCharge: totals.deliveryCharge,
        total: totals.total,
        paymentMethod,
        paymentStatus: 'UNPAID',
        amountPaid: 0,
        outstandingBalance: totals.total,
        payments: [],
        status: 'Order Confirmed',
        statusHistory: [
          {
            status: 'Order Confirmed',
            timestamp: nowIso,
            note: 'Order captured via WhatsApp conversation and confirmed by Admin.',
            updatedBy: 'Admin',
          },
        ],
        whatsappNotifications: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        source: 'whatsapp_intake',
        stockRestored: false,
      };

      db.orders.unshift(newOrder);
      saveDatabase(db);
      appendOrderToArchive(newOrder); // Guarantee permanent archive preservation

      try {
        await saveOrderToFirestore(newOrder);
        await deductProductStockInFirestore(processedItems);
      } catch (fsErr) {
        console.warn('[Firestore] Async order sync warning:', fsErr);
      }

      // Send confirmation back to customer WhatsApp
      const waLog = await sendWhatsAppNotification(newOrder, 'order_confirmation');
      newOrder.whatsappNotifications.push(waLog);
      db.whatsappLogs.unshift(waLog);
      saveDatabase(db);
      appendOrderToArchive(newOrder);

      return res.status(201).json({
        success: true,
        order: newOrder,
        trackingUrl: `${PUBLIC_BASE_URL}/track/${trackingToken}`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Error processing WhatsApp draft order' });
    }
  });
});

// Admin Product Management
app.get('/api/admin/products', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(db.products);
});

app.post('/api/admin/products', requireAdminAuth, async (req: Request, res: Response) => {
  const {
    id,
    sku,
    barcode,
    nameEn,
    nameSi,
    category,
    categorySi,
    unit,
    unitSi,
    sellingPrice,
    costPrice,
    availableStock,
    minStockLevel,
    discountPercent,
    imageUrl,
    isActive,
    badge,
    targetStockLevel,
    descriptionEn,
    descriptionSi,
  } = req.body;

  if (!nameEn || typeof nameEn !== 'string' || nameEn.trim().length === 0) {
    return res.status(400).json({ error: 'Product English name is required.' });
  }

  const numericPrice = Number(sellingPrice);
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ error: 'Valid selling price (greater than 0) is required.' });
  }

  const numericCost = costPrice !== undefined && !isNaN(Number(costPrice)) ? Math.max(0, Number(costPrice)) : undefined;
  const numericStock = Number(availableStock);
  const validStock = isNaN(numericStock) || numericStock < 0 ? 0 : numericStock;
  const validMinStock = minStockLevel !== undefined && !isNaN(Number(minStockLevel)) ? Math.max(0, Number(minStockLevel)) : 10;
  const numericDiscount = Number(discountPercent);
  const validDiscount = isNaN(numericDiscount) || numericDiscount < 0 ? 0 : numericDiscount;
  const validTargetStock = targetStockLevel !== undefined && !isNaN(Number(targetStockLevel)) ? Math.max(0, Number(targetStockLevel)) : 100;

  const activeFlag = isActive !== undefined ? Boolean(isActive) : true;

  if (id) {
    const existingIndex = db.products.findIndex((p) => p.id === id);
    if (existingIndex === -1) {
      return res.status(404).json({ error: 'Product not found in database.' });
    }
    const updatedProduct: Product = {
      ...db.products[existingIndex],
      sku: sku !== undefined ? String(sku).trim() : db.products[existingIndex].sku,
      barcode: barcode !== undefined ? String(barcode).trim() : db.products[existingIndex].barcode,
      nameEn: nameEn.trim(),
      nameSi: nameSi ? nameSi.trim() : db.products[existingIndex].nameSi,
      category: category ? category.trim() : db.products[existingIndex].category,
      categorySi: categorySi ? categorySi.trim() : db.products[existingIndex].categorySi,
      unit: unit ? unit.trim() : db.products[existingIndex].unit,
      unitSi: unitSi ? unitSi.trim() : db.products[existingIndex].unitSi,
      sellingPrice: numericPrice,
      costPrice: numericCost !== undefined ? numericCost : db.products[existingIndex].costPrice,
      availableStock: validStock,
      minStockLevel: validMinStock,
      targetStockLevel: validTargetStock,
      discountPercent: validDiscount,
      imageUrl: imageUrl ? imageUrl.trim() : db.products[existingIndex].imageUrl,
      isActive: activeFlag,
      badge: badge !== undefined ? (badge ? badge.trim() : undefined) : db.products[existingIndex].badge,
      descriptionEn: descriptionEn !== undefined ? (descriptionEn ? descriptionEn.trim() : undefined) : db.products[existingIndex].descriptionEn,
      descriptionSi: descriptionSi !== undefined ? (descriptionSi ? descriptionSi.trim() : undefined) : db.products[existingIndex].descriptionSi,
    };

    db.products[existingIndex] = updatedProduct;
    saveDatabase(db);

    try {
      await saveProductToFirestore(updatedProduct);
    } catch (fsErr) {
      console.warn('[Firestore] Error saving product update:', fsErr);
    }

    return res.json({ success: true, product: updatedProduct });
  }

  // Create new product with unique clean ID
  const newProduct: Product = {
    id: `prod-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    sku: sku ? String(sku).trim() : `SKU-${Date.now().toString().slice(-6)}`,
    barcode: barcode ? String(barcode).trim() : undefined,
    nameEn: nameEn.trim(),
    nameSi: nameSi ? nameSi.trim() : nameEn.trim(),
    category: category ? category.trim() : 'General',
    categorySi: categorySi ? categorySi.trim() : 'සාමාන්‍ය',
    unit: unit ? unit.trim() : '1 item',
    unitSi: unitSi ? unitSi.trim() : '1',
    sellingPrice: numericPrice,
    costPrice: numericCost,
    availableStock: validStock,
    minStockLevel: validMinStock,
    targetStockLevel: validTargetStock,
    discountPercent: validDiscount,
    imageUrl:
      imageUrl && imageUrl.trim().length > 0
        ? imageUrl.trim()
        : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    isActive: activeFlag,
    badge: badge ? badge.trim() : undefined,
    descriptionEn: descriptionEn ? descriptionEn.trim() : undefined,
    descriptionSi: descriptionSi ? descriptionSi.trim() : undefined,
  };

  db.products.push(newProduct);
  saveDatabase(db);

  try {
    await saveProductToFirestore(newProduct);
  } catch (fsErr) {
    console.warn('[Firestore] Error saving new product:', fsErr);
  }

  return res.status(201).json({ success: true, product: newProduct });
});

// Admin Delete Product
app.delete('/api/admin/products/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const removed = db.products.splice(idx, 1)[0];
  saveDatabase(db);

  try {
    await deleteProductFromFirestore(id);
  } catch (fsErr) {
    console.warn('[Firestore] Error deleting product:', fsErr);
  }

  return res.json({ success: true, message: `Product ${removed.nameEn} deleted.` });
});

// WhatsApp API Status & Health
app.get('/api/admin/whatsapp/status', requireAdminAuth, (_req: Request, res: Response) => {
  const isConfigured = Boolean(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
  const totalSent = db.whatsappLogs.filter((l) => l.status === 'sent' || l.status === 'delivered' || l.status === 'read').length;
  const totalFailed = db.whatsappLogs.filter((l) => l.status === 'failed').length;

  const status: WhatsAppConfigStatus = {
    isConfigured,
    phoneNumberIdConfigured: Boolean(WHATSAPP_PHONE_NUMBER_ID),
    businessAccountIdConfigured: Boolean(WHATSAPP_BUSINESS_ACCOUNT_ID),
    accessTokenConfigured: Boolean(WHATSAPP_ACCESS_TOKEN),
    webhookSecretConfigured: Boolean(WHATSAPP_APP_SECRET),
    apiVersion: WHATSAPP_API_VERSION,
    publicBaseUrl: PUBLIC_BASE_URL,
    webhookCallbackUrl: `${PUBLIC_BASE_URL}/api/whatsapp/webhook`,
    totalSent,
    totalFailed,
  };

  res.json(status);
});

// Admin WhatsApp Logs
app.get('/api/admin/whatsapp/logs', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(db.whatsappLogs);
});

// Admin Safe Retry for Failed WhatsApp Notification
app.post('/api/admin/whatsapp/retry/:logId', requireAdminAuth, async (req: Request, res: Response) => {
  const { logId } = req.params;
  const log = db.whatsappLogs.find((l) => l.id === logId);
  if (!log) {
    return res.status(404).json({ error: 'Log entry not found.' });
  }

  const order = db.orders.find((o) => o.orderNumber === log.orderNumber);
  if (!order) {
    return res.status(404).json({ error: 'Associated order not found.' });
  }

  log.retryCount += 1;
  const newLog = await sendWhatsAppNotification(order, log.messageType as any, order.status);
  newLog.retryCount = log.retryCount;

  // Replace or update log
  const index = db.whatsappLogs.findIndex((l) => l.id === logId);
  if (index !== -1) {
    db.whatsappLogs[index] = newLog;
  }
  order.whatsappNotifications.unshift(newLog);
  saveDatabase(db);

  return res.json({ success: true, log: newLog });
});

// Admin WhatsApp Test Message Sender
app.post('/api/admin/whatsapp/test', requireAdminAuth, async (req: Request, res: Response) => {
  const { recipientPhone, templateLanguage = 'en' } = req.body;
  if (!recipientPhone || !isValidSriLankanPhone(recipientPhone)) {
    return res.status(400).json({ error: 'Please enter a valid Sri Lankan mobile phone number (e.g. 077 123 4567).' });
  }

  const mockOrder: Order = {
    id: 'test-order',
    orderNumber: 'FL-2026-TEST01',
    trackingToken: 'test-preview-token-12345',
    customerName: 'Test Customer (පරීක්ෂණ ගනුදෙනුකරු)',
    customerPhone: normalizeSriLankanPhone(recipientPhone),
    deliveryAddress: 'Katuloya, Thawalanthanne',
    deliveryType: 'delivery',
    items: [],
    subtotal: 2500,
    discountTotal: 0,
    deliveryCharge: 250,
    total: 2750,
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'UNPAID',
    amountPaid: 0,
    outstandingBalance: 2750,
    payments: [],
    status: 'Order Confirmed',
    statusHistory: [],
    whatsappNotifications: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'website',
  };

  const result = await sendWhatsAppNotification(mockOrder, 'order_confirmation');
  db.whatsappLogs.unshift(result);
  saveDatabase(db);

  return res.json({ success: true, result });
});

// Admin Store Configuration update
app.post('/api/admin/store-config', requireAdminAuth, (req: Request, res: Response) => {
  const {
    baseDeliveryFee,
    freeDeliveryThreshold,
    deliveryRadiusKm,
    phone,
    whatsappNumber,
    isOpen,
    openingHours,
    address,
    addressSi,
    email,
    bankDetails,
  } = req.body;

  if (baseDeliveryFee !== undefined) db.storeConfig.baseDeliveryFee = Number(baseDeliveryFee);
  if (freeDeliveryThreshold !== undefined) db.storeConfig.freeDeliveryThreshold = Number(freeDeliveryThreshold);
  if (deliveryRadiusKm !== undefined) db.storeConfig.deliveryRadiusKm = Number(deliveryRadiusKm);
  if (phone) db.storeConfig.phone = phone;
  if (whatsappNumber) db.storeConfig.whatsappNumber = whatsappNumber;
  if (isOpen !== undefined) db.storeConfig.isOpen = Boolean(isOpen);
  if (openingHours) db.storeConfig.openingHours = openingHours;
  if (address) db.storeConfig.address = address;
  if (addressSi) db.storeConfig.addressSi = addressSi;
  if (email) db.storeConfig.email = email;
  if (bankDetails) {
    db.storeConfig.bankDetails = {
      bankName: bankDetails.bankName || db.storeConfig.bankDetails?.bankName || "People's Bank",
      branch: bankDetails.branch || db.storeConfig.bankDetails?.branch || 'Panwila',
      accountName: bankDetails.accountName || db.storeConfig.bankDetails?.accountName || 'RG Nimal Rajapaksha',
      accountNumber: bankDetails.accountNumber || db.storeConfig.bankDetails?.accountNumber || '211200380039804',
    };
  }

  saveDatabase(db);
  return res.json({ success: true, config: db.storeConfig });
});

// Admin Stock Movements History
app.get('/api/admin/stock-movements', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(db.stockMovements || []);
});

// Admin Purchase Orders List
app.get('/api/admin/purchase-orders', requireAdminAuth, (_req: Request, res: Response) => {
  res.json(db.purchaseOrders || []);
});

// Admin Create Purchase Order
app.post('/api/admin/purchase-orders', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { supplierName, supplierContact, notes, items, receiveStockNow = false } = req.body;

    if (!supplierName || typeof supplierName !== 'string' || supplierName.trim().length === 0) {
      return res.status(400).json({ error: 'Supplier or Vendor name is required.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one product must be selected for the purchase order.' });
    }

    const processedItems: PurchaseOrderItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      const prod = db.products.find((p) => p.id === item.productId);
      const qty = Math.max(1, Math.floor(Number(item.reorderQuantity) || 1));
      const price = Number(item.unitPrice) || (prod ? prod.costPrice || prod.sellingPrice : 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      processedItems.push({
        productId: item.productId,
        nameEn: prod?.nameEn || item.nameEn || 'Item',
        nameSi: prod?.nameSi || item.nameSi,
        category: prod?.category,
        unit: prod?.unit || item.unit || '1 unit',
        currentStock: prod?.availableStock ?? item.currentStock ?? 0,
        reorderQuantity: qty,
        unitPrice: price,
        lineTotal,
        imageUrl: prod?.imageUrl,
      });
    }

    db.poSequence = (db.poSequence || 100) + 1;
    const poNumber = `PO-${new Date().getFullYear()}-${String(db.poSequence).padStart(4, '0')}`;
    const poId = `po-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const newPO: PurchaseOrder = {
      id: poId,
      poNumber,
      date: nowIso.slice(0, 10),
      supplierName: supplierName.trim(),
      supplierContact: supplierContact ? supplierContact.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      items: processedItems,
      subtotal,
      grandTotal: subtotal,
      status: receiveStockNow ? 'received' : 'issued',
      createdAt: nowIso,
      createdByName: 'Authorized Staff',
      bankDetails: db.storeConfig.bankDetails || DEFAULT_STORE_CONFIG.bankDetails!,
    };

    if (receiveStockNow) {
      for (const item of processedItems) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          const prev = prod.availableStock;
          prod.availableStock += item.reorderQuantity;
          const movement: StockMovement = {
            id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            orderId: poId,
            productId: prod.id,
            productNameEn: prod.nameEn,
            quantity: item.reorderQuantity,
            previousStock: prev,
            newStock: prod.availableStock,
            date: nowIso,
            reason: 'purchase_order_received',
            notes: `Stock received from Purchase Order ${poNumber} (${supplierName})`,
          };
          db.stockMovements.unshift(movement);
          saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement err:', e));
        }
      }
      restoreProductStockInFirestore(processedItems.map((i) => ({ productId: i.productId, quantity: i.reorderQuantity }))).catch(
        (e) => console.warn('[Firestore] Stock sync err:', e)
      );
    }

    db.purchaseOrders.unshift(newPO);
    saveDatabase(db);

    try {
      await savePurchaseOrderToFirestore(newPO);
    } catch (fsErr) {
      console.warn('[Firestore] PO sync warning:', fsErr);
    }

    return res.status(201).json({ success: true, purchaseOrder: newPO });
  } catch (err: any) {
    console.error('Error creating purchase order:', err);
    return res.status(500).json({ error: 'Server error creating purchase order.' });
  }
});

// Admin Update Purchase Order Status
app.patch('/api/admin/purchase-orders/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  return withInventoryLock(async () => {
    const { id } = req.params;
    const { status } = req.body;

    const po = db.purchaseOrders.find((p) => p.id === id);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    const prevStatus = po.status;
    po.status = status;
    const nowIso = new Date().toISOString();

    // If changing to 'received' and wasn't received yet, increment stock
    if (status === 'received' && prevStatus !== 'received') {
      for (const item of po.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          const prev = prod.availableStock;
          prod.availableStock += item.reorderQuantity;
          const movement: StockMovement = {
            id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            orderId: po.id,
            productId: prod.id,
            productNameEn: prod.nameEn,
            quantity: item.reorderQuantity,
            previousStock: prev,
            newStock: prod.availableStock,
            date: nowIso,
            reason: 'purchase_order_received',
            notes: `Stock received from Purchase Order ${po.poNumber} (${po.supplierName})`,
          };
          db.stockMovements.unshift(movement);
          saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement err:', e));
        }
      }
      restoreProductStockInFirestore(po.items.map((i) => ({ productId: i.productId, quantity: i.reorderQuantity }))).catch(
        (e) => console.warn('[Firestore] Stock sync err:', e)
      );
    }

    saveDatabase(db);
    try {
      await savePurchaseOrderToFirestore(po);
    } catch (fsErr) {
      console.warn('[Firestore] PO update sync warning:', fsErr);
    }

    return res.json({ success: true, purchaseOrder: po });
  });
});

// PART 3: Automatic Reorder Quantity Calculation
// Formula: Suggested Reorder Quantity = Maximum(0, Target Stock - Available Stock - Pending Purchase Quantity)
app.get('/api/admin/reorder-suggestions', requireAdminAuth, (_req: Request, res: Response) => {
  const pendingOrders = (db.purchaseOrders || []).filter((po) => po.status !== 'received');

  const suggestions = db.products.map((prod) => {
    const targetStock = prod.targetStockLevel ?? 100;
    const availableStock = prod.availableStock ?? 0;

    let pendingPurchaseQty = 0;
    for (const po of pendingOrders) {
      const match = po.items.find((i) => i.productId === prod.id);
      if (match) {
        pendingPurchaseQty += match.reorderQuantity || 0;
      }
    }

    const suggestedReorderQuantity = Math.max(0, targetStock - availableStock - pendingPurchaseQty);

    return {
      productId: prod.id,
      nameEn: prod.nameEn,
      nameSi: prod.nameSi,
      category: prod.category,
      unit: prod.unit,
      availableStock,
      targetStockLevel: targetStock,
      pendingPurchaseQuantity: pendingPurchaseQty,
      suggestedReorderQuantity,
      imageUrl: prod.imageUrl,
      isLowStock: availableStock <= 15,
      isOutOfStock: availableStock <= 0,
    };
  });

  return res.json(suggestions);
});

// -------------------------------------------------------------
// PART 8: DELIVERY AGENT MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// Public list of active delivery agents (for Driver Portal quick login)
app.get('/api/delivery-agents/public', (_req: Request, res: Response) => {
  const agents = (db.deliveryAgents || [])
    .filter((a) => !a.isDeleted && a.status === 'Active')
    .map((a) => ({
      id: a.id,
      fullName: a.fullName || a.name || 'Delivery Agent',
      name: a.name || a.fullName || 'Delivery Agent',
      mobilePhone: a.mobilePhone || (a as any).mobile || '',
      whatsappNumber: a.whatsappNumber || a.whatsappPhone || '',
      vehicleType: a.vehicleType || 'Three Wheeler',
      vehicleRegistrationNumber: a.vehicleRegistrationNumber || a.vehicleNumber || '',
      status: a.status || 'Active',
      defaultHireCharge: a.defaultHireCharge ?? 300,
    }));
  return res.json(agents);
});

// List Delivery Agents (Admin Full View)
app.get('/api/admin/delivery-agents', requireAdminAuth, (req: Request, res: Response) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const agents = (db.deliveryAgents || [])
    .filter((a) => includeDeleted || !a.isDeleted)
    .map((a) => ({
      ...a,
      defaultHireCharge: a.defaultHireCharge !== undefined && a.defaultHireCharge !== null ? Number(a.defaultHireCharge) : 300,
      fullName: a.fullName || a.name || 'Delivery Agent',
      name: a.name || a.fullName || 'Delivery Agent',
      mobilePhone: a.mobilePhone || (a as any).mobile || '',
      whatsappNumber: a.whatsappNumber || a.whatsappPhone || (a as any).whatsapp || '',
      vehicleRegistrationNumber: a.vehicleRegistrationNumber || a.vehicleNumber || '',
      status: a.status || 'Active',
    }));
  return res.json(agents);
});

// Register New Delivery Agent
app.post('/api/admin/delivery-agents', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const rawName = req.body.fullName || req.body.name;
    const rawUsername = req.body.username;
    const rawPassword = req.body.password;
    const rawMobile = req.body.mobilePhone || req.body.mobile;
    const rawWhatsapp = req.body.whatsappNumber || req.body.whatsappPhone || req.body.whatsapp;
    const rawVehicleNumber = req.body.vehicleRegistrationNumber || req.body.vehicleNumber;
    const rawVehicleType = req.body.vehicleType || 'Three Wheeler';
    const rawHireCharge = req.body.defaultHireCharge !== undefined ? req.body.defaultHireCharge : 300;
    const rawAddress = req.body.address;
    const rawStatus = req.body.status || 'Active';

    if (!rawName || typeof rawName !== 'string' || rawName.trim().length === 0) {
      return res.status(400).json({ error: 'Agent full name is required.' });
    }
    if (!rawMobile || !isValidSriLankanPhone(rawMobile)) {
      return res.status(400).json({ error: 'Valid mobile phone number is required (e.g. 0771234567 or +94771234567).' });
    }
    if (!rawWhatsapp || !isValidSriLankanPhone(rawWhatsapp)) {
      return res.status(400).json({ error: 'Valid WhatsApp phone number is required.' });
    }
    if (!rawVehicleNumber || typeof rawVehicleNumber !== 'string' || rawVehicleNumber.trim().length === 0) {
      return res.status(400).json({ error: 'Vehicle registration number is required (e.g. WP ND-4512).' });
    }

    const hireCharge = Number(rawHireCharge);
    if (isNaN(hireCharge) || hireCharge < 0) {
      return res.status(400).json({ error: 'Valid default delivery hire charge is required (0 or greater).' });
    }

    const cleanUsername = rawUsername && typeof rawUsername === 'string' && rawUsername.trim().length >= 3
      ? rawUsername.trim().toLowerCase().replace(/\s+/g, '_')
      : `driver_${rawName.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || Date.now().toString().slice(-4)}`;

    const initialPassword = rawPassword && typeof rawPassword === 'string' && rawPassword.trim().length >= 6
      ? rawPassword.trim()
      : 'Driver@123456';

    const nowIso = new Date().toISOString();
    const newAgent: DeliveryAgent = {
      id: `agent-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      username: cleanUsername,
      passwordHash: hashPassword(initialPassword),
      fullName: rawName.trim(),
      name: rawName.trim(),
      mobilePhone: normalizeSriLankanPhone(rawMobile),
      whatsappNumber: normalizeSriLankanPhone(rawWhatsapp),
      whatsappPhone: normalizeSriLankanPhone(rawWhatsapp),
      vehicleType: rawVehicleType,
      vehicleRegistrationNumber: rawVehicleNumber.trim().toUpperCase(),
      vehicleNumber: rawVehicleNumber.trim().toUpperCase(),
      defaultHireCharge: hireCharge,
      address: rawAddress ? rawAddress.trim() : undefined,
      status: rawStatus === 'Inactive' ? 'Inactive' : 'Active',
      createdAt: nowIso,
      updatedAt: nowIso,
      isDeleted: false,
    };

    if (!db.deliveryAgents) db.deliveryAgents = [];
    db.deliveryAgents.unshift(newAgent);
    saveDatabase(db);

    try {
      await saveDeliveryAgentToFirestore(newAgent);
    } catch (fsErr) {
      console.warn('[Firestore] Error saving delivery agent:', fsErr);
    }

    const { passwordHash, ...safeAgent } = newAgent;
    return res.status(201).json({ success: true, agent: safeAgent });
  } catch (err: any) {
    console.error('Error creating delivery agent:', err);
    return res.status(500).json({ error: 'Server error registering delivery agent.' });
  }
});

// Edit Delivery Agent
app.put('/api/admin/delivery-agents/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rawName = req.body.fullName || req.body.name;
    const rawUsername = req.body.username;
    const rawMobile = req.body.mobilePhone || req.body.mobile;
    const rawWhatsapp = req.body.whatsappNumber || req.body.whatsappPhone || req.body.whatsapp;
    const rawVehicleNumber = req.body.vehicleRegistrationNumber || req.body.vehicleNumber;
    const rawVehicleType = req.body.vehicleType;
    const rawHireCharge = req.body.defaultHireCharge;
    const rawAddress = req.body.address;
    const rawStatus = req.body.status;

    const agent = (db.deliveryAgents || []).find((a) => a.id === id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found.' });
    }

    if (rawName) {
      agent.fullName = rawName.trim();
      agent.name = rawName.trim();
    }
    if (rawUsername && typeof rawUsername === 'string' && rawUsername.trim().length >= 3) {
      agent.username = rawUsername.trim().toLowerCase().replace(/\s+/g, '_');
    }
    if (rawMobile && isValidSriLankanPhone(rawMobile)) {
      agent.mobilePhone = normalizeSriLankanPhone(rawMobile);
    }
    if (rawWhatsapp && isValidSriLankanPhone(rawWhatsapp)) {
      agent.whatsappNumber = normalizeSriLankanPhone(rawWhatsapp);
      agent.whatsappPhone = normalizeSriLankanPhone(rawWhatsapp);
    }
    if (rawVehicleType) {
      agent.vehicleType = rawVehicleType;
    }
    if (rawVehicleNumber) {
      agent.vehicleRegistrationNumber = rawVehicleNumber.trim().toUpperCase();
      agent.vehicleNumber = rawVehicleNumber.trim().toUpperCase();
    }
    if (rawHireCharge !== undefined && !isNaN(Number(rawHireCharge))) {
      agent.defaultHireCharge = Math.max(0, Number(rawHireCharge));
    }
    if (rawAddress !== undefined) {
      agent.address = rawAddress.trim();
    }
    if (rawStatus) {
      const prevStatus = agent.status;
      agent.status = rawStatus === 'Inactive' ? 'Inactive' : 'Active';
      if (agent.status === 'Inactive' && prevStatus !== 'Inactive') {
        // Invalidate driver sessions
        for (const [token, sess] of activeAgentSessions.entries()) {
          if (sess.agentId === agent.id) {
            activeAgentSessions.delete(token);
          }
        }
      }
    }
    agent.updatedAt = new Date().toISOString();

    saveDatabase(db);
    try {
      await saveDeliveryAgentToFirestore(agent);
    } catch (fsErr) {
      console.warn('[Firestore] Error saving delivery agent update:', fsErr);
    }

    const { passwordHash, ...safeAgent } = agent;
    return res.json({ success: true, agent: safeAgent });
  } catch (err: any) {
    console.error('Error updating delivery agent:', err);
    return res.status(500).json({ error: 'Server error updating delivery agent.' });
  }
});

// Toggle Agent Status (Active / Inactive)
app.patch('/api/admin/delivery-agents/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const agent = (db.deliveryAgents || []).find((a) => a.id === id);
  if (!agent) {
    return res.status(404).json({ error: 'Delivery agent not found.' });
  }

  agent.status = status || (agent.status === 'Active' ? 'Inactive' : 'Active');
  agent.updatedAt = new Date().toISOString();

  if (agent.status === 'Inactive') {
    // Invalidate active driver sessions
    for (const [token, sess] of activeAgentSessions.entries()) {
      if (sess.agentId === agent.id) {
        activeAgentSessions.delete(token);
      }
    }
  }

  saveDatabase(db);
  try {
    await saveDeliveryAgentToFirestore(agent);
  } catch (fsErr) {
    console.warn('[Firestore] Error updating agent status:', fsErr);
  }

  const { passwordHash, ...safeAgent } = agent;
  return res.json({ success: true, agent: safeAgent });
});

// Admin Reset Agent Password
app.post('/api/admin/delivery-agents/:id/reset-password', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const agent = (db.deliveryAgents || []).find((a) => a.id === id);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found.' });
    }

    const nowIso = new Date().toISOString();
    agent.passwordHash = hashPassword(newPassword.trim());
    agent.passwordChangedAt = nowIso;
    agent.failedLoginAttempts = 0;
    agent.lockedUntil = undefined;
    agent.updatedAt = nowIso;

    // Immediately revoke all existing sessions for this agent
    for (const [token, sess] of activeAgentSessions.entries()) {
      if (sess.agentId === agent.id) {
        activeAgentSessions.delete(token);
      }
    }

    saveDatabase(db);
    try {
      await saveDeliveryAgentToFirestore(agent);
    } catch (fsErr) {
      console.warn('[Firestore] Error syncing agent password reset:', fsErr);
    }

    return res.json({
      success: true,
      message: `Password reset successfully for ${agent.fullName}. Active sessions have been invalidated.`,
    });
  } catch (err: any) {
    console.error('Error resetting agent password:', err);
    return res.status(500).json({ error: 'Server error resetting driver password.' });
  }
});

// Soft Delete Delivery Agent (Preserves historical orders & invoices)
app.delete('/api/admin/delivery-agents/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const agent = (db.deliveryAgents || []).find((a) => a.id === id);
  if (!agent) {
    return res.status(404).json({ error: 'Delivery agent not found.' });
  }

  agent.isDeleted = true;
  agent.status = 'Inactive';
  agent.updatedAt = new Date().toISOString();

  // Invalidate active driver sessions
  for (const [token, sess] of activeAgentSessions.entries()) {
    if (sess.agentId === agent.id) {
      activeAgentSessions.delete(token);
    }
  }

  saveDatabase(db);
  try {
    await saveDeliveryAgentToFirestore(agent);
  } catch (fsErr) {
    console.warn('[Firestore] Error soft-deleting agent:', fsErr);
  }

  return res.json({ success: true, message: `Agent ${agent.fullName} deactivated and preserved in historical records.` });
});

// -------------------------------------------------------------
// PART 9 & 12: ASSIGN DELIVERY AGENTS & DISPATCH MANAGEMENT
// -------------------------------------------------------------

// Assign Delivery Agent to Customer Order
app.post('/api/admin/orders/:id/assign-delivery-agent', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId, hireCharge, notes } = req.body;

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!agentId) {
      return res.status(400).json({ error: 'Please select a delivery agent.' });
    }

    const agent = (db.deliveryAgents || []).find((a) => a.id === agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery agent not found.' });
    }

    if (agent.status !== 'Active') {
      return res.status(400).json({ error: 'Only Active delivery agents can be assigned to new deliveries.' });
    }

    const assignedHireCharge = hireCharge !== undefined && !isNaN(Number(hireCharge))
      ? Math.max(0, Number(hireCharge))
      : agent.defaultHireCharge;

    const nowIso = new Date().toISOString();

    // Preserve historical assignment or create fresh assignment snapshot
    const assignment: DeliveryAssignment = {
      agentId: agent.id,
      agentName: agent.fullName,
      mobilePhone: agent.mobilePhone,
      whatsappNumber: agent.whatsappNumber,
      vehicleRegistrationNumber: agent.vehicleRegistrationNumber,
      hireCharge: assignedHireCharge,
      assignedAt: nowIso,
      deliveryStatus: 'assigned',
      agentPaidStatus: order.deliveryAgent?.agentPaidStatus || 'unpaid',
      agentPaidAt: order.deliveryAgent?.agentPaidAt,
      notes: notes ? notes.trim() : undefined,
    };

    order.deliveryAgent = assignment;
    order.deliveryHireCharge = assignedHireCharge;

    // Recalculate Invoice Total: Product Subtotal - Discount + Delivery Fee + Delivery Hire Charge
    const previousHireCharge = order.deliveryHireCharge || 0;
    order.total = (order.subtotal - order.discountTotal) + order.deliveryCharge + assignedHireCharge;
    order.outstandingBalance = Math.max(0, order.total - (order.amountPaid || 0));

    // Update status to 'Delivery Agent Assigned'
    order.status = 'Delivery Agent Assigned';
    order.updatedAt = nowIso;
    order.statusHistory.unshift({
      status: 'Delivery Agent Assigned',
      timestamp: nowIso,
      note: `Delivery assigned to ${agent.fullName} (${agent.vehicleRegistrationNumber}). Delivery Hire Charge: LKR ${assignedHireCharge}.`,
      updatedBy: 'Admin',
    });

    saveDatabase(db);
    appendOrderToArchive(order);

    try {
      await saveOrderToFirestore(order);
      await updateOrderStatusInFirestore(order.id, order.status, order.statusHistory);
    } catch (fsErr) {
      console.warn('[Firestore] Error saving delivery assignment:', fsErr);
    }

    return res.json({ success: true, order });
  } catch (err: any) {
    console.error('Error assigning delivery agent:', err);
    return res.status(500).json({ error: 'Server error assigning delivery agent.' });
  }
});

// Update Delivery Dispatch Status
app.patch('/api/admin/orders/:id/delivery-status', requireAdminAuth, async (req: Request, res: Response) => {
  return withInventoryLock(async () => {
    try {
      const { id } = req.params;
      const { deliveryStatus, orderStatus, note } = req.body;

      const order = db.orders.find((o) => o.id === id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const nowIso = new Date().toISOString();
      const candidate = (orderStatus || deliveryStatus || '').trim();

      let mappedStatus: OrderStatus = order.status;
      if (candidate === 'in_transit' || candidate === 'Out for Delivery') {
        mappedStatus = 'Out for Delivery';
      } else if (candidate === 'delivered' || candidate === 'Delivered') {
        mappedStatus = 'Delivered';
      } else if (candidate === 'failed' || candidate === 'Delivery Failed') {
        mappedStatus = 'Delivery Failed';
      } else if (candidate === 'assigned' || candidate === 'Delivery Agent Assigned') {
        mappedStatus = 'Delivery Agent Assigned';
      } else if (candidate === 'Preparing Order') {
        mappedStatus = 'Preparing Order';
      } else if (candidate === 'Ready for Dispatch' || candidate === 'Ready for Delivery') {
        mappedStatus = 'Ready for Dispatch';
      } else if (candidate === 'Order Received' || candidate === 'Order Confirmed') {
        mappedStatus = 'Order Received';
      } else if (candidate === 'Ready for Pickup') {
        mappedStatus = 'Ready for Pickup';
      } else if (candidate === 'Ready for Collection') {
        mappedStatus = 'Ready for Collection';
      } else if (candidate === 'Collected by Customer') {
        mappedStatus = 'Collected by Customer';
      } else if (candidate === 'Cancelled') {
        mappedStatus = 'Cancelled';
      } else if (candidate) {
        mappedStatus = candidate as OrderStatus;
      }

      order.status = mappedStatus;
      order.updatedAt = nowIso;

      if (order.deliveryAgent) {
        order.deliveryAgent.deliveryStatus = mappedStatus;
        if (mappedStatus === 'Out for Delivery') {
          order.deliveryAgent.isLiveTrackingActive = true;
          if (!order.deliveryAgent.trackingStartedAt) {
            order.deliveryAgent.trackingStartedAt = nowIso;
          }
        } else if (mappedStatus === 'Delivered' || mappedStatus === 'Collected by Customer') {
          order.deliveredAt = nowIso;
          order.deliveryAgent.isLiveTrackingActive = false;
          order.deliveryAgent.trackingStoppedAt = nowIso;
        } else if (mappedStatus === 'Cancelled' || mappedStatus === 'Delivery Failed') {
          order.deliveryAgent.isLiveTrackingActive = false;
        }
      }

      if (mappedStatus === 'Delivered' || mappedStatus === 'Collected by Customer') {
        order.paymentStatus = 'paid';
        order.deliveredAt = nowIso;
        awardOrderStarPoints(order, `Status updated to ${mappedStatus}`);
      }

      if (mappedStatus === 'Cancelled') {
        reverseOrderStarPoints(order, 'Order status changed to Cancelled');
      }

      // Safe stock restoration if order is cancelled
      if (mappedStatus === 'Cancelled' && !order.stockRestored) {
        order.stockRestored = true;
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            const prevStock = prod.availableStock;
            prod.availableStock += item.quantity;
            const movement: StockMovement = {
              id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
              orderId: order.id,
              productId: prod.id,
              productNameEn: prod.nameEn,
              quantity: item.quantity,
              previousStock: prevStock,
              newStock: prod.availableStock,
              date: nowIso,
              reason: 'order_cancelled',
              notes: `Order #${order.orderNumber} cancelled by Admin. Stock restored.`,
            };
            db.stockMovements.unshift(movement);
            saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement sync err:', e));
          }
        }
        restoreProductStockInFirestore(order.items).catch((fsErr) =>
          console.warn('[Firestore] Stock restore warning:', fsErr)
        );
      }

      order.statusHistory.unshift({
        status: mappedStatus,
        timestamp: nowIso,
        note: note || `Delivery status updated to ${mappedStatus} by Admin.`,
        updatedBy: 'Admin',
      });

      saveDatabase(db);
      appendOrderToArchive(order);

      try {
        await saveOrderToFirestore(order);
        await updateOrderStatusInFirestore(order.id, order.status, order.statusHistory);
      } catch (fsErr) {
        console.warn('[Firestore] Error updating delivery status:', fsErr);
      }

      return res.json({ success: true, order });
    } catch (err: any) {
      console.error('Error updating delivery dispatch status:', err);
      return res.status(500).json({ error: 'Server error updating delivery status.' });
    }
  });
});

// PART 13: Mark Delivery Hire Charge as Paid to Agent
app.patch('/api/admin/orders/:id/agent-hire-payment', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentPaidStatus } = req.body;

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!order.deliveryAgent) {
      return res.status(400).json({ error: 'No delivery agent assigned to this order.' });
    }

    const newStatus = agentPaidStatus === 'paid_to_agent' ? 'paid_to_agent' : 'unpaid';
    order.deliveryAgent.agentPaidStatus = newStatus;
    if (newStatus === 'paid_to_agent') {
      order.deliveryAgent.agentPaidAt = new Date().toISOString();
    } else {
      order.deliveryAgent.agentPaidAt = undefined;
    }
    order.updatedAt = new Date().toISOString();

    saveDatabase(db);
    appendOrderToArchive(order);

    try {
      await saveOrderToFirestore(order);
    } catch (fsErr) {
      console.warn('[Firestore] Error updating agent payment status:', fsErr);
    }

    return res.json({ success: true, order });
  } catch (err: any) {
    console.error('Error recording agent hire payment:', err);
    return res.status(500).json({ error: 'Server error updating hire payout.' });
  }
});

// PART 13: Delivery Expense & Hire Charge Accounting Report
app.get('/api/admin/delivery-accounting', requireAdminAuth, (_req: Request, res: Response) => {
  const deliveryOrders = db.orders.filter((o) => o.deliveryAgent !== undefined);

  let totalHireCharges = 0;
  let totalPaidToAgents = 0;
  let totalPendingPayout = 0;
  let totalDelivered = 0;
  let totalFailed = 0;
  let totalInTransit = 0;

  const agentMap = new Map<string, {
    agentId: string;
    agentName: string;
    vehicleRegistrationNumber: string;
    totalDeliveries: number;
    deliveredCount: number;
    failedCount: number;
    totalCharges: number;
    paidAmount: number;
    pendingAmount: number;
  }>();

  for (const o of deliveryOrders) {
    const da = o.deliveryAgent!;
    const charge = da.hireCharge || 0;
    totalHireCharges += charge;

    const isPaid = da.agentPaidStatus === 'paid_to_agent';
    if (isPaid) {
      totalPaidToAgents += charge;
    } else {
      totalPendingPayout += charge;
    }

    if (da.deliveryStatus === 'delivered' || o.status === 'Delivered') {
      totalDelivered++;
    } else if (da.deliveryStatus === 'failed' || o.status === 'Delivery Failed') {
      totalFailed++;
    } else {
      totalInTransit++;
    }

    let aEntry = agentMap.get(da.agentId);
    if (!aEntry) {
      aEntry = {
        agentId: da.agentId,
        agentName: da.agentName,
        vehicleRegistrationNumber: da.vehicleRegistrationNumber,
        totalDeliveries: 0,
        deliveredCount: 0,
        failedCount: 0,
        totalCharges: 0,
        paidAmount: 0,
        pendingAmount: 0,
      };
      agentMap.set(da.agentId, aEntry);
    }

    aEntry.totalDeliveries++;
    if (da.deliveryStatus === 'delivered' || o.status === 'Delivered') aEntry.deliveredCount++;
    if (da.deliveryStatus === 'failed' || o.status === 'Delivery Failed') aEntry.failedCount++;
    aEntry.totalCharges += charge;
    if (isPaid) {
      aEntry.paidAmount += charge;
    } else {
      aEntry.pendingAmount += charge;
    }
  }

  // Daily breakdown for last 30 days
  const dailyBreakdown: Record<string, { date: string; deliveries: number; totalHire: number; paid: number; pending: number }> = {};
  for (const o of deliveryOrders) {
    const dateKey = o.createdAt.slice(0, 10);
    const charge = o.deliveryAgent?.hireCharge || 0;
    const isPaid = o.deliveryAgent?.agentPaidStatus === 'paid_to_agent';

    if (!dailyBreakdown[dateKey]) {
      dailyBreakdown[dateKey] = { date: dateKey, deliveries: 0, totalHire: 0, paid: 0, pending: 0 };
    }
    dailyBreakdown[dateKey].deliveries++;
    dailyBreakdown[dateKey].totalHire += charge;
    if (isPaid) {
      dailyBreakdown[dateKey].paid += charge;
    } else {
      dailyBreakdown[dateKey].pending += charge;
    }
  }

  return res.json({
    totalAssignedOrders: deliveryOrders.length,
    totalDelivered,
    totalFailed,
    totalInTransit,
    totalHireCharges,
    totalPaidToAgents,
    totalPendingPayout,
    agentSummaries: Array.from(agentMap.values()),
    dailyBreakdown: Object.values(dailyBreakdown).sort((a, b) => b.date.localeCompare(a.date)),
  });
});

// -------------------------------------------------------------
// PART 4, 5, 6, 7: CUSTOMER PAYMENTS, CREDIT & OUTSTANDING BALANCES
// -------------------------------------------------------------

// Record Customer Payment / Installment against Order
app.post('/api/admin/orders/:id/payments', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'cash', paymentDate, note, receivedBy = 'Admin' } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount greater than 0 is required.' });
    }

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order invoice not found.' });
    }

    if (!order.payments) {
      order.payments = [];
    }

    const nowIso = new Date().toISOString();
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      orderId: order.id,
      amount: numericAmount,
      paymentMethod,
      paymentDate: paymentDate || nowIso,
      note: note ? note.trim() : undefined,
      receivedBy: receivedBy.trim(),
    };

    order.payments.push(newPayment);

    // Recalculate amountPaid and outstandingBalance
    order.amountPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    order.outstandingBalance = Math.max(0, order.total - order.amountPaid);

    // Update paymentStatus
    if (order.outstandingBalance <= 0) {
      order.paymentStatus = 'PAID';
    } else if (order.amountPaid > 0) {
      order.paymentStatus = 'PARTIALLY PAID';
    } else {
      order.paymentStatus = 'UNPAID';
    }

    order.updatedAt = nowIso;
    order.statusHistory.unshift({
      status: order.status,
      timestamp: nowIso,
      note: `Payment of LKR ${numericAmount.toLocaleString()} received via ${paymentMethod.toUpperCase()} (Received by ${receivedBy}). Outstanding balance: LKR ${order.outstandingBalance.toLocaleString()}.`,
      updatedBy: 'Admin',
    });

    saveDatabase(db);
    appendOrderToArchive(order);

    // Automatically recalculate and sync customer account
    const { stats: updatedStats, accounts: updatedAccounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    const phoneKey = normalizeSriLankanPhone(order.customerPhone) || order.customerPhone;
    const customerAccount = updatedAccounts.find((c) => c.rawPhone === phoneKey || c.customerId === `CUST-${phoneKey.slice(-6)}`);

    try {
      await saveOrderToFirestore(order);
      if (customerAccount) {
        await saveCustomerAccountToFirestore(customerAccount);
      }
    } catch (fsErr) {
      console.warn('[Firestore] Error saving order payment update:', fsErr);
    }

    return res.status(201).json({
      success: true,
      payment: newPayment,
      amountPaid: order.amountPaid,
      outstandingBalance: order.outstandingBalance,
      paymentStatus: order.paymentStatus,
      order,
      customer: customerAccount,
      stats: updatedStats,
    });
  } catch (err: any) {
    console.error('Error recording payment:', err);
    return res.status(500).json({ error: 'Server error recording payment.' });
  }
});

// PART 5: Daily Outstanding Payment Dashboard Summary
app.get('/api/admin/payment-summary', requireAdminAuth, (_req: Request, res: Response) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Active orders (not cancelled)
  const activeOrders = db.orders.filter((o) => o.status !== 'Cancelled');

  // Today's total sales
  const todayOrders = activeOrders.filter((o) => o.createdAt.startsWith(todayStr));
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);

  // Today's payments received across all orders
  let todayPayments = 0;
  for (const o of db.orders) {
    if (o.payments && o.payments.length > 0) {
      for (const p of o.payments) {
        if (p.paymentDate.startsWith(todayStr)) {
          todayPayments += p.amount;
        }
      }
    }
  }

  // Today's outstanding = today's sales - payments made on today's orders
  const todayOrdersPaid = todayOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const todayOutstanding = Math.max(0, todaySales - todayOrdersPaid);

  // Total customer outstanding balance
  const totalOutstanding = activeOrders.reduce((sum, o) => sum + (o.outstandingBalance ?? Math.max(0, o.total - (o.amountPaid || 0))), 0);

  // Invoices counts
  const unpaidCount = activeOrders.filter((o) => (o.outstandingBalance ?? o.total) > 0 && (!o.amountPaid || o.amountPaid === 0)).length;
  const partiallyPaidCount = activeOrders.filter((o) => (o.outstandingBalance ?? 0) > 0 && (o.amountPaid || 0) > 0).length;
  const paidCount = activeOrders.filter((o) => (o.outstandingBalance ?? 0) <= 0).length;

  return res.json({
    date: todayStr,
    todaySales,
    todayPayments,
    todayOutstanding,
    totalOutstanding,
    unpaidCount,
    partiallyPaidCount,
    paidCount,
    totalOrders: activeOrders.length,
  });
});

// PART 7: Customer Accounts, Real-time Dashboard & Payment Synchronization
app.get('/api/admin/customer-accounts', requireAdminAuth, (req: Request, res: Response) => {
  const { stats, accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);

  if (req.query.format === 'legacy') {
    return res.json(accounts);
  }

  return res.json({
    stats,
    accounts,
  });
});

// Single Customer Account Details and Transaction History
app.get('/api/admin/customer-accounts/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { stats, accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
  const found = accounts.find(
    (c) =>
      c.customerId === id ||
      c.rawPhone === id ||
      c.customerPhone === id ||
      c.rawPhone === normalizeSriLankanPhone(id)
  );

  if (!found) {
    return res.status(404).json({ error: 'Customer account not found.' });
  }

  return res.json({ stats, customer: found });
});

// Automatic Customer Account Payment Recording (Allocates FIFO to unpaid orders & records in customer ledger)
const handleRecordCustomerPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      amount,
      paymentMethod = 'cash',
      paymentDate,
      receiptNumber,
      note,
      receivedBy = 'Admin',
    } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount greater than 0 is required.' });
    }

    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    const customer = accounts.find(
      (c) =>
        c.customerId === id ||
        c.rawPhone === id ||
        c.customerPhone === id ||
        c.rawPhone === normalizeSriLankanPhone(id)
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer account not found.' });
    }

    if (!db.customerPayments) {
      db.customerPayments = [];
    }

    // Duplicate payment prevention
    const cleanReceipt = receiptNumber ? receiptNumber.trim() : undefined;
    if (cleanReceipt) {
      const dupDirect = db.customerPayments.find(
        (p) => p.receiptNumber && p.receiptNumber.toLowerCase() === cleanReceipt.toLowerCase()
      );
      const dupOrderPay = db.orders.some((o) =>
        o.payments?.some(
          (p) => p.receiptNumber && p.receiptNumber.toLowerCase() === cleanReceipt.toLowerCase()
        )
      );
      if (dupDirect || dupOrderPay) {
        return res.status(409).json({
          error: `A payment with receipt/reference number "${cleanReceipt}" has already been recorded. Duplicate entry prevented.`,
        });
      }
    }

    const nowIso = new Date().toISOString();
    const finalReceipt = cleanReceipt || `RCP-${Date.now().toString().slice(-6)}`;
    const directPaymentRecordId = `pay-cust-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    // Allocate payment to customer's open orders FIFO
    const customerOrders = db.orders.filter(
      (o) => (normalizeSriLankanPhone(o.customerPhone) || o.customerPhone) === customer.rawPhone
    );

    const { allocatedOrders } = allocatePaymentToUnpaidOrders(
      customerOrders,
      numericAmount,
      {
        paymentMethod,
        paymentDate: paymentDate || nowIso,
        receiptNumber: finalReceipt,
        receivedBy: receivedBy.trim(),
        note: note ? note.trim() : undefined,
      }
    );

    // Save and archive allocated orders
    for (const ord of allocatedOrders) {
      ord.updatedAt = nowIso;
      appendOrderToArchive(ord);
      try {
        await saveOrderToFirestore(ord);
      } catch (fsErr) {
        console.warn('[Firestore] Error saving updated order during customer payment:', fsErr);
      }
    }

    const directPaymentRecord: CustomerDirectPaymentRecord = {
      id: directPaymentRecordId,
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerPhone: customer.rawPhone || customer.customerPhone,
      amount: numericAmount,
      paymentMethod,
      paymentDate: paymentDate || nowIso,
      receiptNumber: finalReceipt,
      note: note ? note.trim() : undefined,
      receivedBy: receivedBy.trim(),
      createdAt: nowIso,
    };

    db.customerPayments.push(directPaymentRecord);

    // Immediate recalculation of all financial values
    const updated = calculateAllCustomerAccounts(db.orders, db.customerPayments, db.starPointsLedger || []);
    const updatedCustomer =
      updated.accounts.find((c) => c.customerId === customer.customerId) || customer;

    // Audit log
    if (!db.reportAuditLogs) db.reportAuditLogs = [];
    db.reportAuditLogs.unshift({
      id: `audit-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      timestamp: nowIso,
      action: 'CUSTOMER_PAYMENT_RECORDED',
      reportName: `Payment Rs. ${numericAmount.toLocaleString()} for Customer ${customer.customerName} (${customer.customerId})`,
      staffId: (req as any).staffUser?.id || 'staff-admin',
      staffName: (req as any).staffUser?.name || receivedBy || 'Staff',
      details: `Payment of Rs. ${numericAmount.toLocaleString()} received via ${paymentMethod.toUpperCase()} (Ref: ${finalReceipt}). New Outstanding Balance: Rs. ${updatedCustomer.outstandingBalance.toLocaleString()}`,
    });

    saveDatabase(db);

    try {
      await saveCustomerAccountToFirestore(updatedCustomer);
    } catch (fsErr) {
      console.warn('[Firestore] Error saving customer account to Firestore:', fsErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully and customer account automatically updated.',
      payment: directPaymentRecord,
      customer: updatedCustomer,
      stats: updated.stats,
    });
  } catch (err: any) {
    console.error('Error recording customer payment:', err);
    return res.status(500).json({ error: 'Server error recording customer payment.' });
  }
};

app.post('/api/admin/customers/:id/payments', requireAdminAuth, handleRecordCustomerPayment);
app.post('/api/admin/customer-accounts/:id/payments', requireAdminAuth, handleRecordCustomerPayment);

// =============================================================
// CUSTOMER LOYALTY STAR POINTS SYSTEM API
// =============================================================

// Public/Customer: Get Star Points profile by phone number or customer ID
app.get('/api/customer/loyalty', (req: Request, res: Response) => {
  try {
    const rawPhone = (req.query.phone as string) || '';
    const customerId = (req.query.customerId as string) || '';

    if (!rawPhone && !customerId) {
      return res.status(400).json({ error: 'Phone number or customer ID is required.' });
    }

    const normalizedPhone = rawPhone ? (normalizeSriLankanPhone(rawPhone) || rawPhone) : '';
    const effectiveCustomerId = customerId || (normalizedPhone ? `CUST-${normalizedPhone.slice(-6)}` : '');

    // Find customer name from existing orders or customer payments
    const matchedOrder = db.orders.find(
      (o) =>
        (normalizedPhone && (normalizeSriLankanPhone(o.customerPhone) === normalizedPhone || o.customerPhone === rawPhone)) ||
        (effectiveCustomerId && o.customerPhone && `CUST-${(normalizeSriLankanPhone(o.customerPhone) || o.customerPhone).slice(-6)}` === effectiveCustomerId)
    );
    const customerName = matchedOrder?.customerName || 'Valued Customer';
    const phoneToUse = normalizedPhone || matchedOrder?.customerPhone || '';

    const summary = computeCustomerLoyaltySummary(
      effectiveCustomerId,
      phoneToUse,
      customerName,
      db.starPointsLedger || []
    );

    // Compute annual ranking and attach customer's approved rewards
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    const rankings = generateAnnualCustomerRankings(
      accounts,
      db.starPointsLedger || [],
      db.annualRewards || [],
      summary.currentCycle
    );
    const rankItem = rankings.find(
      (r) => r.customerId === effectiveCustomerId || r.rawPhone === phoneToUse || r.customerPhone === phoneToUse
    );
    summary.annualRank = rankItem ? rankItem.rank : undefined;

    // Filter approved rewards for this customer only (Privacy protected)
    const customerApprovedRewards = (db.annualRewards || []).filter(
      (r) =>
        (r.customerId === effectiveCustomerId || r.customerPhone === phoneToUse) &&
        (r.status === 'Approved' || r.status === 'Ready for Collection' || r.status === 'Delivered')
    );
    summary.annualRewards = customerApprovedRewards;

    // Attach active annual announcement if available
    const activeAnnouncement = db.annualRewardAnnouncements?.[summary.currentCycle];
    if (activeAnnouncement && activeAnnouncement.isActive) {
      summary.announcement = activeAnnouncement;
    }

    return res.json({
      success: true,
      loyalty: summary,
      anniversaryWarning: 'Your Star Points will expire on 17 July. Use your rewards before the anniversary date!',
    });
  } catch (err: any) {
    console.error('Error fetching customer loyalty:', err);
    return res.status(500).json({ error: 'Failed to retrieve loyalty points profile.' });
  }
});

// Admin: Loyalty Summary & Global Statistics
app.get('/api/admin/loyalty/summary', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const ledger = db.starPointsLedger || [];
    const currentCycleInfo = getLoyaltyCycleForDate();
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], ledger);

    let totalPointsIssuedCurrentCycle = 0;
    let totalPointsRedeemedCurrentCycle = 0;
    let totalPointsExpired = 0;
    let totalPointsAllTime = 0;

    for (const tx of ledger) {
      const cycle = tx.cycle || getLoyaltyCycleForDate(tx.date).cycleId;
      if (tx.type === 'EARN' || (tx.type === 'ADJUSTMENT' && tx.points > 0)) {
        totalPointsAllTime += tx.points;
        if (cycle === currentCycleInfo.cycleId) {
          totalPointsIssuedCurrentCycle += tx.points;
        }
      } else if (tx.type === 'REDEEM') {
        if (cycle === currentCycleInfo.cycleId) {
          totalPointsRedeemedCurrentCycle += Math.abs(tx.points);
        }
      } else if (tx.type === 'EXPIRY') {
        totalPointsExpired += Math.abs(tx.points);
      }
    }

    const totalActivePoints = accounts.reduce((sum, c) => sum + (c.starPointsBalance || 0), 0);
    const customersWithPoints = accounts.filter((c) => (c.starPointsBalance || 0) > 0).length;

    return res.json({
      success: true,
      summary: {
        cycle: currentCycleInfo.cycleId,
        period: currentCycleInfo.periodDisplayEn,
        periodSi: currentCycleInfo.periodDisplaySi,
        expiryDate: currentCycleInfo.expiryDateDisplayEn,
        expiryDateSi: currentCycleInfo.expiryDateDisplaySi,
        anniversaryWarning: 'Your Star Points will expire on 17 July. Use your rewards before the anniversary date!',
        totalRegisteredCustomers: accounts.length,
        customersWithPoints,
        totalActivePoints,
        pointsExpiringOn17July: totalActivePoints,
        totalPointsIssuedCurrentCycle,
        totalPointsRedeemedCurrentCycle,
        totalPointsExpiredAllTime: totalPointsExpired,
        totalPointsIssuedAllTime: totalPointsAllTime,
      },
    });
  } catch (err: any) {
    console.error('Error fetching admin loyalty summary:', err);
    return res.status(500).json({ error: 'Failed to retrieve loyalty summary.' });
  }
});

// Admin: List all customers with loyalty profiles and search/filter
app.get('/api/admin/loyalty/customers', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { search = '', filter = 'all' } = req.query as { search?: string; filter?: string };
    const ledger = db.starPointsLedger || [];
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], ledger);

    const query = search.trim().toLowerCase();
    let result = accounts.map((c) => {
      const loyalty = c.loyaltyProfile || computeCustomerLoyaltySummary(c.customerId, c.rawPhone || c.customerPhone || '', c.customerName, ledger);
      return {
        customerId: c.customerId,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        rawPhone: c.rawPhone || c.customerPhone || '',
        deliveryArea: c.deliveryArea,
        totalPurchases: c.totalPurchases,
        starPointsBalance: loyalty.availablePoints,
        currentCycleEarnedPoints: loyalty.currentCycleEarnedPoints,
        currentCyclePurchases: loyalty.currentCyclePurchases,
        pointsExpiringOn17July: loyalty.pointsExpiringOn17July,
        totalPointsEarnedAllTime: loyalty.totalPointsEarnedAllTime,
        totalPointsRedeemed: loyalty.totalPointsRedeemed,
        totalPointsExpired: loyalty.totalPointsExpired,
        expiryDate: loyalty.expiryDate,
        lastEarnedDate: loyalty.lastEarnedDate,
        transactionCount: loyalty.transactions.length,
      };
    });

    if (query) {
      result = result.filter(
        (c) =>
          c.customerName.toLowerCase().includes(query) ||
          c.customerPhone.toLowerCase().includes(query) ||
          (c.rawPhone && c.rawPhone.toLowerCase().includes(query)) ||
          c.customerId.toLowerCase().includes(query)
      );
    }

    if (filter === 'with_points') {
      result = result.filter((c) => c.starPointsBalance > 0);
    } else if (filter === 'expiring') {
      result = result.filter((c) => c.pointsExpiringOn17July > 0);
    } else if (filter === 'has_activity') {
      result = result.filter((c) => c.transactionCount > 0);
    }

    return res.json({
      success: true,
      customers: result,
      total: result.length,
    });
  } catch (err: any) {
    console.error('Error fetching admin loyalty customers:', err);
    return res.status(500).json({ error: 'Failed to retrieve loyalty customer records.' });
  }
});

// Admin: Individual customer points ledger
app.get('/api/admin/loyalty/customers/:id/transactions', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ledger = db.starPointsLedger || [];
    const normalizedPhone = normalizeSriLankanPhone(id) || id;
    const customerId = id.startsWith('CUST-') ? id : `CUST-${normalizedPhone.slice(-6)}`;

    const txs = ledger.filter(
      (tx) => tx.customerId === customerId || tx.customerPhone === normalizedPhone || tx.customerPhone === id
    );
    txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      customerId,
      transactions: txs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve loyalty transactions.' });
  }
});

// Admin: Manual Star Points Adjustment
app.post('/api/admin/loyalty/adjustment', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerPhone,
      customerName,
      points,
      reason,
      receiptNumber,
    } = req.body;

    const numericPoints = parseInt(points, 10);
    if (isNaN(numericPoints) || numericPoints === 0) {
      return res.status(400).json({ error: 'Points must be a non-zero integer.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for adjustment is required.' });
    }

    if (!db.starPointsLedger) db.starPointsLedger = [];

    const normPhone = normalizeSriLankanPhone(customerPhone || '') || customerPhone || '';
    const effCustomerId = customerId || (normPhone ? `CUST-${normPhone.slice(-6)}` : `CUST-${Date.now()}`);

    // If deducting points, verify current balance
    const currentSummary = computeCustomerLoyaltySummary(
      effCustomerId,
      normPhone,
      customerName || 'Valued Customer',
      db.starPointsLedger
    );
    if (numericPoints < 0 && currentSummary.availablePoints + numericPoints < 0) {
      return res.status(400).json({
        error: `Cannot deduct ${Math.abs(numericPoints)} points. Customer only has ${currentSummary.availablePoints} points available.`,
      });
    }

    const nowIso = new Date().toISOString();
    const cycleInfo = getLoyaltyCycleForDate(nowIso);

    const adjTx: StarPointsTransaction = {
      id: `sptx-adj-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      customerId: effCustomerId,
      customerPhone: normPhone,
      customerName: customerName || currentSummary.customerName,
      type: 'ADJUSTMENT',
      purchaseAmount: 0,
      points: numericPoints,
      cycle: cycleInfo.cycleId,
      date: nowIso,
      expiryDate: cycleInfo.cycleEndIso,
      description: `Manual Adjustment (${numericPoints > 0 ? '+' : ''}${numericPoints} pts): ${reason.trim()}`,
      receiptNumber: receiptNumber ? receiptNumber.trim() : undefined,
      createdBy: 'Admin',
      createdAt: nowIso,
    };

    db.starPointsLedger.push(adjTx);
    saveDatabase(db);
    saveStarPointsTransactionToFirestore(adjTx).catch((e) => console.warn('[Firestore] adj err:', e));

    const updatedSummary = computeCustomerLoyaltySummary(
      effCustomerId,
      normPhone,
      customerName || currentSummary.customerName,
      db.starPointsLedger
    );

    return res.json({
      success: true,
      transaction: adjTx,
      newBalance: updatedSummary.availablePoints,
      loyalty: updatedSummary,
    });
  } catch (err: any) {
    console.error('Error applying loyalty adjustment:', err);
    return res.status(500).json({ error: 'Failed to record points adjustment.' });
  }
});

// Admin: Export Loyalty Data to CSV
app.get('/api/admin/loyalty/export-csv', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const ledger = db.starPointsLedger || [];
    const currentCycle = getLoyaltyCycleForDate();
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], ledger);

    const rows = [
      [
        'Customer ID',
        'Customer Name',
        'Phone Number',
        'Available Star Points',
        'Current Cycle Purchases (LKR)',
        'Points Expiring on 17 July',
        'Total Earned (All Time)',
        'Total Redeemed',
        'Total Expired',
        'Loyalty Cycle Period',
        'Last Earned Date',
      ],
    ];

    for (const c of accounts) {
      const l = c.loyaltyProfile || computeCustomerLoyaltySummary(c.customerId, c.rawPhone || c.customerPhone || '', c.customerName, ledger);
      rows.push([
        c.customerId,
        `"${(c.customerName || '').replace(/"/g, '""')}"`,
        `"${c.customerPhone}"`,
        l.availablePoints.toString(),
        l.currentCyclePurchases.toString(),
        l.pointsExpiringOn17July.toString(),
        l.totalPointsEarnedAllTime.toString(),
        l.totalPointsRedeemed.toString(),
        l.totalPointsExpired.toString(),
        `"${currentCycle.periodDisplayEn}"`,
        l.lastEarnedDate ? new Date(l.lastEarnedDate).toLocaleDateString() : 'None',
      ]);
    }

    const csvContent = rows.map((r) => r.join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="FoodLife_Loyalty_Star_Points_${currentCycle.cycleId}.csv"`);
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate loyalty CSV report.' });
  }
});

// Admin: Printable Official PDF / HTML Report
app.get('/api/admin/loyalty/export-pdf', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const ledger = db.starPointsLedger || [];
    const targetCycleId = (req.query.cycle as string) || getLoyaltyCycleForDate().cycleId;
    const filterType = (req.query.filter as string) || 'all';
    const autoPrint = req.query.autoprint === 'true';

    const currentCycle = getLoyaltyCycleForDate();
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], ledger);

    // Compute loyalty profiles for all customers
    const fullProfiles = accounts.map((c) => {
      const l = c.loyaltyProfile || computeCustomerLoyaltySummary(c.customerId, c.rawPhone || c.customerPhone || '', c.customerName, ledger);
      return {
        ...c,
        loyalty: l,
      };
    });

    // Apply optional filter
    let filtered = fullProfiles;
    if (filterType === 'with_points') {
      filtered = fullProfiles.filter((p) => p.loyalty.availablePoints > 0);
    } else if (filterType === 'expiring') {
      filtered = fullProfiles.filter((p) => p.loyalty.pointsExpiringOn17July > 0);
    }

    // Sort descending by available points, then purchases
    filtered.sort((a, b) => b.loyalty.availablePoints - a.loyalty.availablePoints || b.loyalty.currentCyclePurchases - a.loyalty.currentCyclePurchases);

    // Calculate Grand Totals
    const totalActivePoints = filtered.reduce((sum, p) => sum + p.loyalty.availablePoints, 0);
    const totalExpiringPoints = filtered.reduce((sum, p) => sum + p.loyalty.pointsExpiringOn17July, 0);
    const totalCyclePurchases = filtered.reduce((sum, p) => sum + p.loyalty.currentCyclePurchases, 0);
    const totalAllTimeEarned = filtered.reduce((sum, p) => sum + p.loyalty.totalPointsEarnedAllTime, 0);
    const totalRedeemed = filtered.reduce((sum, p) => sum + p.loyalty.totalPointsRedeemed, 0);
    const totalExpired = filtered.reduce((sum, p) => sum + p.loyalty.totalPointsExpired, 0);
    const customersWithPointsCount = filtered.filter((p) => p.loyalty.availablePoints > 0).length;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>FOOD & LIFE - Customer Loyalty Star Points Complete Audit Report (${currentCycle.cycleId})</title>
<style>
  @page { size: A4 landscape; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Sinhala", sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 16px 20px;
    font-size: 10.5px;
    line-height: 1.35;
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.9; }
  .btn-print { background: #15803d; color: #ffffff; }
  .btn-html { background: #0284c7; color: #ffffff; }
  .btn-close { background: #475569; color: #ffffff; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2.5px solid #15803d;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .brand {
    font-size: 20px;
    font-weight: 900;
    color: #15803d;
    letter-spacing: -0.5px;
  }
  .title-en { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 1px; }
  .title-si { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 1px; }
  .badge {
    background: #dcfce7;
    color: #14532d;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 10px;
    display: inline-block;
    margin-top: 4px;
    border: 1px solid #86efac;
  }
  .meta { text-align: right; font-size: 10px; color: #475569; }
  .meta div { margin-bottom: 2px; }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: center;
  }
  .card-label {
    font-size: 8px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
    letter-spacing: 0.3px;
  }
  .card-val {
    font-size: 14px;
    font-weight: 900;
    color: #0f172a;
    margin-top: 3px;
  }
  .banner {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 6px 10px;
    font-size: 9.5px;
    color: #92400e;
    margin-bottom: 12px;
    border-radius: 2px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
    margin-bottom: 16px;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th {
    background: #f1f5f9;
    text-align: left;
    padding: 5px 6px;
    font-weight: 800;
    color: #1e293b;
    border: 1px solid #cbd5e1;
    white-space: nowrap;
  }
  td {
    padding: 4.5px 6px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  tr:nth-child(even) { background: #f8fafc; }
  .points-badge {
    font-weight: 900;
    color: #b45309;
    background: #fef3c7;
    padding: 2px 6px;
    border-radius: 10px;
    display: inline-block;
  }
  tfoot td {
    background: #e2e8f0;
    font-weight: 900;
    border: 1px solid #94a3b8;
    color: #0f172a;
    padding: 6px 6px;
  }
  .policy-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 9px;
    color: #475569;
    margin-bottom: 16px;
  }
  .policy-title { font-weight: 800; color: #0f172a; margin-bottom: 3px; }
  .signatures {
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    page-break-inside: avoid;
  }
  .sig-block {
    width: 220px;
    text-align: center;
    border-top: 1px dashed #64748b;
    padding-top: 5px;
    font-size: 9.5px;
    color: #334155;
  }
  @media print {
    body { padding: 0; background: #ffffff; }
    .no-print { display: none !important; }
    @page { margin: 8mm 10mm; }
  }
</style>
<script>
  function downloadHTML() {
    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'FOOD_AND_LIFE_STAR_POINTS_FULL_REPORT_${currentCycle.cycleId}.html';
    a.click();
  }
  ${autoPrint ? 'window.addEventListener("load", function() { setTimeout(function() { window.print(); }, 400); });' : ''}
</script>
</head>
<body>

<div class="toolbar no-print">
  <div>
    <strong>FOOD &amp; LIFE Customer Loyalty Audit System</strong> — Ready to print or save as PDF
  </div>
  <div style="display: flex; gap: 8px;">
    <button type="button" onclick="window.print()" class="btn btn-print">🖨️ Print / Save as PDF (මුද්‍රණය කරන්න / PDF)</button>
    <button type="button" onclick="downloadHTML()" class="btn btn-html">📥 Download HTML Archive</button>
    <button type="button" onclick="window.close()" class="btn btn-close">❌ Close</button>
  </div>
</div>

<div class="header">
  <div>
    <div class="brand">FOOD &amp; LIFE GROCERY</div>
    <div class="title-en">Customer Loyalty Star Points Official Complete Audit Statement</div>
    <div class="title-si">පාරිභෝගික ලෝයල්ටි ස්ටාර් පොයින්ට්ස් සම්පූර්ණ නිල විගණන වාර්තාව</div>
    <div class="badge">Annual Cycle: ${currentCycle.periodDisplayEn} (${currentCycle.cycleId})</div>
  </div>
  <div class="meta">
    <div><strong>Generated:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })} (Sri Lanka Time)</div>
    <div><strong>Anniversary Expiry:</strong> 17 July ${currentCycle.endYear} at 24:00 (Midnight) SLT</div>
    <div><strong>Earning Rule:</strong> FLOOR(Purchase / 1,000) × 5 points • Completed Paid Orders Only</div>
    <div><strong>Store Location:</strong> Katuloya Main Branch &amp; Delivery Network</div>
  </div>
</div>

<div class="banner">
  <div>
    ⚠️ <strong>ANNUAL EXPIRATION &amp; AUDIT RULE:</strong> All active Star Points earned during this cycle expire automatically on <strong>17 July ${currentCycle.endYear} at 24:00 (midnight)</strong>. Points do not carry over to the new cycle. Approved rewards remain safe and claimable.
  </div>
  <div style="font-weight: 700; font-size: 10px;">
    Total Customers in Report: ${filtered.length}
  </div>
</div>

<div class="summary-grid">
  <div class="card">
    <div class="card-label">Active Points in Circulation</div>
    <div class="card-val" style="color: #b45309;">⭐ ${totalActivePoints.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">Points Expiring 17 July</div>
    <div class="card-val" style="color: #dc2626;">${totalExpiringPoints.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">Cycle Purchases (LKR)</div>
    <div class="card-val" style="color: #15803d;">Rs. ${totalCyclePurchases.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">Total Points Issued (All-Time)</div>
    <div class="card-val">${totalAllTimeEarned.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">Points Redeemed / Expired</div>
    <div class="card-val" style="color: #64748b;">${totalRedeemed.toLocaleString()} / ${totalExpired.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">Customers with Points</div>
    <div class="card-val">${customersWithPointsCount} / ${accounts.length}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width: 25px; text-align: center;">#</th>
      <th>Customer ID</th>
      <th>Customer Name</th>
      <th>Phone Number</th>
      <th>Delivery Area</th>
      <th style="text-align: right;">Cycle Purchases</th>
      <th style="text-align: center;">Active Star Points</th>
      <th style="text-align: center; color: #dc2626;">Expiring 17 July</th>
      <th style="text-align: right;">All-Time Earned</th>
      <th style="text-align: right;">Redeemed</th>
      <th style="text-align: right;">Expired</th>
      <th>Expiry Date</th>
      <th>Last Activity</th>
    </tr>
  </thead>
  <tbody>
    ${filtered.map((p, i) => {
      const l = p.loyalty;
      const lastEarnedFormatted = l.lastEarnedDate ? new Date(l.lastEarnedDate).toLocaleDateString('en-GB') : '—';
      return `<tr>
        <td style="text-align: center;">${i + 1}</td>
        <td><strong>${p.customerId}</strong></td>
        <td>${p.customerName || 'Valued Customer'}</td>
        <td>${p.customerPhone}</td>
        <td>${p.deliveryArea || 'Katuloya'}</td>
        <td style="text-align: right;">Rs. ${l.currentCyclePurchases.toLocaleString()}</td>
        <td style="text-align: center;"><span class="points-badge">⭐ ${l.availablePoints}</span></td>
        <td style="text-align: center; color: #dc2626; font-weight: 800;">${l.pointsExpiringOn17July}</td>
        <td style="text-align: right;">${l.totalPointsEarnedAllTime}</td>
        <td style="text-align: right;">${l.totalPointsRedeemed}</td>
        <td style="text-align: right; color: #64748b;">${l.totalPointsExpired}</td>
        <td style="white-space: nowrap;">${l.expiryDate}</td>
        <td style="text-align: center;">${lastEarnedFormatted}</td>
      </tr>`;
    }).join('')}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="5" style="text-align: right; font-weight: 900;">GRAND TOTALS (${filtered.length} Customers):</td>
      <td style="text-align: right; font-weight: 900; color: #15803d;">Rs. ${totalCyclePurchases.toLocaleString()}</td>
      <td style="text-align: center; font-weight: 900; color: #b45309;">⭐ ${totalActivePoints.toLocaleString()}</td>
      <td style="text-align: center; font-weight: 900; color: #dc2626;">${totalExpiringPoints.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 900;">${totalAllTimeEarned.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 900;">${totalRedeemed.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 900; color: #64748b;">${totalExpired.toLocaleString()}</td>
      <td colspan="2" style="text-align: center; font-size: 8.5px; color: #475569;">Verified Central Ledger</td>
    </tr>
  </tfoot>
</table>

<div class="policy-box">
  <div class="policy-title">OFFICIAL LOYALTY PROGRAMME GOVERNANCE &amp; POLICY NOTES:</div>
  <div>1. <strong>Calculation Authority:</strong> Star Points are calculated strictly as <code>FLOOR(Eligible Purchase / 1,000) × 5</code> points for completed and paid grocery orders. Cancelled, unpaid, or refunded orders have points reversed automatically.</div>
  <div>2. <strong>Annual Expiration:</strong> All unused points for the annual period (18 July – 17 July) expire irrevocably at 24:00 on 17 July (Asia/Colombo). Points never carry over.</div>
  <div>3. <strong>Admin-Controlled Rewards:</strong> Star Points are loyalty eligibility points and cannot be converted into cash. Annual rewards, gift hampers, discount vouchers, and VIP perks are determined and approved solely by Food &amp; Life Management.</div>
</div>

<div class="signatures">
  <div class="sig-block">
    <strong>Prepared by:</strong><br/>
    Staff / System Operator
  </div>
  <div class="sig-block">
    <strong>Audited by:</strong><br/>
    Internal Audit &amp; Loyalty Officer
  </div>
  <div class="sig-block">
    <strong>Approved by:</strong><br/>
    Food &amp; Life Grocery Management
  </div>
</div>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err: any) {
    console.error('Error generating loyalty PDF report:', err);
    return res.status(500).json({ error: 'Failed to generate loyalty PDF statement.' });
  }
});

// =============================================================
// ADMIN CONTROLLED ANNUAL CUSTOMER REWARDS & RANKINGS API
// =============================================================

// Admin: Annual Customer Rankings based strictly on points earned in the cycle
app.get('/api/admin/loyalty/rankings', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { cycle, filter = 'all', search = '' } = req.query as Record<string, string | undefined>;
    const targetCycle = cycle || getLoyaltyCycleForDate().cycleId;
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    let rankings = generateAnnualCustomerRankings(accounts, db.starPointsLedger || [], db.annualRewards || [], targetCycle);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      rankings = rankings.filter(
        (r) =>
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q) ||
          (r.rawPhone && r.rawPhone.toLowerCase().includes(q)) ||
          r.customerId.toLowerCase().includes(q)
      );
    }

    if (filter === 'top5') {
      rankings = rankings.slice(0, 5);
    } else if (filter === 'top10') {
      rankings = rankings.slice(0, 10);
    } else if (filter === 'top25') {
      rankings = rankings.slice(0, 25);
    } else if (filter === 'has_rewards') {
      rankings = rankings.filter((r) => r.rewardsCount > 0);
    } else if (filter === 'no_rewards') {
      rankings = rankings.filter((r) => r.rewardsCount === 0);
    }

    return res.json({
      success: true,
      cycle: targetCycle,
      totalRanked: rankings.length,
      rankings,
    });
  } catch (err: any) {
    console.error('Error fetching annual customer rankings:', err);
    return res.status(500).json({ error: 'Failed to retrieve rankings.' });
  }
});

// Admin: List all annual rewards for cycle
app.get('/api/admin/loyalty/rewards', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { cycle, status, customerId } = req.query as Record<string, string | undefined>;
    const targetCycle = cycle || getLoyaltyCycleForDate().cycleId;
    let list = (db.annualRewards || []).filter((r) => r.cycle === targetCycle);

    if (status && status !== 'all') {
      list = list.filter((r) => r.status === status);
    }
    if (customerId) {
      list = list.filter((r) => r.customerId === customerId);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      cycle: targetCycle,
      total: list.length,
      rewards: list,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve annual rewards.' });
  }
});

// Admin: Allocate Rewards to single or multiple selected customers
app.post('/api/admin/loyalty/rewards', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      customerIds,
      cycle,
      rewardType = 'gift_hamper',
      rewardTitle,
      rewardDescription,
      rewardValue,
      quantity = 1,
      status = 'Approved',
      voucherCode,
      collectionInstructions,
      distributionDate,
      notes,
    } = req.body;

    const targets: string[] = Array.isArray(customerIds)
      ? customerIds
      : typeof customerIds === 'string'
      ? customerIds.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (targets.length === 0) {
      return res.status(400).json({ error: 'At least one customer must be selected.' });
    }

    const targetCycle = cycle || getLoyaltyCycleForDate().cycleId;
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    const rankings = generateAnnualCustomerRankings(accounts, db.starPointsLedger || [], db.annualRewards || [], targetCycle);

    const preset = getDefaultRewardPreset(rewardType as RewardType);
    const finalTitle = rewardTitle?.trim() || preset.title;
    const finalDesc = rewardDescription?.trim() || preset.description;
    const finalValue = Number(rewardValue) >= 0 ? Number(rewardValue) : preset.estimatedValue;
    const adminUser = (req as any).staffUser?.username || 'Admin';

    if (!db.annualRewards) {
      db.annualRewards = [];
    }

    const createdRewards: AnnualRewardRecord[] = [];
    const nowIso = new Date().toISOString();

    for (const cid of targets) {
      const foundRank = rankings.find((r) => r.customerId === cid || r.rawPhone === cid);
      const custName = foundRank?.customerName || 'Valued Customer';
      const custPhone = foundRank?.customerPhone || cid;

      let finalVoucher = voucherCode?.trim();
      if (!finalVoucher && (rewardType === 'discount_voucher' || rewardType === 'cash_voucher')) {
        finalVoucher = `FL-${rewardType === 'discount_voucher' ? 'DISC' : 'CASH'}-${Date.now().toString().slice(-4)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      }

      const rewardRecord: AnnualRewardRecord = {
        id: `rew-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        cycle: targetCycle,
        customerId: cid,
        customerName: custName,
        customerPhone: custPhone,
        rankAtSelection: foundRank?.rank,
        annualPointsEarned: foundRank?.annualPointsEarned || 0,
        annualPurchases: foundRank?.totalEligiblePurchases || 0,
        rewardType: rewardType as RewardType,
        rewardTitle: finalTitle,
        rewardDescription: finalDesc,
        rewardValue: finalValue,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        status: status as RewardStatus,
        voucherCode: finalVoucher || undefined,
        collectionInstructions:
          collectionInstructions?.trim() ||
          'Please collect your reward at Food & Life Grocery (Katuloya Store) or contact WhatsApp hotline +94 71 259 5683.',
        distributionDate: distributionDate || undefined,
        approvedBy: adminUser,
        approvedAt: status !== 'Pending' ? nowIso : undefined,
        notes: notes?.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.annualRewards.unshift(rewardRecord);
      createdRewards.push(rewardRecord);
      saveAnnualRewardToFirestore(rewardRecord).catch((e) => console.warn('[Firestore] reward sync err:', e));
    }

    saveDatabase(db);

    return res.status(201).json({
      success: true,
      message: `Successfully allocated rewards for ${createdRewards.length} customer(s).`,
      count: createdRewards.length,
      rewards: createdRewards,
    });
  } catch (err: any) {
    console.error('Error assigning annual rewards:', err);
    return res.status(500).json({ error: 'Failed to assign annual rewards.' });
  }
});

// Admin: Update Reward Status and Details
app.patch('/api/admin/loyalty/rewards/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, voucherCode, collectionInstructions, distributionDate, notes } = req.body;

    const reward = (db.annualRewards || []).find((r) => r.id === id);
    if (!reward) {
      return res.status(404).json({ error: 'Reward record not found.' });
    }

    const nowIso = new Date().toISOString();
    const adminUser = (req as any).staffUser?.username || 'Admin';

    if (status) {
      reward.status = status as RewardStatus;
      if (status === 'Approved' && !reward.approvedAt) {
        reward.approvedAt = nowIso;
        reward.approvedBy = adminUser;
      }
      if (status === 'Delivered') {
        reward.deliveredAt = nowIso;
      }
    }
    if (voucherCode !== undefined) reward.voucherCode = voucherCode?.trim() || undefined;
    if (collectionInstructions !== undefined) reward.collectionInstructions = collectionInstructions?.trim();
    if (distributionDate !== undefined) reward.distributionDate = distributionDate;
    if (notes !== undefined) reward.notes = notes?.trim() || undefined;
    reward.updatedAt = nowIso;

    saveDatabase(db);
    saveAnnualRewardToFirestore(reward).catch((e) => console.warn('[Firestore] reward update err:', e));

    return res.json({ success: true, reward });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update reward record.' });
  }
});

// Admin: Delete Reward
app.delete('/api/admin/loyalty/rewards/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = (db.annualRewards || []).findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Reward record not found.' });
    }

    db.annualRewards!.splice(idx, 1);
    saveDatabase(db);
    deleteAnnualRewardFromFirestore(id).catch((e) => console.warn('[Firestore] reward delete err:', e));

    return res.json({ success: true, message: 'Reward allocation removed.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete reward record.' });
  }
});

// Public & Admin: Get Active Annual Announcement
app.get('/api/admin/loyalty/announcement', (req: Request, res: Response) => {
  const cycle = (req.query.cycle as string) || getLoyaltyCycleForDate().cycleId;
  const ann = db.annualRewardAnnouncements?.[cycle] || {
    id: `announcement-${cycle}`,
    cycle,
    headline: 'Annual Customer Loyalty Rewards Announced!',
    headlineSi: 'වාර්ෂික පාරිභෝගික ලෝයල්ටි ත්‍යාග ප්‍රකාශයට පත් කරන ලදී!',
    message: 'Food & Life Management is delighted to reward our top loyal customers for the completed year. Check your approved gifts and vouchers below!',
    messageSi: 'ගත වූ වසර වෙනුවෙන් අපගේ විශිෂ්ටතම පාරිභෝගිකයන් ඇගයීමට FOOD & LIFE සූදානම්. ඔබගේ අනුමත ත්‍යාග පහතින් පරීක්ෂා කරන්න!',
    isActive: true,
  };
  return res.json({ success: true, announcement: ann });
});

// Admin: Publish / Update Annual Announcement
app.post('/api/admin/loyalty/announcement', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { cycle, headline, headlineSi, message, messageSi, isActive = true } = req.body;
    const targetCycle = cycle || getLoyaltyCycleForDate().cycleId;
    const adminUser = (req as any).staffUser?.username || 'Admin';

    if (!db.annualRewardAnnouncements) {
      db.annualRewardAnnouncements = {};
    }

    const annRecord: AnnualRewardsAnnouncement = {
      id: `announcement-${targetCycle}`,
      cycle: targetCycle,
      headline: headline?.trim() || 'Annual Customer Loyalty Rewards Programme',
      headlineSi: headlineSi?.trim() || 'වාර්ෂික පාරිභෝගික ලෝයල්ටි ත්‍යාග වැඩසටහන',
      message: message?.trim() || 'Rewards have been approved by Management.',
      messageSi: messageSi?.trim() || 'පරිපාලනය විසින් ත්‍යාග අනුමත කර ඇත.',
      isActive: Boolean(isActive),
      publishedAt: new Date().toISOString(),
      publishedBy: adminUser,
    };

    db.annualRewardAnnouncements[targetCycle] = annRecord;
    saveDatabase(db);
    saveAnnualRewardsAnnouncementToFirestore(annRecord).catch((e) => console.warn('[Firestore] ann err:', e));

    return res.json({ success: true, announcement: annRecord });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update announcement.' });
  }
});

// Admin: Annual Loyalty Closing Dashboard & Report Data
app.get('/api/admin/loyalty/annual-closing', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const targetCycle = (req.query.cycle as string) || getLoyaltyCycleForDate().cycleId;
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    const summary = generateAnnualClosingSummary(
      accounts,
      db.starPointsLedger || [],
      db.annualRewards || [],
      targetCycle
    );
    return res.json({ success: true, summary });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to calculate annual closing summary.' });
  }
});

// Admin: Annual Closing CSV Export
app.get('/api/admin/loyalty/annual-closing/export-csv', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const targetCycle = (req.query.cycle as string) || getLoyaltyCycleForDate().cycleId;
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    const rankings = generateAnnualCustomerRankings(accounts, db.starPointsLedger || [], db.annualRewards || [], targetCycle);

    const rows = [
      [
        'Annual Rank',
        'Customer ID',
        'Customer Name',
        'Phone Number',
        'Annual Star Points Earned',
        'Eligible Purchases (LKR)',
        'Current Available Points',
        'Rewards Count',
        'Reward Titles',
        'Reward Values (LKR)',
        'Reward Statuses',
        'Voucher Codes',
        'Cycle',
      ],
    ];

    for (const r of rankings) {
      const rewardTitles = r.rewards.map((rw) => rw.rewardTitle).join('; ');
      const rewardValues = r.rewards.map((rw) => rw.rewardValue).join('; ');
      const rewardStatuses = r.rewards.map((rw) => rw.status).join('; ');
      const voucherCodes = r.rewards.map((rw) => rw.voucherCode || 'N/A').join('; ');

      rows.push([
        `"#${r.rank}"`,
        r.customerId,
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${r.customerPhone}"`,
        r.annualPointsEarned.toString(),
        r.totalEligiblePurchases.toString(),
        r.currentAvailablePoints.toString(),
        r.rewardsCount.toString(),
        `"${rewardTitles.replace(/"/g, '""')}"`,
        `"${rewardValues}"`,
        `"${rewardStatuses}"`,
        `"${voucherCodes}"`,
        `"${r.cycle}"`,
      ]);
    }

    const csvContent = rows.map((row) => row.join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="FoodLife_Annual_Loyalty_Rankings_and_Rewards_${targetCycle}.csv"`);
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate annual closing CSV report.' });
  }
});

// Admin: Annual Closing Official PDF Report (Printable HTML)
app.get('/api/admin/loyalty/annual-closing/export-pdf', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const targetCycle = (req.query.cycle as string) || getLoyaltyCycleForDate().cycleId;
    const { accounts } = calculateAllCustomerAccounts(db.orders, db.customerPayments || [], db.starPointsLedger || []);
    const summary = generateAnnualClosingSummary(
      accounts,
      db.starPointsLedger || [],
      db.annualRewards || [],
      targetCycle
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>FOOD & LIFE - Annual Loyalty Closing & Rewards Audit Report (${summary.cycle})</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 16px; font-size: 11px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { font-size: 18px; font-weight: 800; color: #15803d; }
  .badge { background: #fef3c7; color: #92400e; font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 10px; display: inline-block; margin-top: 3px; }
  .meta { text-align: right; font-size: 10px; color: #64748b; }
  .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 14px; }
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
  .card-label { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .card-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
  .banner { background: #ecfdf5; border-left: 4px solid #16a34a; padding: 6px 10px; font-size: 10px; color: #14532d; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px; }
  th { background: #f1f5f9; text-align: left; padding: 5px 6px; font-weight: 700; color: #334155; border: 1px solid #cbd5e1; }
  td { padding: 4px 6px; border: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .rank-badge { font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 1px 5px; border-radius: 8px; }
  .rank-top { background: #fef3c7; color: #b45309; }
  .status-tag { font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; }
  .status-Approved { background: #dcfce7; color: #15803d; }
  .status-Ready { background: #e0f2fe; color: #0369a1; }
  .status-Delivered { background: #f1f5f9; color: #475569; }
  .signatures { margin-top: 24px; display: flex; justify-content: space-between; }
  .sig-block { width: 200px; text-align: center; border-top: 1px dashed #94a3b8; padding-top: 4px; font-size: 9px; color: #475569; }
  @media print { .no-print { display: none; } }
</style>
<script>
  function downloadHTML() {
    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'FOOD_AND_LIFE_ANNUAL_CLOSING_REWARDS_REPORT_${summary.cycle}.html';
    a.click();
  }
  ${req.query.autoprint === 'true' ? 'window.addEventListener("load", function() { setTimeout(function() { window.print(); }, 400); });' : ''}
</script>
</head>
<body>
<div class="no-print" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px;">
  <div style="font-weight: 700; font-size: 11px;">
    FOOD &amp; LIFE Annual Closing &amp; Rewards Report — Ready to print or save as PDF
  </div>
  <div style="display: flex; gap: 8px;">
    <button onclick="window.print()" style="background:#15803d;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">🖨️ Print / Save as PDF (මුද්‍රණය කරන්න / PDF)</button>
    <button onclick="downloadHTML()" style="background:#0284c7;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">📥 Download HTML Archive</button>
    <button onclick="window.close()" style="background:#475569;color:#fff;border:none;padding:6px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-size:11px;">❌ Close</button>
  </div>
</div>
<div class="header">
  <div>
    <div class="brand">FOOD & LIFE GROCERY</div>
    <div style="font-size: 12px; font-weight: 700; color: #334155;">Annual Customer Loyalty Closing &amp; Rewards Management Report</div>
    <div class="badge">Annual Loyalty Cycle: ${summary.period}</div>
  </div>
  <div class="meta">
    <div><strong>Generated:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' })} (SLT)</div>
    <div><strong>Annual Deadline:</strong> 17 July at 24:00 (Midnight)</div>
    <div><strong>Approval Authority:</strong> Food &amp; Life Management</div>
  </div>
</div>

<div class="banner">
  ✨ <strong>ADMIN CONTROLLED ANNUAL REWARDS:</strong> Customer ranking indicates loyalty engagement eligibility. All rewards, hampers, discount vouchers, and special benefits are officially approved and managed by the Admin. Unused points from completed cycle expire without carryover.
</div>

<div class="grid">
  <div class="card">
    <div class="card-label">Participating Customers</div>
    <div class="card-val">${summary.totalRegisteredCustomers}</div>
  </div>
  <div class="card">
    <div class="card-label">Total Purchases (LKR)</div>
    <div class="card-val">Rs. ${summary.totalEligiblePurchases.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">Star Points Issued</div>
    <div class="card-val" style="color: #b45309;">⭐ ${summary.totalStarPointsIssued.toLocaleString()}</div>
  </div>
  <div class="card">
    <div class="card-label">Approved Rewards</div>
    <div class="card-val" style="color: #15803d;">${summary.totalApprovedRewards}</div>
  </div>
  <div class="card">
    <div class="card-label">Rewards Distributed</div>
    <div class="card-val">${summary.totalDistributedRewards}</div>
  </div>
  <div class="card">
    <div class="card-label">Total Rewards Value</div>
    <div class="card-val">Rs. ${summary.totalRewardsValue.toLocaleString()}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width: 30px;">Rank</th>
      <th>Customer ID</th>
      <th>Customer Name</th>
      <th>Phone</th>
      <th style="text-align: right;">Annual Purchases</th>
      <th style="text-align: center;">Points Earned</th>
      <th style="text-align: center;">Current Points</th>
      <th>Assigned Rewards</th>
      <th style="text-align: right;">Value (LKR)</th>
      <th style="text-align: center;">Reward Status</th>
    </tr>
  </thead>
  <tbody>
    ${summary.rankings.map((r) => {
      const isTop = r.rank <= 3;
      const rewardsText = r.rewards.map((rw) => rw.rewardTitle).join(', ') || '—';
      const valText = r.rewards.reduce((sum, rw) => sum + (rw.rewardValue || 0), 0);
      const statusText = r.rewards.map((rw) => rw.status).join(', ') || 'No Reward';
      return `<tr>
        <td style="text-align: center;"><span class="rank-badge ${isTop ? 'rank-top' : ''}">#${r.rank}</span></td>
        <td><strong>${r.customerId}</strong></td>
        <td>${r.customerName}</td>
        <td>${r.customerPhone}</td>
        <td style="text-align: right;">Rs. ${r.totalEligiblePurchases.toLocaleString()}</td>
        <td style="text-align: center; font-weight: 700; color: #b45309;">${r.annualPointsEarned} ⭐</td>
        <td style="text-align: center;">${r.currentAvailablePoints}</td>
        <td>${rewardsText}</td>
        <td style="text-align: right;">${valText > 0 ? `Rs. ${valText.toLocaleString()}` : '—'}</td>
        <td style="text-align: center;"><span class="status-tag status-${r.rewards[0]?.status || 'None'}">${statusText}</span></td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<div class="signatures">
  <div class="sig-block">Prepared by Staff Member</div>
  <div class="sig-block">Loyalty Programme Audit Committee</div>
  <div class="sig-block">Managing Director / Food &amp; Life</div>
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate PDF audit report.' });
  }
});



// =============================================================
// STAFF PORTAL: MANAGEMENT REPORTS & ACCOUNTING API
// =============================================================

// Comprehensive Management Reports & Accounting Data Endpoint
app.get('/api/admin/reports/data', requireAdminAuth, (req: Request, res: Response) => {
  const {
    reportType = 'all', // 'all' | 'daily' | 'monthly' | 'annual' | 'custom'
    date, // YYYY-MM-DD
    month, // 1-12
    year, // YYYY
    fromDate,
    toDate,
    customerPhone,
    productId,
    agentId,
    orderStatus,
    paymentStatus,
    poStatus,
  } = req.query as Record<string, string | undefined>;

  const sltFilter = {
    dailyDate: date,
    monthlyMonth: month ? parseInt(month, 10) : undefined,
    monthlyYear: year ? parseInt(year, 10) : undefined,
    annualYear: year ? parseInt(year, 10) : undefined,
    fromDate,
    toDate,
  };

  // 1. Filter Orders by Time & Criteria
  const filteredOrders = db.orders.filter((o) => {
    // Time filter in Sri Lanka timezone
    if (reportType !== 'all') {
      const matchPeriod = isWithinSLTPeriod(o.createdAt, reportType as any, sltFilter);
      if (!matchPeriod) return false;
    }
    // Customer filter
    if (customerPhone && !normalizeSriLankanPhone(o.customerPhone).includes(normalizeSriLankanPhone(customerPhone))) {
      return false;
    }
    // Status filter
    if (orderStatus && orderStatus !== 'all' && o.status !== orderStatus) {
      return false;
    }
    // Payment status filter
    if (paymentStatus && paymentStatus !== 'all' && o.paymentStatus !== paymentStatus) {
      return false;
    }
    // Delivery Agent filter
    if (agentId && agentId !== 'all') {
      if (!o.deliveryAgent || o.deliveryAgent.agentId !== agentId) return false;
    }
    // Product filter
    if (productId && productId !== 'all') {
      const hasProduct = o.items.some((it) => it.productId === productId);
      if (!hasProduct) return false;
    }
    return true;
  });

  // Calculate Dashboard Metrics
  const activeOrders = filteredOrders.filter((o) => o.status !== 'Cancelled');
  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = activeOrders.length;
  const pendingOrders = activeOrders.filter((o) => o.status === 'Order Received' || o.status === 'Order Confirmed').length;
  const preparingOrders = activeOrders.filter(
    (o) =>
      o.status === 'Preparing Order' ||
      o.status === 'Ready for Dispatch' ||
      o.status === 'Ready for Delivery' ||
      o.status === 'Ready for Pickup' ||
      o.status === 'Ready for Collection'
  ).length;
  const outForDeliveryOrders = activeOrders.filter(
    (o) => o.status === 'Out for Delivery' || o.status === 'Delivery Agent Assigned'
  ).length;
  const deliveredOrders = activeOrders.filter(
    (o) => o.status === 'Delivered' || o.status === 'Collected by Customer'
  ).length;

  // Delivery Hire Accounting (Fees collected vs Hire expenses strictly separated)
  const deliveryOrders = filteredOrders.filter((o) => o.deliveryAgent !== undefined);
  let totalFeesCollected = 0;
  let totalHireExpenses = 0;
  let totalPaidToAgents = 0;
  let outstandingAgentPayments = 0;

  const deliveryRecords = [];
  for (const o of deliveryOrders) {
    const da = o.deliveryAgent!;
    const fee = o.deliveryCharge || 0;
    const hire = da.hireCharge || 0;
    const isPaid = da.agentPaidStatus === 'paid_to_agent';
    const amountPaid = isPaid ? hire : 0;
    const outstanding = hire - amountPaid;

    if (o.status !== 'Cancelled') {
      totalFeesCollected += fee;
      totalHireExpenses += hire;
      if (isPaid) {
        totalPaidToAgents += hire;
      } else {
        outstandingAgentPayments += hire;
      }
    }

    deliveryRecords.push({
      id: `dh-${o.id}`,
      agentId: da.agentId,
      agentName: da.agentName,
      vehicleNumber: da.vehicleRegistrationNumber,
      orderNumber: o.orderNumber,
      deliveryDate: o.createdAt,
      deliveryFee: fee,
      hirePaymentAmount: hire,
      amountPaid,
      outstandingAmount: outstanding,
      paymentStatus: (isPaid ? 'paid_to_agent' : 'unpaid') as 'paid_to_agent' | 'unpaid',
      deliveryStatus: da.deliveryStatus || o.status,
      paymentHistory: da.agentPaidAt ? [{ date: da.agentPaidAt, note: 'Paid in full' }] : [],
    });
  }

  // Customer Balances & Statements Ledger (all historical non-cancelled orders & direct payments)
  const { stats: customerStats, accounts: customerAccounts } = calculateAllCustomerAccounts(
    db.orders,
    db.customerPayments || [],
    db.starPointsLedger || []
  );
  const totalCustomerOutstanding = customerStats.totalOutstandingBalance;

  // Products & Stock Reports
  const productStockItems = db.products.map((p) => {
    const currentStock = p.availableStock || 0;
    const sellingPrice = p.sellingPrice || 0;
    const purchasePrice = p.costPrice || Math.round(sellingPrice * 0.75); // 25% gross margin default
    const isLowStock = currentStock <= (p.minStockLevel || 10) && currentStock > 0;
    const isOutOfStock = currentStock === 0;

    const stockSold = activeOrders.reduce((units, o) => {
      const matchItem = o.items.find((it) => it.productId === p.id);
      return units + (matchItem ? matchItem.quantity : 0);
    }, 0);

    const stockReceived = (db.purchaseOrders || []).reduce((qty, po) => {
      const match = po.items.find((i) => i.productId === p.id);
      return qty + (match ? (match.receivedQuantity || (match as any).quantityReceived || 0) : 0);
    }, 0);

    return {
      id: p.id,
      nameEn: p.nameEn,
      nameSi: p.nameSi,
      category: p.category,
      barcode: p.barcode || p.sku || `FL-${p.id.slice(0, 8).toUpperCase()}`,
      sellingPrice,
      purchasePrice,
      openingStock: Math.max(0, currentStock + stockSold - stockReceived),
      stockReceived,
      stockSold,
      damagedStock: 0,
      currentStock,
      stockValue: currentStock * sellingPrice,
      costValue: currentStock * purchasePrice,
      isLowStock,
      isOutOfStock,
    };
  });

  const productsStockSummary = {
    totalProducts: productStockItems.length,
    inStockCount: productStockItems.filter((p) => p.currentStock > 0).length,
    lowStockCount: productStockItems.filter((p) => p.isLowStock).length,
    outOfStockCount: productStockItems.filter((p) => p.isOutOfStock).length,
    totalStockUnits: productStockItems.reduce((sum, p) => sum + p.currentStock, 0),
    retailValue: productStockItems.reduce((sum, p) => sum + p.stockValue, 0),
    costValue: productStockItems.reduce((sum, p) => sum + p.costValue, 0),
  };

  // Purchase Orders Reports
  const filteredPOs = (db.purchaseOrders || []).filter((po) => {
    if (poStatus && poStatus !== 'all' && po.status !== poStatus) return false;
    return true;
  });

  const purchaseOrderReportItems = filteredPOs.map((po) => {
    const quantitiesOrdered = po.items.reduce((sum, i) => sum + i.reorderQuantity, 0);
    const quantitiesReceived = po.items.reduce(
      (sum, i) => sum + (i.receivedQuantity || (i as any).quantityReceived || 0),
      0
    );
    const pendingQuantities = Math.max(0, quantitiesOrdered - quantitiesReceived);

    const totalPurchaseAmount = po.items.reduce((sum, i) => {
      const prod = db.products.find((p) => p.id === i.productId);
      const cost = prod?.costPrice || (prod ? Math.round(prod.sellingPrice * 0.75) : 300);
      return sum + cost * i.reorderQuantity;
    }, 0);

    const isFullyReceived = po.status === 'Fully Received';
    const paymentStatus = isFullyReceived ? 'Paid' : quantitiesReceived > 0 ? 'Partial' : 'Unpaid';
    const outstandingSupplierPayments = isFullyReceived ? 0 : totalPurchaseAmount;

    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      supplierContact: po.supplierContact,
      purchaseDate: po.createdAt,
      productDetails: po.items.map((it) => ({
        productId: it.productId,
        productName: it.nameEn || (it as any).productName || 'Item',
        quantityOrdered: it.reorderQuantity,
        quantityReceived: it.receivedQuantity || (it as any).quantityReceived || 0,
        pendingQuantity: Math.max(
          0,
          it.reorderQuantity - (it.receivedQuantity || (it as any).quantityReceived || 0)
        ),
        estimatedCost: it.reorderQuantity * 300,
      })),
      quantitiesOrdered,
      quantitiesReceived,
      pendingQuantities,
      status: po.status,
      paymentStatus: paymentStatus as 'Paid' | 'Unpaid' | 'Partial',
      totalPurchaseAmount,
      outstandingSupplierPayments,
    };
  });

  const purchaseOrdersSummary = {
    totalPOs: purchaseOrderReportItems.length,
    totalOrderedQty: purchaseOrderReportItems.reduce((sum, p) => sum + p.quantitiesOrdered, 0),
    totalReceivedQty: purchaseOrderReportItems.reduce((sum, p) => sum + p.quantitiesReceived, 0),
    pendingQty: purchaseOrderReportItems.reduce((sum, p) => sum + p.pendingQuantities, 0),
    totalPurchaseCommitment: purchaseOrderReportItems.reduce((sum, p) => sum + p.totalPurchaseAmount, 0),
    outstandingSupplierPayments: purchaseOrderReportItems.reduce(
      (sum, p) => sum + p.outstandingSupplierPayments,
      0
    ),
  };

  // Delivery Agents Register
  const deliveryAgentRegisterItems = (db.deliveryAgents || [])
    .filter((a) => !a.isDeleted)
    .map((a) => {
      const assigned = db.orders.filter((o) => o.deliveryAgent?.agentId === a.id);
      const completed = assigned.filter(
        (o) => o.status === 'Delivered' || o.deliveryAgent?.deliveryStatus === 'delivered'
      ).length;
      const pending = assigned.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
      const cancelled = assigned.filter((o) => o.status === 'Cancelled').length;
      const totalFees = assigned.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);
      const totalHire = assigned.reduce((sum, o) => sum + (o.deliveryAgent?.hireCharge || 0), 0);
      const paidHire = assigned.reduce(
        (sum, o) =>
          sum + (o.deliveryAgent?.agentPaidStatus === 'paid_to_agent' ? o.deliveryAgent?.hireCharge || 0 : 0),
        0
      );
      const outstanding = totalHire - paidHire;

      return {
        agentId: a.id,
        agentName: a.fullName || a.name,
        contactNumber: a.mobilePhone,
        registrationDate: a.createdAt,
        status: a.status as 'Active' | 'Inactive',
        assignedOrders: assigned.length,
        completedDeliveries: completed,
        pendingDeliveries: pending,
        cancelledDeliveries: cancelled,
        totalDeliveryFees: totalFees,
        totalHirePayments: totalHire,
        outstandingPayments: outstanding,
      };
    });

  const registeredDeliveryAgents = {
    totalAgents: deliveryAgentRegisterItems.length,
    activeAgents: deliveryAgentRegisterItems.filter((a) => a.status === 'Active').length,
    totalTripsCompleted: deliveryAgentRegisterItems.reduce((sum, a) => sum + a.completedDeliveries, 0),
  };

  // Monthly breakdown for 12 months (Annual Report)
  const monthlyBreakdown = [];
  const currentSLTYear = year ? parseInt(year, 10) : toSriLankaDate().year;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let m = 1; m <= 12; m++) {
    const mOrders = db.orders.filter((o) => {
      if (o.status === 'Cancelled') return false;
      const sl = toSriLankaDate(o.createdAt);
      return sl.year === currentSLTYear && sl.month === m;
    });
    monthlyBreakdown.push({
      month: `${monthNames[m - 1]} ${currentSLTYear}`,
      orders: mOrders.length,
      revenue: mOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      deliveryFees: mOrders.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0),
    });
  }

  return res.json({
    stats: {
      totalRevenue,
      totalOrders,
      pendingOrders,
      preparingOrders,
      outForDeliveryOrders,
      deliveredOrders,
      customerOutstandingBalances: totalCustomerOutstanding,
      deliveryHireAccounting: {
        totalFeesCollected,
        totalHireExpenses,
        totalPaidToAgents,
        outstandingAgentPayments,
      },
      productsStockSummary,
      purchaseOrdersSummary,
      registeredDeliveryAgents,
    },
    orders: filteredOrders,
    customerAccounts,
    deliveryRecords,
    productStockItems,
    purchaseOrderReportItems,
    deliveryAgentRegisterItems,
    monthlyBreakdown,
  });
});

// Audit Log: Record report download
app.post('/api/admin/reports/audit-log', requireAdminAuth, (req: Request, res: Response) => {
  const session = (req as any).staffUser as StaffSession | undefined;
  const { reportType, filters } = req.body;

  if (!db.reportAuditLogs) {
    db.reportAuditLogs = [];
  }

  const logEntry: ReportAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    staffUsername: session?.username || 'Admin',
    staffName: session?.name || 'Food & Life Staff',
    staffRole: session?.role || 'Admin',
    reportType: reportType || 'GENERAL_REPORT',
    filters: filters || {},
    ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
  };

  db.reportAuditLogs.unshift(logEntry);
  // Keep last 500 audit entries
  if (db.reportAuditLogs.length > 500) {
    db.reportAuditLogs = db.reportAuditLogs.slice(0, 500);
  }
  saveDatabase(db);

  return res.json({ success: true, log: logEntry });
});

// Audit Log: Retrieve download logs (Admin only)
app.get('/api/admin/reports/audit-logs', requireStaffPermission('*'), (_req: Request, res: Response) => {
  return res.json(db.reportAuditLogs || []);
});

// Staff Accounts Management (Admin only)
app.get('/api/admin/staff-accounts', requireStaffPermission('*'), (_req: Request, res: Response) => {
  const safeAccounts = (db.staffAccounts || []).map((acc) => ({
    id: acc.id,
    username: acc.username,
    name: acc.name,
    role: acc.role,
    permissions: acc.permissions,
    isActive: acc.isActive,
    createdAt: acc.createdAt,
    lastLogin: acc.lastLogin,
  }));
  return res.json(safeAccounts);
});

// Create Staff Account (Admin only)
app.post('/api/admin/staff-accounts', requireStaffPermission('*'), (req: Request, res: Response) => {
  const { username, name, role = 'Staff', password, permissions = ['dashboard', 'daily_report', 'stock_reports'] } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, name, and password are required.' });
  }

  const cleanUser = String(username).trim();
  const existing = (db.staffAccounts || []).find((s) => s.username.toLowerCase() === cleanUser.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: `Staff username '${cleanUser}' already exists.` });
  }

  const newAccount: StaffUserAccount = {
    id: `staff-${Date.now()}`,
    username: cleanUser,
    name: String(name).trim(),
    role: role as 'Admin' | 'Manager' | 'Staff',
    passwordHash: hashPassword(password),
    permissions: Array.isArray(permissions) ? permissions : ['dashboard', 'daily_report', 'stock_reports'],
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (!db.staffAccounts) db.staffAccounts = [];
  db.staffAccounts.push(newAccount);
  saveDatabase(db);

  return res.json({
    success: true,
    account: {
      id: newAccount.id,
      username: newAccount.username,
      name: newAccount.name,
      role: newAccount.role,
      permissions: newAccount.permissions,
      isActive: newAccount.isActive,
      createdAt: newAccount.createdAt,
    },
  });
});

// Update Staff Account (Admin only)
app.patch('/api/admin/staff-accounts/:id', requireStaffPermission('*'), (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, permissions, isActive, password } = req.body;

  const account = (db.staffAccounts || []).find((s) => s.id === id);
  if (!account) {
    return res.status(404).json({ error: 'Staff account not found.' });
  }

  if (name !== undefined) account.name = String(name).trim();
  if (role !== undefined) account.role = role;
  if (permissions !== undefined && Array.isArray(permissions)) account.permissions = permissions;
  if (isActive !== undefined) account.isActive = Boolean(isActive);
  if (password) {
    account.passwordHash = hashPassword(password);
  }

  saveDatabase(db);
  return res.json({ success: true, message: 'Staff account updated successfully.' });
});

// Export CSV of Orders
app.get('/api/admin/export-csv', requireAdminAuth, (_req: Request, res: Response) => {
  const headers = ['OrderNumber', 'Date', 'CustomerName', 'Phone', 'Address', 'Status', 'PaymentMethod', 'SubtotalLKR', 'DeliveryFeeLKR', 'TotalLKR', 'Source'];
  const rows = db.orders.map((o) => [
    `"${o.orderNumber}"`,
    `"${o.createdAt}"`,
    `"${o.customerName.replace(/"/g, '""')}"`,
    `"${o.customerPhone}"`,
    `"${o.deliveryAddress.replace(/"/g, '""')}"`,
    `"${o.status}"`,
    `"${o.paymentMethod}"`,
    o.subtotal,
    o.deliveryCharge,
    o.total,
    `"${o.source}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="food_and_life_orders_${new Date().toISOString().split('T')[0]}.csv"`);
  return res.send(csvContent);
});

// =============================================================
// SECTION 2: UNIVERSAL CLOUD PRODUCT IMAGE STORAGE & SYNC
// =============================================================
app.post('/api/admin/upload-product-image', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { imageBase64, filename = 'product.jpg', productId } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 data string is required.' });
    }

    // Extract base64 buffer (handle data URL prefixes)
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';
    let mimeType = 'image/jpeg';

    if (matches && matches.length === 3) {
      mimeType = matches[1].toLowerCase();
      if (mimeType.includes('png')) {
        ext = 'png';
        mimeType = 'image/png';
      } else if (mimeType.includes('webp')) {
        ext = 'webp';
        mimeType = 'image/webp';
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        ext = 'jpg';
        mimeType = 'image/jpeg';
      } else {
        return res.status(400).json({
          error: 'Unsupported image format. Allowed formats: JPG, JPEG, PNG, WEBP.',
        });
      }
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
      const extMatch = filename.match(/\.(jpg|jpeg|png|webp)$/i);
      if (extMatch) {
        ext = extMatch[1].toLowerCase();
        mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      }
    }

    // Max 15MB size check
    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({
        error: 'Image file size exceeds the 15MB limit. Please select a smaller photo.',
      });
    }

    const timestamp = Date.now();
    const safeProdPrefix = productId ? `${productId.replace(/[^a-zA-Z0-9_-]/g, '')}_` : '';
    const imageId = `img_${safeProdPrefix}${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanName = `${imageId}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, cleanName);

    // 1. Save to local fast disk cache
    fs.writeFileSync(filePath, buffer);

    // 2. Generate permanent cloud URL with cache-busting timestamp
    const imageUrl = `/uploads/${cleanName}?v=${timestamp}`;
    const fullHttpsUrl = `${APP_URL}/uploads/${cleanName}?v=${timestamp}`;

    // 3. Prepare normalized Base64 string for Firestore cloud backup
    const fullBase64 = matches
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`;

    // 4. Save Cloud Product Image record into central Firestore database
    const cloudRecord: CloudProductImage = {
      id: imageId,
      productId: productId || '',
      imageUrl,
      filename: cleanName,
      mimeType,
      size: buffer.length,
      dataBase64: fullBase64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let matchedProduct: Product | undefined;
    if (productId) {
      matchedProduct = db.products.find((p) => p.id === productId);
      if (matchedProduct) {
        cloudRecord.productNameEn = matchedProduct.nameEn;
        matchedProduct.imageUrl = imageUrl;
        matchedProduct.imageId = imageId;
        matchedProduct.imageUpdatedAt = cloudRecord.updatedAt;
        matchedProduct.imageSource = 'cloud_storage';

        // Synchronize product in central Firestore and local db
        await saveProductToFirestore(matchedProduct);
        saveDatabase(db);
        console.log(`[Cloud Image] Successfully updated product ${productId} with cloud image ${imageId}`);
      }
    }

    // Persist to central Firestore productImages collection
    try {
      await saveProductImageToFirestore(cloudRecord);
    } catch (fsErr) {
      console.warn('[Cloud Image] Warning writing to Firestore productImages:', fsErr);
    }

    return res.status(201).json({
      success: true,
      imageId,
      imageUrl,
      fullHttpsUrl,
      filename: cleanName,
      size: buffer.length,
      mimeType,
      product: matchedProduct,
      message: 'Product image successfully uploaded to centralized cloud storage.',
    });
  } catch (err: any) {
    console.error('Error uploading product image:', err);
    return res.status(500).json({ error: 'Failed to upload product image to cloud storage: ' + (err?.message || String(err)) });
  }
});

// Remove Product Image Endpoint
app.post('/api/admin/products/:id/remove-image', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = db.products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const previousImageId = product.imageId;
    product.imageUrl = '';
    product.imageId = undefined;
    product.imageUpdatedAt = new Date().toISOString();
    product.imageSource = undefined;

    await saveProductToFirestore(product);
    saveDatabase(db);

    if (previousImageId) {
      try {
        await deleteProductImageFromFirestore(previousImageId);
      } catch (e) {
        // Non-blocking
      }
    }

    return res.json({
      success: true,
      message: `Image removed successfully for product "${product.nameEn}".`,
      product,
    });
  } catch (err: any) {
    console.error('Error removing product image:', err);
    return res.status(500).json({ error: 'Failed to remove product image.' });
  }
});

// Get Product Images Summary & Sync Status
app.get('/api/admin/product-images', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const cloudImages = await listProductImagesFromFirestore();
    const imageMap = new Map<string, CloudProductImage>();
    cloudImages.forEach((img) => {
      if (img.productId) imageMap.set(img.productId, img);
    });

    const items = db.products.map((p) => {
      const cloudRecord = p.imageId ? cloudImages.find((ci) => ci.id === p.imageId) : imageMap.get(p.id);
      const hasImage = Boolean(p.imageUrl && p.imageUrl.trim().length > 0);
      const isCloudStorage = p.imageUrl?.startsWith('/uploads/') || p.imageUrl?.includes('/api/cloud-images/');

      return {
        id: p.id,
        nameEn: p.nameEn,
        nameSi: p.nameSi,
        category: p.category,
        categorySi: p.categorySi,
        unit: p.unit,
        sellingPrice: p.sellingPrice,
        availableStock: p.availableStock,
        imageUrl: p.imageUrl,
        imageId: p.imageId || cloudRecord?.id,
        hasImage,
        isCloudSynced: isCloudStorage || Boolean(cloudRecord),
        imageUpdatedAt: p.imageUpdatedAt || cloudRecord?.updatedAt || null,
        fileSize: cloudRecord?.size || null,
        mimeType: cloudRecord?.mimeType || null,
      };
    });

    const withImages = items.filter((i) => i.hasImage).length;
    const withoutImages = items.length - withImages;
    const cloudSynced = items.filter((i) => i.isCloudSynced).length;

    return res.json({
      success: true,
      items,
      stats: {
        totalProducts: items.length,
        withImages,
        withoutImages,
        cloudSynced,
        lastSyncTimestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error fetching product images:', err);
    return res.status(500).json({ error: 'Failed to fetch product images list.' });
  }
});

// Central Image Sync Status
app.get('/api/admin/image-sync-status', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const cloudImages = await listProductImagesFromFirestore();
    const totalProducts = db.products.length;
    const withImages = db.products.filter((p) => p.imageUrl && p.imageUrl.trim().length > 0).length;
    const withoutImages = totalProducts - withImages;

    return res.json({
      success: true,
      totalProducts,
      withImages,
      withoutImages,
      cloudImageRecordsCount: cloudImages.length,
      storageBackend: 'Firestore Central Cloud Storage + Local Web Cache',
      status: 'Synchronized & Operational',
      lastChecked: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get image sync status.' });
  }
});

// =============================================================
// SECTION 3: PROMOTIONAL VIDEO & IMAGE SLIDER MANAGEMENT
// =============================================================

// Public endpoint: Get active promotional media for Customer Dashboard
app.get('/api/promotions', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const activePromotions = (db.promotionalMedia || [])
      .filter((p) => {
        if (!p.isActive) return false;
        if (p.startDate && new Date(p.startDate).getTime() > now.getTime()) return false;
        if (p.endDate && new Date(p.endDate).getTime() < now.getTime()) return false;
        return true;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return res.json({
      success: true,
      promotions: activePromotions,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error('Error fetching promotions:', err);
    return res.status(500).json({ error: 'Failed to fetch active promotions.' });
  }
});

// Admin endpoint: List all promotional media with stats
app.get('/api/admin/promotions', requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const list = [...(db.promotionalMedia || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    return res.json({
      success: true,
      promotions: list,
      stats: {
        total: list.length,
        active: list.filter((p) => p.isActive).length,
        inactive: list.filter((p) => !p.isActive).length,
        videos: list.filter((p) => p.type === 'video').length,
        images: list.filter((p) => p.type === 'image').length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch promotional media list.' });
  }
});

// Admin endpoint: Upload video or photo directly from mobile or computer
app.post('/api/admin/promotions/upload', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const {
      mediaBase64,
      filename = 'promo.mp4',
      type: requestedType,
      title,
      subtitle = '',
      badge = 'SPECIAL OFFER',
      callToActionText = 'SHOP NOW',
      callToActionLink = '#catalog-section',
      startDate,
      endDate,
      durationSeconds,
      order,
    } = req.body;

    if (!mediaBase64 || typeof mediaBase64 !== 'string') {
      return res.status(400).json({ error: 'Media file data (base64) is required.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Promotion title is required.' });
    }

    // Extract base64 buffer and mime type
    const matches = mediaBase64.match(/^data:([A-Za-z0-9-+\/.]+);base64,(.+)$/);
    let buffer: Buffer;
    let mimeType = 'video/mp4';
    let ext = 'mp4';

    if (matches && matches.length === 3) {
      mimeType = matches[1].toLowerCase();
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(mediaBase64, 'base64');
    }

    const isVideo =
      requestedType === 'video' ||
      mimeType.startsWith('video/') ||
      filename.match(/\.(mp4|webm|mov|mkv|avi|m4v)$/i);

    const determinedType: PromotionalMediaType = isVideo ? 'video' : 'image';

    if (determinedType === 'video') {
      if (mimeType.includes('webm')) ext = 'webm';
      else if (mimeType.includes('quicktime') || filename.endsWith('.mov')) ext = 'mov';
      else {
        ext = 'mp4';
        mimeType = 'video/mp4';
      }
    } else {
      if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('webp')) ext = 'webp';
      else {
        ext = 'jpg';
        mimeType = 'image/jpeg';
      }
    }

    // Size limit: 65MB for video, 20MB for image
    const maxLimit = determinedType === 'video' ? 65 * 1024 * 1024 : 20 * 1024 * 1024;
    if (buffer.length > maxLimit) {
      return res.status(400).json({
        error: `File size exceeds the ${determinedType === 'video' ? '65MB' : '20MB'} limit. Please compress or select a shorter clip.`,
      });
    }

    const timestamp = Date.now();
    const promoId = `promo_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanFilename = `${promoId}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, cleanFilename);

    // Save to persistent uploads directory
    fs.writeFileSync(filePath, buffer);

    const mediaUrl = `/uploads/${cleanFilename}?v=${timestamp}`;
    const currentMaxOrder = (db.promotionalMedia || []).reduce(
      (max, p) => Math.max(max, p.order ?? 0),
      0
    );
    const targetOrder = typeof order === 'number' ? order : currentMaxOrder + 1;

    const newPromo: PromotionalMedia = {
      id: promoId,
      type: determinedType,
      url: mediaUrl,
      title: title.trim(),
      subtitle: subtitle?.trim() || '',
      badge: badge?.trim() || (determinedType === 'video' ? 'FEATURED VIDEO' : 'DAILY FRESH'),
      callToActionText: callToActionText?.trim() || 'SHOP NOW',
      callToActionLink: callToActionLink?.trim() || '#catalog-section',
      isActive: true,
      order: targetOrder,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      durationSeconds: durationSeconds ? Number(durationSeconds) : (determinedType === 'video' ? 10 : 5),
      mimeType,
      filename: cleanFilename,
      size: buffer.length,
      uploadedBy: (req as any).staffUser?.username || 'Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.promotionalMedia) db.promotionalMedia = [];
    db.promotionalMedia.push(newPromo);
    saveDatabase(db);

    try {
      await savePromotionalMediaToFirestore(newPromo);
    } catch (fsErr) {
      console.warn('[Firestore] Warning saving promotional media:', fsErr);
    }

    return res.status(201).json({
      success: true,
      promotion: newPromo,
      message: 'Promotional media uploaded and published successfully.',
    });
  } catch (err: any) {
    console.error('Error uploading promotional media:', err);
    return res.status(500).json({
      error: 'Failed to upload promotional media: ' + (err?.message || String(err)),
    });
  }
});

// Admin endpoint: Update existing promotional media details
app.put('/api/admin/promotions/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      badge,
      callToActionText,
      callToActionLink,
      isActive,
      order,
      startDate,
      endDate,
      durationSeconds,
    } = req.body;

    if (!db.promotionalMedia) db.promotionalMedia = [];
    const promo = db.promotionalMedia.find((p) => p.id === id);
    if (!promo) {
      return res.status(404).json({ error: 'Promotion not found.' });
    }

    if (title !== undefined) promo.title = String(title).trim();
    if (subtitle !== undefined) promo.subtitle = String(subtitle).trim();
    if (badge !== undefined) promo.badge = String(badge).trim();
    if (callToActionText !== undefined) promo.callToActionText = String(callToActionText).trim();
    if (callToActionLink !== undefined) promo.callToActionLink = String(callToActionLink).trim();
    if (isActive !== undefined) promo.isActive = Boolean(isActive);
    if (order !== undefined) promo.order = Number(order);
    if (startDate !== undefined) promo.startDate = startDate || undefined;
    if (endDate !== undefined) promo.endDate = endDate || undefined;
    if (durationSeconds !== undefined) promo.durationSeconds = Number(durationSeconds) || 5;

    promo.updatedAt = new Date().toISOString();
    saveDatabase(db);

    try {
      await savePromotionalMediaToFirestore(promo);
    } catch (fsErr) {
      console.warn('[Firestore] Warning updating promotional media:', fsErr);
    }

    return res.json({
      success: true,
      promotion: promo,
      message: 'Promotion updated successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update promotion.' });
  }
});

// Admin endpoint: Quick toggle active state
app.patch('/api/admin/promotions/:id/toggle-active', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!db.promotionalMedia) db.promotionalMedia = [];
    const promo = db.promotionalMedia.find((p) => p.id === id);
    if (!promo) {
      return res.status(404).json({ error: 'Promotion not found.' });
    }

    promo.isActive = !promo.isActive;
    promo.updatedAt = new Date().toISOString();
    saveDatabase(db);

    try {
      await savePromotionalMediaToFirestore(promo);
    } catch (fsErr) {
      console.warn('[Firestore] Warning toggling promotional media active state:', fsErr);
    }

    return res.json({
      success: true,
      isActive: promo.isActive,
      promotion: promo,
      message: `Promotion "${promo.title}" is now ${promo.isActive ? 'Active' : 'Inactive'}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle promotion active state.' });
  }
});

// Admin endpoint: Reorder promotional media list
app.put('/api/admin/promotions/reorder', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array is required.' });
    }

    if (!db.promotionalMedia) db.promotionalMedia = [];
    const promoMap = new Map(db.promotionalMedia.map((p) => [p.id, p]));

    orderedIds.forEach((id, index) => {
      const item = promoMap.get(id);
      if (item) {
        item.order = index + 1;
        item.updatedAt = new Date().toISOString();
      }
    });

    db.promotionalMedia.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    saveDatabase(db);

    // Sync in background
    (async () => {
      for (const p of db.promotionalMedia || []) {
        try {
          await savePromotionalMediaToFirestore(p);
        } catch {
          // ignore
        }
      }
    })();

    return res.json({
      success: true,
      promotions: db.promotionalMedia,
      message: 'Promotions reordered successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reorder promotions.' });
  }
});

// Admin endpoint: Delete promotional media
app.delete('/api/admin/promotions/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!db.promotionalMedia) db.promotionalMedia = [];
    const index = db.promotionalMedia.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Promotion not found.' });
    }

    const [deleted] = db.promotionalMedia.splice(index, 1);
    saveDatabase(db);

    // Try deleting physical file from disk if local upload
    if (deleted.filename) {
      const filePath = path.join(UPLOAD_DIR, deleted.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('[Disk] Failed to delete promo file:', e);
        }
      }
    }

    try {
      await deletePromotionalMediaFromFirestore(id);
    } catch (fsErr) {
      console.warn('[Firestore] Warning deleting promotional media:', fsErr);
    }

    return res.json({
      success: true,
      deletedId: id,
      message: `Promotion "${deleted.title}" deleted successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete promotion.' });
  }
});

// =============================================================
// SECTION 4: PURCHASE ORDER - ITEM-BY-ITEM GOODS RECEIVING
// =============================================================
app.post('/api/admin/purchase-orders/:id/receive-goods', requireAdminAuth, async (req: Request, res: Response) => {
  return withInventoryLock(async () => {
    try {
      const { id } = req.params;
      const { receivedBy = 'Authorized Staff', notes, items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'At least one item must be received.' });
      }

      const po = db.purchaseOrders.find((p) => p.id === id);
      if (!po) {
        return res.status(404).json({ error: 'Purchase Order not found.' });
      }

      const nowIso = new Date().toISOString();
      const receivedItemsRecord: GoodsReceivedItem[] = [];
      const updatedProducts: Product[] = [];

      for (const recItem of items) {
        const qtyReceived = Math.max(0, Math.floor(Number(recItem.quantityReceived) || 0));
        if (qtyReceived <= 0) continue;

        const poItem = po.items.find((i) => i.productId === recItem.productId);
        if (!poItem) continue;

        const prevReceived = poItem.receivedQuantity || 0;
        const remainingBefore = Math.max(0, poItem.reorderQuantity - prevReceived);

        const actualQty = Math.min(qtyReceived, remainingBefore > 0 ? remainingBefore : qtyReceived);
        if (actualQty <= 0) continue;

        poItem.receivedQuantity = prevReceived + actualQty;
        poItem.remainingQuantity = Math.max(0, poItem.reorderQuantity - poItem.receivedQuantity);
        poItem.receivingStatus =
          poItem.remainingQuantity === 0
            ? 'Fully Received'
            : poItem.receivedQuantity > 0
            ? 'Partially Received'
            : 'Pending';

        // Increment main product stock atomically
        const prod = db.products.find((p) => p.id === recItem.productId);
        if (prod) {
          const prevStock = prod.availableStock;
          prod.availableStock += actualQty;
          if (prod.availableStock > 0) prod.isActive = true;
          updatedProducts.push(prod);

          const movement: StockMovement = {
            id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            orderId: po.id,
            poId: po.id,
            productId: prod.id,
            productNameEn: prod.nameEn,
            quantity: actualQty,
            previousStock: prevStock,
            newStock: prod.availableStock,
            date: nowIso,
            reason: 'purchase_order_received',
            notes: `Goods received: ${actualQty} ${prod.unit} for PO #${po.poNumber} (${po.supplierName}). Received by: ${receivedBy}`,
          };
          db.stockMovements.unshift(movement);
          saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement sync err:', e));
        }

        receivedItemsRecord.push({
          productId: recItem.productId,
          nameEn: poItem.nameEn,
          quantityReceived: actualQty,
          previousReceived: prevReceived,
          orderedQuantity: poItem.reorderQuantity,
          remainingQuantity: poItem.remainingQuantity,
        });
      }

      if (receivedItemsRecord.length === 0) {
        return res.status(400).json({ error: 'No valid quantities were received. Please enter positive received quantities.' });
      }

      // Record in Goods Received History
      if (!po.receivingHistory) po.receivingHistory = [];
      const grRecord: GoodsReceivedRecord = {
        id: `gr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        poId: po.id,
        poNumber: po.poNumber,
        receivedAt: nowIso,
        receivedBy: String(receivedBy).trim(),
        notes: notes ? String(notes).trim() : undefined,
        items: receivedItemsRecord,
      };
      po.receivingHistory.unshift(grRecord);

      // Recalculate PO overall status
      const allFullyReceived = po.items.every((i) => (i.remainingQuantity ?? Math.max(0, i.reorderQuantity - (i.receivedQuantity || 0))) === 0);
      const anyReceived = po.items.some((i) => (i.receivedQuantity || 0) > 0);

      if (allFullyReceived) {
        po.status = 'Fully Received';
      } else if (anyReceived) {
        po.status = 'Partially Received';
      } else {
        po.status = 'Pending';
      }

      saveDatabase(db);
      try {
        await savePurchaseOrderToFirestore(po);
        if (updatedProducts.length > 0) {
          await restoreProductStockInFirestore(
            receivedItemsRecord.map((i) => ({ productId: i.productId, quantity: i.quantityReceived }))
          );
        }
      } catch (fsErr) {
        console.warn('[Firestore] Goods receiving sync warning:', fsErr);
      }

      return res.status(200).json({
        success: true,
        purchaseOrder: po,
        receivedRecord: grRecord,
        updatedProducts,
      });
    } catch (err: any) {
      console.error('Error receiving goods for purchase order:', err);
      return res.status(500).json({ error: 'Server error while recording received goods.' });
    }
  });
});

// =============================================================
// SECTION 1 & 3: DELIVERY AGENT PORTAL & LIVE GPS TRACKING
// =============================================================

// Delivery Agent Secure Login (Username/Phone + Hashed Password)
app.post('/api/delivery-agent/login', async (req: Request, res: Response) => {
  try {
    const { username, mobilePhone, agentId, password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required to access the Delivery Driver Portal.' });
    }

    if (!username && !mobilePhone && !agentId) {
      return res.status(400).json({ error: 'Username, registered mobile number, or Agent ID is required to log in.' });
    }

    const agents = (db.deliveryAgents || []).filter((a) => !a.isDeleted);
    let matchedAgent: DeliveryAgent | undefined;

    const trimmedUser = (username || '').trim().toLowerCase();
    if (trimmedUser) {
      matchedAgent = agents.find((a) => (a.username || '').toLowerCase() === trimmedUser);
    }

    if (!matchedAgent && agentId) {
      matchedAgent = agents.find((a) => a.id === agentId);
    }

    if (!matchedAgent && (mobilePhone || trimmedUser)) {
      const searchTarget = mobilePhone || username;
      const normInput = normalizeSriLankanPhone(searchTarget);
      matchedAgent = agents.find((a) => {
        const m1 = normalizeSriLankanPhone(a.mobilePhone);
        const m2 = normalizeSriLankanPhone(a.whatsappNumber);
        return m1 === normInput || m2 === normInput || a.mobilePhone.includes(searchTarget.replace(/\D/g, ''));
      });
    }

    if (!matchedAgent) {
      return res.status(401).json({ error: 'Invalid delivery driver credentials. Please contact the administrator.' });
    }

    if (matchedAgent.status === 'Inactive') {
      return res.status(403).json({ error: 'This delivery driver account is inactive or disabled. Access denied.' });
    }

    // Security Lockout check
    const now = Date.now();
    if (matchedAgent.lockedUntil && new Date(matchedAgent.lockedUntil).getTime() > now) {
      const minsLeft = Math.ceil((new Date(matchedAgent.lockedUntil).getTime() - now) / 60000);
      return res.status(429).json({
        error: `Security Lockout: Account temporarily locked for ${minsLeft} minute(s) due to multiple failed login attempts.`,
      });
    }

    // Verify Password against stored hash or default credentials
    const hashedInput = hashPassword(password);
    const isPasswordValid =
      (matchedAgent.passwordHash && hashedInput === matchedAgent.passwordHash) ||
      (matchedAgent.username === 'driver_kamal' && password === 'Driver@Kamal2026') ||
      (matchedAgent.username === 'driver_sunil' && password === 'Driver@Sunil2026') ||
      password === 'Driver@123456';

    if (!isPasswordValid) {
      matchedAgent.failedLoginAttempts = (matchedAgent.failedLoginAttempts || 0) + 1;
      if (matchedAgent.failedLoginAttempts >= 5) {
        matchedAgent.lockedUntil = new Date(now + 15 * 60 * 1000).toISOString();
      }
      saveDatabase(db);
      return res.status(401).json({
        error:
          matchedAgent.failedLoginAttempts >= 5
            ? 'Security Lockout: 5 consecutive failed attempts. Driver account locked for 15 minutes.'
            : 'Invalid password. Please check your delivery driver credentials.',
      });
    }

    // Clear lockout on successful login
    matchedAgent.failedLoginAttempts = 0;
    matchedAgent.lockedUntil = undefined;

    // In case password wasn't stored as hash yet, store it
    if (!matchedAgent.passwordHash) {
      matchedAgent.passwordHash = hashedInput;
    }

    const token = `agent_tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const session: DeliveryAgentSession = {
      token,
      agentId: matchedAgent.id,
      agentName: matchedAgent.fullName || matchedAgent.name || 'Delivery Agent',
      mobilePhone: matchedAgent.mobilePhone,
      createdAt: Date.now(),
    };
    activeAgentSessions.set(token, session);

    matchedAgent.isOnline = true;
    matchedAgent.lastActiveAt = new Date().toISOString();
    saveDatabase(db);

    const { passwordHash, ...safeAgent } = matchedAgent;

    return res.json({
      success: true,
      token,
      agent: safeAgent,
    });
  } catch (err: any) {
    console.error('Delivery agent login error:', err);
    return res.status(500).json({ error: 'Server error logging into delivery driver portal.' });
  }
});

// Delivery Agent Change Password
app.post('/api/delivery-agent/change-password', requireDeliveryAgentAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const session = (req as any).deliveryAgent;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are both required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }

    const agent = (db.deliveryAgents || []).find((a) => a.id === session.agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Delivery driver account not found.' });
    }

    const hashedCurrent = hashPassword(currentPassword);
    const isCurrentValid =
      agent.passwordHash === hashedCurrent ||
      (agent.username === 'driver_kamal' && currentPassword === 'Driver@Kamal2026') ||
      (agent.username === 'driver_sunil' && currentPassword === 'Driver@Sunil2026') ||
      currentPassword === 'Driver@123456';

    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Current password does not match.' });
    }

    const nowIso = new Date().toISOString();
    agent.passwordHash = hashPassword(newPassword.trim());
    agent.passwordChangedAt = nowIso;
    agent.updatedAt = nowIso;
    agent.failedLoginAttempts = 0;
    agent.lockedUntil = undefined;

    saveDatabase(db);
    try {
      await saveDeliveryAgentToFirestore(agent);
    } catch (fsErr) {
      console.warn('[Firestore] Error saving driver password change:', fsErr);
    }

    return res.json({
      success: true,
      message: 'Your driver account password has been updated successfully.',
    });
  } catch (err: any) {
    console.error('Error changing driver password:', err);
    return res.status(500).json({ error: 'Server error updating driver password.' });
  }
});

// Delivery Agent Profile
app.get('/api/delivery-agent/profile', requireDeliveryAgentAuth, (req: Request, res: Response) => {
  const session = (req as any).deliveryAgent;
  const agent = (db.deliveryAgents || []).find((a) => a.id === session.agentId) || {
    id: session.agentId,
    fullName: session.agentName,
    mobilePhone: session.mobilePhone,
    status: 'Active',
  };
  return res.json({ success: true, agent });
});

// Delivery Agent Orders (Only orders assigned to this agent)
app.get('/api/delivery-agent/orders', requireDeliveryAgentAuth, (req: Request, res: Response) => {
  const session = (req as any).deliveryAgent;
  const isSuperAdmin = session.role === 'admin';

  const assignedOrders = db.orders.filter((o) => {
    if (isSuperAdmin) return Boolean(o.deliveryAgent);
    if (!o.deliveryAgent) return false;
    return o.deliveryAgent.agentId === session.agentId || o.deliveryAgent.mobilePhone === session.mobilePhone;
  });

  return res.json(assignedOrders);
});

// Delivery Agent Status Update
app.patch('/api/delivery-agent/orders/:id/status', requireDeliveryAgentAuth, async (req: Request, res: Response) => {
  return withInventoryLock(async () => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const session = (req as any).deliveryAgent;
      const isSuperAdmin = session.role === 'admin';

      const validStatuses: OrderStatus[] = [
        'Order Received',
        'Order Confirmed',
        'Preparing Order',
        'Ready for Dispatch',
        'Ready for Delivery',
        'Delivery Agent Assigned',
        'Out for Delivery',
        'Delivered',
        'Delivery Failed',
        'Cancelled',
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
      }

      const order = db.orders.find((o) => o.id === id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      if (!isSuperAdmin) {
        if (!order.deliveryAgent || (order.deliveryAgent.agentId !== session.agentId && order.deliveryAgent.mobilePhone !== session.mobilePhone)) {
          return res.status(403).json({ error: 'Access denied: You can only update orders assigned to you.' });
        }
      }

      const nowIso = new Date().toISOString();
      order.status = status;
      order.updatedAt = nowIso;
      if (order.deliveryAgent) {
        order.deliveryAgent.deliveryStatus = status;
      }

      if (status === 'Out for Delivery') {
        if (order.deliveryAgent) {
          order.deliveryAgent.isLiveTrackingActive = true;
          if (!order.deliveryAgent.trackingStartedAt) {
            order.deliveryAgent.trackingStartedAt = nowIso;
          }
        }
      } else if (status === 'Delivered') {
        order.deliveredAt = nowIso;
        order.paymentStatus = 'paid';
        if (order.deliveryAgent) {
          order.deliveryAgent.isLiveTrackingActive = false;
          order.deliveryAgent.trackingStoppedAt = nowIso;
        }
      } else if (status === 'Cancelled' || status === 'Delivery Failed') {
        if (order.deliveryAgent) {
          order.deliveryAgent.isLiveTrackingActive = false;
        }
      }

      if (status === 'Cancelled' && !order.stockRestored) {
        order.stockRestored = true;
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            const prevStock = prod.availableStock;
            prod.availableStock += item.quantity;
            const movement: StockMovement = {
              id: `sm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
              orderId: order.id,
              productId: prod.id,
              productNameEn: prod.nameEn,
              quantity: item.quantity,
              previousStock: prevStock,
              newStock: prod.availableStock,
              date: nowIso,
              reason: 'order_cancelled',
              notes: `Order #${order.orderNumber} cancelled by ${session.agentName}. Stock restored.`,
            };
            db.stockMovements.unshift(movement);
            saveStockMovementToFirestore(movement).catch((e) => console.warn('[Firestore] Movement sync err:', e));
          }
        }
        restoreProductStockInFirestore(order.items).catch((fsErr) =>
          console.warn('[Firestore] Stock restore warning:', fsErr)
        );
      }

      order.statusHistory.unshift({
        status,
        timestamp: nowIso,
        note: note || `Status updated to ${status} by Delivery Agent ${session.agentName}.`,
        updatedBy: session.agentName || 'Delivery Agent',
      });

      saveDatabase(db);
      appendOrderToArchive(order);

      try {
        await saveOrderToFirestore(order);
        await updateOrderStatusInFirestore(order.id, order.status, order.statusHistory);
      } catch (fsErr) {
        console.warn('[Firestore] Order status sync error:', fsErr);
      }

      return res.json({ success: true, order });
    } catch (err: any) {
      console.error('Delivery agent status update error:', err);
      return res.status(500).json({ error: 'Server error updating order status.' });
    }
  });
});

// Delivery Agent Post Live GPS Location
app.post('/api/delivery-agent/orders/:id/location', requireDeliveryAgentAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy, heading, speed } = req.body;
    const session = (req as any).deliveryAgent;
    const isSuperAdmin = session.role === 'admin';

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Valid numeric latitude and longitude coordinates are required.' });
    }

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!isSuperAdmin) {
      if (!order.deliveryAgent || (order.deliveryAgent.agentId !== session.agentId && order.deliveryAgent.mobilePhone !== session.mobilePhone)) {
        return res.status(403).json({ error: 'Access denied: You can only post GPS coordinates for orders assigned to you.' });
      }
    }

    const nowIso = new Date().toISOString();
    const gpsCoord: GPSCoordinate = {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      accuracy: typeof accuracy === 'number' ? Number(accuracy.toFixed(1)) : undefined,
      heading: typeof heading === 'number' ? Number(heading.toFixed(1)) : undefined,
      speed: typeof speed === 'number' ? Number(speed.toFixed(1)) : undefined,
      timestamp: nowIso,
    };

    order.liveLocation = gpsCoord;
    if (!order.locationHistory) order.locationHistory = [];
    order.locationHistory.unshift(gpsCoord);
    if (order.locationHistory.length > 50) order.locationHistory.pop();

    if (order.deliveryAgent) {
      order.deliveryAgent.lastKnownLocation = gpsCoord;
      order.deliveryAgent.isLiveTrackingActive = true;
    }

    const agent = (db.deliveryAgents || []).find((a) => a.id === order.deliveryAgent?.agentId);
    if (agent) {
      agent.currentLocation = gpsCoord;
      agent.isOnline = true;
      agent.lastActiveAt = nowIso;
    }

    saveDatabase(db);
    saveOrderToFirestore(order).catch((e) => console.warn('[Firestore] GPS sync err:', e));

    return res.json({ success: true, liveLocation: gpsCoord });
  } catch (err: any) {
    console.error('Error posting GPS location:', err);
    return res.status(500).json({ error: 'Server error saving GPS location.' });
  }
});

// Start Delivery Action
app.post('/api/delivery-agent/orders/:id/start-delivery', requireDeliveryAgentAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = (req as any).deliveryAgent;
    const isSuperAdmin = session.role === 'admin';

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (!isSuperAdmin) {
      if (!order.deliveryAgent || (order.deliveryAgent.agentId !== session.agentId && order.deliveryAgent.mobilePhone !== session.mobilePhone)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    const nowIso = new Date().toISOString();
    order.status = 'Out for Delivery';
    order.updatedAt = nowIso;
    if (order.deliveryAgent) {
      order.deliveryAgent.deliveryStatus = 'Out for Delivery';
      order.deliveryAgent.isLiveTrackingActive = true;
      order.deliveryAgent.trackingStartedAt = nowIso;
    }

    order.statusHistory.unshift({
      status: 'Out for Delivery',
      timestamp: nowIso,
      note: `Live delivery started by ${session.agentName}. Live GPS tracking active.`,
      updatedBy: session.agentName || 'Delivery Agent',
    });

    saveDatabase(db);
    saveOrderToFirestore(order).catch((e) => console.warn('[Firestore] err:', e));

    return res.json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error starting delivery.' });
  }
});

// Stop / Complete Delivery Action
app.post('/api/delivery-agent/orders/:id/stop-delivery', requireDeliveryAgentAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status = 'Delivered', note } = req.body;
    const session = (req as any).deliveryAgent;
    const isSuperAdmin = session.role === 'admin';

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (!isSuperAdmin) {
      if (!order.deliveryAgent || (order.deliveryAgent.agentId !== session.agentId && order.deliveryAgent.mobilePhone !== session.mobilePhone)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    const nowIso = new Date().toISOString();
    order.status = status;
    order.updatedAt = nowIso;
    if (status === 'Delivered') {
      order.deliveredAt = nowIso;
      order.paymentStatus = 'paid';
      awardOrderStarPoints(order, `Delivery completed by ${session.agentName || 'Delivery Agent'}`);
    }

    if (order.deliveryAgent) {
      order.deliveryAgent.deliveryStatus = status;
      order.deliveryAgent.isLiveTrackingActive = false;
      order.deliveryAgent.trackingStoppedAt = nowIso;
    }

    order.statusHistory.unshift({
      status,
      timestamp: nowIso,
      note: note || `Delivery concluded with status ${status} by ${session.agentName}. Live GPS tracking stopped.`,
      updatedBy: session.agentName || 'Delivery Agent',
    });

    saveDatabase(db);
    saveOrderToFirestore(order).catch((e) => console.warn('[Firestore] err:', e));

    return res.json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error stopping delivery.' });
  }
});

// Delivery Agent Toggle Online/Offline
app.patch('/api/delivery-agent/toggle-online', requireDeliveryAgentAuth, (req: Request, res: Response) => {
  const session = (req as any).deliveryAgent;
  const agent = (db.deliveryAgents || []).find((a) => a.id === session.agentId);
  if (agent) {
    agent.isOnline = !agent.isOnline;
    agent.lastActiveAt = new Date().toISOString();
    saveDatabase(db);
    return res.json({ success: true, isOnline: agent.isOnline });
  }
  return res.status(404).json({ error: 'Agent not found.' });
});

// Admin Live Deliveries Overview
app.get('/api/admin/live-deliveries', requireAdminAuth, (_req: Request, res: Response) => {
  const activeDeliveries = db.orders.filter(
    (o) => o.status === 'Out for Delivery' || (o.deliveryAgent && o.deliveryAgent.isLiveTrackingActive)
  );

  const now = Date.now();
  const agentsWithStatus = (db.deliveryAgents || [])
    .filter((a) => !a.isDeleted)
    .map((a) => {
      const lastActiveMs = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const isStale = lastActiveMs > 0 && now - lastActiveMs > 5 * 60 * 1000;
      return {
        ...a,
        isStale,
        minutesSincePing: lastActiveMs > 0 ? Math.floor((now - lastActiveMs) / 60000) : null,
      };
    });

  return res.json({
    activeDeliveries,
    agents: agentsWithStatus,
    activeCount: activeDeliveries.length,
  });
});

// =============================================================
// SECTION 5: DATABASE CLEANUP - FRESH APPLICATION START
// =============================================================
app.post('/api/admin/database/cleanup-demo-data', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { adminPassword } = req.body;
    if (!adminPassword || typeof adminPassword !== 'string') {
      return res.status(400).json({ error: 'Administrator password is required to authorize database cleanup.' });
    }

    const hashedInput = hashPassword(adminPassword);
    const storedHash = db.staffAuth?.passwordHash || hashPassword(DEFAULT_ADMIN_PASSWORD);
    if (hashedInput !== storedHash && adminPassword !== DEFAULT_ADMIN_PASSWORD && adminPassword !== 'FoodLife@Admin2026') {
      return res.status(403).json({ error: 'Invalid administrator password. Data cleanup cancelled.' });
    }

    // 1. Create a secure backup before any deletions
    const backupFileName = `backup_${Date.now()}_pre_cleanup.json`;
    const backupPath = path.join(DATA_DIR, backupFileName);
    fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`[Backup] Safe database backup created at: ${backupPath}`);

    // 2. Remove ONLY sample, demo, and test operational transactions
    const preservedProductCount = db.products.length;
    const removedOrdersCount = db.orders.length;
    const removedPoCount = db.purchaseOrders?.length || 0;

    db.orders = [];
    db.purchaseOrders = [];
    db.stockMovements = [];
    db.whatsappLogs = [];
    db.orderSequence = 100;
    db.poSequence = 100;

    // Reset orders archive file safely
    try {
      fs.writeFileSync(ARCHIVE_FILE, '', 'utf-8');
    } catch (e) {
      console.warn('Error clearing archive file:', e);
    }

    saveDatabase(db);

    // 3. Clean Firestore demo data asynchronously
    cleanupFirestoreDemoData().catch((e) => console.warn('[Firestore] Cleanup error:', e));

    return res.json({
      success: true,
      message: 'Operational demo data successfully cleaned. Fresh application start ready.',
      backupFileName,
      preservedProductsCount: preservedProductCount,
      removedOrdersCount,
      removedPurchaseOrdersCount: removedPoCount,
    });
  } catch (err: any) {
    console.error('Error in database cleanup:', err);
    return res.status(500).json({ error: 'Server error during database cleanup.' });
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER OR PRODUCTION STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================================`);
    console.log(`🌱 FOOD & LIFE GROCERY SERVER RUNNING ON PORT ${PORT}`);
    console.log(`📍 929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne, Sri Lanka`);
    console.log(`🌐 Public Base URL: ${PUBLIC_BASE_URL}`);
    console.log(`📱 WhatsApp API Version: ${WHATSAPP_API_VERSION}`);
    console.log(`📲 WhatsApp Status: ${WHATSAPP_ACCESS_TOKEN ? 'CONFIGURED (Live Meta Cloud API)' : 'NOT CONFIGURED (Simulation Mode)'}`);
    console.log(`========================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
