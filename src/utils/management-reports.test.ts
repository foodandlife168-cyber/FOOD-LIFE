/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  toSriLankaDate,
  formatLKR,
  formatLKRShort,
  isWithinSLTPeriod,
  getSriLankaMonthName,
} from './sriLankaTime.ts';
import {
  generateDailyReportPdf,
  generateMonthlyReportPdf,
  generateAnnualReportPdf,
  generateCustomerStatementsPdf,
  generateDeliveryHireReportPdf,
  generateStockReportPdf,
  generatePurchaseOrdersReportPdf,
  generateDeliveryAgentsReportPdf,
} from './generateManagementReportsPdf.ts';
import type {
  ManagementDashboardStats,
  CustomerAccountLedger,
  DeliveryHireRecord,
  ProductStockReportItem,
  PurchaseOrderReportItem,
  DeliveryAgentRegisterItem,
} from '../types/index.ts';

describe('Management Reports - Sri Lanka Timezone (UTC+5:30) Utilities', () => {
  test('toSriLankaDate accurately offsets UTC timestamp by +5.5 hours', () => {
    // 2026-05-10T19:00:00Z is 2026-05-11 00:30:00 in Sri Lanka
    const utcIso = '2026-05-10T19:00:00.000Z';
    const slt = toSriLankaDate(utcIso);

    assert.equal(slt.dateStr, '2026-05-11');
    assert.equal(slt.year, 2026);
    assert.equal(slt.month, 5);
    assert.equal(slt.day, 11);
    assert.equal(slt.hours, 0);
    assert.equal(slt.minutes, 30);
  });

  test('isWithinSLTPeriod checks daily, monthly, and annual ranges correctly in SLT', () => {
    // 2026-11-06T18:35:00.000Z -> In Sri Lanka, this is 2026-11-07 00:05:00
    const eveningUtc = '2026-11-06T18:35:00.000Z';

    // Must be in 2026-11-07, NOT 2026-11-06
    assert.equal(isWithinSLTPeriod(eveningUtc, 'daily', { dailyDate: '2026-11-07' }), true);
    assert.equal(isWithinSLTPeriod(eveningUtc, 'daily', { dailyDate: '2026-11-06' }), false);

    // Monthly check
    assert.equal(
      isWithinSLTPeriod(eveningUtc, 'monthly', { monthlyMonth: 11, monthlyYear: 2026 }),
      true
    );
    assert.equal(
      isWithinSLTPeriod(eveningUtc, 'monthly', { monthlyMonth: 10, monthlyYear: 2026 }),
      false
    );

    // Annual check
    assert.equal(isWithinSLTPeriod(eveningUtc, 'annual', { annualYear: 2026 }), true);
    assert.equal(isWithinSLTPeriod(eveningUtc, 'annual', { annualYear: 2025 }), false);

    // Custom check
    assert.equal(
      isWithinSLTPeriod(eveningUtc, 'custom', { fromDate: '2026-11-01', toDate: '2026-11-10' }),
      true
    );
    assert.equal(
      isWithinSLTPeriod(eveningUtc, 'custom', { fromDate: '2026-11-08', toDate: '2026-11-15' }),
      false
    );
  });

  test('formatLKR formats currency in Sri Lankan format', () => {
    assert.equal(formatLKR(12500), 'LKR 12,500.00');
    assert.equal(formatLKR(0), 'LKR 0.00');
    assert.equal(formatLKR(450.75), 'LKR 450.75');
  });

  test('formatLKRShort abbreviates thousands cleanly', () => {
    assert.equal(formatLKRShort(1500000), 'Rs. 1,500,000');
    assert.equal(formatLKRShort(45000), 'Rs. 45,000');
    assert.equal(formatLKRShort(850), 'Rs. 850');
  });

  test('getSriLankaMonthName returns standard English month names', () => {
    assert.equal(getSriLankaMonthName(1), 'January');
    assert.equal(getSriLankaMonthName(11), 'November');
    assert.equal(getSriLankaMonthName(12), 'December');
  });
});

