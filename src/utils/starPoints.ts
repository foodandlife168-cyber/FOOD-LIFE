/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toSriLankaDate, SLDateComponents } from './sriLankaTime.ts';

export interface StarPointsTransaction {
  id: string;
  customerId: string; // e.g. CUST-259568
  customerPhone: string;
  customerName?: string;
  orderId?: string;
  orderNumber?: string;
  type: 'EARN' | 'REDEEM' | 'EXPIRY' | 'REVERSAL' | 'ADJUSTMENT';
  purchaseAmount: number; // e.g. 3500
  points: number; // positive (e.g. +15) or negative for redeem/expiry/reversal (-15)
  cycle: string; // e.g. '2026-2027'
  date: string; // ISO timestamp
  expiryDate: string; // ISO or date string e.g. '2027-07-17T23:59:59+05:30'
  description: string;
  receiptNumber?: string;
  createdBy: string; // 'System' | 'Admin'
  createdAt: string;
}

export interface LoyaltyCycleInfo {
  cycleId: string; // e.g. '2026-2027'
  startYear: number;
  endYear: number;
  periodDisplayEn: string; // "18 July 2026 – 17 July 2027"
  periodDisplaySi: string; // "2026 ජූලි 18 – 2027 ජූලි 17"
  expiryDateDisplayEn: string; // "17 July 2027"
  expiryDateDisplaySi: string; // "2027 ජූලි 17"
  cycleStartIso: string; // '2026-07-18T00:00:00+05:30'
  cycleEndIso: string; // '2027-07-17T23:59:59+05:30'
  isExpired: boolean;
}

export interface CustomerLoyaltySummary {
  customerId: string;
  customerPhone: string;
  customerName: string;
  availablePoints: number;
  currentCycleEarnedPoints: number;
  currentCyclePurchases: number;
  totalPointsEarnedAllTime: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  currentCycle: string;
  currentCyclePeriod: string;
  currentCyclePeriodSi: string;
  expiryDate: string;
  expiryDateSi: string;
  pointsExpiringOn17July: number;
  lastEarnedDate: string | null;
  transactions: StarPointsTransaction[];
  annualRank?: number;
  annualRewards?: any[];
  announcement?: any;
}

/**
 * 1. AUTOMATIC STAR POINT CALCULATION
 * Every registered customer automatically receives 5 Star Points for every completed Rs. 1,000 of eligible purchases.
 * Formula: Star Points = FLOOR(Eligible Purchase Amount / 1000) * 5
 * Complete multiples of Rs. 1,000 only. Do not round up.
 */
export function calculateEarnedStarPoints(eligiblePurchaseAmount: number): number {
  if (isNaN(eligiblePurchaseAmount) || eligiblePurchaseAmount <= 0) {
    return 0;
  }
  const completeThousands = Math.floor(eligiblePurchaseAmount / 1000);
  return completeThousands * 5;
}

/**
 * 2. ANNUAL STAR POINTS VALIDITY PERIOD
 * - Starting date: 18 July every year at 00:00 Sri Lanka Time.
 * - Ending date: 17 July every year at 24:00 (midnight immediately before 18 July).
 * All calculations use Sri Lanka local time (Asia/Colombo UTC+05:30).
 */
export function getLoyaltyCycleForDate(isoOrDate: string | number | Date = new Date()): LoyaltyCycleInfo {
  const sl = toSriLankaDate(isoOrDate);
  const year = sl.year;
  const month = sl.month;
  const day = sl.day;

  // Cycle starts on July 18.
  // If date is before July 18, it belongs to cycle (year - 1) to (year).
  // If date is on or after July 18, it belongs to cycle (year) to (year + 1).
  const isBeforeJuly18 = month < 7 || (month === 7 && day < 18);
  const startYear = isBeforeJuly18 ? year - 1 : year;
  const endYear = startYear + 1;
  const cycleId = `${startYear}-${endYear}`;

  const slNow = toSriLankaDate();
  // Is this cycle already past relative to current Sri Lanka time?
  // Current time is past cycleEnd if current date is strictly on or after endYear-07-18.
  const isNowPastCycleEnd =
    slNow.year > endYear ||
    (slNow.year === endYear && (slNow.month > 7 || (slNow.month === 7 && slNow.day >= 18)));

  return {
    cycleId,
    startYear,
    endYear,
    periodDisplayEn: `18 July ${startYear} – 17 July ${endYear}`,
    periodDisplaySi: `${startYear} ජූලි 18 – ${endYear} ජූලි 17`,
    expiryDateDisplayEn: `17 July ${endYear}`,
    expiryDateDisplaySi: `${endYear} ජූලි 17`,
    cycleStartIso: `${startYear}-07-18T00:00:00+05:30`,
    cycleEndIso: `${endYear}-07-17T23:59:59+05:30`,
    isExpired: isNowPastCycleEnd,
  };
}

