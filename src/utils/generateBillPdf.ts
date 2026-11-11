/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { formatPhoneForDisplay } from './order.ts';
import type { DeliveryAssignment, PaymentRecord } from '../types/index.ts';

export interface BillOrderItem {
  nameEn: string;
  nameSi?: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  effectivePrice?: number;
  discountPercent?: number;
  lineTotal: number;
}

export interface BillOrder {
  orderNumber: string;
  trackingToken?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryArea?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryType?: 'delivery' | 'pickup';
  items: BillOrderItem[];
  subtotal: number;
  discountTotal: number;
  deliveryCharge: number;
  deliveryHireCharge?: number;
  total: number;
  amountPaid?: number;
  outstandingBalance?: number;
  payments?: PaymentRecord[];
  deliveryAgent?: DeliveryAssignment;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: string;
}

/**
 * Loads an image from URL and returns a base64 data URL for embedding into jsPDF
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
  } catch (err) {
    console.error('Failed to load image for PDF:', err);
    return null;
  }
}

/**
 * Generates an attractive, professional PDF Bill & Official Receipt for Food & Life Grocery
 */
export async function generateBillPdf(order: BillOrder, options?: { autoDownload?: boolean }): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const emeraldPrimary = [6, 95, 70]; // #065f46
  const emeraldDark = [4, 78, 57]; // #044e39
  const emeraldLight = [236, 253, 245]; // #ecfdf5
  const slateDark = [15, 23, 42]; // #0f172a
  const slateMuted = [100, 116, 139]; // #64748b
  const slateBorder = [226, 232, 240]; // #e2e8f0
  const amberAccent = [217, 119, 6]; // #d97706

  // 1. Top Decorative Header Banner
  doc.setFillColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');

  let currentY = 14;

  // 2. Try to embed Store Logo
  const logoDataUrl = await loadImageAsDataUrl('/logo.jpg');
  if (logoDataUrl) {
    try {
      // 22mm x 22mm circular-looking logo
      doc.addImage(logoDataUrl, 'JPEG', margin, currentY, 22, 22);
    } catch {
      // If addImage fails, continue with text branding
    }
  }

  // Store Information (Header text)
  const headerLeft = logoDataUrl ? margin + 26 : margin;
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FOOD & LIFE GROCERY', headerLeft, currentY + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(amberAccent[0], amberAccent[1], amberAccent[2]);
  doc.text('Everything For Your Choices', headerLeft, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne', headerLeft, currentY + 14);
  doc.text('Delivery: Katuloya • Thawalanthanne • Babaralla • Goomaraya • Thunisgala', headerLeft, currentY + 18);
  doc.text('WhatsApp Hotline: +94 71 259 5683  |  Email: foodandlife168@gmail.com', headerLeft, currentY + 22);

  // Right Header: INVOICE / RECEIPT Title Box
  const invoiceBoxX = 140;
  const invoiceBoxWidth = pageWidth - margin - invoiceBoxX;

  doc.setFillColor(emeraldLight[0], emeraldLight[1], emeraldLight[2]);
  doc.setDrawColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(invoiceBoxX, currentY, invoiceBoxWidth, 23, 2, 2, 'FD');

  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('OFFICIAL BILL / RECEIPT', invoiceBoxX + invoiceBoxWidth / 2, currentY + 5.5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Order Ref:', invoiceBoxX + 4, currentY + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(order.orderNumber, invoiceBoxX + invoiceBoxWidth - 4, currentY + 10.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Date:', invoiceBoxX + 4, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(formattedDate, invoiceBoxX + invoiceBoxWidth - 4, currentY + 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Status:', invoiceBoxX + 4, currentY + 19.5);
  doc.setFont('helvetica', 'bold');
  if (order.status === 'Delivered') {
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text('DELIVERED', invoiceBoxX + invoiceBoxWidth - 4, currentY + 19.5, { align: 'right' });
  } else {
    doc.setTextColor(amberAccent[0], amberAccent[1], amberAccent[2]);
    doc.text(order.status.toUpperCase(), invoiceBoxX + invoiceBoxWidth - 4, currentY + 19.5, { align: 'right' });
  }

  currentY += 30;

  // Divider line
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 5;

  // 3. Customer & Delivery Info Section (2 Column Box)
  const colWidth = (contentWidth - 6) / 2;

  // Customer Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.roundedRect(margin, currentY, colWidth, 24, 2, 2, 'FD');

  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('BILLED TO (CUSTOMER):', margin + 4, currentY + 5.5);

  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(order.customerName || 'Valued Customer', margin + 4, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Phone: ${order.customerPhone ? formatPhoneForDisplay(order.customerPhone) : 'Direct Customer'}`, margin + 4, currentY + 15);
  doc.text(`Payment: ${order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery (COD)' : 'Bank Transfer'} (${order.paymentStatus.toUpperCase()})`, margin + 4, currentY + 19.5);

  // Delivery Box
  const col2X = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, currentY, colWidth, 24, 2, 2, 'FD');

  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DELIVERY DESTINATION:', col2X + 4, currentY + 5.5);

  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Area: ${order.deliveryArea || 'Katuloya'} (${order.deliveryType === 'delivery' ? 'Home Delivery' : 'In-Store Pickup'})`, col2X + 4, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  const addressText = doc.splitTextToSize(order.deliveryAddress || 'Store Pickup at Katuloya', colWidth - 8);
  doc.text(addressText, col2X + 4, currentY + 15);
  if (order.deliveryLandmark) {
    doc.text(`Landmark: ${order.deliveryLandmark}`, col2X + 4, currentY + 20);
  }

  currentY += 28;

  // PART 11: Dedicated DELIVERY INFORMATION section ONLY IF delivery agent is assigned
  if (order.deliveryAgent) {
    const da = order.deliveryAgent;
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DELIVERY INFORMATION (ASSIGNED AGENT):', margin + 4, currentY + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`Agent: ${da.agentName}`, margin + 4, currentY + 10);
    doc.text(`Vehicle No: ${da.vehicleRegistrationNumber}`, margin + 65, currentY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`Phone: ${formatPhoneForDisplay(da.mobilePhone)}`, margin + 4, currentY + 14.5);
    doc.text(`WhatsApp: ${formatPhoneForDisplay(da.whatsappNumber)}`, margin + 65, currentY + 14.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text(`Delivery Hire Charge: LKR ${da.hireCharge.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 4, currentY + 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`Status: ${da.deliveryStatus.toUpperCase()}`, pageWidth - margin - 4, currentY + 14.5, { align: 'right' });

    currentY += 22;
  }

  // 4. Items Table
  // Table Header
  doc.setFillColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.roundedRect(margin, currentY, contentWidth, 7, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  // Column Positions
  const cNum = margin + 3;
  const cItem = margin + 12;
  const cUnit = margin + 85;
  const cQty = margin + 110;
  const cPrice = margin + 130;
  const cDisc = margin + 155;
  const cTotal = margin + contentWidth - 4;

  doc.text('#', cNum, currentY + 4.8);
  doc.text('ITEM DESCRIPTION', cItem, currentY + 4.8);
  doc.text('UNIT', cUnit, currentY + 4.8);
  doc.text('QTY', cQty, currentY + 4.8, { align: 'center' });
  doc.text('PRICE (LKR)', cPrice, currentY + 4.8, { align: 'right' });
  doc.text('DISCOUNT', cDisc, currentY + 4.8, { align: 'right' });
  doc.text('TOTAL (LKR)', cTotal, currentY + 4.8, { align: 'right' });

  currentY += 8;

  // Table Body Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  order.items.forEach((item, index) => {
    // Alternating background
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, 6.5, 'F');
    }

    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(String(index + 1), cNum, currentY + 4.5);

    // Item name
    const itemName = item.nameEn || 'Grocery Item';
    const truncatedName = itemName.length > 38 ? itemName.substring(0, 36) + '...' : itemName;
    doc.setFont('helvetica', 'bold');
    doc.text(truncatedName, cItem, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(item.unit || '1 unit', cUnit, currentY + 4.5);
    doc.text(String(item.quantity), cQty, currentY + 4.5, { align: 'center' });
    const itemPrice = item.unitPrice ?? item.effectivePrice ?? 0;
    doc.text(itemPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }), cPrice, currentY + 4.5, { align: 'right' });

    const discPercent = item.discountPercent ?? 0;
    if (discPercent > 0) {
      doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
      doc.text(`-${discPercent}%`, cDisc, currentY + 4.5, { align: 'right' });
    } else {
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text('-', cDisc, currentY + 4.5, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), cTotal, currentY + 4.5, { align: 'right' });

    currentY += 6.5;

    // Check if we need page overflow handling
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 15;
    }
  });

  // Table bottom border
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY + 1, pageWidth - margin, currentY + 1);

  currentY += 5;

  // 5. Summary Section (Right Aligned)
  const summaryWidth = 75;
  const summaryX = pageWidth - margin - summaryWidth;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Subtotal:', summaryX, currentY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`LKR ${order.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });

  currentY += 5.5;

  // Discount
  if (order.discountTotal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text('Discount Savings:', summaryX, currentY + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`- LKR ${order.discountTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });
    currentY += 5.5;
  }

  // Delivery Fee
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  const deliveryLabel = order.deliveryType === 'delivery'
    ? `Delivery (${order.deliveryArea || 'Katuloya'}):`
    : 'Store Pickup:';
  doc.text(deliveryLabel, summaryX, currentY + 4);
  doc.setFont('helvetica', 'bold');
  if (order.deliveryCharge === 0) {
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text('FREE', pageWidth - margin - 2, currentY + 4, { align: 'right' });
  } else {
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`LKR ${order.deliveryCharge.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });
  }

  currentY += 5;

  // Delivery Agent Hire Charge (if assigned)
  const hireChargeVal = order.deliveryHireCharge ?? order.deliveryAgent?.hireCharge ?? 0;
  if (order.deliveryAgent && hireChargeVal > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text('Delivery Hire Charge:', summaryX, currentY + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`LKR ${hireChargeVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });
    currentY += 5;
  }

  // Grand Total Box
  doc.setFillColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.roundedRect(summaryX - 3, currentY, summaryWidth + 3, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('INVOICE TOTAL:', summaryX, currentY + 6);
  doc.text(`LKR ${order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, currentY + 6, { align: 'right' });
  currentY += 12;

  // Payment Breakdown: Amount Paid & Outstanding Balance
  const amountPaidVal = order.amountPaid || 0;
  const outstandingBal = order.outstandingBalance ?? Math.max(0, order.total - amountPaidVal);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Total Amount Paid:', summaryX, currentY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text(`LKR ${amountPaidVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(outstandingBal > 0 ? 185 : emeraldDark[0], outstandingBal > 0 ? 28 : emeraldDark[1], outstandingBal > 0 ? 28 : emeraldDark[2]);
  doc.text('OUTSTANDING BALANCE:', summaryX, currentY + 4);
  doc.text(`LKR ${outstandingBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });
  currentY += 5;

  const paymentStatusDisplay = (order.paymentStatus || (outstandingBal <= 0 ? 'PAID' : amountPaidVal > 0 ? 'PARTIALLY PAID' : 'UNPAID')).toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Payment Status:', summaryX, currentY + 4);
  doc.setTextColor(
    paymentStatusDisplay === 'PAID' ? emeraldDark[0] : paymentStatusDisplay === 'PARTIALLY PAID' ? amberAccent[0] : 185,
    paymentStatusDisplay === 'PAID' ? emeraldDark[1] : paymentStatusDisplay === 'PARTIALLY PAID' ? amberAccent[1] : 28,
    paymentStatusDisplay === 'PAID' ? emeraldDark[2] : paymentStatusDisplay === 'PARTIALLY PAID' ? amberAccent[2] : 28
  );
  doc.text(paymentStatusDisplay, pageWidth - margin - 2, currentY + 4, { align: 'right' });

  // 6. Left side of Summary: Official Seal / Stamp & Payment Badge
  const sealX = margin + 5;
  const sealY = currentY - 26;

  doc.setDrawColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(sealX, sealY, 70, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text('★ FOOD & LIFE GROCERY ★', sealX + 35, sealY + 5.5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(amberAccent[0], amberAccent[1], amberAccent[2]);
  doc.text('OFFICIAL VERIFIED RECEIPT', sealX + 35, sealY + 10, { align: 'center' });

  doc.setFontSize(6.8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Order #${order.orderNumber} • ${paymentStatusDisplay}`, sealX + 35, sealY + 14.5, { align: 'center' });
  doc.text("People's Bank Panwila • A/C 211200380039804", sealX + 35, sealY + 18.5, { align: 'center' });
  doc.text('THANK YOU FOR YOUR VALUED ORDER!', sealX + 35, sealY + 22.5, { align: 'center' });

  currentY += 10;

  // PART 6: Payment Installments Table if payments exist
  if (order.payments && order.payments.length > 0) {
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text('PAYMENT HISTORY & INSTALLMENTS RECEIVED', margin, currentY);
    currentY += 3;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 5.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text('#', margin + 3, currentY + 3.8);
    doc.text('DATE', margin + 12, currentY + 3.8);
    doc.text('METHOD', margin + 45, currentY + 3.8);
    doc.text('RECEIVED BY / NOTE', margin + 85, currentY + 3.8);
    doc.text('AMOUNT PAID (LKR)', pageWidth - margin - 3, currentY + 3.8, { align: 'right' });
    currentY += 5.5;

    order.payments.forEach((p, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(String(idx + 1), margin + 3, currentY + 4);
      const pDate = new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.text(pDate, margin + 12, currentY + 4);
      doc.text(p.paymentMethod.toUpperCase(), margin + 45, currentY + 4);
      doc.text(p.note || p.receivedBy || 'Staff Received', margin + 85, currentY + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), pageWidth - margin - 3, currentY + 4, { align: 'right' });
      currentY += 5;
    });

    doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 4;
  }

  // 7. Footer Notice & Hotline
  const footerY = pageHeight - 16;
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(
    'Food & Life Grocery, 929 Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne. Hotline: +94 71 259 5683',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    'This is a computer-generated official bill & receipt. Retain for warranty and delivery confirmation.',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  // Auto download if requested
  if (options?.autoDownload !== false) {
    doc.save(`FOOD_LIFE_BILL_${order.orderNumber}.pdf`);
  }

  return doc;
}

/**
 * Generates formatted WhatsApp text bill message for 1-click sharing to customer
 */
export function buildWhatsAppBillText(order: BillOrder, publicBaseUrl: string): string {
  const itemsText = order.items
    .map((item, idx) => {
      const name = item.nameEn;
      return `${idx + 1}. ${name} (${item.unit}) × ${item.quantity} = LKR ${item.lineTotal.toLocaleString()}`;
    })
    .join('\n');

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const billUrl = order.trackingToken ? `${publicBaseUrl}/track/${order.trackingToken}` : publicBaseUrl;
  const amountPaidVal = order.amountPaid || 0;
  const outstandingBal = order.outstandingBalance ?? Math.max(0, order.total - amountPaidVal);
  const statusDisplay = (order.paymentStatus || (outstandingBal <= 0 ? 'PAID' : amountPaidVal > 0 ? 'PARTIALLY PAID' : 'UNPAID')).toUpperCase();

  let agentSection = '';
  if (order.deliveryAgent) {
    agentSection = `\n🚚 *DELIVERY AGENT INFORMATION:*\n` +
      `Agent: ${order.deliveryAgent.agentName}\n` +
      `Vehicle No: ${order.deliveryAgent.vehicleRegistrationNumber}\n` +
      `Phone: ${order.deliveryAgent.mobilePhone}\n` +
      `WhatsApp: ${order.deliveryAgent.whatsappNumber}\n` +
      `Hire Charge: LKR ${order.deliveryAgent.hireCharge.toLocaleString()}\n`;
  }

  return (
    `🧾 *FOOD & LIFE GROCERY - OFFICIAL BILL & RECEIPT*\n` +
    `📍 929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne\n` +
    `☎️ WhatsApp Hotline: +94 71 259 5683\n\n` +
    `👤 *Customer:* ${order.customerName || 'Valued Customer'}\n` +
    `📦 *Order No:* ${order.orderNumber}\n` +
    `📅 *Date:* ${formattedDate}\n` +
    `📍 *Delivery Area:* ${order.deliveryArea || 'Katuloya'}\n` +
    `🚚 *Delivery Address:* ${order.deliveryAddress || 'Store Pickup'}\n` +
    `✅ *Order Status:* ${order.status}\n` +
    agentSection +
    `\n🛍️ *Ordered Items:*\n${itemsText}\n` +
    `-----------------------------------------\n` +
    `*Subtotal:* LKR ${order.subtotal.toLocaleString()}\n` +
    (order.discountTotal > 0 ? `*Discount Savings:* - LKR ${order.discountTotal.toLocaleString()}\n` : '') +
    `*Store Delivery:* ${order.deliveryCharge === 0 ? 'FREE' : `LKR ${order.deliveryCharge.toLocaleString()}`}\n` +
    (order.deliveryAgent ? `*Delivery Hire Charge:* LKR ${order.deliveryAgent.hireCharge.toLocaleString()}\n` : '') +
    `*INVOICE TOTAL:* *LKR ${order.total.toLocaleString()}*\n` +
    `*Amount Paid:* LKR ${amountPaidVal.toLocaleString()}\n` +
    `*OUTSTANDING BALANCE:* *LKR ${outstandingBal.toLocaleString()}*\n` +
    `*Payment Status:* *${statusDisplay}*\n\n` +
    `📄 *View / Download Official PDF Bill:*\n` +
    `${billUrl}\n\n` +
    `Thank you for shopping with FOOD & LIFE GROCERY!`
  );
}
