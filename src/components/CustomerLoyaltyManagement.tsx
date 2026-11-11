/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  Search,
  Filter,
  Download,
  FileText,
  RefreshCw,
  AlertTriangle,
  Calendar,
  Users,
  Clock,
  History,
  TrendingUp,
  PlusCircle,
  X,
  CheckCircle,
  Eye,
  Edit3,
  Gift,
  Trophy,
  Award,
  Check,
  Send,
  MessageSquare,
  ShieldCheck,
  Package,
  Trash2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type {
  AnnualRewardRecord,
  AnnualCustomerRankingItem,
  AnnualRewardsAnnouncement,
  AnnualClosingSummaryReport,
  RewardType,
  RewardStatus,
  StarPointsTransaction,
} from '../types/index.ts';
import { getDefaultRewardPreset } from '../utils/annualRewards.ts';

interface LoyaltySummaryData {
  cycle: string;
  period: string;
  periodSi: string;
  expiryDate: string;
  expiryDateSi: string;
  anniversaryWarning: string;
  totalRegisteredCustomers: number;
  customersWithPoints: number;
  totalActivePoints: number;
  pointsExpiringOn17July: number;
  totalPointsIssuedCurrentCycle: number;
  totalPointsRedeemedCurrentCycle: number;
  totalPointsExpiredAllTime: number;
  totalPointsIssuedAllTime: number;
}

interface CustomerLoyaltyManagementProps {
  authToken?: string | null;
}

