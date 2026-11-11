/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Search,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { getSinhalaStatus, isValidSriLankanPhone, formatPhoneForDisplay } from '../utils/order.ts';

export interface SavedCustomerOrder {
  orderNumber: string;
  trackingToken: string;
  trackingUrl: string;
  total: number;
  deliveryArea?: string;
  deliveryType?: 'delivery' | 'pickup';
  deliveryAddress?: string;
  status?: string;
  createdAt: string;
  itemsCount?: number;
}

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTracking: (token: string) => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  onOpenTracking,
}) => {
  const { language, t } = useLanguage();
  const [orders, setOrders] = useState<SavedCustomerOrder[]>([]);
  const [phoneInput, setPhoneInput] = useState<string>(() => {
    return localStorage.getItem('foodlife_customer_phone') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deduplicate orders by orderNumber, preserving unique records
  const displayOrders = React.useMemo(() => {
    const dedupedMap = new Map<string, SavedCustomerOrder>();
    for (const ord of orders) {
      const k = ord.orderNumber || ord.trackingToken;
      if (k && !dedupedMap.has(k)) {
        dedupedMap.set(k, ord);
      }
    }
    return Array.from(dedupedMap.values());
  }, [orders]);

  // Load orders on modal open
  useEffect(() => {
    if (!isOpen) return;

    // 1. Read from localStorage
    try {
      const stored = localStorage.getItem('foodlife_customer_orders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }

    // 2. If phone is already stored, sync latest status from server
    const savedPhone = localStorage.getItem('foodlife_customer_phone');
    if (savedPhone && isValidSriLankanPhone(savedPhone)) {
      fetchOrdersByPhone(savedPhone);
    }
  }, [isOpen]);

  const fetchOrdersByPhone = async (phoneToQuery: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/customer/orders?phone=${encodeURIComponent(phoneToQuery.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to retrieve order history');
      }

      if (Array.isArray(data)) {
        // Deduplicate with unique order numbers
        const map = new Map<string, SavedCustomerOrder>();
        data.forEach((o) => {
          if (o.orderNumber) map.set(o.orderNumber, o);
        });
        const combined = Array.from(map.values());
        setOrders(combined);
        localStorage.setItem('foodlife_customer_orders', JSON.stringify(combined));
        localStorage.setItem('foodlife_customer_phone', phoneToQuery.trim());

        if (data.length === 0) {
          setErrorMessage(
            language === 'si'
              ? 'මෙම දුරකථන අංකයට අදාළ ඇණවුම් හමු නොවීය.'
              : 'No orders found for this phone number.'
          );
        } else {
          setSuccessMessage(
            language === 'si'
              ? `ඇණවුම් ${data.length} ක් සාර්ථකව සොයාගෙන සුරකින ලදී.`
              : `Found and synced ${data.length} order(s).`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    if (!isValidSriLankanPhone(phoneInput)) {
      setErrorMessage(
        language === 'si'
          ? 'වලංගු ශ්‍රී ලාංකීය ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 077 123 4567).'
          : 'Please enter a valid Sri Lankan mobile phone number.'
      );
      return;
    }

    fetchOrdersByPhone(phoneInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">{t('myOrders')}</h2>
              <p className="text-xs text-emerald-200">
                {language === 'si'
                  ? 'ඔබගේ සියලු ඇණවුම් ඉතිහාසය සහ සජීවී නිරීක්ෂණය'
                  : 'Permanent Order History & Real-Time Tracking'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-emerald-900/50 hover:bg-emerald-900 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permanent Save Assurance Banner */}
        <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-900 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-semibold">{t('orderHistoryPermanentlySaved')}</span>
        </div>

        {/* Phone Lookup Filter */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <form onSubmit={handlePhoneSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder={
                  language === 'si'
                    ? 'දුරකථන අංකයෙන් සොයන්න (උදා: 077 123 4567)'
                    : 'Find all orders by Sri Lankan phone number'
                }
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{language === 'si' ? 'සොයන්න' : 'Sync History'}</span>
            </button>
          </form>

          {errorMessage && (
            <div className="mt-2 text-xs text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {displayOrders.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {language === 'si' ? 'තවමත් ඇණවුම් කිසිවක් නැත' : 'No Past Orders Recorded'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {language === 'si'
                  ? 'ඔබ භාණ්ඩ මිලදී ගත් පසු ඔබගේ සියලු ඇණවුම් ස්ථිරවම මෙහි සටහන් වේ.'
                  : 'When you place an order, it is permanently recorded here and can be tracked anytime.'}
              </p>
            </div>
          ) : (
            displayOrders.map((ord, idx) => {
              const status = ord.status || 'Order Received';
              const isDelivered = status === 'Delivered';
              const isCancelled = status === 'Cancelled';
              const deliveryAreaName = ord.deliveryArea || 'Katuloya';

              let formattedDate = ord.createdAt;
              try {
                const d = new Date(ord.createdAt);
                formattedDate =
                  d.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) +
                  ' at ' +
                  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch {
                // ignore
              }

              return (
                <div
                  key={ord.orderNumber ? `${ord.orderNumber}-${idx}` : (ord.trackingToken || `order-${idx}`)}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <span className="font-mono font-black text-sm text-emerald-800">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{formattedDate}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Delivery Area Tag */}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        📍 {deliveryAreaName}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {language === 'si' ? getSinhalaStatus(status as any) : status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="text-slate-600">
                      <span className="font-bold text-slate-900">
                        LKR {ord.total.toLocaleString()}
                      </span>
                      {ord.deliveryType && (
                        <span className="text-[11px] text-slate-500 ml-2">
                          ({ord.deliveryType === 'delivery' ? 'Home Delivery' : 'Pickup'})
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenTracking(ord.trackingToken);
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{t('trackNow')}</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500">
            {language === 'si'
              ? 'ප්‍රදේශ: කැටුලෝය, තවලන්තැන්න, බඹරැල්ල, ගෝමරය, තුන්හිස්ගල'
              : 'Areas: Katuloya, Thawalanthanne, Babaralla, Goomaraya, Thunisgala'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors"
          >
            {language === 'si' ? 'වසන්න' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
