/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingBag, Search, ShieldCheck, MapPin, Globe, Clock, Truck, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useCart } from '../context/CartContext.tsx';

interface HeaderProps {
  onOpenCart: () => void;
  onOpenTrackLookup: () => void;
  onOpenMyOrders: () => void;
  onOpenAdmin: () => void;
  onOpenDeliveryPortal?: () => void;
  onOpenWelcome?: () => void;
  onOpenStarPoints?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCart,
  onOpenTrackLookup,
  onOpenMyOrders,
  onOpenAdmin,
  onOpenDeliveryPortal,
  onOpenWelcome,
  onOpenStarPoints,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      {/* Top micro-bar: Location and hours */}
      <div className="bg-emerald-800 text-emerald-100 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-medium">
              929, Kandy Road, Cross Waththegama, Katuloya • <span className="text-amber-300 font-bold">{language === 'si' ? 'බෙදාහැරීමේ ප්‍රදේශ:' : 'Delivery Areas:'}</span> {t('deliveryCoverage')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-200">
              <Clock className="w-3 h-3 text-emerald-300" />
              Open Daily: 6:30 AM - 9:30 PM
            </span>
            <a
              href="https://wa.me/94712595683"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:text-white font-semibold transition-colors flex items-center gap-1"
            >
              <span>WhatsApp Hotline:</span>
              <span className="font-bold underline decoration-emerald-400">+94 71 259 5683</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div
          onClick={onOpenWelcome}
          role={onOpenWelcome ? 'button' : undefined}
          tabIndex={onOpenWelcome ? 0 : undefined}
          onKeyDown={(e) => e.key === 'Enter' && onOpenWelcome?.()}
          className={`flex items-center gap-3 ${onOpenWelcome ? 'cursor-pointer group' : ''}`}
          title={onOpenWelcome ? 'FOOD & LIFE GROCERY - Welcome Screen' : undefined}
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center overflow-hidden shrink-0 p-0.5 group-hover:scale-105 group-hover:shadow-md transition-all">
            <img
              src="/logo.jpg"
              alt="FOOD & LIFE GROCERY Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
                FOOD <span className="text-orange-500">&amp; LIFE</span>
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-orange-100 text-orange-800 rounded-md">
                Katuloya
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold tracking-tight">
              {language === 'si'
                ? 'ඔබගේ සියලු තේරීම් සඳහා • 929, මහනුවර පාර, ක්‍රොස් වත්තේගම, කැටුලෝය'
                : 'Everything For Your Choices • 929, Kandy Road, Cross Waththegama, Katuloya'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                language === 'en'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('si')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                language === 'si'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Switch to Sinhala"
            >
              සිංහල
            </button>
          </div>

          {/* My Orders History Button */}
          <button
            type="button"
            onClick={onOpenMyOrders}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
            title={language === 'si' ? 'මගේ ඇණවුම් ඉතිහාසය' : 'My Orders History'}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xs:inline sm:inline">{t('myOrders')}</span>
          </button>

          {/* Customer Loyalty Star Points Button */}
          {onOpenStarPoints && (
            <button
              type="button"
              onClick={onOpenStarPoints}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 shadow-2xs transition-all transform active:scale-95"
              title={language === 'si' ? 'මගේ තරු ලකුණු (MY STAR POINTS)' : 'My Star Points Loyalty Rewards'}
            >
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600 shrink-0" />
              <span>{language === 'si' ? 'තරු ලකුණු' : 'Star Points'}</span>
            </button>
          )}

          {/* Track Order Button */}
          <button
            type="button"
            onClick={onOpenTrackLookup}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('trackOrder')}</span>
          </button>

          {/* Delivery Agent Portal Button */}
          {onOpenDeliveryPortal && (
            <button
              type="button"
              onClick={onOpenDeliveryPortal}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
              title="Delivery Driver GPS & Dispatch Portal"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Driver Portal</span>
            </button>
          )}

          {/* Admin / Staff Portal Button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('adminLogin')}</span>
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="View shopping cart"
            className="relative flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all transform active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{t('cart')}</span>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-400 text-slate-900 text-xs font-extrabold rounded-full">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