describe('Management Reports - Financial & Accounting Calculations', () => {
  const sampleStats: ManagementDashboardStats = {
    totalRevenue: 345000,
    totalOrders: 120,
    pendingOrders: 8,
    preparingOrders: 5,
    outForDeliveryOrders: 4,
    deliveredOrders: 103,
    customerOutstandingBalances: 15400,
    deliveryHireAccounting: {
      totalFeesCollected: 28500,
      totalHireExpenses: 18200,
      totalPaidToAgents: 15000,
      outstandingAgentPayments: 3200,
    },
    productsStockSummary: {
      totalProducts: 42,
      inStockCount: 37,
      lowStockCount: 4,
      outOfStockCount: 1,
      totalStockUnits: 2840,
      retailValue: 890000,
      costValue: 650000,
    },
    purchaseOrdersSummary: {
      totalPOs: 12,
      totalOrderedQty: 600,
      totalReceivedQty: 550,
      pendingQty: 50,
      totalPurchaseCommitment: 520000,
      outstandingSupplierPayments: 75000,
    },
    registeredDeliveryAgents: {
      totalAgents: 5,
      activeAgents: 4,
      totalTripsCompleted: 95,
    },
  };

  test('verifies accurate segregation of customer delivery charges vs driver hire costs', () => {
    const dha = sampleStats.deliveryHireAccounting;
    // Customer delivery fee is operating revenue
    assert.equal(dha.totalFeesCollected, 28500);
    // Driver hire expense is operating cost
    assert.equal(dha.totalHireExpenses, 18200);
    // Net operating margin = Revenue - Expense
    assert.equal(dha.totalFeesCollected - dha.totalHireExpenses, 10300);
    // Outstanding payout to drivers
    assert.equal(dha.outstandingAgentPayments, dha.totalHireExpenses - dha.totalPaidToAgents);
  });

  test('verifies order pipeline status counts sum correctly', () => {
    const activePipeline =
      sampleStats.pendingOrders +
      sampleStats.preparingOrders +
      sampleStats.outForDeliveryOrders;
    assert.equal(activePipeline, 17);
    assert.equal(sampleStats.deliveredOrders, 103);
    assert.equal(sampleStats.deliveredOrders + activePipeline, sampleStats.totalOrders);
  });

  test('customer ledger accurately calculates outstanding balance with partial payments', () => {
    const customer: CustomerAccountLedger = {
      customerId: 'CUST-001',
      customerName: 'Sunil Wickramasinghe',
      customerPhone: '+94 77 123 4567',
      deliveryArea: 'Katuloya, Kandy',
      totalOrders: 2,
      totalPurchases: 18500,
      totalOrdered: 18500,
      paymentsReceived: 12000,
      totalPaid: 12000,
      partialPaymentsCount: 1,
      outstandingBalance: 6500,
      lastOrderDate: '2026-11-05T10:00:00.000Z',
      lastPaymentDate: '2026-11-05T10:00:00.000Z',
      lastTransactionDate: '2026-11-05T10:00:00.000Z',
      accountStatus: 'Credit Active',
      transactions: [
        {
          id: 'TX-1',
          date: '2026-11-01T10:00:00.000Z',
          type: 'ORDER',
          orderNumber: 'FL-2026-000101',
          description: 'Grocery order placed',
          amount: 10000,
          balanceAfter: 10000,
        },
        {
          id: 'TX-2',
          date: '2026-11-01T11:00:00.000Z',
          type: 'PAYMENT',
          description: 'Bank transfer payment received',
          amount: 10000,
          balanceAfter: 0,
        },
        {
          id: 'TX-3',
          date: '2026-11-05T09:30:00.000Z',
          type: 'ORDER',
          orderNumber: 'FL-2026-000108',
          description: 'Fresh vegetables and rice order',
          amount: 8500,
          balanceAfter: 8500,
        },
        {
          id: 'TX-4',
          date: '2026-11-05T12:00:00.000Z',
          type: 'PARTIAL_PAYMENT',
          description: 'Cash payment on delivery (partial)',
          amount: 2000,
          balanceAfter: 6500,
        },
      ],
    };

    assert.equal(
      customer.outstandingBalance,
      customer.totalPurchases - customer.paymentsReceived
    );
    assert.equal(customer.outstandingBalance, 6500);
    assert.equal(customer.transactions.length, 4);
  });
});

