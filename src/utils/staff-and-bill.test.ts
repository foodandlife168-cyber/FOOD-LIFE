/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert';
import { buildWhatsAppBillText, BillOrder } from './generateBillPdf.ts';

test('buildWhatsAppBillText formats attractive bilingual bill with logo details', () => {
  const sampleOrder: BillOrder = {
    orderNumber: 'FL-2026-000101',
    trackingToken: 'secure-token-abc-123',
    customerName: 'Kasun Bandara',
    customerPhone: '077 123 4567',
    deliveryArea: 'Katuloya',
    deliveryAddress: '929, Kandy Road, Cross Waththegama',
    deliveryType: 'delivery',
    items: [
      {
        nameEn: 'Keeri Samba Rice',
        nameSi: 'කීරි සම්බා සහල්',
        unit: '5 kg',
        quantity: 2,
        unitPrice: 1650,
        effectivePrice: 1567.5,
        discountPercent: 5,
        lineTotal: 3135,
      },
      {
        nameEn: 'Fresh Highland Carrots',
        nameSi: 'නැවුම් කැරට්',
        unit: '1 kg',
        quantity: 1,
        unitPrice: 380,
        effectivePrice: 380,
        discountPercent: 0,
        lineTotal: 380,
      },
    ],
    subtotal: 3515,
    discountTotal: 165,
    deliveryCharge: 0,
    total: 3515,
    paymentMethod: 'cash_on_delivery',
    paymentStatus: 'paid',
    status: 'Delivered',
    createdAt: new Date().toISOString(),
  };

  const text = buildWhatsAppBillText(sampleOrder, 'https://example.com');

  assert.ok(text.includes('FOOD & LIFE GROCERY - OFFICIAL BILL & RECEIPT'));
  assert.ok(text.includes('929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne'));
  assert.ok(text.includes('+94 71 259 5683'));
  assert.ok(text.includes('FL-2026-000101'));
  assert.ok(text.includes('Kasun Bandara'));
  assert.ok(text.includes('Delivered'));
  assert.ok(text.includes('Keeri Samba Rice'));
  assert.ok(text.includes('LKR 3,515'));
  assert.ok(text.includes('https://example.com/track/secure-token-abc-123'));
});
