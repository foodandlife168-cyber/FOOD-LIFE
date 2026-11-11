/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import type { PurchaseOrder, StoreConfig } from '../types/index.ts';

/**
 * Loads an image from URL and returns a base64 data URL for embedding into jsPDF
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.resolve(process.cwd(), 'public', url.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }
      } catch {
        // fallback
      }
    }
    const fullUrl = typeof window !== 'undefined' ? url : `http://localhost:3000${url.startsWith('/') ? url : `/${url}`}`;
    const res = await fetch(fullUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (typeof FileReader !== 'undefined') {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } else {
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:${blob.type || 'image/jpeg'};base64,${base64}`;
    }
  } catch (err) {
    console.error('Failed to load image for PO PDF:', err);
    return null;
  }
}

/**
 * Generates an official, branded A4 Purchase Order PDF for Food & Life Grocery
 */
export async function generatePurchaseOrderPdf(
  po: PurchaseOrder,
  storeConfig: StoreConfig,
  options?: { autoDownload?: boolean }
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Food & Life Branding Colors (Deep Forest Green & Warm Amber/Orange Accent)
  const emeraldPrimary = [6, 95, 70]; // #065f46
  const emeraldDark = [4, 78, 57]; // #044e39
  const emeraldLight = [236, 253, 245]; // #ecfdf5
  const slateDark = [15, 23, 42]; // #0f172a
  const slateMuted = [100, 116, 139]; // #64748b
  const slateBorder = [226, 232, 240]; // #e2e8f0
  const amberAccent = [217, 119, 6]; // #d97706
  const orangeBanner = [234, 88, 12]; // #ea580c

  // 1. Top Decorative Brand Bar (Emerald with Orange accent)
  doc.setFillColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.rect(0, 0, pageWidth, 5.5, 'F');
  doc.setFillColor(orangeBanner[0], orangeBanner[1], orangeBanner[2]);
  doc.rect(0, 5.5, pageWidth, 1.5, 'F');

  let currentY = 14;

  // 2. Official Food & Life Circular Logo
  const logoUrl = storeConfig.logoUrl || '/logo.jpg';
  const logoDataUrl = await loadImageAsDataUrl(logoUrl);
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'JPEG', margin, currentY, 24, 24);
    } catch (e) {
      console.warn('Could not render logo in PO PDF:', e);
    }
  }

  // 3. Store Identity & Contact Information
  const headerLeft = logoDataUrl ? margin + 28 : margin;
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(storeConfig.storeName || 'FOOD & LIFE GROCERY', headerLeft, currentY + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orangeBanner[0], orangeBanner[1], orangeBanner[2]);
  doc.text(storeConfig.tagline || 'Everything For Your Choices • ඔබගේ සියලු තේරීම් සඳහා', headerLeft, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(storeConfig.address || '929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne', headerLeft, currentY + 14.5);
  doc.text(`Delivery Hub: ${storeConfig.deliveryAreas ? storeConfig.deliveryAreas.join(' • ') : 'Katuloya, Thawalanthanne, Babaralla, Goomaraya, Thunisgala'}`, headerLeft, currentY + 18.5);
  doc.text(`Phone / WhatsApp: ${storeConfig.whatsappNumber || storeConfig.phone || '+94 71 259 5683'}  |  Email: ${storeConfig.email || 'foodandlife168@gmail.com'}`, headerLeft, currentY + 22.5);

  // 4. Right Header: PURCHASE ORDER Box
  const poBoxX = 138;
  const poBoxWidth = pageWidth - margin - poBoxX;

  doc.setFillColor(emeraldLight[0], emeraldLight[1], emeraldLight[2]);
  doc.setDrawColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(poBoxX, currentY, poBoxWidth, 24, 2, 2, 'FD');

  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PURCHASE ORDER', poBoxX + poBoxWidth / 2, currentY + 5.5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('PO Number:', poBoxX + 4, currentY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(po.poNumber, poBoxX + poBoxWidth - 4, currentY + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Date:', poBoxX + 4, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(po.date || new Date().toISOString().slice(0, 10), poBoxX + poBoxWidth - 4, currentY + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Status:', poBoxX + 4, currentY + 21);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text(po.status.toUpperCase(), poBoxX + poBoxWidth - 4, currentY + 21, { align: 'right' });

  currentY += 28;

  // Divider
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 4;

  // 5. Vendor & Delivery Location Cards (Two Columns)
  const colWidth = (contentWidth - 6) / 2;

  // Vendor Card
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.roundedRect(margin, currentY, colWidth, 23, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text('VENDOR / SUPPLIER DETAILS', margin + 4, currentY + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(po.supplierName || 'General Grocery Supplier', margin + 4, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Contact: ${po.supplierContact || 'Direct Supplier Delivery'}`, margin + 4, currentY + 15);
  doc.text('Terms: Official Commercial Supply', margin + 4, currentY + 19);

  // Delivery Destination Card
  const rightColX = margin + colWidth + 6;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(rightColX, currentY, colWidth, 23, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text('SHIP / DELIVER TO', rightColX + 4, currentY + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(storeConfig.storeName || 'FOOD & LIFE GROCERY', rightColX + 4, currentY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(storeConfig.address || '929, Kandy Road, Cross Waththegama, Katuloya', rightColX + 4, currentY + 15);
  doc.text(`Store Contact: ${storeConfig.whatsappNumber || '+94 71 259 5683'}`, rightColX + 4, currentY + 19);

  currentY += 27;

  // 6. Products Table
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('PURCHASE ORDER LINE ITEMS', margin, currentY);

  currentY += 3;

  // Table Header (QUANTITY ONLY: No Unit Cost, No Line Total)
  const colX = {
    num: margin + 4,
    item: margin + 14,
    unit: margin + 105,
    stock: margin + 138,
    qty: pageWidth - margin - 6,
  };

  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.rect(margin, currentY, contentWidth, 7, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('#', colX.num, currentY + 4.8);
  doc.text('PRODUCT DESCRIPTION', colX.item, currentY + 4.8);
  doc.text('UNIT', colX.unit, currentY + 4.8);
  doc.text('CURRENT STOCK', colX.stock, currentY + 4.8, { align: 'right' });
  doc.text('REQUIRED QUANTITY', colX.qty, currentY + 4.8, { align: 'right' });

  currentY += 7;

  let totalQty = 0;

  // Table Rows
  po.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(String(index + 1), colX.num, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    const maxItemLen = 50;
    const displayName = item.nameEn.length > maxItemLen ? item.nameEn.substring(0, maxItemLen) + '...' : item.nameEn;
    doc.text(displayName, colX.item, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(item.unit, colX.unit, currentY + 4.5);

    doc.text(String(item.currentStock ?? 0), colX.stock, currentY + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
    doc.text(`${item.reorderQuantity} ${item.unit}`, colX.qty, currentY + 4.5, { align: 'right' });

    totalQty += item.reorderQuantity;
    currentY += 6.5;
  });

  // Bottom Border of table
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 5;

  // 7. Quantity Summary Box (QUANTITY ONLY - No Prices or Line Costs)
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.roundedRect(summaryBoxX, currentY, summaryBoxWidth, 23, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(`Distinct Items:`, summaryBoxX + 4, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`${po.items.length} Products`, summaryBoxX + summaryBoxWidth - 4, currentY + 7, { align: 'right' });

  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.line(summaryBoxX + 4, currentY + 11, summaryBoxX + summaryBoxWidth - 4, currentY + 11);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text('Total Order Units:', summaryBoxX + 4, currentY + 18);
  doc.text(`${totalQty} Units`, summaryBoxX + summaryBoxWidth - 4, currentY + 18, { align: 'right' });

  // 8. Official People's Bank Details Box (Left of Summary)
  const bankBoxWidth = contentWidth - summaryBoxWidth - 6;
  doc.setFillColor(emeraldLight[0], emeraldLight[1], emeraldLight[2]);
  doc.setDrawColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, bankBoxWidth, 28, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text("OFFICIAL PAYMENT & BANK DETAILS (PEOPLE'S BANK)", margin + 4, currentY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text("Bank Name: People's Bank", margin + 4, currentY + 11.5);
  doc.text('Branch: Panwila', margin + 4, currentY + 16.5);
  doc.text('Account Name: RG Nimal Rajapaksha', margin + 4, currentY + 21.5);
  doc.setFontSize(9);
  doc.setTextColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.text('Account Number: 211200380039804', margin + 4, currentY + 26.5);

  currentY += 34;

  // 9. Notes & Instructions
  if (po.notes) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`Delivery & Order Notes: ${po.notes}`, margin, currentY);
    currentY += 6;
  }

  // 10. Authorized Signatures Section
  const sigBoxWidth = (contentWidth - 10) / 2;

  // Signature 1: Store Manager
  doc.setDrawColor(slateBorder[0], slateBorder[1], slateBorder[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY + 15, margin + sigBoxWidth, currentY + 15);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('AUTHORIZED STORE MANAGER / PURCHASER', margin, currentY + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('FOOD & LIFE GROCERY (KATULOYA)', margin, currentY + 23);

  // Signature 2: Supplier Acknowledgment
  const sig2X = margin + sigBoxWidth + 10;
  doc.line(sig2X, currentY + 15, sig2X + sigBoxWidth, currentY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('SUPPLIER / VENDOR ACKNOWLEDGMENT', sig2X, currentY + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Signature & Official Rubber Stamp', sig2X, currentY + 23);

  // 11. Footer
  doc.setFillColor(emeraldDark[0], emeraldDark[1], emeraldDark[2]);
  doc.rect(0, pageHeight - 7, pageWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(
    `FOOD & LIFE GROCERY • 929, Kandy Road, Cross Waththegama, Katuloya • Hotline: ${storeConfig.whatsappNumber || '+94 71 259 5683'} • Generated: ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 2.5,
    { align: 'center' }
  );

  if (options?.autoDownload) {
    doc.save(`FoodLife_PO_${po.poNumber}.pdf`);
  }

  return doc;
}

/**
 * Builds clean WhatsApp share text for Purchase Order (QUANTITY ONLY)
 */
export function buildWhatsAppPurchaseOrderText(po: PurchaseOrder, storeConfig: StoreConfig): string {
  let text = `📦 *FOOD & LIFE GROCERY - OFFICIAL PURCHASE ORDER*\n`;
  text += `*PO Number:* ${po.poNumber}\n`;
  text += `*Date:* ${po.date}\n`;
  text += `*Vendor:* ${po.supplierName}\n`;
  text += `*Deliver To:* ${storeConfig.storeName || 'Food & Life Grocery'}, Katuloya\n\n`;
  text += `📋 *ORDERED ITEMS (QUANTITIES ONLY):*\n`;

  let totalQty = 0;
  po.items.forEach((item, i) => {
    text += `${i + 1}. *${item.nameEn}* (${item.unit})\n`;
    text += `   Required Quantity: *${item.reorderQuantity} ${item.unit}*\n`;
    totalQty += item.reorderQuantity;
  });

  text += `\n📦 *TOTAL UNITS ORDERED:* ${totalQty}\n`;
  if (po.notes) {
    text += `📝 *Notes:* ${po.notes}\n`;
  }
  text += `\n🏦 *BANK TRANSFER DETAILS:*\n`;
  text += `Bank: People's Bank\n`;
  text += `Branch: Panwila\n`;
  text += `Account Name: RG Nimal Rajapaksha\n`;
  text += `Account No: 211200380039804\n\n`;
  text += `📍 *Store Address:* ${storeConfig.address || '929, Kandy Road, Cross Waththegama, Katuloya'}\n`;
  text += `📞 *Hotline:* ${storeConfig.whatsappNumber || '+94 71 259 5683'}\n`;

  return text;
}
