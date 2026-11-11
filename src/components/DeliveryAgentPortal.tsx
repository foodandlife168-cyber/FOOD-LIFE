/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Phone,
  MessageCircle,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  X,
  ExternalLink,
  ChevronRight,
  Power,
  RotateCcw,
  Key,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import type { Order, DeliveryAgent, OrderStatus, GPSCoordinate } from '../types/index.ts';
import { LiveDeliveryMap } from './LiveDeliveryMap.tsx';

interface DeliveryAgentPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderTracking: (token: string) => void;
}

export const DeliveryAgentPortal: React.FC<DeliveryAgentPortalProps> = ({
  isOpen,
  onClose,
  onOpenOrderTracking,
}) => {
  // Session & Auth
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('foodlife_delivery_agent_token') || null;
  });
  const [currentAgent, setCurrentAgent] = useState<DeliveryAgent | null>(null);
  const [availableAgents, setAvailableAgents] = useState<DeliveryAgent[]>([]);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Orders State
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Live GPS Tracking State
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);
  const [currentGPS, setCurrentGPS] = useState<GPSCoordinate | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load available delivery agents for easy selection
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/delivery-agents/public');
        if (res.ok) {
          const data: DeliveryAgent[] = await res.json();
          setAvailableAgents(data.filter((a) => a.status === 'Active' && !a.isDeleted));
        }
      } catch (e) {
        // Fallback
      }
    };
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  // Load Agent Profile & Orders if token exists
  const loadAgentData = async () => {
    if (!authToken) return;
    setIsLoadingOrders(true);
    try {
      const profileRes = await fetch('/api/delivery-agent/profile', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setCurrentAgent(data.agent);
      } else {
        // Invalid session
        localStorage.removeItem('foodlife_delivery_agent_token');
        setAuthToken(null);
        setCurrentAgent(null);
        setIsLoadingOrders(false);
        return;
      }

      const ordersRes = await fetch('/api/delivery-agent/orders', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (ordersRes.ok) {
        const ordersData: Order[] = await ordersRes.json();
        setAssignedOrders(ordersData);

        // Check if an order already has live tracking active
        const activeOrder = ordersData.find(
          (o) => o.status === 'Out for Delivery' && o.deliveryAgent?.isLiveTrackingActive
        );
        if (activeOrder && !activeTrackingOrderId) {
          setActiveTrackingOrderId(activeOrder.id);
        }
      }
    } catch (err) {
      console.error('Error loading agent data:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isOpen && authToken) {
      loadAgentData();
      const interval = setInterval(loadAgentData, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen, authToken]);

  // Clean up GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginPassword) {
      setLoginError('Password is required to access the Delivery Driver Portal.');
      return;
    }

    if (!selectedAgentId && !loginUsername.trim()) {
      setLoginError('Please select your agent profile or enter your username / phone number.');
      return;
    }

    setIsLoadingAuth(true);

    try {
      const res = await fetch('/api/delivery-agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim() || undefined,
          agentId: selectedAgentId || undefined,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAuthToken(data.token);
        setCurrentAgent(data.agent);
        localStorage.setItem('foodlife_delivery_agent_token', data.token);
        setLoginPassword('');
      } else {
        setLoginError(data.error || 'Login failed. Please verify your driver username and password.');
      }
    } catch (err) {
      setLoginError('Network error connecting to delivery server.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    if (!currentPassword || !newPassword) {
      setChangePasswordError('Both current password and new password are required.');
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('New password and confirm password do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/delivery-agent/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setChangePasswordSuccess('Password updated successfully! Keep your new password secure.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsChangePasswordOpen(false);
          setChangePasswordSuccess(null);
        }, 2000);
      } else {
        setChangePasswordError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setChangePasswordError('Server error updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    localStorage.removeItem('foodlife_delivery_agent_token');
    setAuthToken(null);
    setCurrentAgent(null);
    setAssignedOrders([]);
    setActiveTrackingOrderId(null);
  };

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/delivery-agent/toggle-online', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (currentAgent) {
          setCurrentAgent({ ...currentAgent, isOnline: data.isOnline });
        }
      }
    } catch (err) {
      console.error('Error toggling online state:', err);
    }
  };

  // Status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/delivery-agent/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Delivery status updated to ${newStatus} by delivery agent`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
        await loadAgentData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Start Live Delivery & GPS Tracking
  const handleStartDelivery = async (order: Order) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your mobile browser.');
      return;
    }

    setGpsError(null);
    setActiveTrackingOrderId(order.id);

    try {
      // 1. Notify backend that delivery started
      await fetch(`/api/delivery-agent/orders/${order.id}/start-delivery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // 2. Start watching position
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const coord: GPSCoordinate = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading ?? undefined,
            speed: pos.coords.speed ?? undefined,
            timestamp: new Date().toISOString(),
          };

          setCurrentGPS(coord);
          setGpsError(null);

          // Transmit to server
          try {
            await fetch(`/api/delivery-agent/orders/${order.id}/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify(coord),
            });
          } catch (e) {
            console.warn('Error transmitting GPS location:', e);
          }
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setGpsError(`GPS Permission/Connection Error: ${err.message}. Showing last known location.`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );

      await loadAgentData();
    } catch (err) {
      console.error('Error starting delivery:', err);
    }
  };

  // Stop Live Delivery & Complete
  const handleStopDelivery = async (order: Order, finalStatus: OrderStatus = 'Delivered') => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActiveTrackingOrderId(null);

    try {
      await fetch(`/api/delivery-agent/orders/${order.id}/stop-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: finalStatus }),
      });

      await loadAgentData();
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error concluding delivery:', err);
    }
  };

  if (!isOpen) return null;

  // Filter orders by active vs completed
  const activeOrders = assignedOrders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Delivery Failed'
  );
  const completedOrders = assignedOrders.filter(
    (o) => o.status === 'Delivered' || o.status === 'Cancelled' || o.status === 'Delivery Failed'
  );
  const displayedOrders = activeTab === 'active' ? activeOrders : completedOrders;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-emerald-800 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Delivery Agent Portal</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-extrabold uppercase">
                  Katuloya Dispatch
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                {currentAgent
                  ? `${currentAgent.fullName || currentAgent.name} • ${currentAgent.vehicleType || 'Three Wheeler'} (${currentAgent.vehicleRegistrationNumber})`
                  : 'Driver dispatch & live GPS location tracking'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentAgent && (
              <button
                type="button"
                onClick={handleToggleOnline}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  currentAgent.isOnline
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{currentAgent.isOnline ? 'Online' : 'Offline'}</span>
              </button>
            )}
            {authToken && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(true);
                    setChangePasswordError(null);
                    setChangePasswordSuccess(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Change Driver Account Password"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Change Password</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Sign Out
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!authToken ? (
            /* Secure Driver Login Form */
            <div className="max-w-md mx-auto py-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 shadow-md mx-auto overflow-hidden">
                  <img
                    src="/logo.jpg"
                    alt="Food & Life Grocery"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-lg font-black text-slate-900">Sign In to Delivery Driver Portal</h3>
                <p className="text-xs text-slate-500">
                  Secure login for authorized and registered Food &amp; Life delivery agents.
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Driver Account (Quick Fill)
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => {
                      setSelectedAgentId(e.target.value);
                      const ag = availableAgents.find((a) => a.id === e.target.value);
                      if (ag) {
                        setLoginUsername(ag.username || ag.mobilePhone);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="">-- Choose your driver profile --</option>
                    {availableAgents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.fullName || ag.name} ({ag.vehicleType || 'Three Wheeler'} - {ag.vehicleRegistrationNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver Username or Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. driver_kamal or 0718849210"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver Account Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your driver password"
                      className="w-full px-3.5 py-2.5 pr-10 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Helpful Credentials Reference Box */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Registered Driver Accounts:</span>
                  </div>
                  <div className="font-mono text-[10px] space-y-0.5">
                    <div>• Kamal Perera: <span className="font-bold">driver_kamal</span> / <span className="font-bold">Driver@Kamal2026</span></div>
                    <div>• Sunil Bandara: <span className="font-bold">driver_sunil</span> / <span className="font-bold">Driver@Sunil2026</span></div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoadingAuth || (!selectedAgentId && !loginUsername) || !loginPassword}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoadingAuth ? 'Authenticating Driver...' : 'Sign In to Driver Portal'}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Logged in Agent Portal */
            <div className="space-y-5">
              {/* GPS Alert Bar if Error */}
              {gpsError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-800 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{gpsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTrackingOrderId) {
                        const ord = assignedOrders.find((o) => o.id === activeTrackingOrderId);
                        if (ord) handleStartDelivery(ord);
                      }
                    }}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-bold text-[10px]"
                  >
                    Retry GPS
                  </button>
                </div>
              )}

              {/* Active Delivery Live Map Panel (If currently delivering) */}
              {activeTrackingOrderId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Active Live Delivery Navigation
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      GPS coordinates transmitting automatically
                    </span>
                  </div>
                  {(() => {
                    const trackingOrder = assignedOrders.find((o) => o.id === activeTrackingOrderId);
                    return (
                      <LiveDeliveryMap
                        agentLocation={currentGPS || trackingOrder?.liveLocation}
                        customerArea={trackingOrder?.deliveryArea}
                        customerAddress={trackingOrder?.deliveryAddress}
                        agentName={currentAgent?.fullName || currentAgent?.name}
                        agentPhone={currentAgent?.mobilePhone}
                        vehicleNumber={currentAgent?.vehicleRegistrationNumber}
                        vehicleType={currentAgent?.vehicleType}
                        status={trackingOrder?.status}
                        isLiveActive={true}
                        orderNumber={trackingOrder?.orderNumber}
                        heightClass="h-64 sm:h-80"
                      />
                    );
                  })()}
                </div>
              )}

              {/* Tabs Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      activeTab === 'active'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Active Deliveries ({activeOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      activeTab === 'completed'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Completed / History ({completedOrders.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={loadAgentData}
                  className="p-2 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                  title="Refresh orders"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Orders List */}
              {isLoadingOrders ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading your deliveries...</div>
              ) : displayedOrders.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">No {activeTab} deliveries found</h4>
                  <p className="text-xs text-slate-500">
                    {activeTab === 'active'
                      ? 'You currently have no pending deliveries assigned. New orders from Katuloya will appear here.'
                      : 'Completed delivery trips will be stored here.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedOrders.map((ord, idx) => {
                    const isTrackingThis = activeTrackingOrderId === ord.id;
                    return (
                      <div
                        key={ord.id ? `${ord.id}-${idx}` : (ord.orderNumber ? `${ord.orderNumber}-${idx}` : `order-${idx}`)}
                        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all space-y-3.5 ${
                          isTrackingThis
                            ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                            : 'border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        {/* Top row: Order # & Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {ord.orderNumber}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              ord.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'Out for Delivery'
                                ? 'bg-blue-100 text-blue-800 animate-pulse'
                                : ord.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>

                        {/* Customer & Address Details */}
                        <div className="space-y-1 text-xs">
                          <div className="font-extrabold text-slate-900 flex items-center justify-between">
                            <span>{ord.customerName}</span>
                            <span className="font-mono text-emerald-700">Rs. {ord.total.toLocaleString()}</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                              {ord.deliveryAddress}
                              {ord.deliveryArea && (
                                <strong className="text-slate-900 font-semibold"> ({ord.deliveryArea})</strong>
                              )}
                            </span>
                          </div>
                          {ord.deliveryLandmark && (
                            <p className="text-[11px] text-slate-500 pl-5">Near: {ord.deliveryLandmark}</p>
                          )}
                          {ord.deliveryLatitude && ord.deliveryLongitude && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-mono font-bold bg-emerald-50 px-2.5 py-1 rounded-lg w-fit">
                              <Compass className="w-3.5 h-3.5 text-emerald-600" />
                              <span>GPS Coordinates: {ord.deliveryLatitude.toFixed(5)}, {ord.deliveryLongitude.toFixed(5)}</span>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500">
                            {ord.items.length} items ({ord.items.map((i) => `${i.quantity}x ${i.nameEn}`).join(', ')})
                          </div>
                        </div>

                        {/* Directions Link */}
                        <a
                          href={
                            ord.deliveryLatitude && ord.deliveryLongitude
                              ? `https://www.google.com/maps/dir/?api=1&destination=${ord.deliveryLatitude},${ord.deliveryLongitude}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ord.deliveryAddress + ', ' + (ord.deliveryArea || 'Katuloya'))}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-colors text-xs"
                        >
                          <Compass className="w-3.5 h-3.5 text-blue-600" />
                          <span>🧭 Open in Maps / Get Directions</span>
                        </a>

                        {/* Customer Direct Contact Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
                          <a
                            href={`tel:${ord.customerPhone}`}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-600" />
                            <span>Call ({ord.customerPhone})</span>
                          </a>

                          <a
                            href={`https://wa.me/${ord.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hello ${ord.customerName}, this is your Food & Life Grocery delivery agent (${currentAgent?.fullName || 'Driver'}). I am handling your order #${ord.orderNumber}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>

                        {/* GPS Live Delivery Controls */}
                        {activeTab === 'active' && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            {!isTrackingThis ? (
                              <button
                                type="button"
                                onClick={() => handleStartDelivery(ord)}
                                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                              >
                                <Navigation className="w-4 h-4" />
                                <span>START DELIVERY &amp; LIVE GPS</span>
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                                    <span className="font-black text-emerald-900">Live GPS Active</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-700">
                                    {currentGPS
                                      ? `${currentGPS.latitude.toFixed(4)}, ${currentGPS.longitude.toFixed(4)}`
                                      : 'Acquiring GPS...'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleStopDelivery(ord, 'Delivered')}
                                    className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                    <span>COMPLETE / DELIVERED</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleStopDelivery(ord, 'Delivery Failed')}
                                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Failed
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Status Change Selector (Delivery Agent Permission) */}
                            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                              <span className="text-[11px] font-bold text-slate-500">Update Status:</span>
                              <select
                                value={ord.status}
                                onChange={(e) => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                              >
                                <option value="Order Received">Order Received</option>
                                <option value="Preparing Order">Preparing Order</option>
                                <option value="Ready for Dispatch">Ready for Dispatch</option>
                                <option value="Delivery Agent Assigned">Delivery Agent Assigned</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Delivery Failed">Delivery Failed</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Customer Tracking Link */}
                        <div className="pt-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenOrderTracking(ord.trackingToken);
                            }}
                            className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <span>Open Customer Live Tracking Page</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Driver Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4 text-emerald-700" />
                </div>
                <h3 className="font-black text-slate-900 text-base">Change Driver Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changePasswordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{changePasswordError}</span>
              </div>
            )}

            {changePasswordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{changePasswordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password (min 6 characters) *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