export const CustomerLoyaltyManagement: React.FC<CustomerLoyaltyManagementProps> = ({ authToken: propToken }) => {
  // Resolve admin token from prop or local storage
  const token = propToken || (typeof window !== 'undefined' ? localStorage.getItem('foodlife_admin_token') : null) || '';

  const getAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const getReportUrl = (basePath: string, extraParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, v);
      }
    });
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Navigation tabs within Customer Loyalty Management module
  const [activeSubTab, setActiveSubTab] = useState<'rankings' | 'rewards' | 'closing' | 'ledger'>('rankings');

  // Global Loyalty Summary
  const [summary, setSummary] = useState<LoyaltySummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Rankings State
  const [rankings, setRankings] = useState<AnnualCustomerRankingItem[]>([]);
  const [rankingFilter, setRankingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Tab 2: Rewards State
  const [rewards, setRewards] = useState<AnnualRewardRecord[]>([]);
  const [rewardStatusFilter, setRewardStatusFilter] = useState<string>('all');

  // Tab 3: Annual Closing State
  const [closingSummary, setClosingSummary] = useState<AnnualClosingSummaryReport | null>(null);
  const [announcement, setAnnouncement] = useState<AnnualRewardsAnnouncement>({
    id: 'announcement-2026-2027',
    cycle: '2026-2027',
    headline: 'Annual Customer Loyalty Rewards Announced!',
    headlineSi: 'වාර්ෂික පාරිභෝගික ලෝයල්ටි ත්‍යාග ප්‍රකාශයට පත් කරන ලදී!',
    message: 'Food & Life Management is delighted to reward our top loyal customers for the completed loyalty year. Check your approved gifts and vouchers below!',
    messageSi: 'ගත වූ වසර වෙනුවෙන් අපගේ විශිෂ්ටතම පාරිභෝගිකයන් ඇගයීමට FOOD & LIFE සූදානම්. ඔබගේ අනුමත ත්‍යාග පහතින් පරීක්ෂා කරන්න!',
    isActive: true,
  });
  const [savingAnnouncement, setSavingAnnouncement] = useState<boolean>(false);
  const [announcementSavedMsg, setAnnouncementSavedMsg] = useState<string | null>(null);

  // Allocation Modal State
  const [isRewardModalOpen, setIsRewardModalOpen] = useState<boolean>(false);
  const [allocTargetCustomers, setAllocTargetCustomers] = useState<AnnualCustomerRankingItem[]>([]);
  const [selectedRewardType, setSelectedRewardType] = useState<RewardType>('gift_hamper');
  const [allocTitle, setAllocTitle] = useState<string>('');
  const [allocDesc, setAllocDesc] = useState<string>('');
  const [allocValue, setAllocValue] = useState<number>(5000);
  const [allocQuantity, setAllocQuantity] = useState<number>(1);
  const [allocStatus, setAllocStatus] = useState<RewardStatus>('Approved');
  const [allocVoucherCode, setAllocVoucherCode] = useState<string>('');
  const [allocInstructions, setAllocInstructions] = useState<string>('');
  const [allocDate, setAllocDate] = useState<string>('');
  const [allocNotes, setAllocNotes] = useState<string>('');
  const [allocSubmitting, setAllocSubmitting] = useState<boolean>(false);
  const [allocError, setAllocError] = useState<string | null>(null);

  // Customer Transaction History Modal state
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<StarPointsTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Manual Adjustment Modal state
  const [adjustmentCustomer, setAdjustmentCustomer] = useState<AnnualCustomerRankingItem | null>(null);
  const [adjPoints, setAdjPoints] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjReceipt, setAdjReceipt] = useState<string>('');
  const [adjSubmitting, setAdjSubmitting] = useState<boolean>(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [rankingFilter, rewardStatusFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const [sumRes, rankRes, rewRes, annRes, closeRes] = await Promise.all([
        fetch('/api/admin/loyalty/summary', { headers }),
        fetch(`/api/admin/loyalty/rankings?filter=${rankingFilter}`, { headers }),
        fetch(`/api/admin/loyalty/rewards?status=${rewardStatusFilter}`, { headers }),
        fetch('/api/admin/loyalty/announcement', { headers }),
        fetch('/api/admin/loyalty/annual-closing', { headers }),
      ]);

      const sumData = await sumRes.json();
      const rankData = await rankRes.json();
      const rewData = await rewRes.json();
      const annData = await annRes.json();
      const closeData = await closeRes.json();

      if (sumRes.ok && sumData.success) setSummary(sumData.summary);
      if (rankRes.ok && rankData.success) setRankings(rankData.rankings || []);
      if (rewRes.ok && rewData.success) setRewards(rewData.rewards || []);
      if (annRes.ok && annData.success && annData.announcement) setAnnouncement(annData.announcement);
      if (closeRes.ok && closeData.success) setClosingSummary(closeData.summary);
    } catch (err: any) {
      console.error('Error fetching loyalty data:', err);
      setError(err.message || 'Failed to load loyalty records.');
    } finally {
      setLoading(false);
    }
  };

  // Open Allocation Modal for single or multiple customers
  const openAllocationModal = (targets: AnnualCustomerRankingItem[]) => {
    setAllocTargetCustomers(targets);
    const preset = getDefaultRewardPreset('gift_hamper');
    setSelectedRewardType('gift_hamper');
    setAllocTitle(preset.title);
    setAllocDesc(preset.description);
    setAllocValue(preset.estimatedValue);
    setAllocQuantity(1);
    setAllocStatus('Approved');
    setAllocVoucherCode('');
    setAllocInstructions('Please collect your reward at Food & Life Grocery (Katuloya Store) or contact WhatsApp hotline +94 71 259 5683.');
    setAllocDate(new Date().toISOString().split('T')[0]);
    setAllocNotes('');
    setAllocError(null);
    setIsRewardModalOpen(true);
  };

  const handleRewardTypeChange = (type: RewardType) => {
    setSelectedRewardType(type);
    const preset = getDefaultRewardPreset(type);
    setAllocTitle(preset.title);
    setAllocDesc(preset.description);
    setAllocValue(preset.estimatedValue);
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allocTargetCustomers.length === 0) return;
    setAllocSubmitting(true);
    setAllocError(null);

    try {
      const res = await fetch('/api/admin/loyalty/rewards', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          customerIds: allocTargetCustomers.map((c) => c.customerId),
          rewardType: selectedRewardType,
          rewardTitle: allocTitle.trim(),
          rewardDescription: allocDesc.trim(),
          rewardValue: allocValue,
          quantity: allocQuantity,
          status: allocStatus,
          voucherCode: allocVoucherCode.trim() || undefined,
          collectionInstructions: allocInstructions.trim(),
          distributionDate: allocDate || undefined,
          notes: allocNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to allocate rewards.');
      }

      setIsRewardModalOpen(false);
      setSelectedCustomerIds([]);
      fetchAllData();
    } catch (err: any) {
      setAllocError(err.message || 'Failed to allocate reward.');
    } finally {
      setAllocSubmitting(false);
    }
  };

  const handleUpdateRewardStatus = async (rewardId: string, newStatus: RewardStatus) => {
    try {
      const res = await fetch(`/api/admin/loyalty/rewards/${encodeURIComponent(rewardId)}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to update reward status:', err);
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!window.confirm('Are you sure you want to delete this reward allocation?')) return;
    try {
      const res = await fetch(`/api/admin/loyalty/rewards/${encodeURIComponent(rewardId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to delete reward:', err);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAnnouncement(true);
    setAnnouncementSavedMsg(null);
    try {
      const res = await fetch('/api/admin/loyalty/announcement', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(announcement),
      });
      if (res.ok) {
        setAnnouncementSavedMsg('Announcement published and updated successfully!');
        setTimeout(() => setAnnouncementSavedMsg(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save announcement:', err);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const openHistoryModal = async (customerId: string) => {
    setHistoryCustomerId(customerId);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/loyalty/customers/${encodeURIComponent(customerId)}/transactions`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomerTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleManualAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentCustomer) return;
    const pts = parseInt(adjPoints, 10);
    if (isNaN(pts) || pts === 0) {
      setAdjError('Points must be a non-zero integer (+ or -).');
      return;
    }
    if (!adjReason.trim()) {
      setAdjError('Reason for manual adjustment is required.');
      return;
    }

    setAdjSubmitting(true);
    setAdjError(null);

    try {
      const res = await fetch('/api/admin/loyalty/adjustment', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          customerId: adjustmentCustomer.customerId,
          customerPhone: adjustmentCustomer.rawPhone,
          customerName: adjustmentCustomer.customerName,
          points: pts,
          reason: adjReason.trim(),
          receiptNumber: adjReceipt.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply adjustment.');
      }

      setAdjustmentCustomer(null);
      setAdjPoints('');
      setAdjReason('');
      setAdjReceipt('');
      fetchAllData();
    } catch (err: any) {
      setAdjError(err.message || 'Error recording points adjustment.');
    } finally {
      setAdjSubmitting(false);
    }
  };

  // Toggle selection for bulk actions
  const toggleSelectCustomer = (cid: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const toggleSelectAllRanked = () => {
    if (selectedCustomerIds.length === filteredRankings.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filteredRankings.map((r) => r.customerId));
    }
  };

  const filteredRankings = rankings.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.customerName.toLowerCase().includes(q) ||
      r.customerPhone.toLowerCase().includes(q) ||
      (r.rawPhone && r.rawPhone.toLowerCase().includes(q)) ||
      r.customerId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-inner">
                <Trophy className="w-6 h-6 text-yellow-100 fill-yellow-200" />
              </span>
              <h2 className="text-2xl font-black tracking-tight">ANNUAL CUSTOMER REWARDS &amp; LOYALTY</h2>
            </div>
            <p className="text-xs text-amber-100 font-medium mt-1">
              Admin-Controlled Rewards Programme • Annual Ranking, Gift Hampers, Discount Vouchers &amp; 17 July Closing
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Full Star Points Audit Report (PDF) */}
            <a
              href={getReportUrl('/api/admin/loyalty/export-pdf', { autoprint: 'true' })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md border border-emerald-500/40 transition-all hover:scale-[1.02] cursor-pointer"
              title="Download & Print Full Star Points Audit Report (සම්පූර්ණ Star Points PDF වාර්තාව)"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>Full Star Points PDF Report (සම්පූර්ණ PDF)</span>
            </a>

            {/* 2. Annual Closing & Rewards Report (PDF) */}
            <a
              href={getReportUrl('/api/admin/loyalty/annual-closing/export-pdf', { autoprint: 'true' })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-900/70 hover:bg-amber-900 text-white text-xs font-bold rounded-xl backdrop-blur-xs border border-white/20 transition-all cursor-pointer"
              title="Annual Closing & Rewards Report (වාර්ෂික සමාප්ති PDF වාර්තාව)"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>Annual Closing PDF</span>
            </a>

            {/* 3. Export CSV */}
            <a
              href={getReportUrl('/api/admin/loyalty/annual-closing/export-csv')}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </a>

            <button
              type="button"
              onClick={fetchAllData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-800/60 hover:bg-amber-800 text-white text-xs font-bold rounded-xl backdrop-blur-xs border border-white/20 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Module Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('rankings')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeSubTab === 'rankings'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Annual Customer Rankings</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
            {rankings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rewards')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeSubTab === 'rewards'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Admin Rewards Approval</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black">
            {rewards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('closing')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeSubTab === 'closing'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Annual Closing (17 July)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
            Asia/Colombo
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeSubTab === 'ledger'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Points Ledger &amp; Adjustments</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border-2 border-amber-300 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Active Star Points</div>
          <div className="text-2xl font-black text-amber-600 mt-1 flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-500 text-amber-600 shrink-0" />
            <span>{summary ? summary.totalActivePoints.toLocaleString() : '0'}</span>
          </div>
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Eligibility Points</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Ranked Customers</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{rankings.length}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Eligible Registered</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Approved Rewards</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {rewards.filter((r) => r.status === 'Approved' || r.status === 'Ready for Collection' || r.status === 'Delivered').length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Of {rewards.length} Allocated</div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-rose-600" />
            <span>Expiring 17 July</span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            {summary ? summary.pointsExpiringOn17July.toLocaleString() : '0'}
          </div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Midnight 24:00 SLT</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Rewards Value</div>
          <div className="text-lg font-black text-slate-900 mt-1 truncate">
            Rs. {rewards.reduce((sum, r) => sum + (r.rewardValue || 0) * (r.quantity || 1), 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Admin Approved</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Current Cycle</div>
          <div className="text-sm font-black text-slate-800 mt-1 truncate">
            {summary?.cycle || '2026-2027'}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">18 Jul – 17 Jul</div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* SUB-TAB 1: ANNUAL CUSTOMER RANKINGS */}
      {/* ============================================================= */}
      {activeSubTab === 'rankings' && (
        <div className="space-y-4">
          {/* Controls: Search, Filters, and Bulk Allocation Button */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone (+94 / 07...), or ID..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setRankingFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rankingFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Ranked ({rankings.length})
              </button>
              <button
                type="button"
                onClick={() => setRankingFilter('top5')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rankingFilter === 'top5'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={() => setRankingFilter('top10')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rankingFilter === 'top10'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Top 10
              </button>
              <button
                type="button"
                onClick={() => setRankingFilter('top25')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rankingFilter === 'top25'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Top 25
              </button>
              <button
                type="button"
                onClick={() => setRankingFilter('has_rewards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rankingFilter === 'has_rewards'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                With Rewards
              </button>
              <button
                type="button"
                onClick={() => setRankingFilter('no_rewards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  rankingFilter === 'no_rewards'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                No Rewards Yet
              </button>
            </div>
          </div>

          {/* Bulk Action Ribbon */}
          {selectedCustomerIds.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <CheckCircle className="w-4 h-4 text-amber-600" />
                <span>{selectedCustomerIds.length} customer(s) selected for rewards allocation</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerIds([])}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targets = rankings.filter((r) => selectedCustomerIds.includes(r.customerId));
                    openAllocationModal(targets);
                  }}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Allocate Rewards ({selectedCustomerIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Rankings Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900">
                  Annual Customer Rankings (Cycle: {summary?.cycle || '2026-2027'})
                </h3>
              </div>
              <div className="text-xs text-slate-500">
                Ranking based strictly on points earned during loyalty year
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                <span>Calculating annual customer rankings...</span>
              </div>
            ) : filteredRankings.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>No customers found in this ranking tier.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.length === filteredRankings.length && filteredRankings.length > 0}
                          onChange={toggleSelectAllRanked}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                      <th className="px-3 py-3 text-center">Rank</th>
                      <th className="px-4 py-3">Customer ID &amp; Name</th>
                      <th className="px-4 py-3">Contact Phone</th>
                      <th className="px-4 py-3 text-right">Eligible Purchases</th>
                      <th className="px-4 py-3 text-center">Points Earned</th>
                      <th className="px-4 py-3 text-center">Available Points</th>
                      <th className="px-4 py-3 text-center">Assigned Rewards</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRankings.map((r) => {
                      const isSelected = selectedCustomerIds.includes(r.customerId);
                      const isTop3 = r.rank <= 3;
                      return (
                        <tr
                          key={r.customerId}
                          className={`hover:bg-amber-50/30 transition-colors ${
                            isSelected ? 'bg-amber-50/60' : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCustomer(r.customerId)}
                              className="rounded text-amber-600 focus:ring-amber-500"
                            />
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center justify-center font-black text-xs px-2.5 py-0.5 rounded-full ${
                                r.rank === 1
                                  ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                                  : r.rank === 2
                                  ? 'bg-slate-200 text-slate-800'
                                  : r.rank === 3
                                  ? 'bg-orange-200 text-orange-900'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {r.rank === 1 && '🥇 '}
                              {r.rank === 2 && '🥈 '}
                              {r.rank === 3 && '🥉 '}
                              #{r.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{r.customerName}</div>
                            <div className="text-[10px] font-mono text-slate-500">{r.customerId}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {r.customerPhone}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                            Rs. {r.totalEligiblePurchases.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="font-black text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              {r.annualPointsEarned} ⭐
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-slate-700">
                            {r.currentAvailablePoints}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {r.rewardsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                                <Gift className="w-3 h-3" />
                                <span>{r.rewardsCount} Reward(s)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">No rewards yet</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openAllocationModal([r])}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
                                title="Allocate Reward to this customer"
                              >
                                <Gift className="w-3 h-3" />
                                <span>Reward</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openHistoryModal(r.customerId)}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                title="View Points Ledger"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SUB-TAB 2: ADMIN REWARDS APPROVAL */}
      {/* ============================================================= */}
      {activeSubTab === 'rewards' && (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Annual Rewards Management &amp; Approval</h3>
              <p className="text-xs text-slate-500">
                Only approved rewards will be displayed to customers in their account portal
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRewardStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rewardStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  All ({rewards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRewardStatusFilter('Approved')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rewardStatusFilter === 'Approved' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Approved
                </button>
                <button
                  type="button"
                  onClick={() => setRewardStatusFilter('Ready for Collection')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rewardStatusFilter === 'Ready for Collection' ? 'bg-white text-sky-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Ready
                </button>
                <button
                  type="button"
                  onClick={() => setRewardStatusFilter('Delivered')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    rewardStatusFilter === 'Delivered' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Delivered
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (rankings.length > 0) openAllocationModal(rankings.slice(0, 1));
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Reward</span>
              </button>
            </div>
          </div>

          {/* Rewards List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {rewards.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>No annual rewards found for this filter.</div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('rankings')}
                  className="mt-3 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-xs inline-flex items-center gap-1"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Go to Customer Rankings to Select Recipients</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Customer ID &amp; Name</th>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Reward Title &amp; Description</th>
                      <th className="px-4 py-3 text-right">Value (LKR)</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Voucher / Code</th>
                      <th className="px-4 py-3">Approved By</th>
                      <th className="px-4 py-3 text-center">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rewards.map((rw) => (
                      <tr key={rw.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{rw.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{rw.customerId} • {rw.customerPhone}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {rw.rankAtSelection ? (
                            <span className="font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[11px]">
                              Rank #{rw.rankAtSelection}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-bold text-slate-900">{rw.rewardTitle}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{rw.rewardDescription}</div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 inline-block">
                            Type: {rw.rewardType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                          Rs. {rw.rewardValue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              rw.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : rw.status === 'Ready for Collection'
                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                : rw.status === 'Delivered'
                                ? 'bg-slate-100 text-slate-700'
                                : rw.status === 'Rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rw.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] font-bold text-slate-700">
                          {rw.voucherCode || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-500">
                          <div>{rw.approvedBy}</div>
                          <div className="text-[10px] text-slate-400">
                            {rw.approvedAt ? new Date(rw.approvedAt).toLocaleDateString('en-GB') : 'Pending'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {rw.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRewardStatus(rw.id, 'Approved')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                                title="Approve Reward"
                              >
                                Approve
                              </button>
                            )}

                            {rw.status === 'Approved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRewardStatus(rw.id, 'Ready for Collection')}
                                className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold"
                                title="Mark Ready for Collection"
                              >
                                Ready
                              </button>
                            )}

                            {rw.status === 'Ready for Collection' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRewardStatus(rw.id, 'Delivered')}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold"
                                title="Mark Delivered"
                              >
                                Delivered
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteReward(rw.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Delete Allocation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SUB-TAB 3: ANNUAL CLOSING DASHBOARD (17 JULY) */}
      {/* ============================================================= */}
      {activeSubTab === 'closing' && (
        <div className="space-y-6">
          {/* Annual Closing Information Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-300 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">
                  ANNUAL LOYALTY CLOSING DASHBOARD (17 JULY DEADLINE)
                </h3>
                <p className="text-xs text-slate-600">
                  Operates strictly on Sri Lanka Standard Time (Asia/Colombo, UTC+05:30)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Every year on <strong>17 July at 24:00 (midnight)</strong>, the annual Star Points earning cycle concludes. All unused Star Points from the completed cycle expire automatically and are archived permanently. Approved rewards remain safe and independently claimable. The new annual cycle starts immediately on <strong>18 July</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={getReportUrl('/api/admin/loyalty/annual-closing/export-pdf', { autoprint: 'true' })}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-200" />
                <span>Download Annual Closing Audit Statement (PDF)</span>
              </a>

              <a
                href={getReportUrl('/api/admin/loyalty/export-pdf', { autoprint: 'true' })}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4 text-amber-100" />
                <span>Download Full Star Points Audit PDF (සම්පූර්ණ PDF)</span>
              </a>

              <a
                href={getReportUrl('/api/admin/loyalty/annual-closing/export-csv')}
                download
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-slate-300" />
                <span>Download Annual Rankings &amp; Rewards Ledger (CSV)</span>
              </a>
            </div>
          </div>

          {/* Customer Announcement Publishing Module */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  Publish Annual Rewards Announcement to Customer Accounts
                </h4>
              </div>
              <span className="text-xs text-slate-500">
                Shown inside customer's <strong>MY STAR POINTS</strong> dashboard
              </span>
            </div>

            {announcementSavedMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{announcementSavedMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Headline (English) *</label>
                  <input
                    type="text"
                    required
                    value={announcement.headline}
                    onChange={(e) => setAnnouncement({ ...announcement, headline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Headline (Sinhala) *</label>
                  <input
                    type="text"
                    required
                    value={announcement.headlineSi || ''}
                    onChange={(e) => setAnnouncement({ ...announcement, headlineSi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Message (English) *</label>
                  <textarea
                    rows={3}
                    required
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Message (Sinhala) *</label>
                  <textarea
                    rows={3}
                    required
                    value={announcement.messageSi || ''}
                    onChange={(e) => setAnnouncement({ ...announcement, messageSi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={announcement.isActive}
                    onChange={(e) => setAnnouncement({ ...announcement, isActive: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Active &amp; Visible to Customers</span>
                </label>

                <button
                  type="submit"
                  disabled={savingAnnouncement}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {savingAnnouncement ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Publish Customer Announcement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SUB-TAB 4: POINTS LEDGER & MANUAL ADJUSTMENTS */}
      {/* ============================================================= */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Star Points Audit Ledger &amp; Adjustments</span>
              </h3>
              <p className="text-xs text-slate-500">
                Rule: FLOOR(Eligible Purchase / 1,000) × 5 points • Manual adjustments recorded with administrator audit log
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={getReportUrl('/api/admin/loyalty/export-pdf', { autoprint: 'true' })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Download & Print Complete Star Points Audit Report (සම්පූර්ණ Star Points PDF වාර්තාව)"
              >
                <FileText className="w-4 h-4 text-emerald-200" />
                <span>Download Full Star Points PDF (සම්පූර්ණ PDF)</span>
              </a>
              <a
                href={getReportUrl('/api/admin/loyalty/export-csv')}
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-300" />
                <span>Download Points CSV</span>
              </a>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Customer ID</th>
                    <th className="px-4 py-3">Customer &amp; Phone</th>
                    <th className="px-4 py-3 text-right">Cycle Purchases</th>
                    <th className="px-4 py-3 text-center">Available Points</th>
                    <th className="px-4 py-3 text-center text-rose-700">Expiring 17 July</th>
                    <th className="px-4 py-3 text-right">All-Time Earned</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankings.map((cust) => (
                    <tr key={cust.customerId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{cust.customerId}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{cust.customerName}</div>
                        <div className="text-[10px] text-slate-500">{cust.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        Rs. {cust.totalEligiblePurchases.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="font-black text-xs px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                          {cust.currentAvailablePoints} pts
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-rose-700">
                        {cust.currentAvailablePoints} pts
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {cust.annualPointsEarned}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openHistoryModal(cust.customerId)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                            title="View Points Ledger History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustmentCustomer(cust);
                              setAdjPoints('');
                              setAdjReason('');
                              setAdjReceipt('');
                              setAdjError(null);
                            }}
                            className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg"
                            title="Manual Points Adjustment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* REWARD ALLOCATION MODAL (SINGLE / BULK) */}
      {/* ============================================================= */}
      {isRewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-200" />
                <h3 className="font-bold text-sm">
                  Allocate Customer Reward ({allocTargetCustomers.length} Customer{allocTargetCustomers.length > 1 ? 's' : ''})
                </h3>
              </div>
              <button
                onClick={() => setIsRewardModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocationSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Recipients Summary */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Selected Recipient(s):
                </div>
                <div className="font-bold text-slate-900 mt-1 max-h-20 overflow-y-auto">
                  {allocTargetCustomers.map((c) => (
                    <span key={c.customerId} className="inline-block bg-white px-2 py-0.5 rounded text-[11px] border border-amber-200 mr-1.5 mb-1">
                      #{c.rank} {c.customerName} ({c.customerId})
                    </span>
                  ))}
                </div>
              </div>

              {allocError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                  {allocError}
                </div>
              )}

              {/* Reward Type Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reward / Benefit Type *</label>
                <select
                  value={selectedRewardType}
                  onChange={(e) => handleRewardTypeChange(e.target.value as RewardType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="gift_hamper">🎁 Premium Grocery Gift Hamper</option>
                  <option value="discount_voucher">🏷️ Discount Voucher</option>
                  <option value="grocery_package">📦 Monthly Household Essentials Package</option>
                  <option value="priority_delivery_pass">🚚 Priority Delivery Pass (Free Delivery)</option>
                  <option value="cash_voucher">💰 Cash Reward Voucher</option>
                  <option value="special_benefit">⭐ Special Loyalty Member Benefit</option>
                  <option value="custom">✨ Custom Customer Reward</option>
                </select>
              </div>

              {/* Title & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reward Title *</label>
                  <input
                    type="text"
                    required
                    value={allocTitle}
                    onChange={(e) => setAllocTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Estimated Retail Value (LKR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={allocValue}
                    onChange={(e) => setAllocValue(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Description / Items Included *</label>
                <textarea
                  rows={2}
                  required
                  value={allocDesc}
                  onChange={(e) => setAllocDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Status & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Approval Status *</label>
                  <select
                    value={allocStatus}
                    onChange={(e) => setAllocStatus(e.target.value as RewardStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="Approved">Approved (Confirmed to Customer)</option>
                    <option value="Pending">Pending Admin Decision</option>
                    <option value="Ready for Collection">Ready for Collection</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={allocQuantity}
                    onChange={(e) => setAllocQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Voucher Code & Collection Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Voucher / Serial Code (Optional)</label>
                  <input
                    type="text"
                    value={allocVoucherCode}
                    onChange={(e) => setAllocVoucherCode(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Distribution Date (Optional)</label>
                  <input
                    type="date"
                    value={allocDate}
                    onChange={(e) => setAllocDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Collection Instructions */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Collection Instructions (Customer Visible)</label>
                <input
                  type="text"
                  value={allocInstructions}
                  onChange={(e) => setAllocInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRewardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {allocSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Reward Allocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer History Modal */}
      {historyCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Star Points Ledger: {historyCustomerId}</h3>
              </div>
              <button onClick={() => setHistoryCustomerId(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                  <span>Loading transaction records...</span>
                </div>
              ) : customerTransactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No points transactions recorded for this customer yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-right">Purchase</th>
                        <th className="px-3 py-2 text-center">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-3 py-2 text-[11px] text-slate-500">{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              tx.type === 'EARN' ? 'bg-emerald-100 text-emerald-800' : tx.type === 'EXPIRY' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>{tx.type}</span>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-700">{tx.description}</td>
                          <td className="px-3 py-2 text-right text-[11px]">{tx.purchaseAmount > 0 ? `Rs. ${tx.purchaseAmount.toLocaleString()}` : '—'}</td>
                          <td className="px-3 py-2 text-center font-bold">{tx.points > 0 ? `+${tx.points}` : tx.points} ⭐</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button type="button" onClick={() => setHistoryCustomerId(null)} className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {adjustmentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-yellow-200" />
                <h3 className="font-bold text-sm">Manual Points Adjustment</h3>
              </div>
              <button onClick={() => setAdjustmentCustomer(null)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualAdjustmentSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{adjustmentCustomer.customerName}</div>
                <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                  ID: {adjustmentCustomer.customerId} • Current: ⭐ {adjustmentCustomer.currentAvailablePoints} pts
                </div>
              </div>
              {adjError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">{adjError}</div>}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Points (+ or -) *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={adjPoints}
                  onChange={(e) => setAdjPoints(e.target.value)}
                  placeholder="e.g. 15 or -10"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setAdjustmentCustomer(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={adjSubmitting} className="px-5 py-2 bg-amber-600 text-white rounded-xl font-bold">
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
