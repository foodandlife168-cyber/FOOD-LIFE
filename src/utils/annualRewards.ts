/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AnnualRewardRecord,
  AnnualCustomerRankingItem,
  AnnualRewardsAnnouncement,
  AnnualClosingSummaryReport,
  CustomerAccountLedger,
  StarPointsTransaction,
  RewardType,
  RewardStatus,
} from '../types/index.ts';
import { getLoyaltyCycleForDate, computeCustomerLoyaltySummary } from './starPoints.ts';

/**
 * Generates an authoritative annual ranking of registered customers based on
 * Star Points earned during the specified annual loyalty cycle.
 *
 * Ranking criteria:
 * 1. Annual Star Points Earned (DESC)
 * 2. Total Eligible Purchases (DESC)
 * 3. Chronological Customer ID / Name (ASC)
 */
export function generateAnnualCustomerRankings(
  customerAccounts: CustomerAccountLedger[],
  starPointsLedger: StarPointsTransaction[],
  annualRewards: AnnualRewardRecord[] = [],
  targetCycle?: string
): AnnualCustomerRankingItem[] {
  const activeCycle = targetCycle || getLoyaltyCycleForDate().cycleId;

  // Compute stats per customer for the target loyalty cycle
  const rankedItems: AnnualCustomerRankingItem[] = customerAccounts.map((account) => {
    const customerId = account.customerId;
    const rawPhone = account.rawPhone || account.customerPhone || '';

    // Filter points transactions for this customer belonging to the target cycle
    const customerTxs = starPointsLedger.filter(
      (tx) =>
        (tx.customerId === customerId || (rawPhone && tx.customerPhone === rawPhone)) &&
        (tx.cycle === activeCycle || getLoyaltyCycleForDate(tx.date).cycleId === activeCycle)
    );

    let annualPointsEarned = 0;
    let totalEligiblePurchases = 0;

    for (const tx of customerTxs) {
      if (tx.type === 'EARN') {
        annualPointsEarned += Number(tx.points) || 0;
        totalEligiblePurchases += Number(tx.purchaseAmount) || 0;
      } else if (tx.type === 'REVERSAL') {
        // Reversals deduct earned points and purchase volume
        annualPointsEarned = Math.max(0, annualPointsEarned - Math.abs(Number(tx.points) || 0));
        totalEligiblePurchases = Math.max(0, totalEligiblePurchases - Math.abs(Number(tx.purchaseAmount) || 0));
      }
    }

    // Available points (from summary engine)
    const summary = computeCustomerLoyaltySummary(
      customerId,
      rawPhone,
      account.customerName,
      starPointsLedger
    );

    // Customer rewards for this cycle
    const customerRewards = annualRewards.filter(
      (r) =>
        (r.customerId === customerId || r.customerPhone === rawPhone) &&
        r.cycle === activeCycle
    );

    const hasApproved = customerRewards.some(
      (r) => r.status === 'Approved' || r.status === 'Ready for Collection' || r.status === 'Delivered'
    );

    return {
      customerId,
      customerName: account.customerName || 'Valued Customer',
      customerPhone: account.customerPhone,
      rawPhone,
      deliveryArea: account.deliveryArea || 'Katuloya',
      annualPointsEarned,
      currentAvailablePoints: summary.availablePoints,
      totalEligiblePurchases,
      rank: 0, // Assigned below after sort
      cycle: activeCycle,
      hasApprovedRewards: hasApproved,
      rewardsCount: customerRewards.length,
      rewards: customerRewards,
    };
  });

  // Sort descending by earned points, then purchases, then customerName
  rankedItems.sort((a, b) => {
    if (b.annualPointsEarned !== a.annualPointsEarned) {
      return b.annualPointsEarned - a.annualPointsEarned;
    }
    if (b.totalEligiblePurchases !== a.totalEligiblePurchases) {
      return b.totalEligiblePurchases - a.totalEligiblePurchases;
    }
    return a.customerName.localeCompare(b.customerName);
  });

  // Assign 1-indexed rank position
  rankedItems.forEach((item, index) => {
    item.rank = index + 1;
  });

  return rankedItems;
}

