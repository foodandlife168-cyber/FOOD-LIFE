/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  MessageCircle,
  CheckCircle2,
  Share2,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Store,
  Sparkles,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { generateBillPdf, buildWhatsAppBillText, BillOrder } from '../utils/generateBillPdf.ts';
import { formatPhoneForDisplay } from '../utils/order.ts';

interface BillModalProps {
  order: BillOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BillModal: React.FC<BillModalProps> = ({ order, isOpen, onClose }) => {
  const { language } = useLanguage();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !order) return null;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateBillPdf(order, { autoDownload: true });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const publicBaseUrl = window.location.origin;
  const whatsappBillText = buildWhatsAppBillText(order, publicBaseUrl);
  const phoneDigits = order.customerPhone ? order.customerPhone.replace(/\D/g, '') : '';
  const customerWhatsAppUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappBillText)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappBillText)}`;

  const handleCopyBillLink = () => {
    const billUrl = `${publicBaseUrl}/track/${order.trackingToken}`;
    navigator.clipboard.writeText(billUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Actions Bar */}
        <div className="bg-emerald-800 text-white p-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black">
                {language === 'si' ? 'නිල බිල්පත සහ රිසිට්පත' : 'Official Bill & Tax Invoice'}
              </h2>
              <p className="text-[11px] text-emerald-200 font-mono">
                {order.orderNumber} &bull; {order.status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="Print Bill"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bill preview"
              className="w-8 h-8 rounded-full bg-emerald-900/50 hover:bg-emerald-900 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable/Viewable Invoice Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 print:p-0 print:m-0" id="printable-bill">
          {/* Bill Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 shadow-sm shrink-0 overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="Food & Life Grocery Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                  FOOD &amp; LIFE GROCERY
                </span>
                <p className="text-[11px] font-semibold text-amber-600">
                  Everything For Your Choices
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne
                </p>
                <p className="text-[11px] text-slate-400">
                  Hotline: +94 71 259 5683 &bull; foodandlife168@gmail.com
                </p>
              </div>
            </div>

            <div className="sm:text-right bg-emerald-50/80 border border-emerald-200/60 p-3 rounded-2xl">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Official Bill / Invoice
              </div>
              <div className="font-mono font-black text-base text-slate-900">
                {order.orderNumber}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {formattedDate} &bull; {formattedTime}
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    order.status === 'Delivered'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {order.status === 'Delivered' ? 'DELIVERED & VERIFIED' : order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Delivery Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Customer Details
              </span>
              <div className="font-bold text-slate-900 text-sm">{order.customerName || 'Valued Customer'}</div>
              <div className="text-slate-600 font-mono">
                {order.customerPhone ? formatPhoneForDisplay(order.customerPhone) : 'Direct Order'}
              </div>
              <div className="text-[11px] text-slate-500 pt-0.5">
                Payment: <strong className="text-slate-700">{order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery (COD)' : 'Bank Deposit'}</strong> ({order.paymentStatus})
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Delivery Destination
              </span>
              <div className="font-bold text-emerald-800">
                📍 {order.deliveryArea || 'Katuloya'} ({order.deliveryType === 'delivery' ? 'Home Delivery' : 'In-Store Pickup'})
              </div>
              <div className="text-slate-700 font-medium">
                {order.deliveryAddress || 'Katuloya Shop'}
              </div>
              {order.deliveryLandmark && (
                <div className="text-[11px] text-slate-400">
                  Landmark: {order.deliveryLandmark}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-emerald-800 text-white text-[11px] font-bold py-2.5 px-3 sm:px-4 grid grid-cols-12 gap-2">
              <span className="col-span-1">#</span>
              <span className="col-span-5 sm:col-span-6">Item Description</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 sm:col-span-1 text-right">Total</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 sm:px-4 grid grid-cols-12 gap-2 items-center ${
                    index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <span className="col-span-1 text-slate-400 font-mono">{index + 1}</span>
                  <div className="col-span-5 sm:col-span-6">
                    <div className="font-bold text-slate-900">
                      {language === 'si' && item.nameSi ? item.nameSi : item.nameEn}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.unit} {item.discountPercent && item.discountPercent > 0 ? `(Discount: ${item.discountPercent}%)` : ''}
                    </div>
                  </div>
                  <span className="col-span-2 text-center font-bold text-slate-700">
                    {item.quantity}
                  </span>
                  <span className="col-span-2 text-right font-mono text-slate-600">
                    {(item.unitPrice ?? item.effectivePrice ?? 0).toLocaleString()}
                  </span>
                  <span className="col-span-2 sm:col-span-1 text-right font-bold text-slate-900 font-mono">
                    {(item.lineTotal ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown & Official Stamp */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            {/* Left: Stamp */}
            <div className="sm:col-span-6 p-4 rounded-2xl border-2 border-dashed border-emerald-600 bg-emerald-50/40 text-center space-y-1">
              <div className="text-xs font-black text-emerald-800 tracking-wider uppercase">
                ★ FOOD &amp; LIFE GROCERY ★
              </div>
              <div className="text-[11px] font-bold text-amber-600">
                OFFICIAL VERIFIED RECEIPT
              </div>
              <p className="text-[10px] text-slate-500">
                Katuloya &bull; Thawalanthanne &bull; Babaralla &bull; Goomaraya &bull; Thunisgala
              </p>
              <div className="text-[9px] text-slate-400 pt-1">
                Ref: {order.orderNumber} &bull; Hotline: +94 71 259 5683
              </div>
            </div>

            {/* Right: Totals */}
            <div className="sm:col-span-6 space-y-1.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold">LKR {(order.subtotal ?? 0).toLocaleString()}</span>
              </div>
              {(order.discountTotal ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Savings:</span>
                  <span className="font-mono font-semibold">- LKR {(order.discountTotal ?? 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span className="font-mono font-semibold">
                  {(order.deliveryCharge ?? 0) === 0 ? 'FREE' : `LKR ${(order.deliveryCharge ?? 0).toLocaleString()}`}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm sm:text-base font-black text-slate-950">
                <span>Grand Total:</span>
                <span className="text-emerald-800 font-mono">LKR {(order.total ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBillLink}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{copiedLink ? 'Link Copied!' : 'Copy Bill Link'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Send Button */}
            <a
              href={customerWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>{language === 'si' ? 'WhatsApp මගින් බිල්පත යවන්න' : 'Send Bill via WhatsApp'}</span>
            </a>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingPdf
                  ? (language === 'si' ? 'PDF සැකසෙමින්...' : 'Generating PDF...')
                  : (language === 'si' ? 'නිල PDF බාගත කරන්න' : 'Download PDF Bill')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
