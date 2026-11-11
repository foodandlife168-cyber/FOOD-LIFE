/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowRight,
  ShoppingBag,
  Truck,
  Store,
  ShieldCheck,
  Search,
  MessageCircle,
  Clock,
  Sparkles,
  Phone,
  MapPin,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface WelcomeSplashScreenProps {
  onGetStarted: () => void;
  onOpenDriverPortal: () => void;
  onOpenStaffPortal: () => void;
  onOpenTrackLookup: () => void;
  onOpenMyOrders?: (phone?: string) => void;
}

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({
  onGetStarted,
  onOpenDriverPortal,
  onOpenStaffPortal,
  onOpenTrackLookup,
  onOpenMyOrders,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [quickPhone, setQuickPhone] = useState('');
  const [showPhoneLookup, setShowPhoneLookup] = useState(false);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPhone.trim()) {
      localStorage.setItem('foodlife_customer_phone', quickPhone.trim());
      if (onOpenMyOrders) {
        onOpenMyOrders(quickPhone.trim());
      }
      onGetStarted();
    }
  };

  const whatsappDirectUrl = `https://wa.me/94712595683?text=${encodeURIComponent(
    language === 'si'
      ? 'ආයුබෝවන් Food & Life Grocery! මට කැටුලෝය/තවලන්තැන්න වෙත බඩු ඇණවුම් කිරීමට අවශ්‍යයි.'
      : 'Hello Food & Life Grocery! I would like to place a grocery order for delivery in Katuloya/Thawalanthanne.'
  )}`;

  return (
    <div className="min-h-screen bg-[#070d1e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(28,45,86,0.6),rgba(7,13,30,0.95))] text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 relative overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Language & Store Status */}
      <header className="w-full max-w-lg mx-auto flex items-center justify-between z-10 pt-2 pb-4">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-emerald-400">
            {language === 'si' ? 'විවෘතයි: පෙ.ව. 6:30 - ප.ව. 9:30' : 'Store Open • 6:30 AM - 9:30 PM'}
          </span>
        </div>

        {/* Language switch */}
        <div className="flex items-center bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-lg transition-all ${
              language === 'en'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('si')}
            className={`px-3 py-1 rounded-lg transition-all ${
              language === 'si'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            සිංහල
          </button>
        </div>
      </header>

      {/* Center Welcome Card (Styled in Ceyzo reference layout) */}
      <main className="w-full max-w-md mx-auto my-auto z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden text-center">
          {/* Subtle Orange Accent Glow along the top card border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

          {/* 1. Logo Integration */}
          <div className="flex justify-center mb-5">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-3 shadow-xl shadow-black/40 border border-slate-200/90 flex items-center justify-center transform transition-transform hover:scale-105 duration-300">
              <img
                src="/logo.jpg"
                alt="FOOD & LIFE GROCERY Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* 2. Brand Name & Tagline */}
          <div className="space-y-1.5 mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              FOOD <span className="text-orange-500">&amp; LIFE</span> GROCERY
            </h1>
            <p className="text-xs sm:text-sm font-bold tracking-wider uppercase text-orange-400/90 font-serif">
              EVERYTHING FOR YOUR CHOICES
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === 'si'
                ? '929, මහනුවර පාර, ක්‍රොස් වත්තේගම, කැටුලෝය • සජීවී ඇණවුම් සහ බෙදාහැරීම'
                : '929, Kandy Road, Cross Waththegama, Katuloya • Fresh Everyday'}
            </p>
          </div>

          {/* 3. Core Store Highlights */}
          <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">
                  {language === 'si' ? 'වේගවත් බෙදාහැරීම' : 'Fast Delivery'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Katuloya &amp; Thawalanthanne
                </p>
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">
                  {language === 'si' ? 'කඩෙන් ලබාගැනීම' : 'Store Pickup'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {language === 'si' ? 'නොමිලේ සූදානම්' : 'Ready in 20 mins'}
                </p>
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">
                  {language === 'si' ? 'විශ්වාසනීය ගෙවීම්' : 'Easy Payment'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Cash or People's Bank
                </p>
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">
                  {language === 'si' ? 'WhatsApp ඇණවුම්' : 'WhatsApp Order'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Instant Bill &amp; Track
                </p>
              </div>
            </div>
          </div>

          {/* 4. Professional Orange Gradient GET STARTED Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={onGetStarted}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-base tracking-wide shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 transform active:scale-98 transition-all cursor-pointer border border-orange-400/30"
            >
              <ShoppingBag className="w-5 h-5 text-white" />
              <span>{language === 'si' ? 'සාප්පු සවාරිය අරඹන්න' : 'GET STARTED'}</span>
              <ArrowRight className="w-5 h-5 text-white ml-1" />
            </button>

            {/* Existing Customer Quick Phone Sign-in / Track toggle */}
            {!showPhoneLookup ? (
              <button
                type="button"
                onClick={() => setShowPhoneLookup(true)}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {language === 'si'
                    ? 'පෙර ඇණවුම් පරීක්ෂාව හෝ දුරකථන අංකයෙන් පිවිසෙන්න'
                    : 'Returning Customer? Track or Access with Phone'}
                </span>
              </button>
            ) : (
              <form onSubmit={handlePhoneSubmit} className="space-y-2 pt-1 text-left">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  {language === 'si'
                    ? 'ඔබගේ දුරකථන අංකය ඇතුළත් කරන්න:'
                    : 'Enter your phone number (e.g. 0712595683):'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="07X XXX XXXX"
                    autoFocus
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                  >
                    {language === 'si' ? 'පිවිසෙන්න' : 'Continue'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Tracking or Direct WhatsApp Order Link */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-4 text-xs">
            <button
              type="button"
              onClick={onOpenTrackLookup}
              className="text-slate-400 hover:text-orange-400 transition-colors font-medium flex items-center gap-1"
            >
              <Search className="w-3 h-3 text-orange-400" />
              <span>{language === 'si' ? 'ඇණවුම සොයන්න' : 'Track Order'}</span>
            </button>
            <span className="text-slate-700">•</span>
            <a
              href={whatsappDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>WhatsApp: +94 71 259 5683</span>
            </a>
          </div>
        </div>
      </main>

      {/* Bottom Footer & Authorized Portals */}
      <footer className="w-full max-w-lg mx-auto z-10 pt-4 pb-2 text-center space-y-3">
        <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={onOpenDriverPortal}
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-800/60"
          >
            <span>🛵</span>
            <span>{language === 'si' ? 'රියදුරු පිවිසුම' : 'Driver Portal'}</span>
          </button>

          <span className="text-slate-700">•</span>

          <button
            type="button"
            onClick={onOpenStaffPortal}
            className="hover:text-orange-400 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-800/60"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span>{language === 'si' ? 'කාර්ය මණ්ඩලය' : 'Staff Portal'}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          &copy; 2026 FOOD &amp; LIFE GROCERY. Katuloya, Sri Lanka. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};
