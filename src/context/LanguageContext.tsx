/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'si';

interface Translations {
  [key: string]: {
    en: string;
    si: string;
  };
}

export const translations: Translations = {
  // Header & Brand
  brandName: {
    en: 'FOOD & LIFE GROCERY',
    si: 'ෆුඩ් ඇන්ඩ් ලයිෆ් සිල්ලර වෙළඳසැල',
  },
  tagline: {
    en: 'Fresh & Everyday Groceries in Katuloya, Thawalanthanne',
    si: 'නැවුම් සහ එදිනෙදා සිල්ලර බඩු - කැටුලෝය, තවලන්තැන්න',
  },
  deliveryCoverage: {
    en: 'Katuloya • Thawalanthanne • Babaralla • Goomaraya • Thunisgala',
    si: 'කැටුලෝය • තවලන්තැන්න • බඹරැල්ල • ගෝමරය • තුන්හිස්ගල',
  },
  trackOrder: {
    en: 'Track Order',
    si: 'ඇණවුම සොයන්න',
  },
  myOrders: {
    en: 'My Orders',
    si: 'මගේ ඇණවුම්',
  },
  myOrdersHistory: {
    en: 'Saved Order History',
    si: 'සුරකින ලද ඇණවුම් ඉතිහාසය',
  },
  deliveryArea: {
    en: 'Delivery Area',
    si: 'බෙදාහැරීමේ ප්‍රදේශය',
  },
  selectDeliveryArea: {
    en: 'Select Delivery Town / Area',
    si: 'බෙදාහැරිය යුතු ප්‍රදේශය තෝරන්න',
  },
  orderHistoryPermanentlySaved: {
    en: 'Your order history is permanently preserved and will never be deleted.',
    si: 'ඔබගේ ඇණවුම් විස්තර කිසිවිටෙකත් මැකී නොයන ලෙස ස්ථිරවම සුරැකේ.',
  },
  adminLogin: {
    en: 'Staff / Admin',
    si: 'පරිපාලක පිවිසුම',
  },
  cart: {
    en: 'Cart',
    si: 'මල්ල',
  },

  // Hero
  heroTitle: {
    en: 'Everything You Need, Freshness You Deserve!',
    si: 'ඔබට අවශ්‍ය සෑම දෙයක්ම, ඔබට හිමි නැවුම් බව!',
  },
  heroSubtitle: {
    en: 'Your Trusted Grocery Shopping Partner • Quality • Freshness • Convenience',
    si: 'ඔබගේ විශ්වාසනීය සිල්ලර සාප්පු සවාරි හවුල්කරු • උසස් තත්ත්වය • නැවුම් බව • පහසුව',
  },
  orderViaWhatsApp: {
    en: 'Order via WhatsApp',
    si: 'WhatsApp මගින් ඇණවුම් කරන්න',
  },
  trackYourOrderPlaceholder: {
    en: 'Enter Order # (e.g. FL-2026-000101) or Token',
    si: 'ඇණවුම් අංකය හෝ Token එක ඇතුළත් කරන්න',
  },

  // Categories
  allCategories: {
    en: 'All Products',
    si: 'සියලුම භාණ්ඩ',
  },
  searchPlaceholder: {
    en: 'Search rice, vegetables, spices, dhal, tea...',
    si: 'සහල්, එළවළු, කුළුබඩු, පරිප්පු, තේ සොයන්න...',
  },
  itemsFound: {
    en: 'products available',
    si: 'භාණ්ඩ තිබේ',
  },

  // Product Card
  addToCart: {
    en: 'Add to Cart',
    si: 'මල්ලට දමන්න',
  },
  inStock: {
    en: 'In Stock',
    si: 'තොග ඇත',
  },
  outOfStock: {
    en: 'Out of Stock',
    si: 'තොග අවසන්',
  },
  unitLabel: {
    en: 'Unit',
    si: 'ප්‍රමාණය',
  },

  // Cart Drawer
  yourCart: {
    en: 'Your Shopping Cart',
    si: 'ඔබේ සාප්පු මල්ල',
  },
  emptyCart: {
    en: 'Your cart is empty',
    si: 'ඔබේ මල්ල හිස්ය',
  },
  startShopping: {
    en: 'Start Shopping',
    si: 'භාණ්ඩ තෝරන්න',
  },
  freeDeliveryUnlocked: {
    en: '🎉 Congratulations! You unlocked FREE Delivery in Katuloya!',
    si: '🎉 සුබ පැතුම්! ඔබට නොමිලේ බෙදාහැරීම හිමිවේ!',
  },
  addMoreForFreeDelivery: {
    en: 'Add LKR {amount} more for FREE Delivery!',
    si: 'නොමිලේ බෙදාහැරීම සඳහා තව LKR {amount} ක් එකතු කරන්න!',
  },
  subtotal: {
    en: 'Subtotal',
    si: 'අතුරු එකතුව',
  },
  discount: {
    en: 'Discount Savings',
    si: 'වට්ටම් ඉතිරිය',
  },
  deliveryFee: {
    en: 'Delivery Charge (Katuloya, Thawalanthanne, Babaralla, Goomaraya, Thunisgala)',
    si: 'බෙදාහැරීමේ ගාස්තුව (කැටුලෝය, තවලන්තැන්න, බඹරැල්ල, ගෝමරය, තුන්හිස්ගල)',
  },
  free: {
    en: 'FREE',
    si: 'නොමිලේ',
  },
  total: {
    en: 'Total Amount',
    si: 'මුළු මුදල',
  },
  checkout: {
    en: 'Proceed to Checkout',
    si: 'ඇණවුම තහවුරු කරන්න',
  },

  // Checkout
  checkoutTitle: {
    en: 'Complete Your Order',
    si: 'ඇණවුම සම්පූර්ණ කිරීම',
  },
  customerDetails: {
    en: 'Customer Contact Information',
    si: 'ඔබගේ තොරතුරු',
  },
  fullName: {
    en: 'Full Name',
    si: 'සම්පූර්ණ නම',
  },
  fullNamePlaceholder: {
    en: 'e.g. Kasun Bandara',
    si: 'උදා: කසුන් බණ්ඩාර',
  },
  phoneNumber: {
    en: 'Sri Lankan Mobile Number (For WhatsApp Updates)',
    si: 'දුරකථන අංකය (WhatsApp දැනුම්දීම් සඳහා)',
  },
  phoneNumberPlaceholder: {
    en: 'e.g. 077 123 4567 or 071 888 9999',
    si: 'උදා: 077 123 4567',
  },
  deliveryType: {
    en: 'Order Type',
    si: 'ඇණවුම් ක්‍රමය',
  },
  homeDelivery: {
    en: 'Home Delivery (Katuloya, Thawalanthanne, Babaralla, Goomaraya, Thunisgala)',
    si: 'නිවසටම ගෙන්වා ගැනීම (කැටුලෝය, තවලන්තැන්න, බඹරැල්ල, ගෝමරය, තුන්හිස්ගල)',
  },
  storePickup: {
    en: 'In-Store Pickup (Katuloya Shop)',
    si: 'කඩෙන් ලබාගැනීම (කැටුලෝය වෙළඳසැල)',
  },
  deliveryAddress: {
    en: 'Delivery Address',
    si: 'භාණ්ඩ ලබාදිය යුතු ලිපිනය',
  },
  deliveryAddressPlaceholder: {
    en: 'e.g. No. 42, Temple Road, Katuloya, Thawalanthanne',
    si: 'උදා: නො. 42, පන්සල පාර, කැටුලෝය, තවලන්තැන්න',
  },
  landmark: {
    en: 'Nearest Landmark',
    si: 'ළඟම ඇති ප්‍රසිද්ධ ස්ථානය',
  },
  landmarkPlaceholder: {
    en: 'e.g. Near Katuloya Bridge / Bus Stop / Tea Factory',
    si: 'උදා: කැටුලෝය පාලම ළඟ / බස් නැවතුම / තේ කම්හල අසල',
  },
  notes: {
    en: 'Special Delivery Notes (Optional)',
    si: 'විශේෂ සටහන් (විකල්ප)',
  },
  paymentMethod: {
    en: 'Payment Method',
    si: 'ගෙවීම් ක්‍රමය',
  },
  cashOnDelivery: {
    en: 'Cash on Delivery (COD) - Pay when you receive groceries',
    si: 'භාණ්ඩ ලැබුණු පසු මුදල් ගෙවීම (COD)',
  },
  bankTransfer: {
    en: "Direct Bank Deposit (People's Bank)",
    si: 'බැංකු තැන්පතු මගින් ගෙවීම (People\'s Bank)',
  },
  placeOrder: {
    en: 'Confirm & Place Order',
    si: 'ඇණවුම තහවුරු කරන්න',
  },
  placingOrder: {
    en: 'Validating & Processing...',
    si: 'සකසමින් පවතී...',
  },

  // Order Confirmation
  orderPlacedSuccess: {
    en: 'Order Successfully Placed!',
    si: 'ඔබගේ ඇණවුම සාර්ථකව භාරගන්නා ලදී!',
  },
  orderPlacedDesc: {
    en: 'We have received your grocery order. A WhatsApp notification with live tracking has been sent to your phone.',
    si: 'ඔබගේ ඇණවුම ලැබිණි. සජීවී නිරීක්ෂණ සබැඳිය සහිත WhatsApp පණිවිඩයක් ඔබගේ දුරකථනයට යවා ඇත.',
  },
  orderNumberLabel: {
    en: 'Order Reference',
    si: 'ඇණවුම් අංකය',
  },
  trackingLink: {
    en: 'Personal Tracking Link',
    si: 'ඔබේ සජීවී නිරීක්ෂණ සබැඳිය',
  },
  copyLink: {
    en: 'Copy Link',
    si: 'සබැඳිය පිටපත් කරන්න',
  },
  copied: {
    en: 'Copied!',
    si: 'පිටපත් විය!',
  },
  trackNow: {
    en: 'Open Live Order Tracker',
    si: 'සජීවී නිරීක්ෂණ පිටුව බලන්න',
  },
  sendWhatsAppMessage: {
    en: 'Message Us on WhatsApp',
    si: 'WhatsApp මගින් කතා කරන්න',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load preferred language from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem('foodlife_lang');
    if (saved === 'en' || saved === 'si') {
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('foodlife_lang', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const item = translations[key];
    let text = item ? item[language] || item['en'] : key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
