/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAllCustomerAccounts,
  allocatePaymentToUnpaidOrders,
} from './customerAccounts.ts';
import type { Order } from '../types/index.ts';

test('Automatic Customer Account Management - Core Requirements', async (t) => {
  await t.test('1. Calculates Total Ordered, Total Paid, and Outstanding Balance accurately', () => {
    const orders: any[] = [
      {
        id: 'ord-001',
        orderNumber: 'FL-2026-000101',
        trackingToken: 'tok-001',
        customerName: 'Test Customer',
        customerPhone: '071 259 5683',
        deliveryArea: 'Katuloya',
        deliveryAddress: '929 Kandy Road',
        items: [],
        subtotal: 25000,
        discountTotal: 0,
        deliveryCharge: 0,
        total: 25000,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'PARTIALLY PAID',
        status: 'Order Confirmed',
        statusHistory: [],
        createdAt: '2026-11-01T08:00:00Z',
        updatedAt: '2026-11-01T08:00:00Z',
        amountPaid: 10000,
        outstandingBalance: 15000,
        payments: [
          {
            id: 'pay-001',
            orderId: 'ord-001',
            amount: 10000,
            paymentMethod: 'bank_transfer',
            paymentDate: '2026-11-02T10:00:00Z',
            receivedBy: 'Admin',
          },
        ],
      },
    ];

    const { stats, accounts } = calculateAllCustomerAccounts(orders);
    assert.equal(accounts.length, 1);
    const customer = accounts[0];

    assert.equal(customer.customerName, 'Test Customer');
    assert.equal(customer.totalOrdered, 25000);
    assert.equal(customer.totalPaid, 10000);
    assert.equal(customer.outstandingBalance, 15000);
    assert.equal(customer.accountStatus, 'Credit Active');
    assert.equal(customer.lastOrderDate, '2026-11-01T08:00:00Z');
    assert.equal(customer.lastPaymentDate, '2026-11-02T10:00:00Z');
  });

  await t.test('2. Validation Test: Updating with another payment of Rs. 5,000', () => {
    // Initial State: Total Ordered Rs. 25,000, Total Paid Rs. 10,000, Balance Rs. 15,000
    const order: any = {
      id: 'ord-001',
      orderNumber: 'FL-2026-000101',
      trackingToken: 'tok-001',
      customerName: 'Test Customer',
      customerPhone: '071 259 5683',
      deliveryArea: 'Katuloya',
      deliveryAddress: '929 Kandy Road',
      items: [],
      subtotal: 25000,
      discountTotal: 0,
      deliveryCharge: 0,
      total: 25000,
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'PARTIALLY PAID',
      status: 'Order Confirmed',
      statusHistory: [],
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T08:00:00Z',
      amountPaid: 10000,
      outstandingBalance: 15000,
      payments: [
        {
          id: 'pay-001',
          orderId: 'ord-001',
          amount: 10000,
          paymentMethod: 'bank_transfer',
          paymentDate: '2026-11-02T10:00:00Z',
        },
      ],
    };

    // Before second payment
    const state1 = calculateAllCustomerAccounts([order]);
    assert.equal(state1.accounts[0].totalOrdered, 25000);
    assert.equal(state1.accounts[0].totalPaid, 10000);
    assert.equal(state1.accounts[0].outstandingBalance, 15000);

    // After recording another payment of Rs. 5,000
    const directPayments = [
      {
        id: 'pay-002',
        customerId: state1.accounts[0].customerId,
        customerPhone: '071 259 5683',
        amount: 5000,
        paymentMethod: 'cash',
        paymentDate: '2026-11-03T14:30:00Z',
        receiptNumber: 'RCP-5001',
        receivedBy: 'Cashier',
      },
    ];

    const state2 = calculateAllCustomerAccounts([order], directPayments);
    const updatedCustomer = state2.accounts[0];

    // EXACT VALIDATION TEST ASSERTIONS
    assert.equal(updatedCustomer.totalOrdered, 25000);
    assert.equal(updatedCustomer.totalPaid, 15000);
    assert.equal(updatedCustomer.outstandingBalance, 10000);
    assert.equal(updatedCustomer.lastPaymentDate, '2026-11-03T14:30:00Z');
  });

  await t.test('3. Excludes cancelled orders from Total Ordered', () => {
    const orders: any[] = [
      {
        id: 'ord-ok',
        orderNumber: 'FL-2026-000101',
        trackingToken: 'tok-ok',
        customerName: 'Customer A',
        customerPhone: '071 111 2222',
        deliveryArea: 'Katuloya',
        deliveryAddress: 'Main St',
        items: [],
        subtotal: 8000,
        discountTotal: 0,
        deliveryCharge: 0,
        total: 8000,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'UNPAID',
        status: 'Delivered',
        statusHistory: [],
        createdAt: '2026-11-01T08:00:00Z',
        updatedAt: '2026-11-01T08:00:00Z',
        amountPaid: 8000,
        outstandingBalance: 0,
        payments: [{ id: 'p1', orderId: 'ord-ok', amount: 8000, paymentMethod: 'cash', paymentDate: '2026-11-01T08:30:00Z' }],
      },
      {
        id: 'ord-cancelled',
        orderNumber: 'FL-2026-000102',
        trackingToken: 'tok-canc',
        customerName: 'Customer A',
        customerPhone: '071 111 2222',
        deliveryArea: 'Katuloya',
        deliveryAddress: 'Main St',
        items: [],
        subtotal: 12000,
        discountTotal: 0,
        deliveryCharge: 0,
        total: 12000,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'UNPAID',
        status: 'Cancelled',
        statusHistory: [],
        createdAt: '2026-11-02T08:00:00Z',
        updatedAt: '2026-11-02T08:00:00Z',
      },
    ];

    const { accounts } = calculateAllCustomerAccounts(orders);
    assert.equal(accounts.length, 1);
    const cust = accounts[0];
    // Cancelled order of Rs. 12,000 must NOT be counted
    assert.equal(cust.totalOrdered, 8000);
    assert.equal(cust.totalPaid, 8000);
    assert.equal(cust.outstandingBalance, 0);
    assert.equal(cust.accountStatus, 'Good Standing');
  });

  await t.test('4. Prevents duplicate order calculations and duplicate payments', () => {
    const order: any = {
      id: 'ord-dup',
      orderNumber: 'FL-2026-000103',
      trackingToken: 'tok-dup',
      customerName: 'Customer B',
      customerPhone: '077 333 4444',
      deliveryArea: 'Katuloya',
      deliveryAddress: 'Station Road',
      items: [],
      subtotal: 5000,
      discountTotal: 0,
      deliveryCharge: 0,
      total: 5000,
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'PAID',
      status: 'Order Confirmed',
      statusHistory: [],
      createdAt: '2026-11-01T08:00:00Z',
      updatedAt: '2026-11-01T08:00:00Z',
      amountPaid: 5000,
      payments: [
        { id: 'p-uniq', orderId: 'ord-dup', amount: 5000, paymentMethod: 'cash', paymentDate: '2026-11-01T09:00:00Z' },
        { id: 'p-uniq', orderId: 'ord-dup', amount: 5000, paymentMethod: 'cash', paymentDate: '2026-11-01T09:00:00Z' }, // duplicate ID
      ],
    };

    // Duplicate order reference passed twice in array
    const { accounts } = calculateAllCustomerAccounts([order, order]);
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].totalOrders, 1);
    assert.equal(accounts[0].totalOrdered, 5000);
    assert.equal(accounts[0].totalPaid, 5000); // duplicate payment ignored
    assert.equal(accounts[0].outstandingBalance, 0);
  });

  await t.test('5. Computes chronological transaction ledger with running balance', () => {
    const orders: any[] = [
      {
        id: 'ord-seq-1',
        orderNumber: 'FL-2026-000104',
        trackingToken: 'tok-1',
        customerName: 'Ledger Customer',
        customerPhone: '077 555 6666',
        deliveryArea: 'Katuloya',
        deliveryAddress: 'Hill View',
        items: [{ productId: 'p1', nameEn: 'Rice', nameSi: '', price: 10000, quantity: 1, total: 10000 }],
        subtotal: 10000,
        discountTotal: 0,
        deliveryCharge: 0,
        total: 10000,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'PARTIALLY PAID',
        status: 'Delivered',
        statusHistory: [],
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
        payments: [
          { id: 'pay-1', orderId: 'ord-seq-1', amount: 4000, paymentMethod: 'cash', paymentDate: '2026-11-01T11:00:00Z' },
        ],
      },
      {
        id: 'ord-seq-2',
        orderNumber: 'FL-2026-000105',
        trackingToken: 'tok-2',
        customerName: 'Ledger Customer',
        customerPhone: '077 555 6666',
        deliveryArea: 'Katuloya',
        deliveryAddress: 'Hill View',
        items: [{ productId: 'p2', nameEn: 'Spices', nameSi: '', price: 5000, quantity: 1, total: 5000 }],
        subtotal: 5000,
        discountTotal: 0,
        deliveryCharge: 0,
        total: 5000,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'UNPAID',
        status: 'Order Confirmed',
        statusHistory: [],
        createdAt: '2026-11-02T10:00:00Z',
        updatedAt: '2026-11-02T10:00:00Z',
        payments: [],
      },
    ];

    const { accounts } = calculateAllCustomerAccounts(orders);
    const cust = accounts[0];

    assert.equal(cust.totalOrdered, 15000);
    assert.equal(cust.totalPaid, 4000);
    assert.equal(cust.outstandingBalance, 11000);

    // 3 transactions: Order 1 (+10,000 -> 10,000), Payment 1 (-4,000 -> 6,000), Order 2 (+5,000 -> 11,000)
    assert.equal(cust.transactions.length, 3);
    assert.equal(cust.transactions[0].type, 'ORDER');
    assert.equal(cust.transactions[0].balanceAfter, 10000);

    assert.equal(cust.transactions[1].type, 'PARTIAL_PAYMENT');
    assert.equal(cust.transactions[1].balanceAfter, 6000);

    assert.equal(cust.transactions[2].type, 'ORDER');
    assert.equal(cust.transactions[2].balanceAfter, 11000);
  });

  await t.test('6. allocatePaymentToUnpaidOrders distributes payment FIFO', () => {
    const orders: any[] = [
      {
        id: 'o1',
        orderNumber: 'FL-001',
        trackingToken: 't1',
        customerName: 'Alice',
        customerPhone: '071 999 8888',
        deliveryArea: 'Katuloya',
        deliveryAddress: 'A',
        items: [],
        subtotal: 6000,
        discountTotal: 0,
        deliveryCharge: 0,
        total: 6000,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'UNPAID',
        status: 'Order Confirmed',
        statusHistory: [],
        createdAt: '2026-11-01T09:00:00Z',
        updatedAt: '2026-11-01T09:00:00Z',
        amountPaid: 0,
        outstandingBalance: 6000,
        payments: [],
      },
      {
        id: 'o2',
        orderNumber: 'FL-002',
        trackingToken: 't2',
        customerName: 'Alice',
        customerPhone: '071 999 8888',
        deliveryArea: 'Katuloya',
        deliveryAddress: 'A',
        items: [],
        subtotal: 4000,
        discountTotal: 0,
        deliveryCharge: 0,
        total: 4000,
        paymentMethod: 'cash_on_delivery',
        paymentStatus: 'UNPAID',
        status: 'Order Confirmed',
        statusHistory: [],
        createdAt: '2026-11-02T09:00:00Z',
        updatedAt: '2026-11-02T09:00:00Z',
        amountPaid: 0,
        outstandingBalance: 4000,
        payments: [],
      },
    ];

    // Customer makes payment of Rs. 8,000 (covers Order 1 fully and Order 2 partially)
    const { allocatedOrders, unallocatedRemainder } = allocatePaymentToUnpaidOrders(
      orders,
      8000,
      {
        paymentMethod: 'bank_transfer',
        paymentDate: '2026-11-03T10:00:00Z',
        receiptNumber: 'RCP-8000',
        receivedBy: 'Admin',
      }
    );

    assert.equal(unallocatedRemainder, 0);
    assert.equal(allocatedOrders.length, 2);

    // Order 1 was 6,000 -> fully paid
    assert.equal(orders[0].amountPaid, 6000);
    assert.equal(orders[0].outstandingBalance, 0);
    assert.equal(orders[0].paymentStatus, 'PAID');

    // Order 2 was 4,000 -> 2,000 paid, 2,000 outstanding
    assert.equal(orders[1].amountPaid, 2000);
    assert.equal(orders[1].outstandingBalance, 2000);
    assert.equal(orders[1].paymentStatus, 'PARTIALLY PAID');
  });
});
