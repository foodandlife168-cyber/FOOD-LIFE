/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, ShieldCheck, MapPin, Phone, User, FileText, CheckCircle2, AlertTriangle, Building2, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { isValidSriLankanPhone } from '../utils/order.ts';

import { CustomerLocationPicker } from './CustomerLocationPicker.tsx';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderData: {
    orderNumber: string;
    trackingToken: string;
    trackingUrl: string;
    total: number;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { items, subtotal, discountTotal, deliveryCharge, grandTotal, deliveryType, clearCart } =
    useCart();
  const { language, t } = useLanguage();

  const [customerName, setCustomerName] = useState(() => localStorage.getItem('foodlife_customer_name') || '');
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('foodlife_customer_phone') || '');
  const [deliveryArea, setDeliveryArea] = useState(() => localStorage.getItem('foodlife_customer_area') || 'Katuloya');
  const [houseNumber, setHouseNumber] = useState(() => localStorage.getItem('foodlife_customer_house') || '');
  const [streetName, setStreetName] = useState(() => localStorage.getItem('foodlife_customer_street') || '');
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('foodlife_customer_address') || '');
  const [deliveryLandmark, setDeliveryLandmark] = useState(() => localStorage.getItem('foodlife_customer_landmark') || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bank_transfer'>(
    'cash_on_delivery'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPhoneValid = isValidSriLankanPhone(customerPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage(
        language === 'si'
          ? 'කරුණාකර ඔබගේ නම ඇතුළත් කරන්න.'
          : 'Please enter your full name.'
      );
      return;
    }

    if (!isPhoneValid) {
      setErrorMessage(
        language === 'si'
          ? 'වලංගු ශ්‍රී ලාංකීය ජංගම දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 077 123 4567).'
          : 'Please enter a valid Sri Lankan mobile phone number (e.g. 077 123 4567 or +94 77 123 4567).'
      );
      return;
    }

    // Build complete address if structured parts provided
    let finalAddress = deliveryAddress.trim();
    if (deliveryType === 'delivery') {
      if (!finalAddress) {
        const parts = [
          houseNumber.trim() ? `No. ${houseNumber.trim()}` : '',
          streetName.trim(),
          deliveryArea,
        ].filter(Boolean);
        finalAddress = parts.join(', ');
      }

      if (finalAddress.length < 5) {
        setErrorMessage(
          language === 'si'
            ? 'කරුණාකර බෙදාහැරීමේ ලිපිනය සම්පූර්ණයෙන් ඇතුළත් කරන්න.'
            : 'Please enter a complete delivery address within the designated delivery areas.'
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryArea,
        deliveryAddress:
          deliveryType === 'delivery'
            ? finalAddress
            : 'Food & Life Grocery – 929, Kandy Road, Cross Waththegama, Katuloya (In-Store Pickup)',
        houseNumber: houseNumber.trim() || undefined,
        streetName: streetName.trim() || undefined,
        deliveryLatitude: deliveryType === 'delivery' ? gpsCoords?.lat : undefined,
        deliveryLongitude: deliveryType === 'delivery' ? gpsCoords?.lng : undefined,
        deliveryLandmark: deliveryLandmark.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        deliveryType,
        paymentMethod,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit order. Please try again.');
      }

      // PERMANENT CUSTOMER INFO PERSISTENCE
      try {
        localStorage.setItem('foodlife_customer_name', customerName.trim());
        localStorage.setItem('foodlife_customer_phone', customerPhone.trim());
        if (deliveryType === 'delivery') {
          localStorage.setItem('foodlife_customer_area', deliveryArea);
          localStorage.setItem('foodlife_customer_house', houseNumber.trim());
          localStorage.setItem('foodlife_customer_street', streetName.trim());
          localStorage.setItem('foodlife_customer_address', finalAddress);
          localStorage.setItem('foodlife_customer_landmark', deliveryLandmark.trim());
        }

        const storedStr = localStorage.getItem('foodlife_customer_orders');
        const pastOrders = storedStr ? JSON.parse(storedStr) : [];
        const newRecord = {
          orderNumber: data.orderNumber,
          trackingToken: data.trackingToken,
          trackingUrl: data.trackingUrl,
          total: data.total,
          deliveryArea,
          deliveryType,
          deliveryAddress: payload.deliveryAddress,
          status: 'Order Received',
          createdAt: new Date().toISOString(),
          itemsCount: items.length,
        };
        const updatedOrders = [
          newRecord,
          ...pastOrders.filter((o: any) => o.orderNumber !== data.orderNumber),
        ];
        localStorage.setItem('foodlife_customer_orders', JSON.stringify(updatedOrders));
      } catch (saveErr) {
        console.error('Error preserving order history locally:', saveErr);
      }

      clearCart();
      onClose();
      onOrderSuccess({
        orderNumber: data.orderNumber,
        trackingToken: data.trackingToken,
        trackingUrl: data.trackingUrl,
        total: data.total,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while contacting server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center">
              <Truck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">{t('checkoutTitle')}</h2>
              <p className="text-xs text-emerald-200">
                {deliveryType === 'delivery'
                  ? 'Katuloya • Thawalanthanne • Babaralla • Goomaraya • Thunisgala'
                  : 'In-Store Pickup at Katuloya Shop'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-8 h-8 rounded-full bg-emerald-900/50 hover:bg-emerald-900 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="m-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Error: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Section 1: Customer Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('customerDetails')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('fullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('phoneNumber')} *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={t('phoneNumberPlaceholder')}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:outline-hidden ${
                      customerPhone && isPhoneValid
                        ? 'border-emerald-500 focus:ring-emerald-500'
                        : customerPhone && !isPhoneValid
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-200 focus:ring-emerald-500'
                    }`}
                  />
                  {customerPhone && (
                    <span className="absolute right-3 top-2.5 text-xs">
                      {isPhoneValid ? (
                        <span className="text-emerald-600 font-bold">✓ Valid</span>
                      ) : (
                        <span className="text-rose-500 font-medium">947X...</span>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  WhatsApp tracking link will be sent to this number automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Details */}
          {deliveryType === 'delivery' ? (
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('deliveryArea')} &amp; Destination Address</span>
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                  Katuloya Hill Delivery
                </span>
              </h3>

              {/* Delivery Town / Area Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('deliveryArea')} ({t('selectDeliveryArea')}) *
                </label>
                <select
                  value={deliveryArea}
                  onChange={(e) => setDeliveryArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="Katuloya">Katuloya (කැටුලෝය)</option>
                  <option value="Thawalanthanne">Thawalanthanne (තවලන්තැන්න)</option>
                  <option value="Babaralla">Babaralla (බඹරැල්ල)</option>
                  <option value="Goomaraya">Goomaraya (ගෝමරය)</option>
                  <option value="Thunisgala">Thunisgala (තුන්හිස්ගල)</option>
                  <option value="Panwila">Panwila (පන්විල)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Covered towns: Katuloya • Thawalanthanne • Babaralla • Goomaraya • Thunisgala • Panwila
                </p>
              </div>

              {/* Structured Address Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    House / Building No or Name
                  </label>
                  <input
                    type="text"
                    value={houseNumber}
                    onChange={(e) => {
                      setHouseNumber(e.target.value);
                      if (!deliveryAddress) {
                        setDeliveryAddress(e.target.value ? `No. ${e.target.value}, ${streetName ? streetName + ', ' : ''}${deliveryArea}` : '');
                      }
                    }}
                    placeholder="e.g. No. 42 / 'Green Valley'"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Street Name / Road
                  </label>
                  <input
                    type="text"
                    value={streetName}
                    onChange={(e) => {
                      setStreetName(e.target.value);
                      if (!deliveryAddress) {
                        setDeliveryAddress(`${houseNumber ? 'No. ' + houseNumber + ', ' : ''}${e.target.value ? e.target.value + ', ' : ''}${deliveryArea}`);
                      }
                    }}
                    placeholder="e.g. Kandy Road / Tea Estate Lane"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Full Address Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('deliveryAddress')} *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={t('deliveryAddressPlaceholder')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Live GPS Location & Map Pin Picker */}
              <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  Live GPS Delivery Pin (Optional &amp; Recommended)
                </span>
                <CustomerLocationPicker
                  selectedCoords={gpsCoords}
                  onSelectCoords={(coords) => {
                    setGpsCoords(coords);
                    if (coords && !deliveryAddress.trim()) {
                      setDeliveryAddress(`GPS Location Pin: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (${deliveryArea})`);
                    }
                  }}
                  areaHint={deliveryArea}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('landmark')}
                  </label>
                  <input
                    type="text"
                    value={deliveryLandmark}
                    onChange={(e) => setDeliveryLandmark(e.target.value)}
                    placeholder={t('landmarkPlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('notes')}
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call before delivery, red gate"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* In-Store Pickup Selected Banner */
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <h4 className="font-black text-emerald-950 text-sm">
                  {language === 'si' ? 'සාප්පුවෙන් භාණ්ඩ ලබාගැනීම (Store Pickup)' : 'In-Store Customer Pickup Selected'}
                </h4>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Your order will be packed and held ready for collection at our central Katuloya shop:
              </p>
              <div className="p-3 bg-white rounded-xl border border-emerald-200/80 text-xs text-slate-800 space-y-1">
                <div className="font-bold text-emerald-800">📍 Food &amp; Life Grocery – Katuloya</div>
                <div className="text-slate-600">929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne</div>
                <div className="text-[11px] text-slate-500 font-medium">Opening Hours: Daily 7:00 AM – 9:00 PM • Hotline: 077 123 4567</div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero Delivery Fee (Rs. 0). No delivery address or GPS coordinates required.</span>
              </div>
            </div>
          )}

          {/* Section 3: Payment Method */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('paymentMethod')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  paymentMethod === 'cash_on_delivery'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    {language === 'si' ? 'භාණ්ඩ ලැබුණු පසු මුදල් (COD)' : 'Cash on Delivery (COD)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  {language === 'si'
                    ? 'භාණ්ඩ ඔබේ අතට ලැබුණු පසු මුදල් ගෙවන්න.'
                    : 'Pay driver directly when groceries arrive at your door.'}
                </p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    {language === 'si' ? 'බැංකු තැන්පතු මගින් (Bank Deposit)' : 'Direct Bank Deposit'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-6">
                  {language === 'si'
                    ? "People's Bank ගිණුමට තැන්පත් කර රිසිට්පත එවන්න."
                    : "Deposit to People's Bank account and verify slip."}
                </p>
              </label>
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  Bank Account Instructions (Food &amp; Life Katuloya)
                </div>
                <p className="text-[11px] leading-relaxed">
                  <strong>Bank:</strong> People's Bank &bull; <strong>Branch:</strong> Panwila
                  <br />
                  <strong>Account Name:</strong> RG Nimal Rajapaksha &bull; <strong>Account No:</strong> 211200380039804
                  <br />
                  <em>Note: Orders will be marked as "Payment Verified" by store staff upon reviewing transfer slip.</em>
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Final Summary & Submit */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Total ({items.length} items)</span>
              <span className="font-semibold text-slate-900">
                LKR {(subtotal - discountTotal).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee ({deliveryType === 'delivery' ? (deliveryArea || 'Katuloya, Thawalanthanne, Babaralla, Goomaraya, Thunisgala') : 'Pickup'})</span>
              <span className="font-semibold text-slate-900">
                {deliveryCharge === 0 ? 'FREE' : `LKR ${deliveryCharge.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
              <span>Grand Total</span>
              <span className="text-emerald-800">LKR {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isPhoneValid}
            className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm shadow-lg transition-all transform active:scale-98 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>{t('placingOrder')}</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('placeOrder')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
