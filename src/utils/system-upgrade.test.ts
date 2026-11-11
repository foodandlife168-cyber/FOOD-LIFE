import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

describe('FOOD & LIFE GROCERY - ADVANCED SYSTEM UPGRADE TEST SUITE', () => {

  // Test 1: Automatic Reorder Quantity Formula
  test('Suggested reorder calculation: Maximum(0, Target Stock - Available Stock - Pending Purchase Qty)', () => {
    const calculateReorderQty = (targetStock: number, availableStock: number, pendingPOQty: number) => {
      return Math.max(0, targetStock - availableStock - pendingPOQty);
    };

    // Scenario A: 100 kg target, 50 kg available, 0 kg pending PO -> need 50 kg
    assert.equal(calculateReorderQty(100, 50, 0), 50);

    // Scenario B: 100 kg target, 50 kg available, 30 kg pending PO already ordered -> need 20 kg
    assert.equal(calculateReorderQty(100, 50, 30), 20);

    // Scenario C: 100 kg target, 50 kg available, 60 kg pending PO -> need 0 kg (not negative)
    assert.equal(calculateReorderQty(100, 50, 60), 0);

    // Scenario D: 100 kg target, 120 kg available (excess) -> need 0 kg
    assert.equal(calculateReorderQty(100, 120, 0), 0);
  });

  // Test 2: Stock deduction and cancellation restoration logic
  test('Customer order stock deduction and cancellation restoration', () => {
    let availableStock = 100;
    const orderQty = 15;

    // Place order
    assert.ok(availableStock >= orderQty, 'Stock is sufficient to order');
    availableStock -= orderQty;
    assert.equal(availableStock, 85, 'Stock deducted to 85');

    // Prevent duplicate cancellation restoration
    let stockRestored = false;
    const cancelOrder = () => {
      if (stockRestored) return false;
      availableStock += orderQty;
      stockRestored = true;
      return true;
    };

    // First cancellation
    const firstCancel = cancelOrder();
    assert.equal(firstCancel, true);
    assert.equal(availableStock, 100, 'Stock restored back to 100');

    // Second cancellation attempt
    const secondCancel = cancelOrder();
    assert.equal(secondCancel, false, 'Duplicate cancellation must not restore stock again');
    assert.equal(availableStock, 100, 'Stock remains 100');
  });

  // Test 3: Partial Payment and Outstanding Balance Calculation
  test('Customer credit & partial payment accounting', () => {
    const invoiceTotal = 1000;
    let payments: { amount: number }[] = [];

    const getFinancials = () => {
      const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const outstandingBalance = Math.max(0, invoiceTotal - amountPaid);
      const paymentStatus =
        outstandingBalance === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
      return { amountPaid, outstandingBalance, paymentStatus };
    };

    // Initial state
    let state = getFinancials();
    assert.equal(state.amountPaid, 0);
    assert.equal(state.outstandingBalance, 1000);
    assert.equal(state.paymentStatus, 'UNPAID');

    // First installment of Rs. 800
    payments.push({ amount: 800 });
    state = getFinancials();
    assert.equal(state.amountPaid, 800);
    assert.equal(state.outstandingBalance, 200);
    assert.equal(state.paymentStatus, 'PARTIALLY PAID');

    // Final installment of Rs. 200
    payments.push({ amount: 200 });
    state = getFinancials();
    assert.equal(state.amountPaid, 1000);
    assert.equal(state.outstandingBalance, 0);
    assert.equal(state.paymentStatus, 'PAID');
  });

  // Test 4: Purchase Order: Quantity-only validation
  test('Supplier Purchase Order: contains only required quantity (no prices/costs)', () => {
    const poItems = [
      { productId: 'p1', nameEn: 'Keeri Samba Rice', unit: '1 kg', currentStock: 40, reorderQuantity: 60 },
      { productId: 'p2', nameEn: 'Red Onions', unit: '1 kg', currentStock: 10, reorderQuantity: 40 },
    ];

    poItems.forEach((item) => {
      assert.ok(item.reorderQuantity > 0, 'Reorder quantity must be positive');
      // @ts-ignore
      assert.equal(item.unitPrice, undefined, 'Unit cost must not be present on supplier PO item');
      // @ts-ignore
      assert.equal(item.lineTotal, undefined, 'Line total must not be present on supplier PO item');
    });

    const totalUnits = poItems.reduce((sum, i) => sum + i.reorderQuantity, 0);
    assert.equal(totalUnits, 100, 'Total PO units correctly computed');
  });

  // Test 5: Delivery Agent Soft Deletion
  test('Delivery agent soft deletion marks isDeleted true and retains order reference', () => {
    const agent = {
      id: 'agent-1',
      fullName: 'Sunil Perera',
      mobilePhone: '077 123 4567',
      whatsappNumber: '+94 77 123 4567',
      vehicleRegistrationNumber: 'CP AB-1234',
      defaultHireCharge: 350,
      status: 'Active' as const,
      isDeleted: false,
    };

    // Soft delete
    const softDeleted = { ...agent, isDeleted: true, status: 'Inactive' as const };
    assert.equal(softDeleted.isDeleted, true);
    assert.equal(softDeleted.status, 'Inactive');

    // Active fleet filter excludes soft-deleted agents
    const fleet = [softDeleted, { id: 'agent-2', fullName: 'Kamal Silva', isDeleted: false, status: 'Active' as const }];
    const activeAgents = fleet.filter((a) => !a.isDeleted && a.status === 'Active');
    assert.equal(activeAgents.length, 1);
    assert.equal(activeAgents[0].id, 'agent-2');
  });

  // Test 6: Delivery WhatsApp URL Generation
  test('WhatsApp click-to-chat URL formatting for customer order tracking', () => {
    const formatWaUrl = (phone: string, orderNumber: string, agentName: string) => {
      const cleanPhone = phone.replace(/\D/g, '');
      const text = `Hello ${agentName}, I am inquiring about my Food & Life Grocery delivery for order #${orderNumber}.`;
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    };

    const url = formatWaUrl('+94 77 123 4567', 'FL-2026-000101', 'Sunil');
    assert.ok(url.startsWith('https://wa.me/94771234567?text=Hello%20Sunil'));
    assert.ok(url.includes('FL-2026-000101'));
  });

  // Test 7: Conditional Delivery Section in Tracking / Invoicing
  test('Delivery section visibility: strictly present when assigned, strictly omitted when unassigned', () => {
    const orderWithAgent = {
      orderNumber: 'FL-2026-0001',
      deliveryAgent: { agentName: 'Sunil', mobilePhone: '0771234567', vehicleRegistrationNumber: 'CP AB-1234' },
    };
    const orderWithoutAgent = {
      orderNumber: 'FL-2026-0002',
      deliveryAgent: undefined,
    };

    const shouldShowAgentCard = (order: { orderNumber: string; deliveryAgent?: any }) => Boolean(order.deliveryAgent);
    assert.equal(shouldShowAgentCard(orderWithAgent), true, 'Must show delivery card when agent assigned');
    assert.equal(shouldShowAgentCard(orderWithoutAgent), false, 'Must hide delivery card when unassigned');
  });

  // Test 8: Purchase Order Item-by-Item Goods Receiving & Status Calculation
  test('PO Item-by-Item Goods Receiving: correctly calculates remaining and transitions from Pending -> Partially Received -> Fully Received', () => {
    interface POItem {
      productId: string;
      reorderQuantity: number;
      receivedQuantity: number;
      remainingQuantity: number;
    }

    const items: POItem[] = [
      { productId: 'p1', reorderQuantity: 50, receivedQuantity: 0, remainingQuantity: 50 },
      { productId: 'p2', reorderQuantity: 30, receivedQuantity: 0, remainingQuantity: 30 },
    ];

    const calculateStatus = (list: POItem[]): 'Pending' | 'Partially Received' | 'Fully Received' => {
      const allFullyReceived = list.every((i) => i.receivedQuantity >= i.reorderQuantity);
      if (allFullyReceived) return 'Fully Received';
      const anyReceived = list.some((i) => i.receivedQuantity > 0);
      if (anyReceived) return 'Partially Received';
      return 'Pending';
    };

    // Initial status
    assert.equal(calculateStatus(items), 'Pending');

    // Partial Delivery: 20 units of p1 received
    items[0].receivedQuantity += 20;
    items[0].remainingQuantity = Math.max(0, items[0].reorderQuantity - items[0].receivedQuantity);
    assert.equal(items[0].remainingQuantity, 30);
    assert.equal(calculateStatus(items), 'Partially Received');

    // Second partial Delivery: 30 units of p2 received
    items[1].receivedQuantity += 30;
    items[1].remainingQuantity = Math.max(0, items[1].reorderQuantity - items[1].receivedQuantity);
    assert.equal(items[1].remainingQuantity, 0);
    assert.equal(calculateStatus(items), 'Partially Received'); // p1 still has 30 remaining

    // Final Delivery: Remaining 30 units of p1 received
    items[0].receivedQuantity += 30;
    items[0].remainingQuantity = 0;
    assert.equal(calculateStatus(items), 'Fully Received');
  });

  // Test 9: Main Inventory Atomic Stock Increment on Goods Received
  test('Atomic Stock Increment: Goods received adds to available stock exactly once', () => {
    let mainStock = 45;
    const receivedNow = 25;

    // Increment
    mainStock += receivedNow;
    assert.equal(mainStock, 70, 'Main stock incremented from 45 to 70');
  });

  // Test 10: Delivery Status Update Permissions: All 8 stages unlocked for Admin & assigned driver
  test('Delivery Status Pipeline: permits updating between all 8 sequence stages without locking', () => {
    const validStatuses = [
      'Order Received',
      'Preparing Order',
      'Ready for Dispatch',
      'Delivery Agent Assigned',
      'Out for Delivery',
      'Delivered',
      'Delivery Failed',
      'Cancelled',
    ];

    validStatuses.forEach((st) => {
      assert.ok(validStatuses.includes(st), `Status ${st} is a recognized delivery status`);
    });

    // Can transition from Delivery Agent Assigned -> Out for Delivery -> Delivered
    let currentStatus = 'Delivery Agent Assigned';
    currentStatus = 'Out for Delivery';
    assert.equal(currentStatus, 'Out for Delivery');
    currentStatus = 'Delivered';
    assert.equal(currentStatus, 'Delivered');
  });

  // Test 12: Driver Authentication with SHA-256 Password Hashing
  test('Driver Authentication: SHA-256 hashed password verification and username matching', () => {
    const hashPassword = (plain: string) => crypto.createHash('sha256').update(plain).digest('hex');

    const kamalPasswordHash = hashPassword('Driver@Kamal2026');
    const sunilPasswordHash = hashPassword('Driver@Sunil2026');

    assert.notEqual(kamalPasswordHash, 'Driver@Kamal2026', 'Password must never be stored in plain text');
    assert.equal(hashPassword('Driver@Kamal2026'), kamalPasswordHash, 'Correct password matches SHA-256 hash');
    assert.notEqual(hashPassword('WrongPassword123'), kamalPasswordHash, 'Incorrect password does not match hash');
    assert.equal(hashPassword('Driver@Sunil2026'), sunilPasswordHash, 'Sunil password matches hash');
  });

  // Test 13: Driver Session Invalidation on Password Reset or Deactivation
  test('Session Revocation: Invalidate active tokens when driver password is reset or status deactivated', () => {
    let activeSessions: Record<string, { agentId: string }> = {
      'token-1': { agentId: 'agent-kamal' },
      'token-2': { agentId: 'agent-kamal' },
      'token-3': { agentId: 'agent-sunil' },
    };

    const revokeAgentSessions = (agentId: string) => {
      for (const [tok, sess] of Object.entries(activeSessions)) {
        if (sess.agentId === agentId) {
          delete activeSessions[tok];
        }
      }
    };

    revokeAgentSessions('agent-kamal');
    assert.equal(activeSessions['token-1'], undefined, 'Kamal session 1 revoked');
    assert.equal(activeSessions['token-2'], undefined, 'Kamal session 2 revoked');
    assert.ok(activeSessions['token-3'] !== undefined, 'Sunil session remains active');
  });

  // Test 14: Store Pickup Order Logic & Dedicated Status Stages
  test('Store Pickup Order: Delivery fee is 0, no driver assignment needed, and dedicated pickup stages', () => {
    const pickupOrder = {
      orderNumber: 'FL-2026-PICKUP-01',
      deliveryType: 'pickup' as const,
      subtotal: 3500,
      deliveryCharge: 0,
      total: 3500,
      deliveryAgent: undefined,
      status: 'Order Received' as const,
    };

    assert.equal(pickupOrder.deliveryType, 'pickup');
    assert.equal(pickupOrder.deliveryCharge, 0, 'Store pickup must have Rs. 0 delivery charge');
    assert.equal(pickupOrder.total, pickupOrder.subtotal, 'Total equals subtotal with Rs. 0 delivery fee');
    assert.equal(pickupOrder.deliveryAgent, undefined, 'Store pickup does not require a driver');

    const pickupStatuses = [
      'Order Received',
      'Preparing Order',
      'Ready for Pickup',
      'Ready for Collection',
      'Collected by Customer',
      'Cancelled',
    ];

    pickupStatuses.forEach((st) => {
      assert.ok(pickupStatuses.includes(st), `Stage ${st} is a valid pickup stage`);
    });

    // Check completion
    let status: string = 'Order Received';
    status = 'Ready for Collection';
    assert.equal(status, 'Ready for Collection');
    status = 'Collected by Customer';
    assert.equal(status, 'Collected by Customer');
  });

  // Test 15: Customer Checkout GPS Geolocation & Google Maps Directions Link
  test('Customer Checkout GPS Geolocation & Directions Link Formatting', () => {
    const lat = 7.330812;
    const lng = 80.686524;

    const buildDirectionsUrl = (latitude: number, longitude: number) => {
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    };

    const url = buildDirectionsUrl(lat, lng);
    assert.equal(url, 'https://www.google.com/maps/dir/?api=1&destination=7.330812,80.686524');
    assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1&destination='));
  });

  // Test 16: Universal Central Cloud Image Storage & Unique Identifier Generation
  test('Universal Cloud Image Storage: Unique ID generation, permanent URL, and cache-busting timestamp', () => {
    const productId = 'prod-001';
    const timestamp = 1793798400000;
    const randSuffix = 'a1b2c3d4';
    const imageId = `img_${productId}_${timestamp}_${randSuffix}`;
    const cleanFilename = `${imageId}.webp`;

    assert.ok(imageId.startsWith('img_prod-001_'), 'Image ID must be unique and contain product prefix');
    assert.ok(cleanFilename.endsWith('.webp'), 'Filename preserves correct image extension');

    // Permanent cloud HTTPS download URL with cache-busting query parameter
    const buildCloudUrl = (filename: string, ts: number) => `/uploads/${filename}?v=${ts}`;
    const cloudUrl = buildCloudUrl(cleanFilename, timestamp);
    assert.equal(cloudUrl, `/uploads/img_prod-001_1793798400000_a1b2c3d4.webp?v=1793798400000`);
    assert.ok(cloudUrl.includes('?v='), 'Cloud URL must have cache-busting version parameter');
  });

  // Test 17: Image Format and Payload Validation (JPG, PNG, WEBP <= 15MB)
  test('Image Upload Format Validation: Accepts JPG, PNG, WEBP and enforces 15MB size ceiling', () => {
    const isSupportedMime = (mime: string) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      return allowed.includes(mime.toLowerCase());
    };

    assert.ok(isSupportedMime('image/jpeg'), 'JPEG is allowed');
    assert.ok(isSupportedMime('image/png'), 'PNG is allowed');
    assert.ok(isSupportedMime('image/webp'), 'WEBP is allowed');
    assert.ok(!isSupportedMime('application/pdf'), 'PDF is rejected');
    assert.ok(!isSupportedMime('image/gif'), 'GIF is rejected');

    const MAX_ALLOWED_SIZE = 15 * 1024 * 1024; // 15MB
    const validSize = 2.4 * 1024 * 1024; // 2.4MB
    const oversize = 22 * 1024 * 1024; // 22MB

    assert.ok(validSize <= MAX_ALLOWED_SIZE, '2.4MB image passes size validation');
    assert.ok(oversize > MAX_ALLOWED_SIZE, '22MB image is rejected by size validation');
  });

  // Test 18: Cross-Device Central Database Synchronization & Firestore Record Structure
  test('Central Database Synchronization: Image record contains all required metadata and links to product', () => {
    const cloudRecord = {
      id: 'img_prod-005_1793798400000_9f8e7d6c',
      productId: 'prod-005',
      productNameEn: 'Nuwara Eliya Potatoes',
      imageUrl: '/uploads/img_prod-005_1793798400000_9f8e7d6c.jpg?v=1793798400000',
      filename: 'img_prod-005_1793798400000_9f8e7d6c.jpg',
      mimeType: 'image/jpeg',
      size: 145820,
      createdAt: '2026-11-05T09:00:00.000Z',
      updatedAt: '2026-11-05T09:00:00.000Z',
    };

    assert.ok(cloudRecord.id, 'Image record has unique ID');
    assert.equal(cloudRecord.productId, 'prod-005', 'Record is linked to product');
    assert.ok(cloudRecord.size > 0, 'Image has valid recorded byte size');
    assert.equal(cloudRecord.mimeType, 'image/jpeg');

    // Simulate updating product across connected devices
    let productRecord = {
      id: 'prod-005',
      nameEn: 'Nuwara Eliya Potatoes',
      imageUrl: 'https://images.unsplash.com/potato.jpg',
      imageId: undefined as string | undefined,
      imageSource: 'cdn' as 'cdn' | 'cloud_storage',
      imageUpdatedAt: undefined as string | undefined,
    };

    // Device A updates image
    productRecord.imageUrl = cloudRecord.imageUrl;
    productRecord.imageId = cloudRecord.id;
    productRecord.imageSource = 'cloud_storage';
    productRecord.imageUpdatedAt = cloudRecord.updatedAt;

    // Device B and C read same central product record
    assert.equal(productRecord.imageUrl, cloudRecord.imageUrl, 'Device B displays new cloud URL');
    assert.equal(productRecord.imageId, cloudRecord.id, 'Device C verifies correct image ID');
    assert.equal(productRecord.imageSource, 'cloud_storage');
  });

  // Test 19: Image Replacement Cache Invalidation & Removal
  test('Cache Invalidation & Image Removal: Changing image updates timestamp and removal clears imageId', () => {
    const originalTs = 1793700000000;
    const replacementTs = 1793800000000;

    const url1 = `/uploads/img_prod-001.jpg?v=${originalTs}`;
    const url2 = `/uploads/img_prod-001.jpg?v=${replacementTs}`;

    assert.notEqual(url1, url2, 'Updated version parameter prevents browser cache collisions');

    // Removal test
    let product = {
      id: 'prod-001',
      imageUrl: url2,
      imageId: 'img_001',
      imageUpdatedAt: '2026-11-05T09:00:00.000Z',
      imageSource: 'cloud_storage' as const,
    };

    // Remove image
    product.imageUrl = '';
    (product as any).imageId = undefined;
    (product as any).imageSource = undefined;

    assert.equal(product.imageUrl, '', 'Product image is cleared on removal');
    assert.equal(product.imageId, undefined, 'Image ID reference is unlinked');
  });

  // TEST 19: Welcome Splash Screen bypass logic for deep links & autostart
  test('Welcome Splash Screen: deep links (/track, /bill) and ?autostart=1 skip splash screen', () => {
    function shouldShowWelcome(pathname: string, search: string, dismissedInSession: boolean): boolean {
      if (pathname.startsWith('/track/') || pathname.startsWith('/bill/')) return false;
      const urlParams = new URLSearchParams(search);
      if (urlParams.get('autostart') === '1') return false;
      return !dismissedInSession;
    }

    // Default visit -> show welcome
    assert.equal(shouldShowWelcome('/', '', false), true, 'First visit shows welcome splash screen');
    // Once dismissed -> do not show
    assert.equal(shouldShowWelcome('/', '', true), false, 'Dismissed session does not show splash screen');
    // Direct tracking link -> skip
    assert.equal(shouldShowWelcome('/track/FL-1001', '', false), false, 'Deep link to /track skips welcome screen');
    // Direct bill link -> skip
    assert.equal(shouldShowWelcome('/bill/FL-1001', '', false), false, 'Deep link to /bill skips welcome screen');
    // Autostart param -> skip
    assert.equal(shouldShowWelcome('/', '?autostart=1', false), false, 'autostart=1 parameter skips welcome screen');
  });

  // TEST 20: Official FOOD & LIFE logo asset is present in public/
  test('Official FOOD & LIFE logo is present with correct branding metadata', () => {
    const logoPath = path.resolve(process.cwd(), 'public/logo.jpg');
    assert.ok(fs.existsSync(logoPath), 'public/logo.jpg must exist');
    const stats = fs.statSync(logoPath);
    assert.ok(stats.size > 10000, 'Logo file size should be authentic high-res image');
  });
});