/**
 * Computes customer loyalty summary and available Star Points balance.
 * Strictly enforces that points from previous cycles that have expired
 * are zeroed out and never carried over to the next cycle.
 */
export function computeCustomerLoyaltySummary(
  customerId: string,
  customerPhone: string,
  customerName: string,
  transactions: StarPointsTransaction[],
  asOfDate: string | Date = new Date()
): CustomerLoyaltySummary {
  const currentCycleInfo = getLoyaltyCycleForDate(asOfDate);
  const customerTxs = transactions
    .filter((tx) => tx.customerId === customerId || tx.customerPhone === customerPhone)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalPointsEarnedAllTime = 0;
  let totalPointsRedeemed = 0;
  let totalPointsExpired = 0;
  let currentCycleEarnedPoints = 0;
  let currentCyclePurchases = 0;
  let lastEarnedDate: string | null = null;

  // Track unexpired points specifically for the active loyalty cycle
  // Every cycle's net points are calculated separately so expired points are never carried over.
  const cycleNetPoints = new Map<string, number>();

  for (const tx of customerTxs) {
    const cycle = tx.cycle || getLoyaltyCycleForDate(tx.date).cycleId;
    const currentNet = cycleNetPoints.get(cycle) || 0;

    if (tx.type === 'EARN' || tx.type === 'ADJUSTMENT') {
      const pts = Number(tx.points) || 0;
      cycleNetPoints.set(cycle, currentNet + pts);

      if (tx.type === 'EARN') {
        totalPointsEarnedAllTime += pts;
        if (cycle === currentCycleInfo.cycleId) {
          currentCycleEarnedPoints += pts;
          currentCyclePurchases += Number(tx.purchaseAmount) || 0;
        }
        if (!lastEarnedDate || new Date(tx.date).getTime() > new Date(lastEarnedDate).getTime()) {
          lastEarnedDate = tx.date;
        }
      }
    } else if (tx.type === 'REDEEM') {
      const pts = Math.abs(Number(tx.points) || 0);
      totalPointsRedeemed += pts;
      cycleNetPoints.set(cycle, Math.max(0, currentNet - pts));
    } else if (tx.type === 'REVERSAL') {
      const pts = Math.abs(Number(tx.points) || 0);
      cycleNetPoints.set(cycle, Math.max(0, currentNet - pts));
      if (cycle === currentCycleInfo.cycleId) {
        currentCycleEarnedPoints = Math.max(0, currentCycleEarnedPoints - pts);
        currentCyclePurchases = Math.max(0, currentCyclePurchases - (Number(tx.purchaseAmount) || 0));
      }
    } else if (tx.type === 'EXPIRY') {
      const pts = Math.abs(Number(tx.points) || 0);
      totalPointsExpired += pts;
      cycleNetPoints.set(cycle, 0); // Expired cycle balance is cleared
    }
  }

  // Points available to spend: only points in active, non-expired cycle(s)
  // According to Section 3: "Never carry expired points into the next annual cycle."
  let availablePoints = 0;
  for (const [cycle, net] of cycleNetPoints.entries()) {
    const [startYearStr, endYearStr] = cycle.split('-');
    const endYear = parseInt(endYearStr, 10);
    const slNow = toSriLankaDate(asOfDate);
    const isCyclePast =
      slNow.year > endYear ||
      (slNow.year === endYear && (slNow.month > 7 || (slNow.month === 7 && slNow.day >= 18)));

    if (!isCyclePast && net > 0) {
      availablePoints += net;
    }
  }

  const pointsExpiringOn17July = cycleNetPoints.get(currentCycleInfo.cycleId) || 0;

  return {
    customerId,
    customerPhone,
    customerName: customerName || 'Valued Customer',
    availablePoints: Math.max(0, availablePoints),
    currentCycleEarnedPoints,
    currentCyclePurchases,
    totalPointsEarnedAllTime,
    totalPointsRedeemed,
    totalPointsExpired,
    currentCycle: currentCycleInfo.cycleId,
    currentCyclePeriod: currentCycleInfo.periodDisplayEn,
    currentCyclePeriodSi: currentCycleInfo.periodDisplaySi,
    expiryDate: currentCycleInfo.expiryDateDisplayEn,
    expiryDateSi: currentCycleInfo.expiryDateDisplaySi,
    pointsExpiringOn17July: Math.max(0, pointsExpiringOn17July),
    lastEarnedDate,
    transactions: customerTxs,
  };
}

