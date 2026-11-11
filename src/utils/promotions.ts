/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PromotionalMedia } from '../types/index.ts';

/**
 * Checks whether a promotion is currently active based on its active flag
 * and optional scheduled start/end dates.
 */
export function isPromotionActive(promo: PromotionalMedia, currentDate: Date = new Date()): boolean {
  if (!promo || !promo.isActive) return false;

  const nowTime = currentDate.getTime();

  if (promo.startDate) {
    const startTime = new Date(promo.startDate).getTime();
    if (!isNaN(startTime) && nowTime < startTime) {
      return false;
    }
  }

  if (promo.endDate) {
    const endTime = new Date(promo.endDate).getTime();
    if (!isNaN(endTime) && nowTime > endTime) {
      return false;
    }
  }

  return true;
}

/**
 * Sorts promotions by their custom display order (ascending),
 * with tie-breaking on creation timestamp (newest first).
 */
export function sortPromotions(promos: PromotionalMedia[]): PromotionalMedia[] {
  return [...promos].sort((a, b) => {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Filters for active promotions within scheduled time windows and sorts them.
 */
export function filterActivePromotions(
  promos: PromotionalMedia[],
  currentDate: Date = new Date()
): PromotionalMedia[] {
  if (!Array.isArray(promos)) return [];
  return sortPromotions(promos.filter((p) => isPromotionActive(p, currentDate)));
}

/**
 * Validates media metadata for maximum file size and supported MIME types.
 * Supports up to 50MB for video and 15MB for image.
 */
export function validateMediaUpload(meta: {
  size: number;
  mimeType: string;
}): { valid: boolean; error?: string; type: 'video' | 'image' } {
  const mime = (meta.mimeType || '').toLowerCase();
  const isVideo = mime.startsWith('video/') || mime.includes('mp4') || mime.includes('webm') || mime.includes('quicktime');
  const isImage = mime.startsWith('image/') || mime.includes('jpeg') || mime.includes('png') || mime.includes('webp');

  if (!isVideo && !isImage) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload MP4, WebM, MOV videos or JPG, PNG, WEBP images.',
      type: 'image',
    };
  }

  const mediaType: 'video' | 'image' = isVideo ? 'video' : 'image';
  const maxSize = isVideo ? 60 * 1024 * 1024 : 15 * 1024 * 1024; // 60MB for video, 15MB for image

  if (meta.size > maxSize) {
    return {
      valid: false,
      error: isVideo
        ? 'Video file exceeds 60MB limit. Please compress or select a shorter clip.'
        : 'Image file exceeds 15MB limit. Please select a smaller photo.',
      type: mediaType,
    };
  }

  return { valid: true, type: mediaType };
}
