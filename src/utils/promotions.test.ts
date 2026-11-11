/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPromotionActive,
  sortPromotions,
  filterActivePromotions,
  validateMediaUpload,
} from './promotions.ts';
import type { PromotionalMedia } from '../types/index.ts';

const baseMockPromo: PromotionalMedia = {
  id: 'promo-1',
  type: 'video',
  url: '/uploads/test.mp4',
  title: 'Fresh Vegetables Promo',
  isActive: true,
  order: 1,
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
};

test('isPromotionActive returns false if isActive is false', () => {
  const promo: PromotionalMedia = { ...baseMockPromo, isActive: false };
  assert.equal(isPromotionActive(promo), false);
});

test('isPromotionActive handles future start dates correctly', () => {
  const promo: PromotionalMedia = {
    ...baseMockPromo,
    startDate: '2026-12-01T00:00:00Z',
  };
  const currentDate = new Date('2026-11-09T10:00:00Z');
  assert.equal(isPromotionActive(promo, currentDate), false);
});

test('isPromotionActive handles past end dates correctly', () => {
  const promo: PromotionalMedia = {
    ...baseMockPromo,
    endDate: '2026-11-05T00:00:00Z',
  };
  const currentDate = new Date('2026-11-09T10:00:00Z');
  assert.equal(isPromotionActive(promo, currentDate), false);
});

test('isPromotionActive returns true when within valid date range', () => {
  const promo: PromotionalMedia = {
    ...baseMockPromo,
    startDate: '2026-11-01T00:00:00Z',
    endDate: '2026-11-30T00:00:00Z',
  };
  const currentDate = new Date('2026-11-09T10:00:00Z');
  assert.equal(isPromotionActive(promo, currentDate), true);
});

test('sortPromotions orders ascending by order number', () => {
  const promos: PromotionalMedia[] = [
    { ...baseMockPromo, id: 'p3', order: 3 },
    { ...baseMockPromo, id: 'p1', order: 1 },
    { ...baseMockPromo, id: 'p2', order: 2 },
  ];
  const sorted = sortPromotions(promos);
  assert.deepEqual(
    sorted.map((p) => p.id),
    ['p1', 'p2', 'p3']
  );
});

test('filterActivePromotions excludes inactive and expired items and sorts active', () => {
  const currentDate = new Date('2026-11-09T12:00:00Z');
  const promos: PromotionalMedia[] = [
    { ...baseMockPromo, id: 'inactive', isActive: false, order: 0 },
    {
      ...baseMockPromo,
      id: 'active-second',
      isActive: true,
      order: 2,
    },
    {
      ...baseMockPromo,
      id: 'expired',
      isActive: true,
      endDate: '2026-11-01T00:00:00Z',
      order: 1,
    },
    {
      ...baseMockPromo,
      id: 'active-first',
      isActive: true,
      order: 1,
    },
  ];

  const result = filterActivePromotions(promos, currentDate);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'active-first');
  assert.equal(result[1].id, 'active-second');
});

test('validateMediaUpload validates media type and size constraints', () => {
  const validVideo = validateMediaUpload({
    size: 20 * 1024 * 1024,
    mimeType: 'video/mp4',
  });
  assert.equal(validVideo.valid, true);
  assert.equal(validVideo.type, 'video');

  const oversizeVideo = validateMediaUpload({
    size: 70 * 1024 * 1024,
    mimeType: 'video/mp4',
  });
  assert.equal(oversizeVideo.valid, false);

  const validImage = validateMediaUpload({
    size: 5 * 1024 * 1024,
    mimeType: 'image/jpeg',
  });
  assert.equal(validImage.valid, true);
  assert.equal(validImage.type, 'image');

  const unsupportedType = validateMediaUpload({
    size: 1024,
    mimeType: 'application/pdf',
  });
  assert.equal(unsupportedType.valid, false);
});
