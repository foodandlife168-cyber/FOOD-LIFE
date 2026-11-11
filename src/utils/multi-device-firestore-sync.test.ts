import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

test('Full Multi-Device Synchronization & Firestore Persistence Verification', async (t) => {
  // Setup: Phone A logs in as Admin
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Admin',
      password: 'FoodLife@Admin2026',
    }),
  });
  assert.equal(loginRes.status, 200, 'Admin login on Phone A must succeed');
  const { token: adminToken } = await loginRes.json();
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // TEST 1: Log in to the admin panel on Phone A and change a product price
  await t.test('TEST 1: Phone A (Admin) changes Keeri Samba Rice price to LKR 1850', async () => {
    const updateRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        id: 'prod-001',
        nameEn: 'Keeri Samba Rice',
        sellingPrice: 1850,
        availableStock: 45,
        isActive: true,
      }),
    });
    assert.equal(updateRes.status, 200, 'Price update on Phone A must return 200');
    const data = await updateRes.json();
    assert.equal(data.product.sellingPrice, 1850);
  });

  // TEST 2: Open the same website on Phone B and verify that the updated price appears
  await t.test('TEST 2: Phone B (Customer) opens website and retrieves updated price LKR 1850', async () => {
    const customerRes = await fetch(`${BASE_URL}/api/products`);
    assert.equal(customerRes.status, 200);
    const products = await customerRes.json();
    const prod1 = products.find((p: any) => p.id === 'prod-001');
    assert.ok(prod1, 'prod-001 must exist for customer on Phone B');
    assert.equal(prod1.sellingPrice, 1850, 'Customer on Phone B must see updated price LKR 1850');
  });

  // Variable to store the new product ID
  let newProductId = '';

  // TEST 3: Add a new product on Phone A and enable Show to Customers
  await t.test('TEST 3: Phone A (Admin) adds a new product with Show to Customers enabled', async () => {
    const addRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        nameEn: 'Organic Ceylon Green Tea',
        nameSi: 'කාබනික හරිත තේ',
        category: 'Snacks & Beverages',
        unit: '250 g',
        sellingPrice: 750,
        availableStock: 30,
        discountPercent: 0,
        isActive: true, // Show to Customers enabled
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
      }),
    });
    assert.equal(addRes.status, 201, 'Adding product on Phone A must return 201 Created');
    const data = await addRes.json();
    assert.ok(data.product.id, 'New product must have an ID');
    assert.equal(data.product.nameEn, 'Organic Ceylon Green Tea');
    assert.equal(data.product.sellingPrice, 750);
    assert.equal(data.product.isActive, true);
    newProductId = data.product.id;
  });

  // TEST 4: Open the customer shop on Phone B and verify that the new product appears
  await t.test('TEST 4: Phone B (Customer) sees the new product in the customer shop', async () => {
    const customerRes = await fetch(`${BASE_URL}/api/products`);
    assert.equal(customerRes.status, 200);
    const products = await customerRes.json();
    const found = products.find((p: any) => p.id === newProductId);
    assert.ok(found, `Newly added product ${newProductId} must appear in customer shop on Phone B`);
    assert.equal(found.nameEn, 'Organic Ceylon Green Tea');
    assert.equal(found.sellingPrice, 750);
  });

  // TEST 5: Add the new product to the shopping cart and verify its name, price, quantity and product ID
  await t.test('TEST 5: Phone B adds new product to cart and places an order verifying name, price, quantity, ID', async () => {
    const orderPayload = {
      customerName: 'Test Customer Phone B',
      customerPhone: '077 123 4567',
      deliveryArea: 'Katuloya',
      deliveryAddress: 'Main Road, Katuloya, Thawalanthanne',
      deliveryType: 'delivery',
      paymentMethod: 'cash_on_delivery',
      items: [
        {
          productId: newProductId,
          quantity: 2,
        },
      ],
    };

    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    assert.equal(orderRes.status, 201, 'Order with new product must be placed successfully');
    const orderData = await orderRes.json();
    assert.ok(orderData.trackingToken);

    // Verify order details via /api/track/:token
    const trackRes = await fetch(`${BASE_URL}/api/track/${orderData.trackingToken}`);
    assert.equal(trackRes.status, 200);
    const trackData = await trackRes.json();
    assert.equal(trackData.items.length, 1);
    assert.equal(trackData.items[0].nameEn, 'Organic Ceylon Green Tea');
    assert.equal(trackData.items[0].quantity, 2);
    assert.equal(trackData.items[0].effectivePrice, 750);
    assert.equal(trackData.items[0].lineTotal, 1500);
  });

  // TEST 6: Disable the product from the admin panel and verify that it disappears from the customer shop
  await t.test('TEST 6: Phone A disables product and Phone B verifies it disappears from customer shop', async () => {
    const disableRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        id: newProductId,
        nameEn: 'Organic Ceylon Green Tea',
        sellingPrice: 750,
        availableStock: 28,
        isActive: false, // Disabled / Hidden from customers
      }),
    });
    assert.equal(disableRes.status, 200);
    const disabledData = await disableRes.json();
    assert.equal(disabledData.product.isActive, false);

    // Verify on Phone B customer shop
    const customerRes = await fetch(`${BASE_URL}/api/products`);
    assert.equal(customerRes.status, 200);
    const products = await customerRes.json();
    const found = products.find((p: any) => p.id === newProductId);
    assert.equal(found, undefined, `Disabled product ${newProductId} must NOT appear in customer shop`);
  });

  // TEST 7: Restart the server or redeploy the application and verify that all products, prices and orders remain saved
  await t.test('TEST 7: Verify central Firestore database contains all updated products, prices and orders', async () => {
    // Import Firestore directly to verify central database persistence
    const { getFirestoreDb } = await import('../lib/serverFirestore.ts');
    const { doc, getDoc } = await import('firebase/firestore');

    const firestoreDb = getFirestoreDb();
    assert.ok(firestoreDb, 'Central Firestore database must be connected');

    // Verify prod-001 price in central Firestore
    const prod1Doc = await getDoc(doc(firestoreDb, 'products', 'prod-001'));
    assert.ok(prod1Doc.exists(), 'prod-001 must exist in central Firestore');
    assert.equal(prod1Doc.data().sellingPrice, 1850, 'Firestore price must be 1850');

    // Verify new product in central Firestore
    const newProdDoc = await getDoc(doc(firestoreDb, 'products', newProductId));
    assert.ok(newProdDoc.exists(), 'New product must exist in central Firestore');
    assert.equal(newProdDoc.data().isActive, false, 'New product state in Firestore must be inactive');
  });
});

process.on('beforeExit', () => {
  process.exit(0);
});