/**
 * Server-Side Expiration Engine:
 * Inspects all customer accounts and generates permanent EXPIRY ledger entries
 * for all unexpired points belonging to loyalty cycles that have concluded.
 * Prevents duplicate expiration records.
 */
export function processStarPointsExpiration(
  ledger: StarPointsTransaction[],
  asOfDate: string | Date = new Date()
): {
  newExpiryTransactions: StarPointsTransaction[];
  affectedCustomerCount: number;
  totalExpiredPoints: number;
} {
  const slNow = toSriLankaDate(asOfDate);
  const currentCycleInfo = getLoyaltyCycleForDate(asOfDate);
  const newExpiryTransactions: StarPointsTransaction[] = [];

  // Group transactions by customerId and cycle
  const customerCycleMap = new Map<string, Map<string, StarPointsTransaction[]>>();

  for (const tx of ledger) {
    if (!tx || !tx.customerId) continue;
    let customerCycles = customerCycleMap.get(tx.customerId);
    if (!customerCycles) {
      customerCycles = new Map();
      customerCycleMap.set(tx.customerId, customerCycles);
    }
    const cycle = tx.cycle || getLoyaltyCycleForDate(tx.date).cycleId;
    let cycleList = customerCycles.get(cycle);
    if (!cycleList) {
      cycleList = [];
      customerCycles.set(cycle, cycleList);
    }
    cycleList.push(tx);
  }

  let totalExpiredPoints = 0;
  const affectedCustomerIds = new Set<string>();

  for (const [customerId, cycleMap] of customerCycleMap.entries()) {
    for (const [cycle, txs] of cycleMap.entries()) {
      // Is this cycle past?
      const [startYearStr, endYearStr] = cycle.split('-');
      const endYear = parseInt(endYearStr, 10);
      if (isNaN(endYear)) continue;

      const isCyclePast =
        slNow.year > endYear ||
        (slNow.year === endYear && (slNow.month > 7 || (slNow.month === 7 && slNow.day >= 18)));

      if (!isCyclePast) {
        // Still active; cannot expire yet
        continue;
      }

      // Check if this cycle already has an EXPIRY transaction
      const hasExpiryTx = txs.some((t) => t.type === 'EXPIRY');
      if (hasExpiryTx) {
        // Already processed; avoid duplicate
        continue;
      }

      // Calculate remaining points in this expired cycle
      let cycleNetPoints = 0;
      let samplePhone = '';
      let sampleName = '';
      for (const t of txs) {
        if (t.customerPhone) samplePhone = t.customerPhone;
        if (t.customerName) sampleName = t.customerName;

        if (t.type === 'EARN' || t.type === 'ADJUSTMENT') {
          cycleNetPoints += Number(t.points) || 0;
        } else if (t.type === 'REDEEM' || t.type === 'REVERSAL') {
          cycleNetPoints = Math.max(0, cycleNetPoints - Math.abs(Number(t.points) || 0));
        }
      }

      if (cycleNetPoints > 0) {
        const expiryIso = `${endYear}-07-17T23:59:59+05:30`;
        const expiryTx: StarPointsTransaction = {
          id: `tx-exp-${customerId}-${cycle}`,
          customerId,
          customerPhone: samplePhone,
          customerName: sampleName,
          type: 'EXPIRY',
          purchaseAmount: 0,
          points: -cycleNetPoints,
          cycle,
          date: expiryIso,
          expiryDate: expiryIso,
          description: `Annual Expiry: ${cycleNetPoints} unused Star Points expired at end of cycle 18 July ${startYearStr} – 17 July ${endYearStr}`,
          createdBy: 'System',
          createdAt: new Date().toISOString(),
        };

        newExpiryTransactions.push(expiryTx);
        totalExpiredPoints += cycleNetPoints;
        affectedCustomerIds.add(customerId);
      }
    }
  }

  return {
    newExpiryTransactions,
    affectedCustomerCount: affectedCustomerIds.size,
    totalExpiredPoints,
  };
}
