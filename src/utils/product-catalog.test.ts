/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SRI_LANKAN_MASTER_PRODUCTS,
  mergeMasterSriLankanCatalog,
} from '../data/sriLankanGroceryCatalog.ts';
import type { Product } from '../types/index.ts';

test('Sri Lankan Master Catalog has at least 80 unique authentic grocery items', () => {
  assert.ok(
    SRI_LANKAN_MASTER_PRODUCTS.length >= 80,
    `Expected at least 80 master products, got ${SRI_LANKAN_MASTER_PRODUCTS.length}`
  );

  const idSet = new Set<string>();
  for (const prod of SRI_LANKAN_MASTER_PRODUCTS) {
    assert.ok(prod.id, 'Every product must have an ID');
    assert.ok(!idSet.has(prod.id), `Duplicate ID detected: ${prod.id}`);
    idSet.add(prod.id);
  }
});

test('Every master product has valid bilingual fields and positive price', () => {
  for (const prod of SRI_LANKAN_MASTER_PRODUCTS) {
    assert.ok(prod.nameEn && prod.nameEn.trim().length > 0, `Missing nameEn for ${prod.id}`);
    assert.ok(prod.nameSi && prod.nameSi.trim().length > 0, `Missing nameSi for ${prod.id}`);
    assert.ok(prod.category && prod.category.trim().length > 0, `Missing category for ${prod.id}`);
    assert.ok(prod.categorySi && prod.categorySi.trim().length > 0, `Missing categorySi for ${prod.id}`);
    assert.ok(prod.unit && prod.unit.trim().length > 0, `Missing unit for ${prod.id}`);
    assert.ok(prod.unitSi && prod.unitSi.trim().length > 0, `Missing unitSi for ${prod.id}`);
    assert.ok(prod.sellingPrice > 0, `Selling price must be positive for ${prod.id}`);
    assert.ok(prod.availableStock >= 0, `Stock must be non-negative for ${prod.id}`);
    assert.ok(prod.imageUrl && prod.imageUrl.startsWith('http'), `Valid image URL required for ${prod.id}`);
    assert.strictEqual(prod.isActive, true, `Product must be active for ${prod.id}`);
  }
});

test('mergeMasterSriLankanCatalog preserves existing products and adds new products', () => {
  const mockExisting: Product[] = [
    {
      id: 'prod-001',
      nameEn: 'Keeri Samba Rice',
      nameSi: 'කීරි සම්බා සහල්',
      category: 'Rice & Grains',
      categorySi: 'සහල් සහ ධාන්‍ය',
      unit: '5 kg',
      unitSi: 'කි.ග්‍රෑ. 5',
      sellingPrice: 1850,
      availableStock: 45,
      discountPercent: 0,
      imageUrl: '/uploads/custom-photo.jpg',
      imageId: 'custom-img-id',
      imageSource: 'cloud_storage',
      isActive: true,
    },
  ];

  const merged = mergeMasterSriLankanCatalog(mockExisting);

  // Must preserve prod-001 with its existing cloud image and price
  const p1 = merged.find((p) => p.id === 'prod-001');
  assert.ok(p1, 'prod-001 must exist');
  assert.strictEqual(p1?.imageUrl, '/uploads/custom-photo.jpg');
  assert.strictEqual(p1?.sellingPrice, 1850);
  assert.strictEqual(p1?.imageSource, 'cloud_storage');

  // Must include all new master items
  assert.ok(merged.length > mockExisting.length, 'Merged list must contain more items');
  assert.ok(merged.some((p) => p.id === 'prod-021'), 'Must contain prod-021');
  assert.ok(merged.some((p) => p.id === 'prod-081'), 'Must contain prod-081 (Maliban Lemon Puff)');
});
