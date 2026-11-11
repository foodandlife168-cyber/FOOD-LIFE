/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAnnualCustomerRankings,
  generateAnnualClosingSummary,
  getDefaultRewardPreset,
} from './annualRewards.ts';
import type { CustomerAccountLedger, StarPointsTransaction, AnnualRewardRecord } from '../types/index.ts';

const mockAccounts: CustomerAccountLedger[] = [
  {
    customerId: 'CUST-000001',
    customerName: 'Kamal Perera',
    customerPhone: '+94 71 111 1111',
    rawPhone: '+94711111111',
    deliveryArea: 'Katuloya',
    totalOrders: 5,
    totalOrdered: 25000,
    totalPurchases: 25000,
    totalPaid: 25000,
    paymentsReceived: 25000,
    partialPaymentsCount: 0,
    outstandingBalance: 0,
    lastOrderDate: '2026-09-01T10:00:00Z',
    lastPaymentDate: '2026-09-01T10:00:00Z',
    lastTransactionDate: '2026-09-01T10:00:00Z',
    accountStatus: 'Good Standing',
    transactions: [],
    orders: [],
  },
  {
    customerId: 'CUST-000002',
    customerName: 'Sunil Silva',
    customerPhone: '+94 77 222 2222',
    rawPhone: '+94772222222',
    deliveryArea: 'Babaralla',
    totalOrders: 3,
    totalOrdered: 10000,
    totalPurchases: 10000,
    totalPaid: 10000,
    paymentsReceived: 10000,
    partialPaymentsCount: 0,
    outstandingBalance: 0,
    lastOrderDate: '2026-09-02T10:00:00Z',
    lastPaymentDate: '2026-09-02T10:00:00Z',
    lastTransactionDate: '2026-09-02T10:00:00Z',
    accountStatus: 'Good Standing',
    transactions: [],
    orders: [],
  },
  {
    customerId: 'CUST-000003',
    customerName: 'Nimal Fernando',
    customerPhone: '+94 78 333 3333',
    rawPhone: '+94783333333',
    deliveryArea: 'Thawalanthanne',
    totalOrders: 4,
    totalOrdered: 25000,
    totalPurchases: 25000,
    totalPaid: 25000,
    paymentsReceived: 25000,
    partialPaymentsCount: 0,
    outstandingBalance: 0,
    lastOrderDate: '2026-09-03T10:00:00Z',
    lastPaymentDate: '2026-09-03T10:00:00Z',
    lastTransactionDate: '2026-09-03T10:00:00Z',
    accountStatus: 'Good Standing',
    transactions: [],
    orders: [],
  },
];

const mockStarPoints: StarPointsTransaction[] = [
  // Kamal: 125 points earned (Rs. 25,000)
  {
    id: 'sptx-1',
    customerId: 'CUST-000001',
    customerPhone: '+94711111111',
    type: 'EARN',
    purchaseAmount: 25000,
    points: 125,
    cycle: '2026-2027',
    date: '2026-09-01T10:00:00Z',
    expiryDate: '2027-07-17T23:59:59+05:30',
    description: 'Order completion',
    createdBy: 'System',
    createdAt: '2026-09-01T10:00:00Z',
  },
  // Sunil: 50 points earned (Rs. 10,000)
  {
    id: 'sptx-2',
    customerId: 'CUST-000002',
    customerPhone: '+94772222222',
    type: 'EARN',
    purchaseAmount: 10000,
    points: 50,
    cycle: '2026-2027',
    date: '2026-09-02T10:00:00Z',
    expiryDate: '2027-07-17T23:59:59+05:30',
    description: 'Order completion',
    createdBy: 'System',
    createdAt: '2026-09-02T10:00:00Z',
  },
  // Nimal: 75 points earned (Rs. 15,000)
  {
    id: 'sptx-3',
    customerId: 'CUST-000003',
    customerPhone: '+94783333333',
    type: 'EARN',
    purchaseAmount: 15000,
    points: 75,
    cycle: '2026-2027',
    date: '2026-09-03T10:00:00Z',
    expiryDate: '2027-07-17T23:59:59+05:30',
    description: 'Order completion',
    createdBy: 'System',
    createdAt: '2026-09-03T10:00:00Z',
  },
];

