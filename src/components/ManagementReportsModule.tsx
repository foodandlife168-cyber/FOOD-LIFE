/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  CreditCard,
  Package,
  FileSpreadsheet,
  Users,
  Download,
  Filter,
  Calendar,
  Search,
  AlertTriangle,
  FileText,
  ShieldCheck,
  RefreshCw,
  Eye,
  X,
  ChevronDown,
  Building2,
  DollarSign,
  UserCheck,
  Plus,
  Lock,
  Wallet,
  Check,
} from 'lucide-react';
import { formatLKR, formatLKRShort, toSriLankaDate } from '../utils/sriLankaTime.ts';
import {
  generateDailyReportPdf,
  generateMonthlyReportPdf,
  generateAnnualReportPdf,
  generateCustomerStatementsPdf,
  generateDeliveryHireReportPdf,
  generateStockReportPdf,
  generatePurchaseOrdersReportPdf,
  generateDeliveryAgentsReportPdf,
} from '../utils/generateManagementReportsPdf.ts';
import type {
  ManagementDashboardStats,
  CustomerAccountLedger,
  DeliveryHireRecord,
  ProductStockReportItem,
  PurchaseOrderReportItem,
  DeliveryAgentRegisterItem,
  StaffRole,
  ReportAuditLog,
} from '../types/index.ts';
import { DateRangePicker } from './DateRangePicker.tsx';

interface ManagementReportsModuleProps {
  authToken: string | null;
  currentUser?: {
    name: string;
    username: string;
    role: StaffRole;
    permissions?: string[];
  } | null;
}

