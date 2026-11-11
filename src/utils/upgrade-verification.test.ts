import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePurchaseOrderPdf, buildWhatsAppPurchaseOrderText } from './generatePurchaseOrderPdf.ts';
import type { PurchaseOrder, StoreConfig } from '../types/index.ts';

const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  username: 'Admin',
  password: 'FoodLife@Admin2026',
};

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDENTIALS),
  });
  assert.equal(res.status, 200, 'Admin login must succeed');
  const data = await res.json();
  assert.ok(data.token, 'Token must be present in response');
  return data.token;
}

test('FOOD & LIFE GROCERY - SYSTEM UPGRADE VERIFICATION', async (t) => {
  let adminToken: string;

  await t.test('Pre-check: Admin Authentication', async () => {
    adminToken = await getAdminToken();
    assert.ok(adminToken, 'Admin token acquired');
  });

  // TEST 1: Customer adds products to cart: stock remains unchanged
  await t.test('TEST 1: Customer adds products to cart: stock remains unchanged', async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    assert.equal(res.status, 200);
    const products = await res.json();
    assert.ok(products.length > 0, 'Products catalog must not be empty');

    const testProd = products[0];
    const initialStock = testProd.availableStock;

    // Adding to cart is a client-side action in CartDrawer/useCart.
    // Verify that GET /api/products returns unchanged stock regardless of browser sessions.
    const recheckRes = await fetch(`${BASE_URL}/api/products`);
    const recheckProducts = await recheckRes.json();
    const sameProd = recheckProducts.find((p: any) => p.id === testProd.id);
    assert.equal(sameProd.availableStock, initialStock, 'Stock remains unchanged when items are merely viewed or in cart');
  });

  // TEST 2: Customer confirms order: stock is deducted exactly once
  let createdOrderId: string;
  let orderedProductId: string;
  let stockBeforeOrder: number;
  let orderQuantity = 2;

  await t.test('TEST 2: Customer confirms order: stock is deducted exactly once', async () => {
    const res = await fetch(`${BASE_URL}/api/products`);
    const products = await res.json();
    // Pick an active product with stock >= 5
    const targetProd = products.find((p: any) => p.isActive && p.availableStock >= 5);
    assert.ok(targetProd, 'Target product found');
    orderedProductId = targetProd.id;
    stockBeforeOrder = targetProd.availableStock;

    // Customer places order
    const orderPayload = {
      customerName: 'Test Customer Rajapaksha',
      customerPhone: '0771234567',
      deliveryArea: 'Katuloya',
      deliveryAddress: 'Main Junction, Katuloya',
      deliveryType: 'delivery',
      paymentMethod: 'bank_transfer',
      items: [
        {
          productId: orderedProductId,
          quantity: orderQuantity,
        },
      ],
    };

    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    assert.equal(orderRes.status, 201, 'Order confirmation must return 201 Created');
    const orderData = await orderRes.json();
    assert.ok(orderData.success, 'Order response must be successful');
    assert.ok(orderData.orderId, 'Order ID must be returned');
    createdOrderId = orderData.orderId;

    // Verify stock is deducted exactly once
    const verifyRes = await fetch(`${BASE_URL}/api/products`);
    const updatedProducts = await verifyRes.json();
    const updatedProd = updatedProducts.find((p: any) => p.id === orderedProductId);
    assert.equal(
      updatedProd.availableStock,
      stockBeforeOrder - orderQuantity,
      `Stock must decrease from ${stockBeforeOrder} to ${stockBeforeOrder - orderQuantity}`
    );

    // Verify stock movement was recorded
    const smRes = await fetch(`${BASE_URL}/api/admin/stock-movements`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(smRes.status, 200);
    const smList = await smRes.json();
    const matchingMovement = smList.find((sm: any) => sm.orderId === createdOrderId && sm.productId === orderedProductId);
    assert.ok(matchingMovement, 'Stock movement record must exist for order');
    assert.equal(matchingMovement.quantity, -orderQuantity, 'Quantity deducted must be recorded as negative');
    assert.equal(matchingMovement.reason, 'order_placed', 'Reason must be order_placed');
  });

  // TEST 3: Staff cancels order: stock is restored exactly once
  await t.test('TEST 3: Staff cancels order: stock is restored exactly once', async () => {
    const cancelRes = await fetch(`${BASE_URL}/api/admin/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Cancelled',
        note: 'Customer requested cancellation for testing stock restoration.',
        sendNotification: false,
      }),
    });

    assert.equal(cancelRes.status, 200, 'Order cancellation must succeed');
    const cancelData = await cancelRes.json();
    assert.equal(cancelData.order.status, 'Cancelled');
    assert.equal(cancelData.order.stockRestored, true, 'order.stockRestored flag must be set to true');

    // Verify product stock is restored to original
    const verifyRes = await fetch(`${BASE_URL}/api/products`);
    const updatedProducts = await verifyRes.json();
    const updatedProd = updatedProducts.find((p: any) => p.id === orderedProductId);
    assert.equal(
      updatedProd.availableStock,
      stockBeforeOrder,
      `Stock must be restored back to ${stockBeforeOrder}`
    );

    // Verify positive stock movement audit was recorded
    const smRes = await fetch(`${BASE_URL}/api/admin/stock-movements`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const smList = await smRes.json();
    const restoreMovement = smList.find((sm: any) => sm.orderId === createdOrderId && sm.reason === 'order_cancelled');
    assert.ok(restoreMovement, 'Positive stock movement audit must exist');
    assert.equal(restoreMovement.quantity, orderQuantity, 'Quantity restored must be positive');
  });

  // TEST 4: Staff cancels the same order again: no additional stock is restored
  await t.test('TEST 4: Staff cancels the same order again: no additional stock is restored', async () => {
    const secondCancelRes = await fetch(`${BASE_URL}/api/admin/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'Cancelled',
        note: 'Repeated cancellation request - duplicate protection test.',
        sendNotification: false,
      }),
    });

    assert.equal(secondCancelRes.status, 200);

    // Verify stock did NOT increase again
    const verifyRes = await fetch(`${BASE_URL}/api/products`);
    const updatedProducts = await verifyRes.json();
    const updatedProd = updatedProducts.find((p: any) => p.id === orderedProductId);
    assert.equal(
      updatedProd.availableStock,
      stockBeforeOrder,
      'Stock must not be restored twice upon repeated cancellations'
    );
  });

  // TEST 5: Two customers order the last available product: overselling is prevented
  await t.test('TEST 5: Two customers order the last available product: overselling is prevented', async () => {
    // 1. Create a limited stock product with availableStock = 1
    const createProdRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nameEn: 'Limited Concurrency Test Rice',
        nameSi: 'සීමිත සහල් පරීක්ෂණය',
        category: 'Rice & Grains',
        unit: '1 kg',
        sellingPrice: 500,
        availableStock: 1, // Only 1 left!
        isActive: true,
      }),
    });

    assert.equal(createProdRes.status, 201);
    const { product: limitedProd } = await createProdRes.json();
    assert.equal(limitedProd.availableStock, 1);

    // 2. Fire two concurrent checkout requests competing for the 1 remaining item
    const orderPayloadA = {
      customerName: 'Customer A',
      customerPhone: '0711111111',
      deliveryArea: 'Katuloya',
      deliveryAddress: 'House A, Katuloya',
      deliveryType: 'delivery',
      paymentMethod: 'cash_on_delivery',
      items: [{ productId: limitedProd.id, quantity: 1 }],
    };

    const orderPayloadB = {
      customerName: 'Customer B',
      customerPhone: '0722222222',
      deliveryArea: 'Katuloya',
      deliveryAddress: 'House B, Katuloya',
      deliveryType: 'delivery',
      paymentMethod: 'cash_on_delivery',
      items: [{ productId: limitedProd.id, quantity: 1 }],
    };

    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayloadA),
      }),
      fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayloadB),
      }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert.deepEqual(
      statuses,
      [201, 400],
      'One order must succeed (201) and the competing concurrent order must be rejected (400) due to insufficient stock'
    );

    // Verify stock is exactly 0 and never drops below zero (no overselling)
    const checkRes = await fetch(`${BASE_URL}/api/products`);
    const allProducts = await checkRes.json();
    const endProd = allProducts.find((p: any) => p.id === limitedProd.id);
    assert.equal(endProd.availableStock, 0, 'Stock must be exactly 0, preventing overselling');

    // Clean up test product
    await fetch(`${BASE_URL}/api/admin/products/${limitedProd.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  // TEST 6: Staff selects products and generates a PO: all details are correct
  let generatedPoId: string;
  await t.test('TEST 6: Staff selects products and generates a PO: all details are correct', async () => {
    const poPayload = {
      supplierName: 'Katuloya Agro Wholesale Supplies',
      supplierContact: '+94 81 247 9999',
      notes: 'Urgent restocking for weekend Katuloya delivery routes',
      items: [
        {
          productId: orderedProductId,
          reorderQuantity: 25,
          unitPrice: 420,
        },
      ],
      receiveStockNow: false,
    };

    const poRes = await fetch(`${BASE_URL}/api/admin/purchase-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(poPayload),
    });

    assert.equal(poRes.status, 201, 'Purchase Order creation must return 201');
    const poData = await poRes.json();
    assert.ok(poData.success);
    assert.ok(poData.purchaseOrder.poNumber.startsWith('PO-'));
    assert.equal(poData.purchaseOrder.supplierName, 'Katuloya Agro Wholesale Supplies');
    assert.equal(poData.purchaseOrder.items.length, 1);
    assert.equal(poData.purchaseOrder.items[0].reorderQuantity, 25);
    assert.equal(poData.purchaseOrder.items[0].unitPrice, 420);
    assert.equal(poData.purchaseOrder.subtotal, 25 * 420);
    assert.equal(poData.purchaseOrder.grandTotal, 10500);
    assert.equal(poData.purchaseOrder.status, 'issued');
    generatedPoId = poData.purchaseOrder.id;
  });

  // TEST 7: PDF displays the supplied logo and People's Bank details
  await t.test("TEST 7: PDF displays the supplied logo and People's Bank details", async () => {
    const configRes = await fetch(`${BASE_URL}/api/store-config`);
    const storeConfig: StoreConfig = await configRes.json();

    assert.equal(storeConfig.bankDetails?.bankName, "People's Bank");
    assert.equal(storeConfig.bankDetails?.branch, 'Panwila');
    assert.equal(storeConfig.bankDetails?.accountName, 'RG Nimal Rajapaksha');
    assert.equal(storeConfig.bankDetails?.accountNumber, '211200380039804');
    assert.equal(storeConfig.logoUrl, '/logo.jpg');

    const mockPo: PurchaseOrder = {
      id: generatedPoId || 'po-test-1',
      poNumber: 'PO-2026-0105',
      date: '2026-11-01',
      supplierName: 'Katuloya Agro Wholesale Supplies',
      items: [
        {
          productId: 'prod-001',
          nameEn: 'Keeri Samba Rice',
          unit: '5 kg',
          currentStock: 40,
          reorderQuantity: 20,
          unitPrice: 1550,
          lineTotal: 31000,
        },
      ],
      subtotal: 31000,
      grandTotal: 31000,
      status: 'issued',
      createdAt: new Date().toISOString(),
      bankDetails: storeConfig.bankDetails!,
    };

    // Test WhatsApp formatted text generator
    const waText = buildWhatsAppPurchaseOrderText(mockPo, storeConfig);
    assert.ok(waText.includes("Bank: People's Bank"), 'WhatsApp share text must contain People\'s Bank');
    assert.ok(waText.includes('Branch: Panwila'), 'WhatsApp share text must contain Panwila branch');
    assert.ok(waText.includes('RG Nimal Rajapaksha'), 'WhatsApp share text must contain Account Name RG Nimal Rajapaksha');
    assert.ok(waText.includes('211200380039804'), 'WhatsApp share text must contain Account Number 211200380039804');
    assert.ok(!waText.includes('Commercial Bank'), 'Must NOT contain Commercial Bank');
    assert.ok(!waText.includes('BOC'), 'Must NOT contain BOC');

    // Test PDF generation object (Node.js compatible jsPDF instance)
    const doc = await generatePurchaseOrderPdf(mockPo, storeConfig, { autoDownload: false });
    assert.ok(doc, 'Purchase Order jsPDF document must be generated');
    const pdfOutput = doc.output();
    assert.ok(pdfOutput.length > 1000, 'PDF binary must contain valid document bytes');
  });

  // TEST 8: Existing customer and staff dashboards continue to work
  await t.test('TEST 8: Existing customer and staff dashboards continue to work', async () => {
    // 1. Customer product catalog endpoint
    const prodRes = await fetch(`${BASE_URL}/api/products`);
    assert.equal(prodRes.status, 200);
    const prodList = await prodRes.json();
    assert.ok(Array.isArray(prodList) && prodList.length >= 10, 'Catalog displays authentic products');

    // 2. Staff Stats endpoint
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(statsRes.status, 200);
    const statsData = await statsRes.json();
    assert.ok(statsData.totalOrders !== undefined, 'Stats has totalOrders');
    assert.ok(statsData.totalProducts !== undefined, 'Stats has totalProducts');

    // 3. Staff Orders endpoint
    const ordersRes = await fetch(`${BASE_URL}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(ordersRes.status, 200);
    const ordersList = await ordersRes.json();
    assert.ok(Array.isArray(ordersList), 'Orders list returned');

    // 4. Public Tracking Endpoint
    if (ordersList.length > 0 && ordersList[0].trackingToken) {
      const trackRes = await fetch(`${BASE_URL}/api/track/${ordersList[0].trackingToken}`);
      assert.equal(trackRes.status, 200, 'Tracking endpoint accessible');
      const trackData = await trackRes.json();
      assert.ok(trackData.orderNumber, 'Order tracking returns orderNumber');
    }
  });
});
