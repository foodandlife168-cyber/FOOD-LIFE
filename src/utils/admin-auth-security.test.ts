import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

test('1. Unauthorized access to /api/admin/orders is rejected with 401', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/orders`);
  assert.equal(res.status, 401, 'Expected status 401 Unauthorized for unauthenticated request');
  const body = await res.json();
  assert.match(body.error, /login required|authorization/i);
});

test('2. Incorrect admin credentials are rejected with 401 and descriptive message', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Admin',
      password: 'wrong-password-123',
    }),
  });
  assert.equal(res.status, 401, 'Expected status 401 for incorrect credentials');
  const body = await res.json();
  assert.match(body.error, /invalid administrator username or password/i);
});

test('3. Correct admin credentials (Username: Admin, Password: FoodLife@Admin2026) succeed and return 64-char token', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Admin',
      password: 'FoodLife@Admin2026',
    }),
  });
  assert.equal(res.status, 200, 'Expected 200 OK for valid admin credentials');
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.token && body.token.length === 64, 'Token must be a 64-char cryptographically random string');
  assert.equal(body.user.username, 'Admin');
  assert.equal(body.user.role, 'Administrator');
});

test('4. Valid token accesses protected admin endpoints and verifies session (simulating page reload)', async () => {
  // Login first
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Admin',
      password: 'FoodLife@Admin2026',
    }),
  });
  const { token } = await loginRes.json();

  // Test verify-session (page refresh check)
  const verifyRes = await fetch(`${BASE_URL}/api/admin/verify-session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(verifyRes.status, 200, 'Verify session must succeed with valid token');
  const verifyBody = await verifyRes.json();
  assert.equal(verifyBody.valid, true);

  // Test protected orders endpoint
  const ordersRes = await fetch(`${BASE_URL}/api/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(ordersRes.status, 200, 'Admin orders endpoint must return 200');
  const orders = await ordersRes.json();
  assert.ok(Array.isArray(orders), 'Orders should be an array');

  // Test protected stats endpoint
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(statsRes.status, 200, 'Admin stats endpoint must return 200');
});

test('5. Logout explicitly terminates the session and invalidates the token', async () => {
  // Login to get token
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Admin',
      password: 'FoodLife@Admin2026',
    }),
  });
  const { token } = await loginRes.json();

  // Logout
  const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logoutRes.status, 200, 'Logout should succeed');

  // Try to use the same token again -> should now be rejected (403 or 401)
  const afterLogoutRes = await fetch(`${BASE_URL}/api/admin/verify-session`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.ok(
    afterLogoutRes.status === 401 || afterLogoutRes.status === 403,
    'Invalidated token must no longer access protected endpoints'
  );
});

test('6. Old hardcoded demo passwords (admin123, foodlife2026) are rejected', async () => {
  const passwordsToTest = ['admin123', 'foodlife2026'];
  for (const pwd of passwordsToTest) {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Admin',
        password: pwd,
      }),
    });
    assert.equal(res.status, 401, `Old hardcoded demo password "${pwd}" must be rejected`);
  }
});
