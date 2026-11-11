/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEarnedStarPoints,
  getLoyaltyCycleForDate,
  computeCustomerLoyaltySummary,
  processStarPointsExpiration,
  StarPointsTransaction,
} from './starPoints.ts';

test('1. AUTOMATIC STAR POINT CALCULATION matches user specification exactly', () => {
  // Test all 10 examples from user prompt:
  // - Rs. 500 = 0 points
  assert.equal(calculateEarnedStarPoints(500), 0, 'Rs. 500 must equal 0 points');
  // - Rs. 999 = 0 points
  assert.equal(calculateEarnedStarPoints(999), 0, 'Rs. 999 must equal 0 points');
  // - Rs. 1,000 = 5 points
  assert.equal(calculateEarnedStarPoints(1000), 5, 'Rs. 1,000 must equal 5 points');
  // - Rs. 1,999 = 5 points
  assert.equal(calculateEarnedStarPoints(1999), 5, 'Rs. 1,999 must equal 5 points');
  // - Rs. 2,000 = 10 points
  assert.equal(calculateEarnedStarPoints(2000), 10, 'Rs. 2,000 must equal 10 points');
  // - Rs. 2,999 = 10 points
  assert.equal(calculateEarnedStarPoints(2999), 10, 'Rs. 2,999 must equal 10 points');
  // - Rs. 3,000 = 15 points
  assert.equal(calculateEarnedStarPoints(3000), 15, 'Rs. 3,000 must equal 15 points');
  // - Rs. 3,500 = 15 points
  assert.equal(calculateEarnedStarPoints(3500), 15, 'Rs. 3,500 must equal 15 points');
  // - Rs. 5,000 = 25 points
  assert.equal(calculateEarnedStarPoints(5000), 25, 'Rs. 5,000 must equal 25 points');
  // - Rs. 10,000 = 50 points
  assert.equal(calculateEarnedStarPoints(10000), 50, 'Rs. 10,000 must equal 50 points');

  // Negative and 0 purchase checks
  assert.equal(calculateEarnedStarPoints(0), 0);
  assert.equal(calculateEarnedStarPoints(-500), 0);
  assert.equal(calculateEarnedStarPoints(NaN), 0);
});

test('2. ANNUAL STAR POINTS VALIDITY PERIOD correctly identifies July 18 - July 17 cycle', () => {
  // Test November 2026 (current time period)
  const nov2026 = getLoyaltyCycleForDate('2026-11-10T12:00:00Z');
  assert.equal(nov2026.cycleId, '2026-2027');
  assert.equal(nov2026.periodDisplayEn, '18 July 2026 – 17 July 2027');
  assert.equal(nov2026.expiryDateDisplayEn, '17 July 2027');

  // Test Boundary: 17 July 2026 at 23:59:00 Sri Lanka Time (UTC 18:29)
  // Belongs to the 2025-2026 cycle!
  const jul17_2026 = getLoyaltyCycleForDate('2026-07-17T18:00:00Z'); // 23:30 SLT on 17 July
  assert.equal(jul17_2026.cycleId, '2025-2026');
  assert.equal(jul17_2026.expiryDateDisplayEn, '17 July 2026');

  // Test Boundary: 18 July 2026 at 00:01:00 Sri Lanka Time (UTC 17 July 18:31)
  // Belongs to the NEW 2026-2027 cycle!
  const jul18_2026 = getLoyaltyCycleForDate('2026-07-17T19:00:00Z'); // 00:30 SLT on 18 July
  assert.equal(jul18_2026.cycleId, '2026-2027');
  assert.equal(jul18_2026.periodDisplayEn, '18 July 2026 – 17 July 2027');
  assert.equal(jul18_2026.expiryDateDisplayEn, '17 July 2027');
});

test('3. computeCustomerLoyaltySummary calculates points, purchases, and expiration accurately', () => {
  const customerId = 'CUST-259568';
  const customerPhone = '+94712595683';
  const customerName = 'Kamal Perera';

  const txs: StarPointsTransaction[] = [
    {
      id: 'tx-1',
      customerId,
      customerPhone,
      type: 'EARN',
      purchaseAmount: 3500,
      points: 15,
      cycle: '2026-2027',
      date: '2026-08-01T10:00:00Z',
      expiryDate: '2027-07-17T23:59:59+05:30',
      description: 'Order #FL-2026-000101',
      createdBy: 'System',
      createdAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'tx-2',
      customerId,
      customerPhone,
      type: 'EARN',
      purchaseAmount: 5000,
      points: 25,
      cycle: '2026-2027',
      date: '2026-09-15T10:00:00Z',
      expiryDate: '2027-07-17T23:59:59+05:30',
      description: 'Order #FL-2026-000102',
      createdBy: 'System',
      createdAt: '2026-09-15T10:00:00Z',
    },
    {
      id: 'tx-3',
      customerId,
      customerPhone,
      type: 'REDEEM',
      purchaseAmount: 0,
      points: -10,
      cycle: '2026-2027',
      date: '2026-10-01T10:00:00Z',
      expiryDate: '2027-07-17T23:59:59+05:30',
      description: 'Redeemed for Rs. 100 grocery voucher',
      createdBy: 'Customer',
      createdAt: '2026-10-01T10:00:00Z',
    },
  ];

  const summary = computeCustomerLoyaltySummary(customerId, customerPhone, customerName, txs, '2026-11-10T10:00:00Z');

  assert.equal(summary.availablePoints, 30, 'Available points should be 15 + 25 - 10 = 30');
  assert.equal(summary.currentCycleEarnedPoints, 40, 'Total points earned in current cycle = 40');
  assert.equal(summary.currentCyclePurchases, 8500, 'Total purchases in current cycle = 3500 + 5000 = 8500');
  assert.equal(summary.totalPointsRedeemed, 10, 'Total redeemed = 10');
  assert.equal(summary.currentCycle, '2026-2027');
  assert.equal(summary.expiryDate, '17 July 2027');
  assert.equal(summary.pointsExpiringOn17July, 30);
});

