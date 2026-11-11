/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  MapPin,
  Phone,
  Clock,
  MessageCircle,
  Truck,
  ShieldCheck,
  Heart,
  Store,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';
import type { Product } from './types/index.ts';
import { SRI_LANKAN_MASTER_PRODUCTS } from './data/sriLankanGroceryCatalog.ts';
import { db, collection, onSnapshot } from './lib/firebase.ts';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { OrderConfirmationModal } from './components/OrderConfirmationModal.tsx';
import { OrderTrackingView } from './components/OrderTrackingView.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { MyOrdersModal } from './components/MyOrdersModal.tsx';
import { MyStarPointsModal } from './components/MyStarPointsModal.tsx';
import { DeliveryAgentPortal } from './components/DeliveryAgentPortal.tsx';
import { WelcomeSplashScreen } from './components/WelcomeSplashScreen.tsx';

function GroceryShop() {
  const { language, t } = useLanguage();
  const { itemCount, grandTotal, storeConfig, syncLatestProducts } = useCart();

  // Welcome / Splash Screen State (User can open it anytime from the logo/header)
  const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/track/') || path.startsWith('/bill/')) return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome') === '1') return true;
    return sessionStorage.getItem('foodlife_show_welcome') === 'true';
  });

  // Catalog State - Initialized with cached data or master catalog for instant display
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('foodlife_cached_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore localStorage parse errors
    }
    return SRI_LANKAN_MASTER_PRODUCTS;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProductModal, setActiveProductModal] = useState<Product | null>(null);

  // Modals & Views State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [isStarPointsOpen, setIsStarPointsOpen] = useState(false);
  const [isDeliveryPortalOpen, setIsDeliveryPortalOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    trackingToken: string;
    trackingUrl: string;
    total: number;
  } | null>(null);

  // Tracking Token state (from URL /track/:token or lookup)
  const [activeTrackingToken, setActiveTrackingToken] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/track/')) {
      return path.replace('/track/', '').trim();
    }
    if (path.startsWith('/bill/')) {
      return path.replace('/bill/', '').trim();
    }
    return null;
  });

  const [isTrackLookupOpen, setIsTrackLookupOpen] = useState(false);
  const [lookupInput, setLookupInput] = useState('');

  // Resilient API Fetch with timeout and backoff
  const fetchProductsFromApi = async (retryCount = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/products', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: Product[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
          syncLatestProducts(data);
          try {
            localStorage.setItem('foodlife_cached_products', JSON.stringify(data));
          } catch {
            // ignore localStorage quota errors
          }
        }
      } else if (retryCount < 2) {
        setTimeout(() => {
          fetchProductsFromApi(retryCount + 1);
        }, 1500 * (retryCount + 1));
      }
    } catch (err) {
      if (retryCount < 2) {
        setTimeout(() => {
          fetchProductsFromApi(retryCount + 1);
        }, 1500 * (retryCount + 1));
      } else {
        console.warn('[Products] Transient API fetch notice, displaying available catalog:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time Firestore product listener + multi-device synchronization
  useEffect(() => {
    fetchProductsFromApi();
    let unsubscribe: (() => void) | null = null;

    try {
      const colRef = collection(db, 'products');
      unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Product[] = [];
            snapshot.forEach((d) => {
              const item = d.data() as Product;
              if (item && item.nameEn) {
                list.push({
                  ...item,
                  id: d.id,
                  sellingPrice: Number(item.sellingPrice) || 0,
                  availableStock: Number(item.availableStock) || 0,
                  discountPercent: Number(item.discountPercent) || 0,
                  isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
                });
              }
            });
            setProducts(list);
            syncLatestProducts(list);
            setIsLoading(false);
            try {
              localStorage.setItem('foodlife_cached_products', JSON.stringify(list));
            } catch {
              // ignore
            }
          }
        },
        (err) => {
          console.warn('[Firestore] Product sync notice:', err);
        }
      );
    } catch (e) {
      console.warn('[Firestore] Realtime subscription notice:', e);
    }

    const onOnlineOrFocus = () => {
      fetchProductsFromApi();
    };
    window.addEventListener('online', onOnlineOrFocus);
    window.addEventListener('focus', onOnlineOrFocus);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('online', onOnlineOrFocus);
      window.removeEventListener('focus', onOnlineOrFocus);
    };
  }, []);

  // Handle browser popstate / back button for tracking
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/track/')) {
        setActiveTrackingToken(path.replace('/track/', '').trim());
      } else if (path.startsWith('/bill/')) {
        setActiveTrackingToken(path.replace('/bill/', '').trim());
      } else {
        setActiveTrackingToken(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openTrackingView = (token: string) => {
    setActiveTrackingToken(token);
    window.history.pushState({}, '', `/track/${token}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToStore = () => {
    setActiveTrackingToken(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Requirement: Customers only see active products
  const visibleProducts = products.filter((p) => p.isActive);

  // Categories extraction based strictly on visible active products
  const categories = Array.from(new Set(visibleProducts.map((p) => p.category)));

  // Filtered products for customer store
  const filteredProducts = visibleProducts.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.nameEn.toLowerCase().includes(q) ||
      (p.nameSi && p.nameSi.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q) ||
      (p.categorySi && p.categorySi.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  // If viewing dedicated tracking page
  if (activeTrackingToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header
          onOpenCart={() => setIsCartOpen(true)}
          onOpenTrackLookup={() => setIsTrackLookupOpen(true)}
          onOpenMyOrders={() => setIsMyOrdersOpen(true)}
          onOpenStarPoints={() => setIsStarPointsOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenDeliveryPortal={() => setIsDeliveryPortalOpen(true)}
        />
        <main className="flex-1">
          <OrderTrackingView token={activeTrackingToken} onBackToStore={backToStore} />
        </main>

        {/* Support modals on tracking view */}
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onProceedToCheckout={() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
        />

        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderSuccess={(orderData) => {
            setConfirmedOrder(orderData);
          }}
        />

        {isTrackLookupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>Track Your Grocery Order</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTrackLookupOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Enter your secure tracking token or reference code.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (lookupInput.trim()) {
                    setIsTrackLookupOpen(false);
                    openTrackingView(lookupInput.trim());
                  }
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  required
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="e.g. 16/32 character token or order ref"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Lookup Order Status
                </button>
              </form>
            </div>
          </div>
        )}

        <AdminPortal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          onOpenOrderTracking={(token) => {
            setIsAdminOpen(false);
            openTrackingView(token);
          }}
        />

        <MyOrdersModal
          isOpen={isMyOrdersOpen}
          onClose={() => setIsMyOrdersOpen(false)}
          onOpenTracking={(token) => {
            setIsMyOrdersOpen(false);
            openTrackingView(token);
          }}
        />

        <MyStarPointsModal
          isOpen={isStarPointsOpen}
          onClose={() => setIsStarPointsOpen(false)}
        />

        <DeliveryAgentPortal
          isOpen={isDeliveryPortalOpen}
          onClose={() => setIsDeliveryPortalOpen(false)}
          onOpenOrderTracking={(token) => {
            setIsDeliveryPortalOpen(false);
            openTrackingView(token);
          }}
        />
      </div>
    );
  }

  // Welcome / Splash Screen view
  if (showWelcomeScreen && !activeTrackingToken) {
    return (
      <div className="relative">
        <WelcomeSplashScreen
          onGetStarted={() => {
            sessionStorage.setItem('foodlife_welcome_dismissed', 'true');
            setShowWelcomeScreen(false);
          }}
          onOpenDriverPortal={() => setIsDeliveryPortalOpen(true)}
          onOpenStaffPortal={() => setIsAdminOpen(true)}
          onOpenTrackLookup={() => setIsTrackLookupOpen(true)}
          onOpenMyOrders={(phone) => {
            sessionStorage.setItem('foodlife_welcome_dismissed', 'true');
            setShowWelcomeScreen(false);
            setIsMyOrdersOpen(true);
          }}
        />

        {/* Global modals accessible from Welcome Screen */}
        {isTrackLookupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-slate-100">
              <button
                type="button"
                onClick={() => setIsTrackLookupOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
              >
                ✕
              </button>
              <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                <Search className="w-5 h-5 text-orange-400" />
                <span>Track Grocery Order</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Enter your unique order number (e.g. FL-1001) or secure tracking token.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (lookupInput.trim()) {
                    setIsTrackLookupOpen(false);
                    setShowWelcomeScreen(false);
                    openTrackingView(lookupInput.trim());
                  }
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="e.g. FL-1001 or tracking token"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Lookup Order Status
                </button>
              </form>
            </div>
          </div>
        )}

        <AdminPortal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          onOpenOrderTracking={(token) => {
            setIsAdminOpen(false);
            setShowWelcomeScreen(false);
            openTrackingView(token);
          }}
        />

        <MyOrdersModal
          isOpen={isMyOrdersOpen}
          onClose={() => setIsMyOrdersOpen(false)}
          onOpenTracking={(token) => {
            setIsMyOrdersOpen(false);
            setShowWelcomeScreen(false);
            openTrackingView(token);
          }}
        />

        <DeliveryAgentPortal
          isOpen={isDeliveryPortalOpen}
          onClose={() => setIsDeliveryPortalOpen(false)}
          onOpenOrderTracking={(token) => {
            setIsDeliveryPortalOpen(false);
            setShowWelcomeScreen(false);
            openTrackingView(token);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* 1. Header */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTrackLookup={() => setIsTrackLookupOpen(true)}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        onOpenStarPoints={() => setIsStarPointsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenDeliveryPortal={() => setIsDeliveryPortalOpen(true)}
        onOpenWelcome={() => setShowWelcomeScreen(true)}
      />

      {/* 2. Hero */}
      <Hero
        onSearchToken={(token) => openTrackingView(token)}
        onOpenWhatsAppIntakeNotice={() => setIsAdminOpen(true)}
      />

      {/* 3. Main Catalog Section */}
      <main id="catalog-section" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Search & Filter Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {language === 'si' ? 'නැවුම් සිල්ලර බඩු නාමාවලිය' : 'Fresh Grocery Catalog'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {filteredProducts.length} {t('itemsFound')} • Katuloya, Thawalanthanne
              </p>
            </div>

            {/* Live Search Bar */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t('allCategories')}
            </button>

            {categories.map((cat) => {
              const matched = visibleProducts.find((p) => p.category === cat && p.categorySi);
              const label = language === 'si' && matched?.categorySi ? matched.categorySi : cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-slate-200/60 animate-pulse space-y-3"
              >
                <div className="aspect-4/3 bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">No products found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find items matching "{searchQuery}". Try searching for rice, dhal, eggs, onions or tea.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetails={(p) => setActiveProductModal(p)}
              />
            ))}
          </div>
        )}

        {/* Local Information Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Store className="w-4 h-4" />
                <span>Physical Store Location</span>
              </div>
              <h3 className="text-lg font-black">FOOD &amp; LIFE GROCERY</h3>
              <p className="text-xs text-emerald-200 leading-relaxed font-semibold">
                929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne
              </p>
              <p className="text-[11px] text-emerald-300/90">
                929, මහනුවර පාර, ක්‍රොස් වත්තේගම, කැටුලෝය, තවලන්තැන්න
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Delivery Areas
              </div>
              <div className="p-2.5 bg-emerald-800/80 border border-emerald-500/40 rounded-xl space-y-1">
                <div className="text-xs font-extrabold text-white">
                  Katuloya • Thawalanthanne • Babaralla • Goomaraya • Thunisgala
                </div>
                <div className="text-[11px] text-emerald-200">
                  කැටුලෝය • තවලන්තැන්න • බඹරැල්ල • ගෝමරය • තුන්හිස්ගල
                </div>
              </div>
              <div className="text-xs text-amber-200 font-medium">
                Order before 8:30 PM for same-day delivery.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-center">
              <a
                href="https://wa.me/94712595683"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>WhatsApp: +94 71 259 5683</span>
              </a>
              <button
                type="button"
                onClick={() => setIsTrackLookupOpen(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-white/20 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Track Existing Order</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white p-0.5 border border-slate-700 overflow-hidden shrink-0 shadow-xs">
                <img src="/logo.jpg" alt="FOOD & LIFE GROCERY Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-base text-white tracking-tight">
                  FOOD &amp; LIFE GROCERY
                </span>
                <p className="text-[11px] text-slate-400 font-medium">
                  Everything For Your Choices • 929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne • WhatsApp: +94 71 259 5683
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShowWelcomeScreen(true)}
                className="text-orange-400 hover:text-orange-300 transition-colors font-bold flex items-center gap-1"
              >
                <span>👋 Welcome Screen</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeliveryPortalOpen(true)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold flex items-center gap-1"
              >
                <span>🛵 Driver Portal</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTrackLookupOpen(true)}
                className="hover:text-emerald-400 transition-colors"
              >
                Track Order
              </button>
              <button
                type="button"
                onClick={() => setIsAdminOpen(true)}
                className="hover:text-emerald-400 transition-colors"
              >
                Staff Portal
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <p>&copy; 2026 FOOD &amp; LIFE GROCERY. All rights reserved. Katuloya, Sri Lanka.</p>
            <p>Meta WhatsApp Business Platform Cloud API Automated Notifications Enabled.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Cart Bar */}
      {itemCount > 0 && !isCartOpen && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-extrabold text-xs">
                {itemCount}
              </div>
              <span>View Cart &bull; {itemCount} items</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-black">
              <span>LKR {grandTotal.toLocaleString()}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Modals */}
      {/* 1. Product Detail Modal */}
      <ProductModal
        product={activeProductModal}
        onClose={() => setActiveProductModal(null)}
      />

      {/* 2. Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* 3. Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(orderData) => {
          setConfirmedOrder(orderData);
        }}
      />

      {/* 4. Order Confirmation Modal */}
      <OrderConfirmationModal
        orderData={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onOpenTracking={(token) => {
          setConfirmedOrder(null);
          openTrackingView(token);
        }}
      />

      {/* 5. Track Order Quick Lookup Dialog */}
      {isTrackLookupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Track Your Grocery Order</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTrackLookupOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Enter your secure tracking token or reference code sent to your WhatsApp.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (lookupInput.trim()) {
                  setIsTrackLookupOpen(false);
                  openTrackingView(lookupInput.trim());
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder="e.g. 16/32 character token or order ref"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Lookup Order Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Admin Portal */}
      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onOpenOrderTracking={(token) => {
          setIsAdminOpen(false);
          openTrackingView(token);
        }}
        onProductsUpdated={fetchProductsFromApi}
      />

      {/* 7. Permanent Customer Order History Modal */}
      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        onOpenTracking={(token) => {
          setIsMyOrdersOpen(false);
          openTrackingView(token);
        }}
      />

      {/* Customer Loyalty Star Points Dashboard */}
      <MyStarPointsModal
        isOpen={isStarPointsOpen}
        onClose={() => setIsStarPointsOpen(false)}
      />

      {/* 8. Delivery Agent Dispatch & Live GPS Tracking Portal */}
      <DeliveryAgentPortal
        isOpen={isDeliveryPortalOpen}
        onClose={() => setIsDeliveryPortalOpen(false)}
        onOpenOrderTracking={(token) => {
          setIsDeliveryPortalOpen(false);
          openTrackingView(token);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <CartProvider>
        <GroceryShop />
      </CartProvider>
    </LanguageProvider>
  );
}
