/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MessageCircle,
  Search,
  Truck,
  Sparkles,
  ShoppingBag,
  QrCode,
  CheckCircle2,
  ExternalLink,
  Copy,
  X,
  Maximize2,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { PromotionalMediaSlider } from './PromotionalMediaSlider.tsx';

interface HeroProps {
  onSearchToken: (token: string) => void;
  onOpenWhatsAppIntakeNotice?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSearchToken, onOpenWhatsAppIntakeNotice }) => {
  const { language } = useLanguage();
  const { storeConfig } = useCart();
  const [tokenInput, setTokenInput] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      onSearchToken(tokenInput.trim());
    }
  };

  const handleShopNowClick = () => {
    const catalogElement = document.getElementById('catalog-section');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const whatsappDirectUrl = `https://wa.me/94712595683?text=${encodeURIComponent(
    language === 'si'
      ? 'ආයුබෝවන් Food & Life Grocery! (+94712595683) මට කැටුලෝය/තවලන්තැන්න වෙත බඩු ඇණවුම් කිරීමට අවශ්‍යයි.'
      : 'Hello Food & Life Grocery! I would like to place a grocery order for delivery in Katuloya/Thawalanthanne.'
  )}`;

  const appShareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://food-life-grocery.ai.studio';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="relative bg-[#FFF8F1] text-[#171717] overflow-hidden border-b border-orange-200/70">
      {/* Background Gradients and Ambient Circles */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF8F1] via-[#FFF3E6] to-[#FFE9D6] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#F36B16]/12 to-amber-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-10 w-96 h-96 bg-[#078B48]/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#F36B16_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Brand Identity, Headlines & Actions */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Brand Logo Badge */}
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-sm border border-orange-200/90 flex items-center justify-center shrink-0">
                <img
                  src="/logo.jpg"
                  alt="FOOD & LIFE Official Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-[#F36B16]">
                    FOOD &amp; LIFE
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#F36B16]/10 text-[#F36B16] border border-[#F36B16]/20">
                    Katuloya • Cross Waththegama
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  {language === 'si'
                    ? 'ඔබගේ සියලු තේරීම් සඳහා • 929, මහනුවර පාර'
                    : 'Everything For Your Choices • 929, Kandy Road'}
                </p>
              </div>
            </div>

            {/* 2. Main Requested Headlines (Verbatim) */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.12] text-[#171717] text-balance">
                Everything You Need, Freshness You Deserve!
              </h1>

              {/* Supporting Text: Quality • Freshness • Convenience */}
              <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg font-bold text-[#078B48]">
                <span>Quality</span>
                <span className="text-orange-400 font-black">•</span>
                <span>Freshness</span>
                <span className="text-orange-400 font-black">•</span>
                <span>Convenience</span>
              </div>

              {/* Brand Message: Your Trusted Grocery Shopping Partner */}
              <p className="text-base sm:text-lg font-medium text-slate-700 leading-relaxed">
                Your Trusted Grocery Shopping Partner
              </p>
            </div>

            {/* 3. Call-To-Action Buttons: SHOP NOW, ORDER VIA WHATSAPP, SCAN & SHOP */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Button 1: SHOP NOW */}
              <button
                type="button"
                onClick={handleShopNowClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#F36B16] hover:bg-[#d85605] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>SHOP NOW</span>
              </button>

              {/* Button 2: ORDER VIA WHATSAPP */}
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#078B48] hover:bg-[#06733b] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all transform active:scale-95"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>ORDER VIA WHATSAPP</span>
              </a>

              {/* Button 3: SCAN & SHOP */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-orange-50 text-[#F36B16] border-2 border-[#F36B16] font-bold text-sm sm:text-base shadow-xs hover:shadow-md transition-all transform active:scale-95 cursor-pointer"
              >
                <QrCode className="w-5 h-5" />
                <span>SCAN &amp; SHOP</span>
              </button>
            </div>

            {/* 4. Delivery Highlights Strip */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5 text-[#078B48]">
                <Truck className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'si'
                    ? `රු. ${storeConfig.freeDeliveryThreshold.toLocaleString()} ට වැඩි ඇණවුම් සඳහා නොමිලේ බෙදාහැරීම`
                    : `FREE Delivery on orders over LKR ${storeConfig.freeDeliveryThreshold.toLocaleString()}`}
                </span>
              </div>
              <span className="hidden sm:inline text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="font-bold text-[#F36B16]">Fast Dispatch:</span>
                <span>Katuloya • Thawalanthanne • Babaralla • Goomaraya • Thunisgala</span>
              </div>
            </div>

            {/* 5. Live Order Tracking Box */}
            <div className="pt-2">
              <div className="bg-white/90 backdrop-blur-xs border border-orange-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#F36B16]" />
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#171717]">
                      {language === 'si' ? 'සජීවී ඇණවුම් නිරීක්ෂණය' : 'Live Order Tracking'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {language === 'si' ? 'ක්ෂණික තත්ත්වය' : 'Real-time status'}
                  </span>
                </div>

                <form onSubmit={handleTrackSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder={
                        language === 'si'
                          ? 'ඇණවුම් අංකය (FL-2026-...) හෝ Token ඇතුළත් කරන්න'
                          : 'Enter Order Ref (e.g. FL-2026-000101) or Token'
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#F36B16] focus:border-transparent focus:outline-hidden transition-all shadow-inner"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#F36B16] hover:bg-[#d85605] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    {language === 'si' ? 'සොයන්න' : 'Track Order'}
                  </button>
                </form>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Promotional Video & Image Slider */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <PromotionalMediaSlider onShopNowClick={handleShopNowClick} />
          </div>

        </div>
      </div>

      {/* SCAN & SHOP QR CODE LIGHTBOX MODAL */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-orange-200 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-orange-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 p-1 border border-orange-200 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-[#F36B16]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    Scan &amp; Open FOOD &amp; LIFE App
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use your mobile camera for direct app access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close QR Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-Resolution QR Poster Display */}
            <div className="relative aspect-square w-full rounded-2xl bg-[#FFF8F1] border border-orange-200 p-2 shadow-inner overflow-hidden flex items-center justify-center">
              <img
                src="/assets/aistudio/file_00000000ed0c82089a98f694d0eed291_4efed887.png"
                alt="FOOD & LIFE Grocery App High-Resolution QR Code"
                className="w-full h-full object-contain select-none"
              />
            </div>

            {/* Quick 3-step Instructions */}
            <div className="bg-[#FFF8F1] border border-orange-200/80 rounded-2xl p-3.5 space-y-2 text-xs text-slate-700">
              <div className="font-bold text-[#F36B16] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>How to Scan:</span>
              </div>
              <ol className="space-y-1 pl-4 list-decimal marker:text-[#F36B16] marker:font-bold">
                <li>Open your smartphone camera or any QR scanner app.</li>
                <li>Point your lens at the QR code displayed above.</li>
                <li>Tap the link banner to launch the online grocery store instantly!</li>
              </ol>
            </div>

            {/* Action Buttons: Copy Link & WhatsApp Direct */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#078B48]" />
                    <span className="text-[#078B48]">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copy Store Link</span>
                  </>
                )}
              </button>

              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#078B48] hover:bg-[#06733b] text-white font-bold text-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Order on WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