test('4. Points from previous cycle expire and NEVER carry over into new loyalty year', () => {
  const customerId = 'CUST-111111';
  const customerPhone = '+9471111111';

  // 50 points earned in cycle 2025-2026 (expired on 17 July 2026)
  // 15 points earned in cycle 2026-2027
  const txs: StarPointsTransaction[] = [
    {
      id: 'tx-old',
      customerId,
      customerPhone,
      type: 'EARN',
      purchaseAmount: 10000,
      points: 50,
      cycle: '2025-2026',
      date: '2025-10-10T10:00:00Z',
      expiryDate: '2026-07-17T23:59:59+05:30',
      description: 'Old order',
      createdBy: 'System',
      createdAt: '2025-10-10T10:00:00Z',
    },
    {
      id: 'tx-new',
      customerId,
      customerPhone,
      type: 'EARN',
      purchaseAmount: 3000,
      points: 15,
      cycle: '2026-2027',
      date: '2026-08-10T10:00:00Z',
      expiryDate: '2027-07-17T23:59:59+05:30',
      description: 'New order',
      createdBy: 'System',
      createdAt: '2026-08-10T10:00:00Z',
    },
  ];

  // As of November 2026, the 2025-2026 points are expired
  const summary = computeCustomerLoyaltySummary(customerId, customerPhone, 'Test Customer', txs, '2026-11-10T12:00:00Z');

  assert.equal(summary.availablePoints, 15, 'Only the active cycle points (15) must be available');
  assert.equal(summary.pointsExpiringOn17July, 15, 'Only current cycle points expire on 17 July 2027');
});

test('5. processStarPointsExpiration creates permanent expiry transactions and prevents duplicates', () => {
  const customerId = 'CUST-222222';
  const customerPhone = '+9471222222';

  const ledger: StarPointsTransaction[] = [
    {
      id: 'tx-past-earn',
      customerId,
      customerPhone,
      type: 'EARN',
      purchaseAmount: 5000,
      points: 25,
      cycle: '2024-2025',
      date: '2024-12-01T10:00:00Z',
      expiryDate: '2025-07-17T23:59:59+05:30',
      description: 'Past cycle order',
      createdBy: 'System',
      createdAt: '2024-12-01T10:00:00Z',
    },
  ];

  // Run expiry process as of Nov 2026
  const result1 = processStarPointsExpiration(ledger, '2026-11-10T12:00:00Z');
  assert.equal(result1.newExpiryTransactions.length, 1);
  assert.equal(result1.totalExpiredPoints, 25);
  assert.equal(result1.newExpiryTransactions[0].type, 'EXPIRY');
  assert.equal(result1.newExpiryTransactions[0].points, -25);

  // Add the newly generated expiry transaction to ledger
  ledger.push(result1.newExpiryTransactions[0]);

  // Run expiry process again: MUST NOT duplicate
  const result2 = processStarPointsExpiration(ledger, '2026-11-10T12:00:00Z');
  assert.equal(result2.newExpiryTransactions.length, 0, 'Must prevent duplicate expiration records');
  assert.equal(result2.totalExpiredPoints, 0);
});

test('6. Order Cancellation reverses points correctly', () => {
  const customerId = 'CUST-333333';
  const customerPhone = '+9471333333';

  const txs: StarPointsTransaction[] = [
    {
      id: 'tx-ord-1',
      customerId,
      customerPhone,
      orderId: 'ord-101',
      orderNumber: 'FL-2026-000101',
      type: 'EARN',
      purchaseAmount: 4000,
      points: 20,
      cycle: '2026-2027',
      date: '2026-09-01T10:00:00Z',
      expiryDate: '2027-07-17T23:59:59+05:30',
      description: 'Earned 20 points on Order #FL-2026-000101',
      createdBy: 'System',
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'tx-rev-1',
      customerId,
      customerPhone,
      orderId: 'ord-101',
      orderNumber: 'FL-2026-000101',
      type: 'REVERSAL',
      purchaseAmount: 4000,
      points: -20,
      cycle: '2026-2027',
      date: '2026-09-02T10:00:00Z',
      expiryDate: '2027-07-17T23:59:59+05:30',
      description: 'Points reversed due to cancellation of Order #FL-2026-000101',
      createdBy: 'System',
      createdAt: '2026-09-02T10:00:00Z',
    },
  ];

  const summary = computeCustomerLoyaltySummary(customerId, customerPhone, 'Cancelled Customer', txs, '2026-11-10T12:00:00Z');
  assert.equal(summary.availablePoints, 0, 'Available points should be 0 after reversal');
  assert.equal(summary.currentCycleEarnedPoints, 0, 'Current cycle earned points should be 0 after reversal');
  assert.equal(summary.currentCyclePurchases, 0, 'Current cycle purchases should be 0 after reversal');
});
