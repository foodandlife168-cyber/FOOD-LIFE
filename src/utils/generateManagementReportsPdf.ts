/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { formatLKR, toSriLankaDate } from './sriLankaTime.ts';
import type {
  ManagementDashboardStats,
  CustomerAccountLedger,
  DeliveryHireRecord,
  ProductStockReportItem,
  PurchaseOrderReportItem,
  DeliveryAgentRegisterItem,
} from '../types/index.ts';

/**
 * Loads image as DataURL for embedding into jsPDF
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface CommonReportMeta {
  title: string;
  subtitle?: string;
  period: string;
  generatedBy?: {
    name: string;
    role: string;
    username: string;
  };
}

const BUSINESS_DETAILS = {
  name: 'FOOD & LIFE',
  parentCompany: 'RG GROUP (PVT) LTD',
  branch: 'Katuloya Branch',
  address: '929, Kandy Road, Cross Wattegama, Katuloya, Thawalanthanne',
  whatsapp: '+94712595683',
  hotline: '+94 71 259 5683',
  currency: 'LKR',
};

// Brand Colors
const ORANGE_BRAND = [234, 88, 12]; // #ea580c
const EMERALD_BRAND = [6, 95, 70]; // #065f46
const SLATE_DARK = [15, 23, 42]; // #0f172a
const SLATE_MUTED = [100, 116, 139]; // #64748b
const SLATE_BG = [248, 250, 252]; // #f8fafc
const BORDER_COLOR = [226, 232, 240]; // #e2e8f0

/**
 * Renders standard official Food & Life header on any page
 */
