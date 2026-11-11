/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  AlertCircle,
  ArrowLeft,
  MessageCircle,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Download,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { OrderStatus, PublicTrackingOrder } from '../types/index.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { getSinhalaStatus } from '../utils/order.ts';
import { BillModal } from './BillModal.tsx';
import { generateBillPdf, BillOrder } from '../utils/generateBillPdf.ts';
import { LiveDeliveryMap } from './LiveDeliveryMap.tsx';

interface OrderTrackingViewProps {
  token: string;
  onBackToStore: () => void;
}

const ORDER_STEPS: OrderStatus[] = [
  'Order Received',
  'Order Confirmed',
  'Preparing Order',
  'Ready for Delivery',
  'Out for Delivery',
  'Delivered',
];

const PICKUP_STEPS: OrderStatus[] = [
  'Order Received',
  'Preparing Order',
  'Ready for Pickup',
  'Ready for Collection',
  'Collected by Customer',
];

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  token,
  onBackToStore,
}) => {
  const { language, t } = useLanguage();
  const [order, setOrder] = useState<PublicTrackingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchTrackingData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    try {
      const res = await fetch(`/api/track/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to load tracking details');
      }
      setOrder(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      if (!silent) {
        setErrorMessage(err.message || 'Error communicating with tracking service');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrackingData();

      // Poll every 5s for real-time live GPS & status tracking
      const interval = setInterval(() => {
        fetchTrackingData(true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [token]);

  const isPickup = order?.deliveryType === 'pickup';
  const activeSteps = isPickup ? PICKUP_STEPS : ORDER_STEPS;

  const getStepIndex = (status: OrderStatus): number => {
    if (status === 'Cancelled') return -1;
    if (isPickup) {
      if (status === 'Delivered' || status === 'Collected by Customer') return 4;
      const idx = PICKUP_STEPS.indexOf(status);
      return idx >= 0 ? idx : 0;
    }
    return ORDER_STEPS.indexOf(status);
  };

  const currentStepIdx = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === 'Cancelled';

  const handleDownloadPdf = async () => {
    if (!order) return;
    setIsGeneratingPdf(true);
    try {
      const billData: BillOrder = {
        orderNumber: order.orderNumber,
        trackingToken: token,
        status: order.status,
        createdAt: order.createdAt,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        deliveryCharge: order.deliveryCharge,
        deliveryHireCharge: order.deliveryHireCharge,
        total: order.total,
        amountPaid: order.amountPaid,
        outstandingBalance: order.outstandingBalance,
        deliveryArea: order.deliveryArea || 'Katuloya',
        deliveryType: order.deliveryType || 'delivery',
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryAgent: order.assignedDeliveryAgent
          ? {
              agentId: 'assigned',
              agentName: order.assignedDeliveryAgent.agentName,
              mobilePhone: order.assignedDeliveryAgent.mobilePhone,
              whatsappNumber: order.assignedDeliveryAgent.whatsappNumber,
              vehicleRegistrationNumber: order.assignedDeliveryAgent.vehicleRegistrationNumber,
              hireCharge: order.deliveryHireCharge || 0,
              assignedAt: order.createdAt,
              deliveryStatus: (order.assignedDeliveryAgent.deliveryStatus as any) || 'assigned',
              agentPaidStatus: 'unpaid',
            }
          : undefined,
        items: order.items.map((it) => ({
          nameEn: it.nameEn,
          nameSi: it.nameSi,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.effectivePrice,
          effectivePrice: it.effectivePrice,
          discountPercent: 0,
          lineTotal: it.lineTotal,
        })),
      };
      await generateBillPdf(billData, { autoDownload: true });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ', ' +
        d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs shadow-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'si' ? 'ආපසු සාප්පුවට' : 'Back to Grocery Shop'}</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 overflow-hidden shrink-0 shadow-xs">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchTrackingData(false)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 text-xs shadow-xs transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{language === 'si' ? 'යාවත්කාලීන කරන්න' : 'Refresh'}</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && !order && (
          <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              {language === 'si' ? 'තොරතුරු පූරණය වෙමින් පවතී...' : 'Fetching live order dispatch status...'}
            </h3>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="font-black text-rose-900 text-lg">
              {language === 'si' ? 'ඇණවුම සොයාගත නොහැකි විය' : 'Order Not Found'}
            </h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{errorMessage}</p>
            <button
              type="button"
              onClick={onBackToStore}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Return to Catalog
            </button>
          </div>
        )}

        {/* Order Details Display */}
        {order && (
          <div className="space-y-6">
            {/* Top Order Status Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {t('orderNumberLabel')}
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-wider">
                    {order.orderNumber}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Ordered on: {formatTimestamp(order.createdAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Status
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                      isCancelled
                        ? 'bg-rose-100 text-rose-800'
                        : order.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    <span>
                      {language === 'si' ? getSinhalaStatus(order.status) : order.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    ETA: {order.estimatedDelivery}
                  </div>
                </div>
              </div>

              {/* Progress Timeline */}
              {isCancelled ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold">This order has been cancelled. </span>
                    If you have any questions, please contact the Katuloya grocery hotline below.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isPickup ? 'Store Pickup Progress Timeline' : 'Delivery Progress Timeline'}
                  </h3>

                  <div className="relative pt-2">
                    {/* Stepper Grid */}
                    <div className={`grid gap-2 ${isPickup ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-6'}`}>
                      {activeSteps.map((st, idx) => {
                        const isDone = currentStepIdx >= idx;
                        const isCurrent = currentStepIdx === idx;

                        return (
                          <div
                            key={st}
                            className={`p-3 rounded-2xl border text-center transition-all ${
                              isCurrent
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/20'
                                : isDone
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="flex justify-center mb-1.5">
                              {isDone ? (
                                <CheckCircle2 className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-emerald-600'}`} />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                              )}
                            </div>
                            <div className="text-[11px] font-bold leading-tight">
                              {language === 'si' ? getSinhalaStatus(st) : st}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Chronological Status History */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Timestamped Status Log
                </h4>
                <div className="space-y-2">
                  {order.statusHistory.map((hist, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200/60"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900">
                          {language === 'si' ? getSinhalaStatus(hist.status) : hist.status}
                        </span>
                        {hist.note && <p className="text-[11px] text-slate-500">{hist.note}</p>}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatTimestamp(hist.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Store Pickup Collection Card OR Live GPS Map + Delivery Driver Card */}
            {isPickup ? (
              <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                        <span>Customer Store Pickup Order</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Food &amp; Life Grocery — Katuloya Store
                      </h3>
                      <p className="text-xs text-emerald-100 font-medium mt-0.5">
                        929, Kandy Road, Cross Waththegama, Katuloya &bull; Hours: 7:00 AM – 9:00 PM (Daily)
                      </p>
                      <div className="mt-2 text-xs text-emerald-200 bg-white/10 p-2.5 rounded-xl border border-white/15">
                        <strong>Pickup Instructions:</strong> Show your Order Number <strong>{order.orderNumber}</strong> at the grocery counter upon collection. Delivery Fee: <strong>FREE (Rs. 0)</strong>.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=7.3308,80.6865"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-2xl font-black text-xs shadow-md transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Katuloya Store in Maps</span>
                    </a>
                    <a
                      href="https://wa.me/94712595683"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs border border-white/20 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-300" />
                      <span>Store Hotline: +94 71 259 5683</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Interactive Live GPS Delivery Map */}
                {(order.assignedDeliveryAgent || order.status === 'Out for Delivery' || order.liveLocation) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {order.status === 'Out for Delivery'
                            ? 'Live Vehicle GPS Tracking En Route'
                            : 'Delivery Route & Dispatch Location'}
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Katuloya • {order.deliveryArea || 'Thawalanthanne'}
                      </span>
                    </div>
                    <LiveDeliveryMap
                      agentLocation={order.liveLocation}
                      customerArea={order.deliveryArea}
                      customerAddress={order.deliveryAddress}
                      agentName={order.assignedDeliveryAgent?.agentName || 'Delivery Agent'}
                      agentPhone={order.assignedDeliveryAgent?.mobilePhone}
                      vehicleNumber={order.assignedDeliveryAgent?.vehicleRegistrationNumber}
                      status={order.status}
                      isLiveActive={order.status === 'Out for Delivery' || !!order.liveLocation}
                      orderNumber={order.orderNumber}
                      heightClass="h-72 sm:h-96"
                    />
                  </div>
                )}

                {/* Prominent Delivery Agent Contact - ONLY IF ASSIGNED */}
                {order.assignedDeliveryAgent && (
                  <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-500/40 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
                          <Truck className="w-6 h-6 text-emerald-200" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                            <span>Assigned Delivery Agent</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white">
                            {order.assignedDeliveryAgent.agentName}
                          </h3>
                          <p className="text-xs text-emerald-100 font-medium mt-0.5">
                            Vehicle No: <strong>{order.assignedDeliveryAgent.vehicleRegistrationNumber}</strong> &bull; Contact: {order.assignedDeliveryAgent.mobilePhone}
                          </p>
                        </div>
                      </div>

                      <a
                        href={order.assignedDeliveryAgent.whatsappChatUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition-all transform active:scale-95 shrink-0"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        <span>CONTACT DELIVERY AGENT ON WHATSAPP</span>
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Official Bill & Tax Receipt Card */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-600/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-13 h-13 rounded-2xl bg-white p-1 shadow-md shrink-0 overflow-hidden border border-white/20">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/80 text-emerald-200 text-[10px] font-bold border border-emerald-500/40 uppercase tracking-wider mb-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>
                        {order.status === 'Delivered'
                          ? (language === 'si' ? 'භාණ්ඩ භාරදෙන ලදී • නිල බිල්පත' : 'Delivered • Official Bill')
                          : (language === 'si' ? 'නිල බිල්පත සහ රිසිට්පත' : 'Official Bill & Tax Receipt')}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {language === 'si' ? 'නිල බිල්පත සහ රිසිට්පත (PDF)' : 'Official Bill & Tax Receipt (PDF)'}
                    </h3>
                    <p className="text-xs text-emerald-200 mt-0.5">
                      {language === 'si'
                        ? 'Food & Life Grocery ලාංඡනය සහිත නිල බිල්පත බාගත කරන්න හෝ WhatsApp වෙත යවන්න.'
                        : 'Download your attractive official PDF bill with authentic logo or share to WhatsApp.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBillModalOpen(true)}
                    className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-emerald-300" />
                    <span>{language === 'si' ? 'බිල්පත බලන්න' : 'View Bill'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isGeneratingPdf
                        ? (language === 'si' ? 'PDF සැකසෙමින්...' : 'Generating...')
                        : (language === 'si' ? 'PDF බාගත කරන්න' : 'Download PDF Bill')}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Ordered Items Summary */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Items in Order ({order.items.length})</span>
              </div>

              <div className="divide-y divide-slate-100">
                {order.items.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">
                        {language === 'si' && item.nameSi ? item.nameSi : item.nameEn}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.quantity} &times; LKR {item.effectivePrice.toLocaleString()} ({item.unit})
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900">
                      LKR {item.lineTotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-4 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>LKR {order.subtotal.toLocaleString()}</span>
                </div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount</span>
                    <span>- LKR {order.discountTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery ({order.deliveryType === 'delivery' ? (order.deliveryArea ? `Delivery: ${order.deliveryArea}` : 'Katuloya, Thawalanthanne, Babaralla, Goomaraya, Thunisgala') : 'Store Pickup'})</span>
                  <span>{order.deliveryCharge === 0 ? 'FREE' : `LKR ${order.deliveryCharge.toLocaleString()}`}</span>
                </div>
                {order.deliveryHireCharge !== undefined && order.deliveryHireCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Agent Hire Charge</span>
                    <span>LKR {(order.deliveryHireCharge ?? 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                  <span>Invoice Total</span>
                  <span className="text-emerald-800">LKR {order.total.toLocaleString()}</span>
                </div>
                {(order.amountPaid !== undefined || order.outstandingBalance !== undefined) && (
                  <>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Total Amount Paid</span>
                      <span className="font-bold text-emerald-700">LKR {(order.amountPaid || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-800">
                      <span>Outstanding Balance</span>
                      <span className={(order.outstandingBalance ?? (order.total - (order.amountPaid || 0))) > 0 ? 'text-amber-700 font-extrabold' : 'text-emerald-700'}>
                        LKR {(order.outstandingBalance ?? Math.max(0, order.total - (order.amountPaid || 0))).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Payment Method &amp; Status:</span>
                  <span className="font-semibold text-slate-800 uppercase">
                    {order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Bank Deposit'} &bull; {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy & Help Footer */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Secure Privacy Protection:</strong> Phone numbers and full delivery addresses are never exposed in public tracking links.
                </span>
              </div>
              <a
                href="https://wa.me/94712595683"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shrink-0 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp: +94 71 259 5683</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bill & Invoice Modal */}
      {order && (
        <BillModal
          order={{
            orderNumber: order.orderNumber,
            trackingToken: token,
            status: order.status,
            createdAt: order.createdAt,
            subtotal: order.subtotal,
            discountTotal: order.discountTotal,
            deliveryCharge: order.deliveryCharge,
            total: order.total,
            deliveryArea: order.deliveryArea || 'Katuloya',
            deliveryType: order.deliveryType || 'delivery',
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            items: order.items.map((it) => ({
              nameEn: it.nameEn,
              nameSi: it.nameSi,
              unit: it.unit,
              quantity: it.quantity,
              unitPrice: it.effectivePrice,
              effectivePrice: it.effectivePrice,
              discountPercent: 0,
              lineTotal: it.lineTotal,
            })),
          }}
          isOpen={isBillModalOpen}
          onClose={() => setIsBillModalOpen(false)}
        />
      )}
    </div>
  );
};