export const ManagementReportsModule: React.FC<ManagementReportsModuleProps> = ({
  authToken,
  currentUser,
}) => {
  const activeUser = currentUser || {
    name: 'Food & Life Administrator',
    username: 'Admin',
    role: 'Admin' as StaffRole,
    permissions: ['*'],
  };
  // Current Active Sub-Section
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'customers' | 'delivery_hire' | 'stock' | 'purchase_orders' | 'agents' | 'staff_admin'
  >('dashboard');

  // Filter States
  const [reportPeriodType, setReportPeriodType] = useState<'all' | 'daily' | 'monthly' | 'annual' | 'custom'>('all');
  const [filterDate, setFilterDate] = useState<string>(toSriLankaDate().dateStr);
  const [filterMonth, setFilterMonth] = useState<number>(toSriLankaDate().month);
  const [filterYear, setFilterYear] = useState<number>(toSriLankaDate().year);
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [filterCustomerPhone, setFilterCustomerPhone] = useState<string>('');
  const [filterProductId, setFilterProductId] = useState<string>('all');
  const [filterAgentId, setFilterAgentId] = useState<string>('all');
  const [filterOrderStatus, setFilterOrderStatus] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [filterPoStatus, setFilterPoStatus] = useState<string>('all');

  // Data State
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    stats: ManagementDashboardStats;
    orders: any[];
    customerAccounts: CustomerAccountLedger[];
    deliveryRecords: DeliveryHireRecord[];
    productStockItems: ProductStockReportItem[];
    purchaseOrderReportItems: PurchaseOrderReportItem[];
    deliveryAgentRegisterItems: DeliveryAgentRegisterItem[];
    monthlyBreakdown: any[];
  } | null>(null);

  // Modals & Details
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccountLedger | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerFilterBalanceOnly, setCustomerFilterBalanceOnly] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<CustomerAccountLedger | null>(null);
  const [customerPaymentForm, setCustomerPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    receiptNumber: '',
    note: '',
    receivedBy: 'Staff',
  });
  const [isSubmittingCustomerPayment, setIsSubmittingCustomerPayment] = useState(false);

  // Downloading State & Feedback
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Staff Accounts & Audit Logs (Admin only)
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<ReportAuditLog[]>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Manager' | 'Staff'>('Staff');
  const [newStaffPassword, setNewStaffPassword] = useState('');

  const isAdmin = activeUser.role === 'Admin';
  const isManager = activeUser.role === 'Manager' || isAdmin;

  // Fetch Report Data
  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('reportType', reportPeriodType);
      if (reportPeriodType === 'daily') queryParams.set('date', filterDate);
      if (reportPeriodType === 'monthly') {
        queryParams.set('month', String(filterMonth));
        queryParams.set('year', String(filterYear));
      }
      if (reportPeriodType === 'annual') queryParams.set('year', String(filterYear));
      if (reportPeriodType === 'custom') {
        if (filterFromDate) queryParams.set('fromDate', filterFromDate);
        if (filterToDate) queryParams.set('toDate', filterToDate);
      }
      if (filterCustomerPhone) queryParams.set('customerPhone', filterCustomerPhone);
      if (filterProductId !== 'all') queryParams.set('productId', filterProductId);
      if (filterAgentId !== 'all') queryParams.set('agentId', filterAgentId);
      if (filterOrderStatus !== 'all') queryParams.set('orderStatus', filterOrderStatus);
      if (filterPaymentStatus !== 'all') queryParams.set('paymentStatus', filterPaymentStatus);
      if (filterPoStatus !== 'all') queryParams.set('poStatus', filterPoStatus);

      const res = await fetch(`/api/admin/reports/data?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load management report data');
      }

      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Error loading report metrics' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordCustomerPaymentFromReports = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalCustomer) return;
    const num = Number(customerPaymentForm.amount);
    if (isNaN(num) || num <= 0) {
      setFeedback({ success: false, message: 'Please enter a valid payment amount greater than Rs. 0' });
      return;
    }
    setIsSubmittingCustomerPayment(true);
    try {
      const res = await fetch(`/api/admin/customers/${paymentModalCustomer.customerId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: num,
          paymentMethod: customerPaymentForm.paymentMethod,
          receiptNumber: customerPaymentForm.receiptNumber.trim() || undefined,
          note: customerPaymentForm.note.trim() || undefined,
          receivedBy: customerPaymentForm.receivedBy.trim() || activeUser.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ success: false, message: data.error || 'Failed to record customer payment.' });
        setIsSubmittingCustomerPayment(false);
        return;
      }
      setFeedback({ success: true, message: `Payment of Rs. ${num.toLocaleString()} recorded successfully for ${paymentModalCustomer.customerName}!` });
      setPaymentModalCustomer(null);
      await fetchReportData();
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Server error recording customer payment.' });
    } finally {
      setIsSubmittingCustomerPayment(false);
    }
  };

  // Load staff admin data
  const fetchStaffAdminData = async () => {
    if (!isAdmin) return;
    try {
      const [staffRes, auditRes] = await Promise.all([
        fetch('/api/admin/staff-accounts', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/admin/reports/audit-logs', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      if (staffRes.ok) setStaffAccounts(await staffRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [
    reportPeriodType,
    filterDate,
    filterMonth,
    filterYear,
    filterFromDate,
    filterToDate,
    filterProductId,
    filterAgentId,
    filterOrderStatus,
    filterPaymentStatus,
    filterPoStatus,
  ]);

  useEffect(() => {
    if (activeSection === 'staff_admin' && isAdmin) {
      fetchStaffAdminData();
    }
  }, [activeSection]);

  // Log report download to server audit log
  const recordAuditDownload = async (reportType: string) => {
    try {
      await fetch('/api/admin/reports/audit-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          reportType,
          filters: {
            periodType: reportPeriodType,
            date: filterDate,
            month: filterMonth,
            year: filterYear,
            from: filterFromDate,
            to: filterToDate,
          },
        }),
      });
    } catch {
      // ignore audit log error
    }
  };

  // PDF Handlers
  const handleDownloadDailyPdf = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generateDailyReportPdf({
        date: filterDate,
        stats: reportData.stats,
        orders: reportData.orders,
        customerAccounts: reportData.customerAccounts,
        deliveryRecords: reportData.deliveryRecords,
        generatedBy: activeUser,
      });
      doc.save(`FOOD_LIFE_DAILY_REPORT_${filterDate}.pdf`);
      await recordAuditDownload('DAILY_REPORT_PDF');
      setFeedback({ success: true, message: `Daily Report PDF downloaded for ${filterDate}` });
    } catch (err: any) {
      setFeedback({ success: false, message: 'Failed to generate Daily Report PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadMonthlyPdf = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generateMonthlyReportPdf({
        month: filterMonth,
        year: filterYear,
        stats: reportData.stats,
        monthlyRevenue: reportData.stats.totalRevenue,
        monthlyOrdersCount: reportData.stats.totalOrders,
        customerOutstandingTotal: reportData.stats.customerOutstandingBalances,
        deliveryExpensesTotal: reportData.stats.deliveryHireAccounting.totalHireExpenses,
        bestSellers: [...reportData.productStockItems].sort((a, b) => b.stockSold - a.stockSold),
        generatedBy: activeUser,
      });
      doc.save(`FOOD_LIFE_MONTHLY_REPORT_${filterYear}_${filterMonth}.pdf`);
      await recordAuditDownload('MONTHLY_REPORT_PDF');
      setFeedback({ success: true, message: `Monthly Report PDF downloaded for ${filterMonth}/${filterYear}` });
    } catch {
      setFeedback({ success: false, message: 'Failed to generate Monthly Report PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAnnualPdf = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generateAnnualReportPdf({
        year: filterYear,
        stats: reportData.stats,
        annualRevenue: reportData.stats.totalRevenue,
        annualOrdersCount: reportData.stats.totalOrders,
        monthlyBreakdown: reportData.monthlyBreakdown,
        generatedBy: activeUser,
      });
      doc.save(`FOOD_LIFE_ANNUAL_REPORT_${filterYear}.pdf`);
      await recordAuditDownload('ANNUAL_REPORT_PDF');
      setFeedback({ success: true, message: `Annual Report PDF downloaded for ${filterYear}` });
    } catch {
      setFeedback({ success: false, message: 'Failed to generate Annual Report PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCustomerStatementsPdf = async (singleCust?: CustomerAccountLedger) => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generateCustomerStatementsPdf({
        customerAccounts: reportData.customerAccounts,
        singleCustomer: singleCust,
        period: reportPeriodType === 'daily' ? filterDate : reportPeriodType === 'monthly' ? `${filterMonth}/${filterYear}` : 'Ledger Period',
        generatedBy: activeUser,
      });
      const fname = singleCust
        ? `FOOD_LIFE_STATEMENT_${singleCust.customerId}.pdf`
        : `FOOD_LIFE_CUSTOMER_BALANCES_REPORT.pdf`;
      doc.save(fname);
      await recordAuditDownload(singleCust ? `CUSTOMER_STATEMENT_${singleCust.customerId}` : 'ALL_CUSTOMER_STATEMENTS');
      setFeedback({ success: true, message: `Customer Statement PDF generated successfully` });
    } catch {
      setFeedback({ success: false, message: 'Failed to generate Customer Statement PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDeliveryHirePdf = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generateDeliveryHireReportPdf({
        records: reportData.deliveryRecords,
        totals: reportData.stats.deliveryHireAccounting,
        period: reportPeriodType === 'daily' ? filterDate : 'Full Period',
        generatedBy: activeUser,
      });
      doc.save(`FOOD_LIFE_DELIVERY_HIRE_REPORT.pdf`);
      await recordAuditDownload('DELIVERY_HIRE_REPORT_PDF');
      setFeedback({ success: true, message: 'Delivery Hire Report PDF downloaded' });
    } catch {
      setFeedback({ success: false, message: 'Failed to generate Delivery Hire Report PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadStockPdf = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generateStockReportPdf({
        products: reportData.productStockItems,
        totals: {
          totalProducts: reportData.stats.productsStockSummary.totalProducts,
          retailValue: reportData.stats.productsStockSummary.retailValue,
          costValue: reportData.stats.productsStockSummary.costValue,
          lowStockCount: reportData.stats.productsStockSummary.lowStockCount,
          outOfStockCount: reportData.stats.productsStockSummary.outOfStockCount,
        },
        period: toSriLankaDate().displayDate,
        generatedBy: activeUser,
      });
      doc.save(`FOOD_LIFE_STOCK_VALUATION_REPORT.pdf`);
      await recordAuditDownload('STOCK_REPORT_PDF');
      setFeedback({ success: true, message: 'Products & Stock Valuation Report PDF downloaded' });
    } catch {
      setFeedback({ success: false, message: 'Failed to generate Stock Report PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPurchaseOrdersPdf = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generatePurchaseOrdersReportPdf({
        purchaseOrders: reportData.purchaseOrderReportItems,
        totals: {
          totalPOs: reportData.stats.purchaseOrdersSummary.totalPOs,
          totalAmount: reportData.stats.purchaseOrdersSummary.totalPurchaseCommitment,
          pendingDeliveries: reportData.stats.purchaseOrdersSummary.pendingQty,
        },
        period: 'Full Period',
        generatedBy: activeUser,
      });
      doc.save(`FOOD_LIFE_PURCHASE_ORDERS_REPORT.pdf`);
      await recordAuditDownload('PURCHASE_ORDERS_REPORT_PDF');
      setFeedback({ success: true, message: 'Purchase Orders Report PDF downloaded' });
    } catch {
      setFeedback({ success: false, message: 'Failed to generate Purchase Orders Report PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDeliveryAgentsPdf = async () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const doc = await generateDeliveryAgentsReportPdf({
        agents: reportData.deliveryAgentRegisterItems,
        totals: {
          totalAgents: reportData.stats.registeredDeliveryAgents.totalAgents,
          activeAgents: reportData.stats.registeredDeliveryAgents.activeAgents,
          totalDeliveries: reportData.stats.registeredDeliveryAgents.totalTripsCompleted,
        },
        period: 'Registered Active Roster',
        generatedBy: activeUser,
      });
      doc.save(`FOOD_LIFE_DELIVERY_AGENTS_REGISTER.pdf`);
      await recordAuditDownload('DELIVERY_AGENTS_REGISTER_PDF');
      setFeedback({ success: true, message: 'Delivery Agents Register PDF downloaded' });
    } catch {
      setFeedback({ success: false, message: 'Failed to generate Delivery Agents Register PDF' });
    } finally {
      setIsDownloading(false);
    }
  };

  // Filtered customer list for table
  const displayedCustomers = useMemo(() => {
    if (!reportData?.customerAccounts) return [];
    return reportData.customerAccounts.filter((c) => {
      if (customerFilterBalanceOnly && c.outstandingBalance <= 0) return false;
      if (customerSearchQuery) {
        const q = customerSearchQuery.toLowerCase();
        return (
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.includes(q) ||
          c.customerId.toLowerCase().includes(q) ||
          c.deliveryArea.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reportData?.customerAccounts, customerFilterBalanceOnly, customerSearchQuery]);

  const stats = reportData?.stats;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. MODULE HEADER & AUTHORIZED STAFF BADGE */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Management Reports &amp; Accounting</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Official Branch Ledger
                  </span>
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  FOOD &amp; LIFE • RG GROUP (PVT) LTD • Katuloya Branch • 929, Kandy Road, Cross Wattegama
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Staff Role Badge */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Authenticated Staff</span>
                <span className="font-bold text-white">
                  {activeUser.name} <span className="text-orange-400 font-mono">({activeUser.role})</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchReportData}
              disabled={isLoading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
              feedback.success
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. ADVANCED REPORTING & TIMEZONE FILTERS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-orange-500" />
            <span>Reporting Period &amp; Time Filters (Sri Lanka Time UTC+05:30)</span>
          </div>

          {/* Period Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {(['all', 'daily', 'monthly', 'annual', 'custom'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setReportPeriodType(mode)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  reportPeriodType === mode
                    ? 'bg-orange-500 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'all' ? 'All History' : mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Daily Date Picker */}
          {reportPeriodType === 'daily' && (
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Selected Date:</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          {/* Monthly Month/Year Picker */}
          {reportPeriodType === 'monthly' && (
            <>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Month:</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                >
                  {[
                    '1 - January',
                    '2 - February',
                    '3 - March',
                    '4 - April',
                    '5 - May',
                    '6 - June',
                    '7 - July',
                    '8 - August',
                    '9 - September',
                    '10 - October',
                    '11 - November',
                    '12 - December',
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Year:</label>
                <input
                  type="number"
                  min="2024"
                  max="2030"
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>
            </>
          )}

          {/* Annual Year Picker */}
          {reportPeriodType === 'annual' && (
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Financial Year:</label>
              <input
                type="number"
                min="2024"
                max="2030"
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          {/* Custom Date Range Picker */}
          {reportPeriodType === 'custom' && (
            <div className="sm:col-span-2 bg-orange-50/60 p-3 rounded-2xl border border-orange-200/90 shadow-2xs">
              <DateRangePicker
                fromDate={filterFromDate}
                toDate={filterToDate}
                onChange={(from, to) => {
                  setFilterFromDate(from);
                  setFilterToDate(to);
                }}
                onClear={() => {
                  setFilterFromDate('');
                  setFilterToDate('');
                }}
              />
            </div>
          )}

          {/* Order Status Filter */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Order Status:</label>
            <select
              value={filterOrderStatus}
              onChange={(e) => setFilterOrderStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Orders</option>
              <option value="Delivered">Delivered</option>
              <option value="Order Received">Order Received</option>
              <option value="Preparing Order">Preparing Order</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Collected by Customer">Collected by Customer</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Payment Status:</label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Payments</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIALLY PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid (Credit)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SUB-MODULE NAVIGATION TABS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold">
        {[
          { id: 'dashboard', label: '1. Performance Dashboard', icon: BarChart3 },
          { id: 'customers', label: '2. Customer Balances & Statements', icon: CreditCard },
          { id: 'delivery_hire', label: '3. Delivery Hire Accounting', icon: Truck },
          { id: 'stock', label: '4. Products & Stock Reports', icon: Package },
          { id: 'purchase_orders', label: '5. Purchase Orders Reports', icon: FileSpreadsheet },
          { id: 'agents', label: '6. Delivery Agent Register', icon: Users },
          ...(isAdmin ? [{ id: 'staff_admin', label: '7. Staff Roles & Audit Log', icon: ShieldCheck }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-md font-black'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-xs'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: BUSINESS PERFORMANCE DASHBOARD (11 CARDS) */}
      {/* ------------------------------------------------------------- */}
      {activeSection === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Quick PDF Export Bar */}
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Executive Business PDF Reports</span>
              </h3>
              <p className="text-xs text-slate-600">
                Generate official printable statements with Food &amp; Life logo, RG GROUP credentials &amp; Katuloya details.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadDailyPdf}
                disabled={isDownloading}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Daily Report PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadMonthlyPdf}
                disabled={isDownloading}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Monthly Report PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadAnnualPdf}
                disabled={isDownloading}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Annual Report PDF</span>
              </button>

              <a
                href={`/api/admin/loyalty/export-pdf?autoprint=true${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Customer Loyalty Star Points Full Report (සම්පූර්ණ Star Points PDF වාර්තාව)"
              >
                <FileText className="w-3.5 h-3.5 text-amber-200" />
                <span>Star Points Report PDF (තරු ලකුණු)</span>
              </a>
            </div>
          </div>

          {/* 11 Performance Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* 1. Total Revenue */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Total Revenue</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-800">{formatLKR(stats.totalRevenue)}</div>
              <p className="text-[11px] text-slate-500 font-medium">Completed non-cancelled orders</p>
            </div>

            {/* 2. Total Orders */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Total Orders</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingBag className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.totalOrders}</div>
              <p className="text-[11px] text-slate-500 font-medium">Recorded in active reporting filter</p>
            </div>

            {/* 3. New / Pending Orders */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">3. New / Pending</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600">{stats.pendingOrders}</div>
              <p className="text-[11px] text-slate-500 font-medium">Awaiting kitchen &amp; packing confirmation</p>
            </div>

            {/* 4. Preparing Orders */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-orange-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">4. Preparing Orders</span>
                <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-orange-600">{stats.preparingOrders}</div>
              <p className="text-[11px] text-slate-500 font-medium">Packing floor / ready for dispatch</p>
            </div>

            {/* 5. Out for Delivery Orders */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">5. Out for Delivery</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-600">{stats.outForDeliveryOrders}</div>
              <p className="text-[11px] text-slate-500 font-medium">En route across Katuloya &amp; hills</p>
            </div>

            {/* 6. Delivered Orders */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">6. Delivered Orders</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700">{stats.deliveredOrders}</div>
              <p className="text-[11px] text-slate-500 font-medium">Successfully completed drop-offs</p>
            </div>

            {/* 7. Customer Outstanding Balances */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-rose-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">7. Customer Balances</span>
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600">
                {formatLKR(stats.customerOutstandingBalances)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Unpaid customer credit balances</p>
            </div>

            {/* 8. Delivery Hire Accounting */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">8. Delivery Hire</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Truck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-base font-black text-slate-900">
                Fees: <span className="text-emerald-700">{formatLKRShort(stats.deliveryHireAccounting.totalFeesCollected)}</span>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Hire Cost: <span className="font-bold text-slate-900">{formatLKRShort(stats.deliveryHireAccounting.totalHireExpenses)}</span>
                <span className="block text-[10px] text-orange-600 font-bold">
                  Pending Driver Payout: {formatLKRShort(stats.deliveryHireAccounting.outstandingAgentPayments)}
                </span>
              </div>
            </div>

            {/* 9. Products & Stock Summary */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">9. Stock Summary</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {stats.productsStockSummary.totalProducts} Items
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                Retail Val: <span className="font-bold text-emerald-800">{formatLKRShort(stats.productsStockSummary.retailValue)}</span>
                <span className="block text-amber-700 font-bold">
                  {stats.productsStockSummary.lowStockCount} Low / {stats.productsStockSummary.outOfStockCount} Out of Stock
                </span>
              </div>
            </div>

            {/* 10. Purchase Orders Summary */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">10. Purchase Orders</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900">{stats.purchaseOrdersSummary.totalPOs} Orders</div>
              <p className="text-[11px] text-slate-600 font-medium">
                Received: <span className="font-bold">{stats.purchaseOrdersSummary.totalReceivedQty}</span> /{' '}
                <span className="text-slate-500">{stats.purchaseOrdersSummary.totalOrderedQty} items</span>
              </p>
            </div>

            {/* 11. Registered Delivery Agents */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-2 hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">11. Delivery Agents</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {stats.registeredDeliveryAgents.activeAgents} / {stats.registeredDeliveryAgents.totalAgents} Active
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Total completed trips: <span className="font-bold text-slate-800">{stats.registeredDeliveryAgents.totalTripsCompleted}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CUSTOMER BALANCES & STATEMENTS */}
      {/* ------------------------------------------------------------- */}
      {activeSection === 'customers' && reportData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Customer Balance Ledger &amp; Statements</h3>
              <p className="text-xs text-slate-500">
                Historical customer purchase ledger, partial payments, and credit balances across Katuloya
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleDownloadCustomerStatementsPdf()}
                disabled={isDownloading}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All Balances PDF</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone, or area..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={customerFilterBalanceOnly}
                onChange={(e) => setCustomerFilterBalanceOnly(e.target.checked)}
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Show Unpaid Balances Only</span>
            </label>
          </div>

          {/* Customer Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Customer Name &amp; ID</th>
                  <th className="py-3 px-3.5">Contact Phone</th>
                  <th className="py-3 px-3.5">Area</th>
                  <th className="py-3 px-3.5">Total Orders</th>
                  <th className="py-3 px-3.5">Total Purchases</th>
                  <th className="py-3 px-3.5">Payments Received</th>
                  <th className="py-3 px-3.5">Outstanding Balance</th>
                  <th className="py-3 px-3.5 text-right">Statement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      No matching customer accounts found.
                    </td>
                  </tr>
                ) : (
                  displayedCustomers.map((c, idx) => (
                    <tr key={`${c.customerId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{c.customerName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{c.customerId}</div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-700">{c.customerPhone}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-600">{c.deliveryArea}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-800">{c.totalOrders}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">{formatLKR(c.totalPurchases)}</td>
                      <td className="py-3 px-3.5 font-medium text-emerald-700">{formatLKR(c.paymentsReceived)}</td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`font-black ${
                            c.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatLKR(c.outstandingBalance)}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentModalCustomer(c);
                            setCustomerPaymentForm({
                              amount: c.outstandingBalance > 0 ? String(c.outstandingBalance) : '',
                              paymentMethod: 'cash',
                              receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
                              note: '',
                              receivedBy: activeUser.name,
                            });
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1"
                          title="Record Customer Payment"
                        >
                          <Wallet className="w-3 h-3" />
                          <span>Record Payment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsCustomerModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all"
                        >
                          Statement
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCustomerStatementsPdf(c)}
                          className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[11px] font-bold transition-all"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: DELIVERY HIRE ACCOUNTING */}
      {/* ------------------------------------------------------------- */}
      {activeSection === 'delivery_hire' && reportData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Delivery Hire Accounting Ledger</h3>
              <p className="text-xs text-slate-500">
                Customer delivery fees collected vs Driver hire expenses (Strictly segregated)
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadDeliveryHirePdf}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Delivery Hire Report PDF</span>
            </button>
          </div>

          {/* Segregated Totals Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1">
              <span className="font-bold text-emerald-800 uppercase text-[10px]">Total Delivery Fees (Revenue)</span>
              <div className="text-xl font-black text-emerald-900">
                {formatLKR(reportData.stats.deliveryHireAccounting.totalFeesCollected)}
              </div>
              <p className="text-[10px] text-emerald-700">Charged directly to customers</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-700 uppercase text-[10px]">Total Hire Cost (Expense)</span>
              <div className="text-xl font-black text-slate-900">
                {formatLKR(reportData.stats.deliveryHireAccounting.totalHireExpenses)}
              </div>
              <p className="text-[10px] text-slate-500">Payable to assigned delivery agents</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-1">
              <span className="font-bold text-blue-800 uppercase text-[10px]">Total Paid to Drivers</span>
              <div className="text-xl font-black text-blue-900">
                {formatLKR(reportData.stats.deliveryHireAccounting.totalPaidToAgents)}
              </div>
              <p className="text-[10px] text-blue-700">Settled delivery trips</p>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 space-y-1">
              <span className="font-bold text-orange-800 uppercase text-[10px]">Outstanding Driver Payout</span>
              <div className="text-xl font-black text-orange-600">
                {formatLKR(reportData.stats.deliveryHireAccounting.outstandingAgentPayments)}
              </div>
              <p className="text-[10px] text-orange-700">Awaiting disbursement</p>
            </div>
          </div>

          {/* Delivery Records Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Order Ref</th>
                  <th className="py-3 px-3.5">Delivery Agent</th>
                  <th className="py-3 px-3.5">Vehicle</th>
                  <th className="py-3 px-3.5">Delivery Date</th>
                  <th className="py-3 px-3.5">Customer Delivery Fee</th>
                  <th className="py-3 px-3.5">Hire Expense</th>
                  <th className="py-3 px-3.5">Payout Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.deliveryRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No delivery trip records recorded in this period.
                    </td>
                  </tr>
                ) : (
                  reportData.deliveryRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{r.orderNumber}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-800">{r.agentName}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-500">{r.vehicleNumber}</td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {toSriLankaDate(r.deliveryDate).displayDate}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-emerald-800">{formatLKR(r.deliveryFee)}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-900">{formatLKR(r.hirePaymentAmount)}</td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            r.paymentStatus === 'paid_to_agent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {r.paymentStatus === 'paid_to_agent' ? 'Paid to Driver' : 'Pending Payout'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: PRODUCTS & STOCK REPORTS */}
      {/* ------------------------------------------------------------- */}
      {activeSection === 'stock' && reportData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Products &amp; Stock Valuation Ledger</h3>
              <p className="text-xs text-slate-500">
                Opening stock, goods received, sales deductions, valuation, and stock alerts
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadStockPdf}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Stock Report PDF</span>
            </button>
          </div>

          {/* Product Stock Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Product Name &amp; Barcode</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5">Selling Price</th>
                  <th className="py-3 px-3.5">Opening Qty</th>
                  <th className="py-3 px-3.5">Received Qty</th>
                  <th className="py-3 px-3.5">Sold Qty</th>
                  <th className="py-3 px-3.5">Current Stock</th>
                  <th className="py-3 px-3.5">Stock Value (LKR)</th>
                  <th className="py-3 px-3.5">Inventory Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.productStockItems.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{p.nameEn}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.barcode}</div>
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-600">{p.category}</td>
                    <td className="py-3 px-3.5 font-mono text-slate-800">{formatLKR(p.sellingPrice)}</td>
                    <td className="py-3 px-3.5 text-slate-600">{p.openingStock}</td>
                    <td className="py-3 px-3.5 text-emerald-700 font-bold">+{p.stockReceived}</td>
                    <td className="py-3 px-3.5 text-orange-700 font-bold">-{p.stockSold}</td>
                    <td className="py-3 px-3.5 font-black text-slate-900">{p.currentStock}</td>
                    <td className="py-3 px-3.5 font-medium text-emerald-800">{formatLKR(p.stockValue)}</td>
                    <td className="py-3 px-3.5">
                      {p.isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700">
                          Out of Stock
                        </span>
                      ) : p.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: PURCHASE ORDERS REPORTS */}
      {/* ------------------------------------------------------------- */}
      {activeSection === 'purchase_orders' && reportData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Purchase Orders &amp; Supplier Procurement</h3>
              <p className="text-xs text-slate-500">
                Track supplier replenishment, goods receipt reconciliation, and outstanding supplier commitments
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadPurchaseOrdersPdf}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Purchase Orders Report PDF</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">PO Number</th>
                  <th className="py-3 px-3.5">Supplier Name</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Ordered Qty</th>
                  <th className="py-3 px-3.5">Received Qty</th>
                  <th className="py-3 px-3.5">Pending Qty</th>
                  <th className="py-3 px-3.5">Est. Total</th>
                  <th className="py-3 px-3.5">PO Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.purchaseOrderReportItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No purchase order records found.
                    </td>
                  </tr>
                ) : (
                  reportData.purchaseOrderReportItems.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">{po.poNumber}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-800">{po.supplierName}</div>
                        <div className="text-[10px] text-slate-400">{po.supplierContact}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {toSriLankaDate(po.purchaseDate).displayDate}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900">{po.quantitiesOrdered}</td>
                      <td className="py-3 px-3.5 font-bold text-emerald-700">{po.quantitiesReceived}</td>
                      <td className="py-3 px-3.5 font-bold text-orange-600">{po.pendingQuantities}</td>
                      <td className="py-3 px-3.5 font-medium text-slate-800">{formatLKR(po.totalPurchaseAmount)}</td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            po.status === 'Fully Received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : po.status === 'Partially Received'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: DELIVERY AGENT REGISTER */}
      {/* ------------------------------------------------------------- */}
      {activeSection === 'agents' && reportData && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Delivery Agent Performance &amp; Register</h3>
              <p className="text-xs text-slate-500">
                Official delivery fleet roster, completed trip volumes, and hire payout status
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadDeliveryAgentsPdf}
              disabled={isDownloading}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Delivery Agents Report PDF</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Agent Name &amp; ID</th>
                  <th className="py-3 px-3.5">Mobile Contact</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Assigned Orders</th>
                  <th className="py-3 px-3.5">Completed Trips</th>
                  <th className="py-3 px-3.5">Pending Trips</th>
                  <th className="py-3 px-3.5">Total Hire Earned</th>
                  <th className="py-3 px-3.5">Pending Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.deliveryAgentRegisterItems.map((a) => (
                  <tr key={a.agentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{a.agentName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{a.agentId}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">{a.contactNumber}</td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          a.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-800">{a.assignedOrders}</td>
                    <td className="py-3 px-3.5 font-bold text-emerald-700">{a.completedDeliveries}</td>
                    <td className="py-3 px-3.5 font-bold text-amber-600">{a.pendingDeliveries}</td>
                    <td className="py-3 px-3.5 font-medium text-slate-900">{formatLKR(a.totalHirePayments)}</td>
                    <td className="py-3 px-3.5 font-bold text-orange-600">{formatLKR(a.outstandingPayments)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: STAFF ROLES & AUDIT LOG (ADMIN ONLY) */}
      {/* ------------------------------------------------------------- */}
      {activeSection === 'staff_admin' && isAdmin && (
        <div className="space-y-6">
          {/* Staff Accounts Management */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base">Staff Access Control &amp; Roles</h3>
                <p className="text-xs text-slate-500">
                  Role-based permissions for Admin, Manager, and Staff to safeguard confidential business statements
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingStaff(!isAddingStaff)}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Staff Account</span>
              </button>
            </div>

            {/* Add Staff Account Form */}
            {isAddingStaff && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newStaffUsername || !newStaffPassword || !newStaffName) return;
                  try {
                    const res = await fetch('/api/admin/staff-accounts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                      body: JSON.stringify({
                        username: newStaffUsername,
                        name: newStaffName,
                        role: newStaffRole,
                        password: newStaffPassword,
                        permissions:
                          newStaffRole === 'Manager'
                            ? [
                                'dashboard',
                                'daily_report',
                                'monthly_report',
                                'annual_report',
                                'customer_statements',
                                'delivery_hire',
                                'stock_reports',
                                'purchase_orders',
                                'delivery_agents',
                              ]
                            : ['dashboard', 'daily_report', 'stock_reports'],
                      }),
                    });
                    const d = await res.json();
                    if (!res.ok) throw new Error(d.error || 'Failed to create account');
                    setFeedback({ success: true, message: `Staff account '${newStaffUsername}' created successfully` });
                    setIsAddingStaff(false);
                    setNewStaffUsername('');
                    setNewStaffName('');
                    setNewStaffPassword('');
                    fetchStaffAdminData();
                  } catch (err: any) {
                    setFeedback({ success: false, message: err.message });
                  }
                }}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
              >
                <h4 className="font-bold text-xs text-slate-800">Create New Staff Account</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-600 block">Username:</label>
                    <input
                      type="text"
                      required
                      value={newStaffUsername}
                      onChange={(e) => setNewStaffUsername(e.target.value)}
                      placeholder="e.g. manager_ravi"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block">Full Name:</label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="e.g. Ravi Shantha"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block">Role:</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold"
                    >
                      <option value="Manager">Manager (Authorized Reports)</option>
                      <option value="Staff">Staff (Restricted Daily/Stock)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block">Password:</label>
                    <input
                      type="password"
                      required
                      value={newStaffPassword}
                      onChange={(e) => setNewStaffPassword(e.target.value)}
                      placeholder="Secure password"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingStaff(false)}
                    className="px-3 py-1 text-slate-600 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
                  >
                    Save Account
                  </button>
                </div>
              </form>
            )}

            {/* Staff Accounts Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                  <tr>
                    <th className="py-3 px-3.5">Staff Name &amp; Username</th>
                    <th className="py-3 px-3.5">Assigned Role</th>
                    <th className="py-3 px-3.5">Permissions</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{acc.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">@{acc.username}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            acc.role === 'Admin'
                              ? 'bg-purple-100 text-purple-800'
                              : acc.role === 'Manager'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {acc.role}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-[11px] text-slate-600">
                        {acc.permissions.includes('*') ? 'Full System Access' : `${acc.permissions.length} Reports Authorized`}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            acc.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {acc.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                        {acc.lastLogin ? toSriLankaDate(acc.lastLogin).formatted : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report Download Audit Log Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-500" />
              <span>Report Download Security Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500">
              Permanent immutable security log of every PDF report generated and downloaded by staff members
            </p>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3.5">Timestamp (SLT)</th>
                    <th className="py-2.5 px-3.5">Staff Member</th>
                    <th className="py-2.5 px-3.5">Role</th>
                    <th className="py-2.5 px-3.5">Report Type</th>
                    <th className="py-2.5 px-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No report download events logged yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3.5 font-mono text-[11px] text-slate-600">
                          {toSriLankaDate(log.timestamp).formatted}
                        </td>
                        <td className="py-2 px-3.5 font-bold text-slate-800">{log.staffName}</td>
                        <td className="py-2 px-3.5 font-mono text-[10px] text-slate-500">{log.staffRole}</td>
                        <td className="py-2 px-3.5 font-mono text-orange-700 font-bold">{log.reportType}</td>
                        <td className="py-2 px-3.5 font-mono text-slate-400 text-[10px]">{log.ipAddress}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: INDIVIDUAL CUSTOMER STATEMENT DRAWER */}
      {/* ------------------------------------------------------------- */}
      {isCustomerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">{selectedCustomer.customerName}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {selectedCustomer.customerId} • Contact: {selectedCustomer.customerPhone} • {selectedCustomer.deliveryArea}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">TOTAL PURCHASES</span>
                <span className="text-base font-black text-slate-900">{formatLKR(selectedCustomer.totalPurchases)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 block">PAYMENTS RECEIVED</span>
                <span className="text-base font-black text-emerald-800">{formatLKR(selectedCustomer.paymentsReceived)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-600 block">CURRENT OUTSTANDING</span>
                <span className="text-base font-black text-rose-600">{formatLKR(selectedCustomer.outstandingBalance)}</span>
              </div>
            </div>

            {/* Transactions Ledger */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800">Recorded Transactions History</h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Order / Ref</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCustomer.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600">{toSriLankaDate(tx.date).displayDate}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              tx.type === 'ORDER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{tx.orderNumber || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">{tx.description}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{formatLKR(tx.amount)}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{formatLKR(tx.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalCustomer(selectedCustomer);
                    setCustomerPaymentForm({
                      amount: selectedCustomer.outstandingBalance > 0 ? String(selectedCustomer.outstandingBalance) : '',
                      paymentMethod: 'cash',
                      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
                      note: '',
                      receivedBy: activeUser.name,
                    });
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadCustomerStatementsPdf(selectedCustomer)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Statement PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD CUSTOMER PAYMENT FROM REPORTS */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Wallet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Record Customer Payment</h3>
                  <p className="text-xs text-slate-500">
                    Automatic synchronization with Customer Balance, Statements &amp; Orders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-black text-slate-900 text-sm">{paymentModalCustomer.customerName}</span>
                  <div className="text-[11px] font-mono text-slate-500">
                    ID: {paymentModalCustomer.customerId} • Contact: {paymentModalCustomer.customerPhone}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Current Balance</span>
                  <span className={`text-base font-black ${(paymentModalCustomer.outstandingBalance ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatLKR(paymentModalCustomer.outstandingBalance ?? 0)}
                  </span>
                </div>
              </div>

              {(paymentModalCustomer.outstandingBalance ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setCustomerPaymentForm((prev) => ({
                      ...prev,
                      amount: String(paymentModalCustomer.outstandingBalance ?? 0),
                    }))
                  }
                  className="w-full py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all text-center"
                >
                  Quick Fill: Pay Full Outstanding ({formatLKR(paymentModalCustomer.outstandingBalance ?? 0)})
                </button>
              )}
            </div>

            <form onSubmit={handleRecordCustomerPaymentFromReports} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (Rs.) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rs.</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={customerPaymentForm.amount}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="e.g. 5000"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={customerPaymentForm.paymentMethod}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online / Card</option>
                    <option value="other">Other Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receipt / Ref Number
                  </label>
                  <input
                    type="text"
                    value={customerPaymentForm.receiptNumber}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, receiptNumber: e.target.value }))
                    }
                    placeholder="e.g. RCP-0021"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={customerPaymentForm.receivedBy}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, receivedBy: e.target.value }))
                    }
                    placeholder="Staff name"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Note / Memo (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerPaymentForm.note}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="Settlement note"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {Number(customerPaymentForm.amount) > 0 && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                  <span className="text-slate-600 font-medium">New Outstanding Balance After Payment:</span>
                  <span className="font-black text-emerald-800 text-sm">
                    {formatLKR(
                      Math.max(
                        0,
                        (paymentModalCustomer.outstandingBalance ?? 0) - Number(customerPaymentForm.amount)
                      )
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomerPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingCustomerPayment ? 'Recording...' : 'Record & Synchronize'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