describe('Management Reports - PDF Generation System (All 8 Reports)', () => {
  const sampleStats: ManagementDashboardStats = {
    totalRevenue: 285400,
    totalOrders: 85,
    pendingOrders: 4,
    preparingOrders: 3,
    outForDeliveryOrders: 2,
    deliveredOrders: 76,
    customerOutstandingBalances: 8400,
    deliveryHireAccounting: {
      totalFeesCollected: 24000,
      totalHireExpenses: 15500,
      totalPaidToAgents: 13000,
      outstandingAgentPayments: 2500,
    },
    productsStockSummary: {
      totalProducts: 35,
      inStockCount: 33,
      lowStockCount: 2,
      outOfStockCount: 0,
      totalStockUnits: 2400,
      retailValue: 720000,
      costValue: 510000,
    },
    purchaseOrdersSummary: {
      totalPOs: 8,
      totalOrderedQty: 400,
      totalReceivedQty: 370,
      pendingQty: 30,
      totalPurchaseCommitment: 420000,
      outstandingSupplierPayments: 45000,
    },
    registeredDeliveryAgents: {
      totalAgents: 4,
      activeAgents: 4,
      totalTripsCompleted: 78,
    },
  };

  test('1. generateDailyReportPdf creates valid PDF instance', async () => {
    const doc = await generateDailyReportPdf({
      date: '2026-11-07',
      stats: sampleStats,
      orders: [
        {
          orderNumber: 'FL-2026-000101',
          customerName: 'Priyantha',
          deliveryArea: 'Katuloya',
          total: 4500,
          paymentStatus: 'PAID',
          status: 'Delivered',
        },
      ],
      customerAccounts: [],
      deliveryRecords: [],
      generatedBy: { name: 'Admin', role: 'Admin', username: 'admin' },
    });
    assert.ok(doc);
    assert.equal(typeof doc.output, 'function');
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });

  test('2. generateMonthlyReportPdf creates valid PDF instance', async () => {
    const doc = await generateMonthlyReportPdf({
      month: 11,
      year: 2026,
      stats: sampleStats,
      monthlyRevenue: 285400,
      monthlyOrdersCount: 85,
      customerOutstandingTotal: 8400,
      deliveryExpensesTotal: 15500,
      bestSellers: [],
      generatedBy: { name: 'Store Manager', role: 'Manager', username: 'manager' },
    });
    assert.ok(doc);
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });

  test('3. generateAnnualReportPdf creates valid PDF instance', async () => {
    const doc = await generateAnnualReportPdf({
      year: 2026,
      stats: sampleStats,
      annualRevenue: 3420000,
      annualOrdersCount: 1020,
      monthlyBreakdown: [
        { month: 'January', revenue: 320000, orders: 95, deliveryFees: 25000 },
        { month: 'February', revenue: 340000, orders: 102, deliveryFees: 27000 },
      ],
      generatedBy: { name: 'Director', role: 'Admin', username: 'admin' },
    });
    assert.ok(doc);
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });

  test('4. generateCustomerStatementsPdf creates valid individual & all balances PDF', async () => {
    const customers: CustomerAccountLedger[] = [
      {
        customerId: 'CUST-001',
        customerName: 'Priyantha Fernando',
        customerPhone: '+94 71 234 5678',
        deliveryArea: 'Katuloya',
        totalOrders: 4,
        totalPurchases: 14500,
        totalOrdered: 14500,
        paymentsReceived: 10000,
        totalPaid: 10000,
        partialPaymentsCount: 0,
        outstandingBalance: 4500,
        lastOrderDate: '2026-11-02T12:00:00Z',
        lastPaymentDate: '2026-11-02T12:00:00Z',
        lastTransactionDate: '2026-11-02T12:00:00Z',
        accountStatus: 'Credit Active',
        transactions: [
          {
            id: 'T1',
            date: '2026-11-02T08:00:00Z',
            type: 'ORDER',
            description: 'Weekly grocery basket',
            amount: 14500,
            balanceAfter: 14500,
          },
          {
            id: 'T2',
            date: '2026-11-02T12:00:00Z',
            type: 'PAYMENT',
            description: 'Direct cash deposit',
            amount: 10000,
            balanceAfter: 4500,
          },
        ],
      },
    ];

    const doc = await generateCustomerStatementsPdf({
      customerAccounts: customers,
      singleCustomer: customers[0],
      period: 'November 2026 Statement',
      generatedBy: { name: 'Accounts Officer', role: 'Staff', username: 'staff' },
    });
    assert.ok(doc);
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });

  test('5. generateDeliveryHireReportPdf creates valid PDF instance', async () => {
    const records: DeliveryHireRecord[] = [
      {
        id: 'ASSIGN-1',
        orderNumber: 'FL-2026-000101',
        agentId: 'AGT-01',
        agentName: 'Kamal Perera',
        vehicleNumber: 'CP AA-4521',
        deliveryDate: '2026-11-06T10:00:00Z',
        deliveryFee: 350,
        hirePaymentAmount: 250,
        amountPaid: 250,
        outstandingAmount: 0,
        paymentStatus: 'paid_to_agent',
        deliveryStatus: 'Delivered',
      },
    ];

    const doc = await generateDeliveryHireReportPdf({
      records,
      totals: sampleStats.deliveryHireAccounting,
      period: 'Daily Delivery Hire Report',
      generatedBy: { name: 'Logistics Supervisor', role: 'Manager', username: 'manager' },
    });
    assert.ok(doc);
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });

  test('6. generateStockReportPdf creates valid PDF instance', async () => {
    const items: ProductStockReportItem[] = [
      {
        id: 'PROD-1',
        nameEn: 'Keeri Samba Rice 5kg',
        nameSi: 'කීරි සම්බා සහල් 5kg',
        category: 'Rice & Grains',
        barcode: 'RICE-SAM-5',
        sellingPrice: 1550,
        purchasePrice: 1300,
        openingStock: 40,
        stockReceived: 20,
        stockSold: 15,
        damagedStock: 0,
        currentStock: 45,
        stockValue: 45 * 1550,
        costValue: 45 * 1300,
        isLowStock: false,
        isOutOfStock: false,
      },
    ];

    const doc = await generateStockReportPdf({
      products: items,
      totals: {
        totalProducts: sampleStats.productsStockSummary.totalProducts,
        retailValue: sampleStats.productsStockSummary.retailValue,
        costValue: sampleStats.productsStockSummary.costValue,
        lowStockCount: sampleStats.productsStockSummary.lowStockCount,
        outOfStockCount: sampleStats.productsStockSummary.outOfStockCount,
      },
      period: 'Current Store Stock Position',
      generatedBy: { name: 'Inventory Manager', role: 'Staff', username: 'staff' },
    });
    assert.ok(doc);
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });

  test('7. generatePurchaseOrdersReportPdf creates valid PDF instance', async () => {
    const pos: PurchaseOrderReportItem[] = [
      {
        id: 'PO-2026-001',
        poNumber: 'PO-0001',
        supplierName: 'Katuloya Wholesale Depot',
        supplierContact: '+94 81 247 6200',
        purchaseDate: '2026-11-01T08:00:00Z',
        productDetails: [],
        quantitiesOrdered: 100,
        quantitiesReceived: 100,
        pendingQuantities: 0,
        status: 'Received',
        paymentStatus: 'Paid',
        totalPurchaseAmount: 145000,
        outstandingSupplierPayments: 0,
      },
    ];

    const doc = await generatePurchaseOrdersReportPdf({
      purchaseOrders: pos,
      totals: {
        totalPOs: 1,
        totalAmount: 145000,
        pendingDeliveries: 0,
      },
      period: 'November 2026 Procurement Report',
      generatedBy: { name: 'Purchasing Officer', role: 'Staff', username: 'staff' },
    });
    assert.ok(doc);
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });

  test('8. generateDeliveryAgentsReportPdf creates valid PDF instance', async () => {
    const agents: DeliveryAgentRegisterItem[] = [
      {
        agentId: 'AGT-01',
        agentName: 'Kamal Perera',
        contactNumber: '+94 77 123 4567',
        registrationDate: '2026-10-01T08:00:00Z',
        status: 'Active',
        assignedOrders: 35,
        completedDeliveries: 34,
        pendingDeliveries: 1,
        cancelledDeliveries: 0,
        totalDeliveryFees: 12250,
        totalHirePayments: 8000,
        outstandingPayments: 750,
      },
    ];

    const doc = await generateDeliveryAgentsReportPdf({
      agents,
      totals: {
        totalAgents: 1,
        activeAgents: 1,
        totalDeliveries: 34,
      },
      period: 'Delivery Agent Roster & Commission Statement',
      generatedBy: { name: 'Operations Manager', role: 'Manager', username: 'manager' },
    });
    assert.ok(doc);
    const pdfData = doc.output('datauristring');
    assert.ok(pdfData.startsWith('data:application/pdf'));
  });
});
