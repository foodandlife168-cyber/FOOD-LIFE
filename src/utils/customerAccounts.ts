/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeSriLankanPhone, formatPhoneForDisplay } from './order.ts';
import type {
  Order,
  PaymentRecord,
  CustomerAccountLedger,
  CustomerStatementTransaction,
  CustomerAccountsDashboardStats,
  StarPointsTransaction,
} from '../types/index.ts';
import { computeCustomerLoyaltySummary } from './starPoints.ts';

export interface CustomerDirectPaymentRecord {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  receiptNumber?: string;
  note?: string;
  receivedBy?: string;
  createdAt?: string;
}

/**
 * Pure, authoritative financial calculation engine for Customer Accounts
 * Ensures 100% mathematical accuracy for:
 * 1. Total Ordered = Sum of all confirmed/completed/credit orders (excludes Cancelled)
 * 2. Total Paid = Sum of all verified payments received from customer
 * 3. Outstanding Balance = Total Ordered - Total Paid
 */
export function calculateAllCustomerAccounts(
  orders: Order[],
  directPayments: CustomerDirectPaymentRecord[] = [],
  starPointsLedger: StarPointsTransaction[] = []
): {
  stats: CustomerAccountsDashboardStats;
  accounts: CustomerAccountLedger[];
} {
  const customerMap = new Map<string, CustomerAccountLedger>();
  const processedOrderIds = new Set<string>();

  // 1. Process all qualifying customer orders
  for (const o of orders) {
    if (!o || !o.id) continue;
    // Prevent duplicate order calculations
    if (processedOrderIds.has(o.id)) continue;
    processedOrderIds.add(o.id);

    // Cancelled orders are strictly excluded from Total Ordered
    if (o.status === 'Cancelled') continue;

    const rawPhone = normalizeSriLankanPhone(o.customerPhone) || o.customerPhone;
    const customerId = `CUST-${rawPhone.slice(-6)}`;

    let entry = customerMap.get(rawPhone);
    if (!entry) {
      entry = {
        customerId,
        customerName: o.customerName || 'Valued Customer',
        customerPhone: formatPhoneForDisplay(o.customerPhone),
        rawPhone,
        deliveryArea: o.deliveryArea || 'Katuloya',
        deliveryAddress: o.deliveryAddress || '',
        totalOrders: 0,
        totalOrdered: 0,
        totalPurchases: 0,
        totalPaid: 0,
        paymentsReceived: 0,
        partialPaymentsCount: 0,
        outstandingBalance: 0,
        lastOrderDate: o.createdAt,
        lastPaymentDate: null,
        lastTransactionDate: o.createdAt,
        accountStatus: 'Good Standing',
        transactions: [],
        orders: [],
      };
      customerMap.set(rawPhone, entry);
    }

    // Accumulate Total Ordered
    const orderTotal = Number(o.total) || 0;
    entry.totalOrders++;
    entry.totalOrdered += orderTotal;
    entry.totalPurchases = entry.totalOrdered;

    // Track latest order date
    if (new Date(o.createdAt).getTime() >= new Date(entry.lastOrderDate).getTime()) {
      entry.lastOrderDate = o.createdAt;
      entry.lastTransactionDate = o.createdAt;
      if (o.customerName) entry.customerName = o.customerName;
      if (o.deliveryAddress) entry.deliveryAddress = o.deliveryAddress;
      if (o.deliveryArea) entry.deliveryArea = o.deliveryArea;
    }

    const orderPaid = Number(o.amountPaid) || 0;
    const orderBalance =
      o.outstandingBalance !== undefined
        ? Number(o.outstandingBalance)
        : Math.max(0, orderTotal - orderPaid);

    entry.orders?.push({
      id: o.id,
      orderNumber: o.orderNumber,
      total: orderTotal,
      amountPaid: orderPaid,
      outstandingBalance: orderBalance,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      status: o.status,
    });

    // Record ORDER transaction
    entry.transactions.push({
      id: `tx-ord-${o.id}`,
      referenceId: o.id,
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: o.createdAt,
      type: 'ORDER',
      orderAmount: orderTotal,
      amount: orderTotal,
      paymentMethod: o.paymentMethod || 'cash_on_delivery',
      transactionStatus: o.status === 'Delivered' ? 'COMPLETED' : 'CONFIRMED',
      status: o.status,
      description: `Order #${o.orderNumber} (${o.items?.length || 0} items)`,
      balanceAfter: 0, // sequential pass below
    });

    // Process Order-level payments
    const processedPaymentIds = new Set<string>();
    if (Array.isArray(o.payments)) {
      for (const p of o.payments) {
        if (!p || !p.amount || p.amount <= 0) continue;
        const pKey = p.id || `${o.id}-${p.amount}-${p.paymentDate}`;
        if (processedPaymentIds.has(pKey)) continue;
        processedPaymentIds.add(pKey);

        const pAmount = Number(p.amount) || 0;
        entry.totalPaid += pAmount;
        entry.paymentsReceived = entry.totalPaid;

        const pDate = p.paymentDate || o.createdAt;
        if (
          !entry.lastPaymentDate ||
          new Date(pDate).getTime() > new Date(entry.lastPaymentDate).getTime()
        ) {
          entry.lastPaymentDate = pDate;
        }

        entry.transactions.push({
          id: `tx-pay-${p.id || Date.now()}`,
          referenceId: p.id || o.id,
          orderId: o.id,
          paymentId: p.id,
          orderNumber: o.orderNumber,
          date: pDate,
          type: pAmount < orderTotal ? 'PARTIAL_PAYMENT' : 'PAYMENT',
          paymentAmount: pAmount,
          amount: pAmount,
          paymentMethod: p.paymentMethod || 'cash',
          receiptNumber: p.receiptNumber,
          transactionStatus: 'VERIFIED',
          status: 'VERIFIED',
          receivedBy: p.receivedBy || 'Staff',
          description: `Payment received via ${(p.paymentMethod || 'cash').toUpperCase()}${
            p.receiptNumber ? ` (Ref: ${p.receiptNumber})` : ''
          } for Order #${o.orderNumber}`,
          balanceAfter: 0,
        });
      }
    } else if (orderPaid > 0) {
      entry.totalPaid += orderPaid;
      entry.paymentsReceived = entry.totalPaid;
      if (
        !entry.lastPaymentDate ||
        new Date(o.createdAt).getTime() > new Date(entry.lastPaymentDate).getTime()
      ) {
        entry.lastPaymentDate = o.createdAt;
      }
      entry.transactions.push({
        id: `tx-pay-init-${o.id}`,
        referenceId: o.id,
        orderId: o.id,
        orderNumber: o.orderNumber,
        date: o.createdAt,
        type: orderPaid < orderTotal ? 'PARTIAL_PAYMENT' : 'PAYMENT',
        paymentAmount: orderPaid,
        amount: orderPaid,
        paymentMethod: o.paymentMethod || 'cash',
        transactionStatus: 'VERIFIED',
        status: 'VERIFIED',
        description: `Payment recorded for Order #${o.orderNumber}`,
        balanceAfter: 0,
      });
    }
  }

  // 2. Process Direct Customer Account Payments
  const processedDirectPaymentIds = new Set<string>();
  for (const cp of directPayments) {
    if (!cp || !cp.amount || cp.amount <= 0) continue;
    if (cp.id && processedDirectPaymentIds.has(cp.id)) continue;
    if (cp.id) processedDirectPaymentIds.add(cp.id);

    const rawPhone = normalizeSriLankanPhone(cp.customerPhone) || cp.customerPhone;
    let entry = customerMap.get(rawPhone);
    if (!entry) {
      const customerId = cp.customerId || `CUST-${rawPhone.slice(-6)}`;
      entry = {
        customerId,
        customerName: cp.customerName || 'Valued Customer',
        customerPhone: formatPhoneForDisplay(cp.customerPhone),
        rawPhone,
        deliveryArea: 'Katuloya',
        totalOrders: 0,
        totalOrdered: 0,
        totalPurchases: 0,
        totalPaid: 0,
        paymentsReceived: 0,
        partialPaymentsCount: 0,
        outstandingBalance: 0,
        lastOrderDate: cp.createdAt || cp.paymentDate,
        lastPaymentDate: cp.paymentDate,
        lastTransactionDate: cp.paymentDate,
        accountStatus: 'Good Standing',
        transactions: [],
        orders: [],
      };
      customerMap.set(rawPhone, entry);
    }

    const pAmount = Number(cp.amount) || 0;
    entry.totalPaid += pAmount;
    entry.paymentsReceived = entry.totalPaid;

    if (
      !entry.lastPaymentDate ||
      new Date(cp.paymentDate).getTime() > new Date(entry.lastPaymentDate).getTime()
    ) {
      entry.lastPaymentDate = cp.paymentDate;
    }

    entry.transactions.push({
      id: `tx-cp-${cp.id}`,
      referenceId: cp.id,
      paymentId: cp.id,
      date: cp.paymentDate,
      type: 'PAYMENT',
      paymentAmount: pAmount,
      amount: pAmount,
      paymentMethod: cp.paymentMethod || 'cash',
      receiptNumber: cp.receiptNumber,
      transactionStatus: 'VERIFIED',
      status: 'VERIFIED',
      receivedBy: cp.receivedBy || 'Staff',
      description: `Account payment received via ${(cp.paymentMethod || 'cash').toUpperCase()}${
        cp.receiptNumber ? ` (Receipt: ${cp.receiptNumber})` : ''
      }${cp.note ? ` - ${cp.note}` : ''}`,
      balanceAfter: 0,
    });
  }

  // 3. Finalize: Outstanding Balance = Total Ordered - Total Paid
  // and compute running chronological balanceAfter
  for (const entry of customerMap.values()) {
    entry.outstandingBalance = Math.max(0, entry.totalOrdered - entry.totalPaid);

    if (entry.outstandingBalance <= 0) {
      entry.accountStatus = 'Good Standing';
    } else {
      entry.accountStatus = 'Credit Active';
    }

    // Sort transactions chronologically
    entry.transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    for (const tx of entry.transactions) {
      if (tx.type === 'ORDER') {
        runningBalance += (tx.orderAmount || tx.amount || 0);
      } else {
        runningBalance = Math.max(0, runningBalance - (tx.paymentAmount || tx.amount || 0));
      }
      tx.balanceAfter = runningBalance;
    }

    // Attach Customer Loyalty Star Points Profile
    if (starPointsLedger && starPointsLedger.length > 0) {
      const loyalty = computeCustomerLoyaltySummary(
        entry.customerId,
        entry.rawPhone || entry.customerPhone || '',
        entry.customerName,
        starPointsLedger
      );
      entry.loyaltyProfile = loyalty;
      entry.starPointsBalance = loyalty.availablePoints;
    } else {
      entry.starPointsBalance = 0;
    }
  }

  const allAccounts = Array.from(customerMap.values()).sort(
    (a, b) =>
      b.outstandingBalance - a.outstandingBalance ||
      new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
  );

  // Summary Statistics
  // 1. Total Customer Credit: Sum of credit orders or total purchases on active credit accounts
  const totalCustomerCredit = allAccounts
    .filter((c) => c.outstandingBalance > 0)
    .reduce((sum, c) => sum + c.totalOrdered, 0);

  // 2. Total Outstanding Balance: Total amount currently owed by customers
  const totalOutstandingBalance = allAccounts.reduce((sum, c) => sum + c.outstandingBalance, 0);

  // 3. Total Payments Received: Total verified payments received
  const totalPaymentsReceived = allAccounts.reduce((sum, c) => sum + c.totalPaid, 0);

  // 4. Total Customer Orders: Sum of all qualifying confirmed orders
  const totalCustomerOrders = allAccounts.reduce((sum, c) => sum + c.totalOrders, 0);

  const stats: CustomerAccountsDashboardStats = {
    totalCustomerCredit,
    totalOutstandingBalance,
    totalPaymentsReceived,
    totalCustomerOrders,
  };

  return { stats, accounts: allAccounts };
}

