/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Calendar,
  AlertTriangle,
  History,
  TrendingUp,
  Award,
  Sparkles,
  Phone,
  RefreshCw,
  Gift,
  HelpCircle,
  Clock,
  CheckCircle,
  Trophy,
  Copy,
  Check,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import type { CustomerLoyaltyProfile, StarPointsTransaction, AnnualRewardRecord } from '../types/index.ts';
import { normalizeSriLankanPhone, isValidSriLankanPhone } from '../utils/order.ts';

interface MyStarPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
}

export const MyStarPointsModal: React.FC<MyStarPointsModalProps> = ({
  isOpen,
  onClose,
  initialPhone = '',
}) => {
  const { language } = useLanguage();
  const [phone, setPhone] = useState<string>(() => {
    return initialPhone || localStorage.getItem('foodlife_customer_phone') || '';
  });
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyProfile | null>(null);
  const [warningMessage, setWarningMessage] = useState<string>(
    'Your Star Points will expire on 17 July. Use your rewards before the anniversary date!'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'earn' | 'expired'>('all');
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);

  // Sync phone from localStorage or prop when opened
  useEffect(() => {
    if (isOpen) {
      const storedPhone = initialPhone || localStorage.getItem('foodlife_customer_phone') || '';
      if (storedPhone) {
        setPhone(storedPhone);
        setPhoneInput(storedPhone);
        fetchLoyaltyData(storedPhone);
      }
    }
  }, [isOpen, initialPhone]);

  const fetchLoyaltyData = async (targetPhone: string) => {
    if (!targetPhone) return;
    setLoading(true);
    setError(null);
    try {
      const norm = normalizeSriLankanPhone(targetPhone) || targetPhone;
      const res = await fetch(`/api/customer/loyalty?phone=${encodeURIComponent(norm)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load loyalty points.');
      }
      setLoyalty(data.loyalty);
      if (data.anniversaryWarning) {
        setWarningMessage(data.anniversaryWarning);
      }
      localStorage.setItem('foodlife_customer_phone', norm);
    } catch (err: any) {
      console.error('Error fetching loyalty profile:', err);
      setError(err.message || 'Could not fetch your Star Points.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput || !isValidSriLankanPhone(phoneInput)) {
      setError(language === 'si' ? 'කරුණාකර වලංගු ශ්‍රී ලංකා දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 071 259 5683).' : 'Please enter a valid Sri Lankan mobile number (e.g., 071 259 5683).');
      return;
    }
    setPhone(phoneInput);
    fetchLoyaltyData(phoneInput);
  };

  if (!isOpen) return null;

  const transactions = loyalty?.transactions || [];
  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'earn') return tx.type === 'EARN';
    if (activeTab === 'expired') return tx.type === 'EXPIRY';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl my-8 bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="relative bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 px-6 py-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                <Star className="w-6 h-6 text-yellow-100 fill-yellow-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    MY STAR POINTS
                  </h2>
                  <span className="bg-amber-800/40 text-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Official Loyalty Club
                  </span>
                </div>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  {language === 'si'
                    ? 'FOOD & LIFE පාරිභෝගික ලෝයල්ටි තරු ලකුණු ගිණුම'
                    : 'Food & Life Grocery Customer Loyalty Rewards System'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Phone Lookup / Current Account Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'si' ? 'සම්බන්ධිත ගිණුම / දුරකථන අංකය' : 'Linked Customer Phone'}
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {phone ? phone : (language === 'si' ? 'දුරකථන අංකයක් ඇතුළත් කර නැත' : 'No phone linked')}
                </div>
              </div>
            </div>

            <form onSubmit={handleLookup} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="07X XXXXXXX"
                className="w-full sm:w-44 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 flex items-center gap-1 shadow-xs"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{language === 'si' ? 'යාවත්කාලීන' : 'Check Points'}</span>
              </button>
            </form>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Mandatory Expiry Warning Banner (Requirement 4) */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400/80 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-extrabold text-amber-950 uppercase tracking-wide flex items-center gap-2">
                <span>{language === 'si' ? 'වාර්ෂික කල් ඉකුත් වීමේ නිවේදනය' : 'ANNUAL STAR POINTS EXPIRY NOTICE'}</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded">17 July</span>
              </div>
              <p className="text-xs font-bold text-amber-900 mt-1">
                "{warningMessage}"
              </p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                {language === 'si'
                  ? 'වාර්ෂික ලෝයල්ටි වසර ජූලි 18 ආරම්භ වී ජූලි 17 මධ්‍යම රාත්‍රී 24:00 න් අවසන් වේ. භාවිත නොකළ සියලුම ලකුණු අවලංගු වන අතර ඊළඟ වසරට ගෙන යා නොහැක.'
                  : 'Loyalty cycle runs from 18 July to 17 July at 24:00 (Asia/Colombo). Unused points expire at midnight and never carry over.'}
              </p>
            </div>
          </div>

          {/* Customer Annual Ranking Banner (Requirement 2 & 5) */}
          {loyalty && loyalty.annualRank !== undefined && (
            <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/20 to-amber-500/10 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-sm">
                  <Trophy className="w-5 h-5 text-yellow-100 fill-yellow-200" />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                    {language === 'si' ? 'වාර්ෂික ලෝයල්ටි ශ්‍රේණිගත කිරීම (Annual Ranking)' : 'Annual Loyalty Ranking Position'}
                  </div>
                  <div className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span className="text-amber-800">Rank #{loyalty.annualRank}</span>
                    <span className="text-xs font-semibold text-slate-600">
                      ({loyalty.currentCycleEarnedPoints} Star Points in {loyalty.currentCycle})
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-300 inline-block">
                  {loyalty.annualRank === 1
                    ? '🥇 Top Gold Rank'
                    : loyalty.annualRank <= 3
                    ? '🥈 Silver Rank'
                    : loyalty.annualRank <= 10
                    ? '🥉 Top 10 Star Member'
                    : '⭐ Active Member'}
                </span>
              </div>
            </div>
          )}

          {/* Active Annual Announcement Banner (Requirement 5) */}
          {loyalty?.announcement && loyalty.announcement.isActive && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-emerald-100" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-extrabold text-emerald-950 text-sm">
                  {language === 'si' && loyalty.announcement.headlineSi
                    ? loyalty.announcement.headlineSi
                    : loyalty.announcement.headline}
                </div>
                <p className="text-emerald-800 mt-1">
                  {language === 'si' && loyalty.announcement.messageSi
                    ? loyalty.announcement.messageSi
                    : loyalty.announcement.message}
                </p>
              </div>
            </div>
          )}

          {/* Main Loyalty KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Available Star Points */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-100/70 border-2 border-amber-300 rounded-xl p-4 text-center shadow-xs relative overflow-hidden">
              <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                {language === 'si' ? 'දැනට පවතින තරු ලකුණු' : 'Available Star Points'}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-600 mt-1 flex items-center justify-center gap-1">
                <Star className="w-6 h-6 fill-amber-500 text-amber-600 shrink-0" />
                <span>{loyalty ? loyalty.availablePoints.toLocaleString() : '0'}</span>
              </div>
              <div className="text-[10px] font-bold text-amber-700/80 mt-1">
                {language === 'si' ? 'භාවිතයට සූදානම් ලකුණු' : 'Ready to Redeem'}
              </div>
            </div>

            {/* 2. Total Purchases Current Cycle */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {language === 'si' ? 'මෙම වසරේ මුළු මිලදී ගැනීම්' : 'Current Year Purchases'}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                Rs. {loyalty ? loyalty.currentCyclePurchases.toLocaleString() : '0'}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{loyalty ? loyalty.currentCycle : 'Active Cycle'}</span>
              </div>
            </div>

            {/* 3. Total Points Earned */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center shadow-xs">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {language === 'si' ? 'උපයාගත් මුළු ලකුණු' : 'Total Points Earned'}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
                {loyalty ? loyalty.totalPointsEarnedAllTime.toLocaleString() : '0'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">
                {language === 'si' ? 'සම්පූර්ණ ඉතිහාසය' : 'All-Time Earned'}
              </div>
            </div>

            {/* 4. Expiry Date */}
            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 text-center shadow-xs">
              <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-rose-600" />
                <span>{language === 'si' ? 'කල් ඉකුත්වන දිනය' : 'Expiry Date'}</span>
              </div>
              <div className="text-base sm:text-lg font-black text-rose-900 mt-1">
                {loyalty ? loyalty.expiryDate : '17 July'}
              </div>
              <div className="text-[10px] font-bold text-rose-700 mt-1">
                {language === 'si' ? 'මධ්‍යම රාත්‍රී 24:00 ට' : 'At 24:00 (Midnight)'}
              </div>
            </div>
          </div>

          {/* Secondary Info Bar: Annual Cycle & Points Formula */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{language === 'si' ? 'වාර්ෂික ලෝයල්ටි කාලසීමාව:' : 'Annual Loyalty Period:'}</strong>{' '}
                <span className="font-semibold text-slate-900">
                  {language === 'si' ? (loyalty?.currentCyclePeriodSi || 'ජූලි 18 – ජූලි 17') : (loyalty?.currentCyclePeriod || '18 July – 17 July')}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowFormulaModal(!showFormulaModal)}
              className="text-amber-800 hover:text-amber-950 font-bold underline flex items-center gap-1 text-[11px]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{language === 'si' ? 'ලකුණු ගණනය කරන ආකාරය (Formula)' : 'How Star Points are Calculated'}</span>
            </button>
          </div>

          {/* Formula Explanation Accordion / Card */}
          {showFormulaModal && (
            <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Automatic Star Point Calculation Formula</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg font-mono font-bold text-amber-950 text-xs border border-amber-200">
                Star Points = FLOOR(Eligible Purchase Amount / 1000) × 5
              </div>
              <p className="text-slate-600 text-[11px]">
                Every registered customer automatically receives <strong>5 Star Points</strong> for every completed <strong>Rs. 1,000</strong> of eligible purchases. Only complete multiples of Rs. 1,000 qualify for points. We never round up.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-semibold text-[11px]">
                <div className="bg-slate-100 p-1.5 rounded text-center">Rs. 999 = <span className="text-rose-600 font-bold">0 pts</span></div>
                <div className="bg-amber-100 p-1.5 rounded text-center">Rs. 1,000 = <span className="text-amber-800 font-bold">5 pts</span></div>
                <div className="bg-amber-100 p-1.5 rounded text-center">Rs. 2,000 = <span className="text-amber-800 font-bold">10 pts</span></div>
                <div className="bg-amber-100 p-1.5 rounded text-center">Rs. 3,500 = <span className="text-amber-800 font-bold">15 pts</span></div>
                <div className="bg-amber-100 p-1.5 rounded text-center">Rs. 5,000 = <span className="text-amber-800 font-bold">25 pts</span></div>
                <div className="bg-amber-100 p-1.5 rounded text-center">Rs. 10,000 = <span className="text-amber-800 font-bold">50 pts</span></div>
              </div>
            </div>
          )}

          {/* Approved Annual Customer Rewards & Benefits (Requirement 3 & 5) */}
          {loyalty?.annualRewards && loyalty.annualRewards.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">
                    {language === 'si' ? 'ඔබ වෙනුවෙන් අනුමත වූ වාර්ෂික ත්‍යාග' : 'Approved Annual Customer Rewards & Gifts'}
                  </h3>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {loyalty.annualRewards.length} {loyalty.annualRewards.length === 1 ? 'Reward Confirmed' : 'Rewards Confirmed'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loyalty.annualRewards.map((reward) => (
                  <div key={reward.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                          {reward.rewardType.replace(/_/g, ' ')}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{reward.rewardTitle}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          reward.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : reward.status === 'Ready for Collection'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : reward.status === 'Delivered'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {reward.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">{reward.rewardDescription}</p>

                    <div className="flex items-center justify-between pt-1 text-xs border-t border-slate-100">
                      <span className="text-slate-500 text-[10px]">Estimated Value:</span>
                      <span className="font-extrabold text-amber-700">Rs. {reward.rewardValue.toLocaleString()}</span>
                    </div>

                    {reward.voucherCode && (
                      <div className="bg-amber-50 border border-dashed border-amber-300 rounded-lg p-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-amber-800 uppercase block">Voucher Code:</span>
                          <span className="font-mono font-black text-amber-950 text-xs">{reward.voucherCode}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(reward.voucherCode || '');
                            setCopiedVoucherId(reward.id);
                            setTimeout(() => setCopiedVoucherId(null), 2000);
                          }}
                          className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded text-[10px] font-bold border border-amber-200 transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          {copiedVoucherId === reward.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedVoucherId === reward.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {reward.collectionInstructions && (
                      <div className="text-[10px] text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <strong className="text-slate-800">Collection Instructions:</strong> {reward.collectionInstructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 8 Mandatory Disclaimer */}
          <div className="text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
            {language === 'si'
              ? 'දැනුම්දීම: තරු ලකුණු යනු වාර්ෂික ත්‍යාග සුදුසුකම් සලකා බැලීමේ ලකුණු පමණක් වන අතර මුදල් හෝ සෘජු වට්ටම් බවට පරිවර්තනය නොකෙරේ. වාර්ෂික ත්‍යාග තීරණය කිරීමේ සම්පූර්ණ අයිතිය පරිපාලනය සතුය.'
              : 'Official Notice: Star Points are loyalty rewards eligibility points and are not directly convertible into cash. All annual rewards, vouchers, and customer benefits are officially reviewed and approved by Food & Life Management.'}
          </div>

          {/* Transaction Points History Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'si' ? 'ලකුණු ගනුදෙනු ඉතිහාසය' : 'Points Transaction History'}
                </h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {language === 'si' ? 'සියල්ල' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('earn')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    activeTab === 'earn' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {language === 'si' ? 'උපයාගත්' : 'Earned'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expired')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    activeTab === 'expired' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {language === 'si' ? 'කල් ඉකුත් වූ' : 'Expired'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                <span>Loading your Star Points ledger...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="font-bold text-slate-700">No Star Points transactions found.</div>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Complete your grocery orders with Food &amp; Life to automatically earn 5 Star Points for every Rs. 1,000 spent!
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Type &amp; Description</th>
                        <th className="px-3 py-2.5 text-right">Purchase (LKR)</th>
                        <th className="px-3 py-2.5 text-center">Points</th>
                        <th className="px-3 py-2.5 text-right">Cycle Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((tx) => {
                        const isPositive = tx.points > 0;
                        return (
                          <tr key={tx.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="px-3 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(tx.date).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                    tx.type === 'EARN'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : tx.type === 'EXPIRY'
                                      ? 'bg-rose-100 text-rose-800'
                                      : tx.type === 'REVERSAL'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                                {tx.orderNumber && (
                                  <span className="text-slate-600 font-mono text-[11px]">
                                    #{tx.orderNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                                {tx.description}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-[11px] text-slate-700 font-medium">
                              {tx.purchaseAmount > 0 ? `Rs. ${tx.purchaseAmount.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              <span
                                className={`font-black text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                                  isPositive
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {isPositive ? `+${tx.points}` : tx.points} ⭐
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-[11px] text-slate-500 whitespace-nowrap">
                              {tx.type === 'EXPIRY' ? (
                                <span className="text-rose-600 font-semibold">Expired</span>
                              ) : (
                                <span>17 July</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Customer ID: <strong>{loyalty?.customerId || 'Registered Guest'}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            {language === 'si' ? 'වසන්න' : 'Close Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