function renderReportHeader(
  doc: jsPDF,
  meta: CommonReportMeta,
  logoDataUrl: string | null,
  currentY: number,
  pageWidth: number,
  margin: number
): number {
  // Top Orange Accent Bar
  doc.setFillColor(ORANGE_BRAND[0], ORANGE_BRAND[1], ORANGE_BRAND[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  let y = currentY;

  // Logo
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', margin, y, 22, 22);
    } catch {
      // Ignore
    }
  }

  const leftTextX = logoDataUrl ? margin + 26 : margin;

  // Business Name & Parent Company
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
  doc.text(BUSINESS_DETAILS.name, leftTextX, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(ORANGE_BRAND[0], ORANGE_BRAND[1], ORANGE_BRAND[2]);
  doc.text(`${BUSINESS_DETAILS.parentCompany} • ${BUSINESS_DETAILS.branch}`, leftTextX, y + 9.5);

  doc.setFontSize(7.5);
  doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
  doc.text(BUSINESS_DETAILS.address, leftTextX, y + 14);
  doc.text(`WhatsApp: ${BUSINESS_DETAILS.whatsapp}  |  Official Business Ledger`, leftTextX, y + 18);

  // Right Box: Report Metadata
  const boxWidth = 65;
  const boxX = pageWidth - margin - boxWidth;
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(boxX, y, boxWidth, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
  doc.text(meta.title, boxX + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
  doc.text(`Period: ${meta.period}`, boxX + 4, y + 10.5);

  const genDate = toSriLankaDate().formatted;
  doc.text(`Generated: ${toSriLankaDate().displayDate} ${toSriLankaDate().timeStr}`, boxX + 4, y + 14.5);

  if (meta.generatedBy) {
    doc.text(`Auth: ${meta.generatedBy.name} (${meta.generatedBy.role})`, boxX + 4, y + 18.5);
  }

  y += 27;

  // Thin separator line
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  return y + 6;
}

/**
 * Adds page numbering and confidentiality footer
 */
function addFooters(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);

    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.text(
      `FOOD & LIFE GROCERY - ${BUSINESS_DETAILS.parentCompany} - STRICTLY CONFIDENTIAL`,
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }
}

/**
 * 1. DAILY REPORT PDF
 */
export async function generateDailyReportPdf(params: {
  date: string;
  stats: ManagementDashboardStats;
  orders: any[];
  customerAccounts: CustomerAccountLedger[];
  deliveryRecords: DeliveryHireRecord[];
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  let y = renderReportHeader(
    doc,
    {
      title: 'DAILY PERFORMANCE REPORT',
      period: params.date,
      generatedBy: params.generatedBy,
    },
    logoDataUrl,
    10,
    pageWidth,
    margin
  );

  // Financial summary grid (4 boxes)
  const boxW = (pageWidth - margin * 2 - 9) / 4;
  const drawStatBox = (x: number, title: string, value: string, sub: string, color: number[]) => {
    doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.roundedRect(x, y, boxW, 17, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
    doc.text(title.toUpperCase(), x + 3, y + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(value, x + 3, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
    doc.text(sub, x + 3, y + 14.5);
  };

  drawStatBox(margin, 'Daily Revenue', formatLKR(params.stats.totalRevenue), `${params.stats.totalOrders} total orders`, EMERALD_BRAND);
  drawStatBox(margin + boxW + 3, 'Delivered Orders', String(params.stats.deliveredOrders), 'Completed deliveries', EMERALD_BRAND);
  drawStatBox(margin + (boxW + 3) * 2, 'Customer Balance', formatLKR(params.stats.customerOutstandingBalances), 'Unpaid credit owed', ORANGE_BRAND);
  drawStatBox(margin + (boxW + 3) * 3, 'Driver Hire Cost', formatLKR(params.stats.deliveryHireAccounting.totalHireExpenses), `Paid: ${formatLKR(params.stats.deliveryHireAccounting.totalPaidToAgents)}`, SLATE_DARK);

  y += 23;

  // Section: Order Status Distribution
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
  doc.text('1. Daily Orders & Status Breakdown', margin, y);
  y += 4;

  // Table Header
  const colWidths = [28, 40, 26, 26, 32, 30];
  const colX = [
    margin,
    margin + colWidths[0],
    margin + colWidths[0] + colWidths[1],
    margin + colWidths[0] + colWidths[1] + colWidths[2],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4],
  ];

  doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Order Ref', colX[0] + 2, y + 4.5);
  doc.text('Customer', colX[1] + 2, y + 4.5);
  doc.text('Area', colX[2] + 2, y + 4.5);
  doc.text('Total (LKR)', colX[3] + 2, y + 4.5);
  doc.text('Payment Status', colX[4] + 2, y + 4.5);
  doc.text('Delivery Status', colX[5] + 2, y + 4.5);

  y += 6.5;

  // Rows
  const dailyOrders = params.orders.slice(0, 20); // Top 20 for single page or paginated
  dailyOrders.forEach((ord, idx) => {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 15;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
      doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(ord.orderNumber || 'N/A', colX[0] + 2, y + 3.8);
    doc.text(String(ord.customerName || 'Customer').slice(0, 22), colX[1] + 2, y + 3.8);
    doc.text(String(ord.deliveryArea || 'Katuloya').slice(0, 14), colX[2] + 2, y + 3.8);
    doc.text(Number(ord.total || 0).toLocaleString(), colX[3] + 2, y + 3.8);
    doc.text(String(ord.paymentStatus || 'UNPAID'), colX[4] + 2, y + 3.8);
    doc.text(String(ord.status || 'Received'), colX[5] + 2, y + 3.8);

    y += 5.5;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}

/**
 * 2. MONTHLY REPORT PDF
 */
export async function generateMonthlyReportPdf(params: {
  month: number;
  year: number;
  stats: ManagementDashboardStats;
  monthlyRevenue: number;
  monthlyOrdersCount: number;
  customerOutstandingTotal: number;
  deliveryExpensesTotal: number;
  bestSellers: ProductStockReportItem[];
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthLabel = `${monthNames[params.month - 1]} ${params.year}`;

  let y = renderReportHeader(
    doc,
    {
      title: 'MONTHLY BUSINESS REPORT',
      period: monthLabel,
      generatedBy: params.generatedBy,
    },
    logoDataUrl,
    10,
    pageWidth,
    margin
  );

  // Financial Cards
  const cardW = (pageWidth - margin * 2 - 9) / 4;
  const drawCard = (x: number, title: string, value: string, sub: string, col: number[]) => {
    doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.roundedRect(x, y, cardW, 18, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
    doc.text(title.toUpperCase(), x + 3, y + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(col[0], col[1], col[2]);
    doc.text(value, x + 3, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
    doc.text(sub, x + 3, y + 15);
  };

  drawCard(margin, 'Monthly Revenue', formatLKR(params.monthlyRevenue), `${params.monthlyOrdersCount} orders placed`, EMERALD_BRAND);
  drawCard(margin + cardW + 3, 'Customer Balance', formatLKR(params.customerOutstandingTotal), 'Total pending credit', ORANGE_BRAND);
  drawCard(margin + (cardW + 3) * 2, 'Delivery Hire Exp.', formatLKR(params.deliveryExpensesTotal), 'Expenses to drivers', SLATE_DARK);
  drawCard(margin + (cardW + 3) * 3, 'Inventory Value', formatLKR(params.stats.productsStockSummary.retailValue), `${params.stats.productsStockSummary.totalProducts} active items`, EMERALD_BRAND);

  y += 24;

  // Best Selling Products Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
  doc.text('Monthly Top-Selling Products & Inventory Performance', margin, y);
  y += 4;

  doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Product Name', margin + 3, y + 4.5);
  doc.text('Category', margin + 65, y + 4.5);
  doc.text('Price (LKR)', margin + 110, y + 4.5);
  doc.text('Units Sold', margin + 140, y + 4.5);
  doc.text('Current Stock', margin + 165, y + 4.5);

  y += 6.5;

  params.bestSellers.slice(0, 15).forEach((p, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
      doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(p.nameEn.slice(0, 35), margin + 3, y + 4);
    doc.text(p.category.slice(0, 24), margin + 65, y + 4);
    doc.text(Number(p.sellingPrice).toLocaleString(), margin + 110, y + 4);
    doc.text(String(p.stockSold), margin + 140, y + 4);
    doc.text(String(p.currentStock), margin + 165, y + 4);
    y += 6;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}

/**
 * 3. ANNUAL REPORT PDF
 */
export async function generateAnnualReportPdf(params: {
  year: number;
  stats: ManagementDashboardStats;
  annualRevenue: number;
  annualOrdersCount: number;
  monthlyBreakdown: { month: string; revenue: number; orders: number; deliveryFees: number }[];
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  let y = renderReportHeader(
    doc,
    {
      title: 'ANNUAL PERFORMANCE REPORT',
      period: `Year ${params.year}`,
      generatedBy: params.generatedBy,
    },
    logoDataUrl,
    10,
    pageWidth,
    margin
  );

  // Annual Totals
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
  doc.text('ANNUAL REVENUE & ORDERS OVERVIEW', margin + 5, y + 5);

  doc.setFontSize(14);
  doc.setTextColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.text(formatLKR(params.annualRevenue), margin + 5, y + 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
  doc.text(`Total Orders: ${params.annualOrdersCount}  |  Outstanding Customer Debt: ${formatLKR(params.stats.customerOutstandingBalances)}`, margin + 5, y + 19);

  y += 28;

  // Monthly Comparison Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
  doc.text('Monthly Comparison Breakdown (12 Months)', margin, y);
  y += 4;

  doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Month', margin + 4, y + 4.5);
  doc.text('Orders Placed', margin + 50, y + 4.5);
  doc.text('Revenue (LKR)', margin + 95, y + 4.5);
  doc.text('Delivery Fees (LKR)', margin + 145, y + 4.5);

  y += 6.5;

  params.monthlyBreakdown.forEach((m, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
      doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(m.month, margin + 4, y + 4.2);
    doc.text(String(m.orders), margin + 50, y + 4.2);
    doc.text(Number(m.revenue).toLocaleString(), margin + 95, y + 4.2);
    doc.text(Number(m.deliveryFees).toLocaleString(), margin + 145, y + 4.2);
    y += 6;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}

/**
 * 4. CUSTOMER STATEMENTS & BALANCES PDF
 */
export async function generateCustomerStatementsPdf(params: {
  customerAccounts: CustomerAccountLedger[];
  singleCustomer?: CustomerAccountLedger;
  period?: string;
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  if (params.singleCustomer) {
    // Individual Customer Statement
    const cust = params.singleCustomer;
    let y = renderReportHeader(
      doc,
      {
        title: 'CUSTOMER STATEMENT',
        period: params.period || 'Full History',
        generatedBy: params.generatedBy,
      },
      logoDataUrl,
      10,
      pageWidth,
      margin
    );

    // Customer Detail Card
    doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(cust.customerName, margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
    doc.text(`Phone: ${cust.customerPhone}  |  Customer ID: ${cust.customerId}  |  Area: ${cust.deliveryArea}`, margin + 4, y + 11);
    doc.text(`Total Purchases: ${formatLKR(cust.totalPurchases)}  |  Total Paid: ${formatLKR(cust.paymentsReceived)}`, margin + 4, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cust.outstandingBalance > 0 ? ORANGE_BRAND[0] : EMERALD_BRAND[0], cust.outstandingBalance > 0 ? ORANGE_BRAND[1] : EMERALD_BRAND[1], cust.outstandingBalance > 0 ? ORANGE_BRAND[2] : EMERALD_BRAND[2]);
    doc.text(`Outstanding Balance: ${formatLKR(cust.outstandingBalance)}`, pageWidth - margin - 60, y + 16);

    y += 28;

    // Detailed Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text('Detailed Transaction Ledger', margin, y);
    y += 4;

    doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
    doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Date', margin + 3, y + 4.5);
    doc.text('Description', margin + 30, y + 4.5);
    doc.text('Ref #', margin + 90, y + 4.5);
    doc.text('Amount (LKR)', margin + 125, y + 4.5);
    doc.text('Balance After (LKR)', margin + 155, y + 4.5);

    y += 6.5;

    cust.transactions.forEach((tx, idx) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 15;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
        doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
      doc.text(tx.date.slice(0, 10), margin + 3, y + 3.8);
      doc.text(tx.description.slice(0, 35), margin + 30, y + 3.8);
      doc.text(tx.orderNumber || tx.receiptNumber || '-', margin + 90, y + 3.8);
      doc.text(Number(tx.amount).toLocaleString(), margin + 125, y + 3.8);
      doc.text(Number(tx.balanceAfter).toLocaleString(), margin + 155, y + 3.8);
      y += 5.5;
    });
  } else {
    // All Customers Balance Ledger
    let y = renderReportHeader(
      doc,
      {
        title: 'CUSTOMER BALANCES & LEDGER REPORT',
        period: params.period || 'All Customers',
        generatedBy: params.generatedBy,
      },
      logoDataUrl,
      10,
      pageWidth,
      margin
    );

    doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
    doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Customer Name', margin + 3, y + 4.5);
    doc.text('Contact', margin + 50, y + 4.5);
    doc.text('Area', margin + 80, y + 4.5);
    doc.text('Purchases (LKR)', margin + 110, y + 4.5);
    doc.text('Paid (LKR)', margin + 140, y + 4.5);
    doc.text('Balance (LKR)', margin + 165, y + 4.5);

    y += 6.5;

    params.customerAccounts.forEach((c, idx) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 15;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
        doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
      doc.text(c.customerName.slice(0, 24), margin + 3, y + 3.8);
      doc.text(c.customerPhone, margin + 50, y + 3.8);
      doc.text(c.deliveryArea.slice(0, 14), margin + 80, y + 3.8);
      doc.text(Number(c.totalPurchases).toLocaleString(), margin + 110, y + 3.8);
      doc.text(Number(c.paymentsReceived).toLocaleString(), margin + 140, y + 3.8);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(c.outstandingBalance > 0 ? ORANGE_BRAND[0] : EMERALD_BRAND[0], c.outstandingBalance > 0 ? ORANGE_BRAND[1] : EMERALD_BRAND[1], c.outstandingBalance > 0 ? ORANGE_BRAND[2] : EMERALD_BRAND[2]);
      doc.text(Number(c.outstandingBalance).toLocaleString(), margin + 165, y + 3.8);

      y += 5.5;
    });
  }

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}

/**
 * 5. DELIVERY HIRE REPORT PDF
 */
export async function generateDeliveryHireReportPdf(params: {
  records: DeliveryHireRecord[];
  totals: {
    totalFeesCollected: number;
    totalHireExpenses: number;
    totalPaidToAgents: number;
    outstandingAgentPayments: number;
  };
  period: string;
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  let y = renderReportHeader(
    doc,
    {
      title: 'DELIVERY HIRE ACCOUNTING REPORT',
      period: params.period,
      generatedBy: params.generatedBy,
    },
    logoDataUrl,
    10,
    pageWidth,
    margin
  );

  // Separation Summary Card
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'FD');

  const cardW = (pageWidth - margin * 2) / 4;
  const colStat = (x: number, title: string, val: string, col: number[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
    doc.text(title.toUpperCase(), x + 4, y + 6);

    doc.setFontSize(9.5);
    doc.setTextColor(col[0], col[1], col[2]);
    doc.text(val, x + 4, y + 13);
  };

  colStat(margin, 'Delivery Fee Revenue', formatLKR(params.totals.totalFeesCollected), EMERALD_BRAND);
  colStat(margin + cardW, 'Hire Cost (Expense)', formatLKR(params.totals.totalHireExpenses), SLATE_DARK);
  colStat(margin + cardW * 2, 'Paid to Drivers', formatLKR(params.totals.totalPaidToAgents), EMERALD_BRAND);
  colStat(margin + cardW * 3, 'Pending Driver Payout', formatLKR(params.totals.outstandingAgentPayments), ORANGE_BRAND);

  y += 26;

  // Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
  doc.text('Individual Delivery Trip & Hire Records', margin, y);
  y += 4;

  doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Order Ref', margin + 3, y + 4.5);
  doc.text('Delivery Agent', margin + 30, y + 4.5);
  doc.text('Delivery Date', margin + 75, y + 4.5);
  doc.text('Customer Fee', margin + 110, y + 4.5);
  doc.text('Hire Expense', margin + 138, y + 4.5);
  doc.text('Payment Status', margin + 165, y + 4.5);

  y += 6.5;

  params.records.forEach((r, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
      doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(String(r.orderNumber || 'N/A'), margin + 3, y + 3.8);
    doc.text(String(r.agentName || 'Agent').slice(0, 24), margin + 30, y + 3.8);
    doc.text(String(r.deliveryDate || 'N/A').slice(0, 10), margin + 75, y + 3.8);
    doc.text(Number(r.deliveryFee || 0).toLocaleString(), margin + 110, y + 3.8);
    doc.text(Number(r.hirePaymentAmount || 0).toLocaleString(), margin + 138, y + 3.8);
    doc.text(r.paymentStatus === 'paid_to_agent' ? 'Paid to Driver' : 'Pending', margin + 165, y + 3.8);
    y += 5.5;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}

/**
 * 6. STOCK & INVENTORY REPORT PDF
 */
export async function generateStockReportPdf(params: {
  products: ProductStockReportItem[];
  totals: {
    totalProducts: number;
    retailValue: number;
    costValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  period: string;
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  let y = renderReportHeader(
    doc,
    {
      title: 'PRODUCTS & STOCK VALUATION REPORT',
      period: params.period,
      generatedBy: params.generatedBy,
    },
    logoDataUrl,
    10,
    pageWidth,
    margin
  );

  // Stats
  doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 1.5, 1.5, 'FD');

  const cardW = (pageWidth - margin * 2) / 4;
  const showStat = (x: number, title: string, val: string, col: number[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(SLATE_MUTED[0], SLATE_MUTED[1], SLATE_MUTED[2]);
    doc.text(title.toUpperCase(), x + 4, y + 5);

    doc.setFontSize(9);
    doc.setTextColor(col[0], col[1], col[2]);
    doc.text(val, x + 4, y + 12);
  };

  showStat(margin, 'Total Products', String(params.totals.totalProducts), SLATE_DARK);
  showStat(margin + cardW, 'Retail Stock Value', formatLKR(params.totals.retailValue), EMERALD_BRAND);
  showStat(margin + cardW * 2, 'Cost Valuation', formatLKR(params.totals.costValue), SLATE_DARK);
  showStat(margin + cardW * 3, 'Low / Out of Stock', `${params.totals.lowStockCount} Low / ${params.totals.outOfStockCount} Out`, ORANGE_BRAND);

  y += 24;

  // Table
  doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Product Name', margin + 3, y + 4.5);
  doc.text('Category', margin + 65, y + 4.5);
  doc.text('Selling (LKR)', margin + 110, y + 4.5);
  doc.text('Current Qty', margin + 138, y + 4.5);
  doc.text('Stock Value (LKR)', margin + 160, y + 4.5);

  y += 6.5;

  params.products.forEach((p, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
      doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(String(p.nameEn || 'Item').slice(0, 36), margin + 3, y + 3.8);
    doc.text(String(p.category || 'General').slice(0, 24), margin + 65, y + 3.8);
    doc.text(Number(p.sellingPrice || 0).toLocaleString(), margin + 110, y + 3.8);
    doc.text(String(p.currentStock ?? 0), margin + 138, y + 3.8);
    doc.text(Number(p.stockValue || 0).toLocaleString(), margin + 160, y + 3.8);
    y += 5.5;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}

/**
 * 7. PURCHASE ORDERS REPORT PDF
 */
export async function generatePurchaseOrdersReportPdf(params: {
  purchaseOrders: PurchaseOrderReportItem[];
  totals: {
    totalPOs: number;
    totalAmount: number;
    pendingDeliveries: number;
  };
  period: string;
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  let y = renderReportHeader(
    doc,
    {
      title: 'PURCHASE ORDERS & SUPPLIER LEDGER',
      period: params.period,
      generatedBy: params.generatedBy,
    },
    logoDataUrl,
    10,
    pageWidth,
    margin
  );

  doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PO Number', margin + 3, y + 4.5);
  doc.text('Supplier Name', margin + 35, y + 4.5);
  doc.text('Date', margin + 85, y + 4.5);
  doc.text('Ordered', margin + 115, y + 4.5);
  doc.text('Received', margin + 135, y + 4.5);
  doc.text('PO Status', margin + 155, y + 4.5);

  y += 6.5;

  params.purchaseOrders.forEach((po, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
      doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(po.poNumber, margin + 3, y + 3.8);
    doc.text(po.supplierName.slice(0, 28), margin + 35, y + 3.8);
    doc.text(po.purchaseDate.slice(0, 10), margin + 85, y + 3.8);
    doc.text(String(po.quantitiesOrdered), margin + 115, y + 3.8);
    doc.text(String(po.quantitiesReceived), margin + 135, y + 3.8);
    doc.text(po.status, margin + 155, y + 3.8);
    y += 5.5;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}

/**
 * 8. DELIVERY AGENTS REGISTER REPORT PDF
 */
export async function generateDeliveryAgentsReportPdf(params: {
  agents: DeliveryAgentRegisterItem[];
  totals: {
    totalAgents: number;
    activeAgents: number;
    totalDeliveries: number;
  };
  period: string;
  generatedBy?: any;
}): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');

  let y = renderReportHeader(
    doc,
    {
      title: 'DELIVERY AGENTS REGISTER & PERFORMANCE',
      period: params.period,
      generatedBy: params.generatedBy,
    },
    logoDataUrl,
    10,
    pageWidth,
    margin
  );

  doc.setFillColor(EMERALD_BRAND[0], EMERALD_BRAND[1], EMERALD_BRAND[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Agent Name', margin + 3, y + 4.5);
  doc.text('Contact', margin + 45, y + 4.5);
  doc.text('Status', margin + 75, y + 4.5);
  doc.text('Trips', margin + 100, y + 4.5);
  doc.text('Hire Total (LKR)', margin + 125, y + 4.5);
  doc.text('Pending Payout', margin + 160, y + 4.5);

  y += 6.5;

  params.agents.forEach((a, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
    if (idx % 2 === 1) {
      doc.setFillColor(SLATE_BG[0], SLATE_BG[1], SLATE_BG[2]);
      doc.rect(margin, y, pageWidth - margin * 2, 5.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_DARK[0], SLATE_DARK[1], SLATE_DARK[2]);
    doc.text(a.agentName.slice(0, 25), margin + 3, y + 3.8);
    doc.text(a.contactNumber, margin + 45, y + 3.8);
    doc.text(a.status, margin + 75, y + 3.8);
    doc.text(`${a.completedDeliveries} / ${a.assignedOrders}`, margin + 100, y + 3.8);
    doc.text(Number(a.totalHirePayments).toLocaleString(), margin + 125, y + 3.8);
    doc.text(Number(a.outstandingPayments).toLocaleString(), margin + 160, y + 3.8);
    y += 5.5;
  });

  addFooters(doc, pageWidth, pageHeight, margin);
  return doc;
}