/**
 * Distributes a customer payment FIFO across unpaid customer orders
 */
export function allocatePaymentToUnpaidOrders(
  customerOrders: Order[],
  paymentAmount: number,
  paymentDetails: {
    paymentMethod: string;
    paymentDate: string;
    receiptNumber?: string;
    receivedBy?: string;
    note?: string;
  }
): {
  allocatedOrders: Order[];
  unallocatedRemainder: number;
} {
  let remaining = paymentAmount;
  const allocatedOrders: Order[] = [];

  const eligibleOrders = customerOrders
    .filter(
      (o) =>
        o.status !== 'Cancelled' &&
        (o.outstandingBalance ?? Math.max(0, o.total - (o.amountPaid || 0))) > 0
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const ord of eligibleOrders) {
    if (remaining <= 0) break;
    const currentOutstanding =
      ord.outstandingBalance ?? Math.max(0, ord.total - (ord.amountPaid || 0));
    const alloc = Math.min(currentOutstanding, remaining);

    if (!ord.payments) ord.payments = [];
    ord.payments.push({
      id: `pay-ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderId: ord.id,
      amount: alloc,
      paymentMethod: paymentDetails.paymentMethod as any,
      paymentDate: paymentDetails.paymentDate,
      receiptNumber: paymentDetails.receiptNumber,
      note: paymentDetails.note,
      receivedBy: paymentDetails.receivedBy || 'Staff',
    });

    ord.amountPaid = (ord.amountPaid || 0) + alloc;
    ord.outstandingBalance = Math.max(0, ord.total - ord.amountPaid);
    ord.paymentStatus = ord.outstandingBalance <= 0 ? 'PAID' : 'PARTIALLY PAID';
    ord.updatedAt = new Date().toISOString();

    allocatedOrders.push(ord);
    remaining -= alloc;
  }

  return {
    allocatedOrders,
    unallocatedRemainder: remaining,
  };
}