/**
 * Creates an Annual Rewards Closing Summary Report.
 * Consolidates all metrics for the annual closing process.
 */
export function generateAnnualClosingSummary(
  customerAccounts: CustomerAccountLedger[],
  starPointsLedger: StarPointsTransaction[],
  annualRewards: AnnualRewardRecord[],
  targetCycle?: string
): AnnualClosingSummaryReport {
  const cycleInfo = getLoyaltyCycleForDate();
  const activeCycle = targetCycle || cycleInfo.cycleId;
  const rankings = generateAnnualCustomerRankings(customerAccounts, starPointsLedger, annualRewards, activeCycle);

  const cycleRewards = annualRewards.filter((r) => r.cycle === activeCycle);

  const totalRegisteredCustomers = rankings.length;
  const totalEligiblePurchases = rankings.reduce((sum, r) => sum + r.totalEligiblePurchases, 0);
  const totalStarPointsIssued = rankings.reduce((sum, r) => sum + r.annualPointsEarned, 0);

  // Expired points for this cycle (from EXPIRY transactions)
  const totalStarPointsExpired = starPointsLedger
    .filter((tx) => tx.type === 'EXPIRY' && tx.cycle === activeCycle)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.points) || 0), 0);

  const totalApprovedRewards = cycleRewards.filter(
    (r) => r.status === 'Approved' || r.status === 'Ready for Collection' || r.status === 'Delivered'
  ).length;

  const totalDistributedRewards = cycleRewards.filter((r) => r.status === 'Delivered').length;

  const totalPendingCollections = cycleRewards.filter((r) => r.status === 'Ready for Collection').length;

  const totalRewardsValue = cycleRewards
    .filter((r) => r.status !== 'Rejected')
    .reduce((sum, r) => sum + (Number(r.rewardValue) || 0) * (Number(r.quantity) || 1), 0);

  return {
    cycle: activeCycle,
    period: cycleInfo.periodDisplayEn,
    totalRegisteredCustomers,
    totalEligiblePurchases,
    totalStarPointsIssued,
    totalStarPointsExpired,
    totalApprovedRewards,
    totalDistributedRewards,
    totalPendingCollections,
    totalRewardsValue,
    closedAt: new Date().toISOString(),
    closedBy: 'Admin',
    rankings,
    rewards: cycleRewards,
  };
}

/**
 * Generates human-friendly default reward descriptions and titles based on type
 */
export function getDefaultRewardPreset(type: RewardType): {
  title: string;
  description: string;
  estimatedValue: number;
} {
  switch (type) {
    case 'gift_hamper':
      return {
        title: 'Premium Grocery Gift Hamper',
        description: 'Exclusive Food & Life grocery hamper packed with premium tea, biscuits, spices, and organic pantry essentials.',
        estimatedValue: 5000,
      };
    case 'discount_voucher':
      return {
        title: 'Rs. 1,500 Storewide Discount Voucher',
        description: 'Special annual loyalty discount voucher valid on all grocery orders over Rs. 3,000.',
        estimatedValue: 1500,
      };
    case 'grocery_package':
      return {
        title: 'Monthly Household Essentials Package',
        description: 'Complete family pack of Samba rice, dhal, coconut milk, tea, and daily spices.',
        estimatedValue: 7500,
      };
    case 'priority_delivery_pass':
      return {
        title: 'Annual VIP Priority Delivery Pass',
        description: 'Unlimited priority dispatch with zero delivery fee across Katuloya, Thawalanthanne, and Babaralla.',
        estimatedValue: 3500,
      };
    case 'cash_voucher':
      return {
        title: 'Rs. 2,500 Cash Reward Voucher',
        description: 'Direct redeemable credit voucher for in-store or online grocery purchases.',
        estimatedValue: 2500,
      };
    case 'special_benefit':
      return {
        title: 'Loyalty Club Gold Membership Benefit',
        description: 'Guaranteed festive season reservations, first access to fresh produce harvests, and dedicated customer hotline.',
        estimatedValue: 2000,
      };
    case 'custom':
    default:
      return {
        title: 'Special Customer Appreciation Reward',
        description: 'Custom reward granted by Food & Life Management for outstanding customer loyalty.',
        estimatedValue: 2000,
      };
  }
}
