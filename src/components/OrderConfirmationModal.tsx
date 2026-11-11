/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, MessageCircle, ExternalLink, X, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface OrderConfirmationModalProps {
  orderData: {
    orderNumber: string;
    trackingToken: string;
    trackingUrl: string;
    total: number;
  } | null;
  onClose: () => void;
  onOpenTracking: (token: string) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  orderData,
  onClose,
  onOpenTracking,
}) => {
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!orderData) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(orderData.trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappChatUrl = `https://wa.me/94712595683?text=${encodeURIComponent(
    `Hello Food & Life Grocery! I just placed order ${orderData.orderNumber} (LKR ${orderData.total.toLocaleString()}). Here is my tracking link: ${orderData.trackingUrl}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm mx-auto flex items-center justify-center overflow-hidden">
            <img src="/logo.jpg" alt="Food & Life Grocery" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            {t('orderPlacedSuccess')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            {t('orderPlacedDesc')}
          </p>
        </div>

        {/* Order Details Card */}
        <div className="my-6 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs text-slate-500 font-medium">{t('orderNumberLabel')}</span>
              <div className="text-lg font-black text-emerald-800 tracking-wider">
                {orderData.orderNumber}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium">{t('total')}</span>
              <div className="text-lg font-black text-slate-900">
                LKR {(orderData.total ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Tracking Link display */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('trackingLink')}
            </label>
            <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-600">
              <span className="truncate flex-1 font-mono text-[11px]">
                {orderData.trackingUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-bold flex items-center gap-1 text-[11px] shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? t('copied') : t('copyLink')}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Anyone with this link can check live grocery dispatch status without signing in.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTracking(orderData.trackingToken);
            }}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{t('trackNow')}</span>
          </button>

          <a
            href={whatsappChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>{t('sendWhatsAppMessage')}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