test('1. generateAnnualCustomerRankings correctly assigns rank by annual points earned', () => {
  const rankings = generateAnnualCustomerRankings(mockAccounts, mockStarPoints, [], '2026-2027');

  assert.equal(rankings.length, 3);
  // Rank 1: Kamal (125 pts)
  assert.equal(rankings[0].customerId, 'CUST-000001');
  assert.equal(rankings[0].rank, 1);
  assert.equal(rankings[0].annualPointsEarned, 125);

  // Rank 2: Nimal (75 pts)
  assert.equal(rankings[1].customerId, 'CUST-000003');
  assert.equal(rankings[1].rank, 2);
  assert.equal(rankings[1].annualPointsEarned, 75);

  // Rank 3: Sunil (50 pts)
  assert.equal(rankings[2].customerId, 'CUST-000002');
  assert.equal(rankings[2].rank, 3);
  assert.equal(rankings[2].annualPointsEarned, 50);
});

test('2. Order reversals update rankings accordingly', () => {
  // If Kamal has an order reversal of 60 points
  const pointsWithReversal: StarPointsTransaction[] = [
    ...mockStarPoints,
    {
      id: 'sptx-rev-1',
      customerId: 'CUST-000001',
      customerPhone: '+94711111111',
      type: 'REVERSAL',
      purchaseAmount: 12000,
      points: -60,
      cycle: '2026-2027',
      date: '2026-09-05T10:00:00Z',
      expiryDate: '2027-07-17T23:59:59+05:30',
      description: 'Order cancellation reversal',
      createdBy: 'System',
      createdAt: '2026-09-05T10:00:00Z',
    },
  ];

  const rankings = generateAnnualCustomerRankings(mockAccounts, pointsWithReversal, [], '2026-2027');

  // Kamal now has 125 - 60 = 65 points.
  // Rank 1: Nimal (75 pts)
  // Rank 2: Kamal (65 pts)
  // Rank 3: Sunil (50 pts)
  assert.equal(rankings[0].customerId, 'CUST-000003');
  assert.equal(rankings[0].rank, 1);
  assert.equal(rankings[0].annualPointsEarned, 75);

  assert.equal(rankings[1].customerId, 'CUST-000001');
  assert.equal(rankings[1].rank, 2);
  assert.equal(rankings[1].annualPointsEarned, 65);
});

test('3. Annual Closing Summary calculates totals and preserves approved rewards', () => {
  const approvedReward: AnnualRewardRecord = {
    id: 'rew-test-01',
    cycle: '2026-2027',
    customerId: 'CUST-000001',
    customerName: 'Kamal Perera',
    customerPhone: '+94711111111',
    annualPointsEarned: 125,
    annualPurchases: 25000,
    rewardType: 'gift_hamper',
    rewardTitle: 'Premium Grocery Gift Hamper',
    rewardDescription: 'Exclusive Food & Life hamper',
    rewardValue: 5000,
    quantity: 1,
    status: 'Approved',
    approvedBy: 'Admin',
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
  };

  const summary = generateAnnualClosingSummary(
    mockAccounts,
    mockStarPoints,
    [approvedReward],
    '2026-2027'
  );

  assert.equal(summary.totalRegisteredCustomers, 3);
  assert.equal(summary.totalEligiblePurchases, 50000);
  assert.equal(summary.totalStarPointsIssued, 250);
  assert.equal(summary.totalApprovedRewards, 1);
  assert.equal(summary.totalRewardsValue, 5000);
});

test('4. Reward presets return valid descriptions and estimated values', () => {
  const hamper = getDefaultRewardPreset('gift_hamper');
  assert.equal(hamper.title, 'Premium Grocery Gift Hamper');
  assert.equal(hamper.estimatedValue, 5000);

  const voucher = getDefaultRewardPreset('discount_voucher');
  assert.equal(voucher.title, 'Rs. 1,500 Storewide Discount Voucher');
  assert.equal(voucher.estimatedValue, 1500);
});
