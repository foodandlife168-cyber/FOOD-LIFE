/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShoppingBag,
  Package,
  MessageCircle,
  Settings,
  Download,
  Search,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  ExternalLink,
  ChevronDown,
  Lock,
  ArrowRight,
  TrendingUp,
  Truck,
  RotateCcw,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Printer,
  Shield,
  Share2,
  Mail,
  FileSpreadsheet,
  Check,
  Trash2,
  Building2,
  Receipt,
  CreditCard,
  UserCheck,
  UserX,
  UserPlus,
  Edit2,
  Phone,
  DollarSign,
  Wallet,
  Upload,
  Image as ImageIcon,
  Navigation,
  BarChart3,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Film,
  Star,
} from 'lucide-react';
import type {
  Order,
  OrderStatus,
  Product,
  WhatsAppConfigStatus,
  WhatsAppNotificationRecord,
  StoreConfig,
  PurchaseOrder,
  PurchaseOrderItem,
  StockMovement,
  DeliveryAgent,
  PaymentRecord,
  DeliveryAssignment,
  StaffRole,
  CustomerAccountLedger,
  CustomerAccountsDashboardStats,
} from '../types/index.ts';
import { formatPhoneForDisplay, isValidSriLankanPhone } from '../utils/order.ts';
import { BillModal } from './BillModal.tsx';
import { generateBillPdf } from '../utils/generateBillPdf.ts';
import {
  generatePurchaseOrderPdf,
  buildWhatsAppPurchaseOrderText,
} from '../utils/generatePurchaseOrderPdf.ts';
import { LiveDeliveryMap } from './LiveDeliveryMap.tsx';
import { AdminProductImageManager } from './AdminProductImageManager.tsx';
import { ManagementReportsModule } from './ManagementReportsModule.tsx';
import { PromotionalMediaManager } from './PromotionalMediaManager.tsx';
import { CustomerLoyaltyManagement } from './CustomerLoyaltyManagement.tsx';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderTracking: (token: string) => void;
  onProductsUpdated?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  onOpenOrderTracking,
  onProductsUpdated,
}) => {
  // Staff & Admin auth state
  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem('foodlife_admin_token')
  );
  const [usernameInput, setUsernameInput] = useState('Admin');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Staff Password Change State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Bill Modal State
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [orderForBill, setOrderForBill] = useState<Order | null>(null);

  // Active staff user account details
  const [currentStaffUser, setCurrentStaffUser] = useState<{
    name: string;
    username: string;
    role: StaffRole;
    permissions?: string[];
    store?: string;
  } | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<
    'orders' | 'live_tracking' | 'intake' | 'inventory' | 'product_images' | 'purchase_orders' | 'delivery_agents' | 'whatsapp' | 'settings' | 'reports_accounting' | 'promotional_media' | 'customer_loyalty'
  >('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Live GPS Tracking Tab State
  const [liveDeliveries, setLiveDeliveries] = useState<any[]>([]);
  const [isLoadingLiveDeliveries, setIsLoadingLiveDeliveries] = useState(false);
  const [selectedLiveOrder, setSelectedLiveOrder] = useState<any | null>(null);

  // Stats State
  const [stats, setStats] = useState<any>(null);

  // Inventory & Product Image State
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productIsActive, setProductIsActive] = useState<boolean>(true);
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setProductImageUrl(editingProduct.imageUrl || '');
      setProductIsActive(editingProduct.isActive !== undefined ? editingProduct.isActive : true);
      setImageUploadError(null);
    } else if (isAddingProduct) {
      setProductImageUrl('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80');
      setProductIsActive(true);
      setImageUploadError(null);
    }
  }, [editingProduct, isAddingProduct]);

  // PO Goods Receiving Modal State
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [receivingInputs, setReceivingInputs] = useState<Record<string, number>>({});
  const [receivingNotes, setReceivingNotes] = useState('');
  const [isSubmittingReceiving, setIsSubmittingReceiving] = useState(false);
  const [receivingFeedback, setReceivingFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Database Cleanup (Fresh Start) State
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [cleanupPasswordInput, setCleanupPasswordInput] = useState('');
  const [isSubmittingCleanup, setIsSubmittingCleanup] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    success: boolean;
    message: string;
    backupFile?: string;
  } | null>(null);

  // Purchase Orders State (Quantity Only & Reorders)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [poSupplierName, setPoSupplierName] = useState('Katuloya Central Wholesale Distributors');
  const [poSupplierContact, setPoSupplierContact] = useState('+94 81 247 6200');
  const [poNotes, setPoNotes] = useState('Deliver directly to Food & Life Grocery, Katuloya shop floor.');
  const [poSearch, setPoSearch] = useState('');
  const [poStockFilter, setPoStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [poSelectedItems, setPoSelectedItems] = useState<{
    productId: string;
    product: Product;
    reorderQuantity: number;
  }[]>([]);
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [poFeedback, setPoFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [poViewMode, setPoViewMode] = useState<'builder' | 'history'>('builder');

  // Delivery Agents State
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);
  const [editingAgent, setEditingAgent] = useState<DeliveryAgent | null>(null);
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [resetAgent, setResetAgent] = useState<DeliveryAgent | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordFeedback, setResetPasswordFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Payment Summary & Modals
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([]);
  const [isCustomerAccountsOpen, setIsCustomerAccountsOpen] = useState(false);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccountLedger[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerAccountsDashboardStats | null>(null);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<CustomerAccountLedger | null>(null);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<CustomerAccountLedger | null>(null);
  const [customerPaymentForm, setCustomerPaymentForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    receiptNumber: '',
    note: '',
    receivedBy: 'Admin',
  });
  const [customerAccountSearch, setCustomerAccountSearch] = useState('');
  const [customerAccountFilterBalanceOnly, setCustomerAccountFilterBalanceOnly] = useState(false);
  const [isSubmittingCustomerPayment, setIsSubmittingCustomerPayment] = useState(false);
  const [customerPaymentSuccessMsg, setCustomerPaymentSuccessMsg] = useState('');
  const [customerPaymentErrorMsg, setCustomerPaymentErrorMsg] = useState('');
  const [isCustomerAccountsLoading, setIsCustomerAccountsLoading] = useState(false);
  const [isDeliveryAccountingOpen, setIsDeliveryAccountingOpen] = useState(false);
  const [deliveryAccounting, setDeliveryAccounting] = useState<any>(null);

  // Payment Recording Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'credit_card' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentReceivedBy, setPaymentReceivedBy] = useState('Admin');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Delivery Agent Assignment inline state for selected order
  const [assignAgentId, setAssignAgentId] = useState('');
  const [assignHireCharge, setAssignHireCharge] = useState<number>(300);
  const [assigningAgent, setAssigningAgent] = useState(false);

  // WhatsApp Hub State
  const [waStatus, setWaStatus] = useState<WhatsAppConfigStatus | null>(null);
  const [waLogs, setWaLogs] = useState<WhatsAppNotificationRecord[]>([]);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // WhatsApp Order Intake State
  const [intakeCustomerName, setIntakeCustomerName] = useState('');
  const [intakeCustomerPhone, setIntakeCustomerPhone] = useState('');
  const [intakeDeliveryArea, setIntakeDeliveryArea] = useState('Katuloya');
  const [intakeAddress, setIntakeAddress] = useState('Katuloya Area');
  const [intakeRawMessage, setIntakeRawMessage] = useState('');
  const [intakeItems, setIntakeItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [intakeConsent, setIntakeConsent] = useState(false);
  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  // Store Settings
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Verify and fetch admin data if authenticated
  useEffect(() => {
    if (authToken && isOpen) {
      loadAllAdminData();
    }
  }, [authToken, isOpen]);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    const headers = { Authorization: `Bearer ${authToken}` };

    try {
      // 1. Verify session on server first to guarantee valid, unexpired session
      const verifyRes = await fetch('/api/admin/verify-session', { headers });
      if (!verifyRes.ok) {
        setAuthToken(null);
        setCurrentStaffUser(null);
        localStorage.removeItem('foodlife_admin_token');
        setLoginError('Your administrator session has expired or is invalid. Please log in again.');
        setIsLoading(false);
        return;
      }
      const verifyData = await verifyRes.json();
      if (verifyData.user) {
        setCurrentStaffUser(verifyData.user);
      }

      // 2. Load all admin resources
      const [
        statsRes,
        ordersRes,
        productsRes,
        waStatusRes,
        waLogsRes,
        configRes,
        poRes,
        smRes,
        agentsRes,
        paymentSummaryRes,
        reorderRes,
      ] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/whatsapp/status', { headers }),
        fetch('/api/admin/whatsapp/logs', { headers }),
        fetch('/api/store-config'),
        fetch('/api/admin/purchase-orders', { headers }),
        fetch('/api/admin/stock-movements', { headers }),
        fetch('/api/admin/delivery-agents', { headers }),
        fetch('/api/admin/payment-summary', { headers }),
        fetch('/api/admin/reorder-suggestions', { headers }),
      ]);

      if (statsRes.status === 401 || ordersRes.status === 401) {
        setAuthToken(null);
        localStorage.removeItem('foodlife_admin_token');
        setLoginError('Administrator session expired. Please sign in again.');
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (waStatusRes.ok) setWaStatus(await waStatusRes.json());
      if (waLogsRes.ok) setWaLogs(await waLogsRes.json());
      if (configRes.ok) setStoreConfig(await configRes.json());
      if (poRes.ok) setPurchaseOrders(await poRes.json());
      if (smRes.ok) setStockMovements(await smRes.json());
      if (agentsRes.ok) setDeliveryAgents(await agentsRes.json());
      if (paymentSummaryRes.ok) setPaymentSummary(await paymentSummaryRes.json());
      if (reorderRes.ok) setReorderSuggestions(await reorderRes.json());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerAccounts = async () => {
    setIsCustomerAccountsLoading(true);
    try {
      const res = await fetch('/api/admin/customer-accounts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCustomerAccounts(data);
        } else {
          setCustomerAccounts(data.accounts || []);
          if (data.stats) setCustomerStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching customer accounts:', err);
    } finally {
      setIsCustomerAccountsLoading(false);
    }
  };

  const handleRecordDirectCustomerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalCustomer) return;
    const num = Number(customerPaymentForm.amount);
    if (isNaN(num) || num <= 0) {
      setCustomerPaymentErrorMsg('Please enter a valid payment amount greater than Rs. 0');
      return;
    }
    setIsSubmittingCustomerPayment(true);
    setCustomerPaymentErrorMsg('');
    setCustomerPaymentSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/customers/${paymentModalCustomer.customerId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: num,
          paymentMethod: customerPaymentForm.paymentMethod,
          receiptNumber: customerPaymentForm.receiptNumber.trim() || undefined,
          note: customerPaymentForm.note.trim() || undefined,
          receivedBy: customerPaymentForm.receivedBy.trim() || currentStaffUser?.name || 'Admin',
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setCustomerPaymentErrorMsg(result.error || 'Failed to record customer payment');
        setIsSubmittingCustomerPayment(false);
        return;
      }
      setCustomerPaymentSuccessMsg(result.message || 'Payment recorded successfully!');
      if (result.customer) {
        setCustomerAccounts((prev) =>
          prev.map((acc) => (acc.customerId === result.customer.customerId ? result.customer : acc))
        );
        if (selectedCustomerForLedger?.customerId === result.customer.customerId) {
          setSelectedCustomerForLedger(result.customer);
        }
      }
      if (result.stats) {
        setCustomerStats(result.stats);
      }
      loadAllAdminData();
      setTimeout(() => {
        setPaymentModalCustomer(null);
        setCustomerPaymentForm({
          amount: '',
          paymentMethod: 'cash',
          receiptNumber: '',
          note: '',
          receivedBy: currentStaffUser?.name || 'Admin',
        });
        setCustomerPaymentSuccessMsg('');
      }, 1200);
    } catch (err: any) {
      setCustomerPaymentErrorMsg(err.message || 'Error communicating with server');
    } finally {
      setIsSubmittingCustomerPayment(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }
      setAuthToken(data.token);
      if (data.user) {
        setCurrentStaffUser(data.user);
      }
      localStorage.setItem('foodlife_admin_token', data.token);
      setPasswordInput('');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus(null);

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeStatus({
        success: false,
        message: 'New password and confirmation do not match.',
      });
      return;
    }

    if (newPasswordInput.length < 6) {
      setPasswordChangeStatus({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update staff password.');
      }
      setPasswordChangeStatus({
        success: true,
        message: 'Staff password changed successfully! Store operations are now secured with your new password.',
      });
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      setPasswordChangeStatus({
        success: false,
        message: err.message || 'Error updating password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (err) {
        console.error('Error invalidating session on server:', err);
      }
    }
    setAuthToken(null);
    setCurrentStaffUser(null);
    localStorage.removeItem('foodlife_admin_token');
    setPasswordInput('');
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Status updated to ${newStatus} from Admin Portal`,
          sendNotification: true,
        }),
      });

      if (res.ok) {
        await loadAllAdminData();
        if (selectedOrder && selectedOrder.id === orderId) {
          const updated = orders.find((o) => o.id === orderId);
          if (updated) setSelectedOrder({ ...updated, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleRetryNotification = async (logId: string) => {
    try {
      const res = await fetch(`/api/admin/whatsapp/retry/${logId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        await loadAllAdminData();
      }
    } catch (err) {
      console.error('Error retrying notification:', err);
    }
  };

  const [settingsFeedback, setSettingsFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleTogglePoProduct = (prod: Product) => {
    const existing = poSelectedItems.find((i) => i.productId === prod.id);
    if (existing) {
      setPoSelectedItems(poSelectedItems.filter((i) => i.productId !== prod.id));
    } else {
      const suggestion = reorderSuggestions.find((s) => s.productId === prod.id);
      const suggestedQty =
        suggestion && suggestion.suggestedReorderQuantity > 0
          ? suggestion.suggestedReorderQuantity
          : Math.max(10, (prod.targetStockLevel || 100) - prod.availableStock);
      setPoSelectedItems([
        ...poSelectedItems,
        {
          productId: prod.id,
          product: prod,
          reorderQuantity: suggestedQty,
        },
      ]);
    }
  };

  const handleUpdatePoQty = (productId: string, qty: number) => {
    const validQty = Math.max(1, Math.floor(qty) || 1);
    setPoSelectedItems(
      poSelectedItems.map((i) => (i.productId === productId ? { ...i, reorderQuantity: validQty } : i))
    );
  };

  const handleRemovePoItem = (productId: string) => {
    setPoSelectedItems(poSelectedItems.filter((i) => i.productId !== productId));
  };

  const handleAddAllSuggestedPoItems = () => {
    const itemsToAdd = reorderSuggestions
      .filter((s) => s.suggestedReorderQuantity > 0)
      .map((s) => {
        const prod = products.find((p) => p.id === s.productId);
        if (!prod) return null;
        return {
          productId: prod.id,
          product: prod,
          reorderQuantity: s.suggestedReorderQuantity,
        };
      })
      .filter(Boolean) as { productId: string; product: Product; reorderQuantity: number }[];

    if (itemsToAdd.length === 0) {
      setPoFeedback({
        success: true,
        message: 'All products currently meet target stock levels! No replenishment needed at this time.',
      });
      return;
    }

    setPoSelectedItems(itemsToAdd);
    setPoFeedback({
      success: true,
      message: `Added ${itemsToAdd.length} products needing replenishment based on target stock and pending orders!`,
    });
  };

  const poTotalUnits = poSelectedItems.reduce((sum, item) => sum + item.reorderQuantity, 0);

  const getCurrentPoObject = (): PurchaseOrder => {
    const items: PurchaseOrderItem[] = poSelectedItems.map((i) => ({
      productId: i.productId,
      nameEn: i.product.nameEn,
      nameSi: i.product.nameSi,
      category: i.product.category,
      unit: i.product.unit,
      currentStock: i.product.availableStock,
      reorderQuantity: i.reorderQuantity,
      imageUrl: i.product.imageUrl,
    }));

    return {
      id: `po-draft-${Date.now()}`,
      poNumber: `PO-${new Date().getFullYear()}-${String((purchaseOrders.length || 0) + 101).padStart(4, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      supplierName: poSupplierName.trim() || 'Katuloya Central Wholesale Distributors',
      supplierContact: poSupplierContact.trim(),
      notes: poNotes.trim(),
      items,
      subtotal: 0,
      grandTotal: 0,
      status: 'issued',
      createdAt: new Date().toISOString(),
      bankDetails: storeConfig?.bankDetails || {
        bankName: "People's Bank",
        branch: 'Panwila',
        accountName: 'RG Nimal Rajapaksha',
        accountNumber: '211200380039804',
      },
    };
  };

  const handleDownloadPoPdf = async (customPo?: PurchaseOrder) => {
    if (!storeConfig) return;
    const po = customPo || getCurrentPoObject();
    if (po.items.length === 0) {
      setPoFeedback({ success: false, message: 'Please select at least one product before downloading PDF.' });
      return;
    }
    await generatePurchaseOrderPdf(po, storeConfig, { autoDownload: true });
    setPoFeedback({ success: true, message: `Official Purchase Order PDF (${po.poNumber}) downloaded successfully!` });
  };

  const handleSharePoWhatsApp = (customPo?: PurchaseOrder) => {
    if (!storeConfig) return;
    const po = customPo || getCurrentPoObject();
    if (po.items.length === 0) {
      setPoFeedback({ success: false, message: 'Please select at least one product before sharing.' });
      return;
    }
    const text = buildWhatsAppPurchaseOrderText(po, storeConfig);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSharePoEmail = (customPo?: PurchaseOrder) => {
    if (!storeConfig) return;
    const po = customPo || getCurrentPoObject();
    if (po.items.length === 0) {
      setPoFeedback({ success: false, message: 'Please select at least one product before sharing.' });
      return;
    }
    const text = buildWhatsAppPurchaseOrderText(po, storeConfig);
    const mailto = `mailto:?subject=${encodeURIComponent(`Purchase Order ${po.poNumber} - Food & Life Grocery`)}&body=${encodeURIComponent(text)}`;
    window.location.href = mailto;
  };

  const handleSavePurchaseOrder = async (receiveNow = false) => {
    if (!poSupplierName.trim()) {
      setPoFeedback({ success: false, message: 'Please enter a Supplier or Vendor name.' });
      return;
    }
    if (poSelectedItems.length === 0) {
      setPoFeedback({ success: false, message: 'Please select at least one product for this purchase order.' });
      return;
    }

    setPoSubmitting(true);
    setPoFeedback(null);

    try {
      const items = poSelectedItems.map((i) => ({
        productId: i.productId,
        nameEn: i.product.nameEn,
        nameSi: i.product.nameSi,
        unit: i.product.unit,
        currentStock: i.product.availableStock,
        reorderQuantity: i.reorderQuantity,
      }));

      const res = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          supplierName: poSupplierName,
          supplierContact: poSupplierContact,
          notes: poNotes,
          items,
          receiveStockNow: receiveNow,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save purchase order');
      }

      setPurchaseOrders([data.purchaseOrder, ...purchaseOrders]);
      setPoSelectedItems([]);
      setPoFeedback({
        success: true,
        message: receiveNow
          ? `Purchase Order ${data.purchaseOrder.poNumber} created and stock received immediately!`
          : `Purchase Order ${data.purchaseOrder.poNumber} successfully saved and issued!`,
      });
      loadAllAdminData();
      onProductsUpdated?.();
    } catch (err: any) {
      setPoFeedback({ success: false, message: err.message || 'Error creating purchase order' });
    } finally {
      setPoSubmitting(false);
    }
  };

  const handleMarkPoReceived = async (poId: string) => {
    try {
      const res = await fetch(`/api/admin/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: 'received' }),
      });
      if (res.ok) {
        loadAllAdminData();
        onProductsUpdated?.();
      }
    } catch (e) {
      console.error('Error marking PO as received:', e);
    }
  };

  // Live GPS Deliveries Loader
  const loadLiveDeliveries = async () => {
    if (!authToken) return;
    setIsLoadingLiveDeliveries(true);
    try {
      const res = await fetch('/api/admin/live-deliveries', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiveDeliveries(data.deliveries || []);
      }
    } catch (e) {
      console.warn('Error fetching live deliveries:', e);
    } finally {
      setIsLoadingLiveDeliveries(false);
    }
  };

  // Product Image Upload Handler (Option A)
  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
      setImageUploadError('Please select a valid image file (.jpg, .jpeg, .png, .webp).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setImageUploadError('Image size exceeds 20MB limit.');
      return;
    }

    setIsUploadingImage(true);
    setImageUploadError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/admin/upload-product-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            filename: file.name,
            productId: editingProduct?.id,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload product image');
        }

        setProductImageUrl(data.imageUrl);
      } catch (err: any) {
        setImageUploadError(err.message || 'Error uploading image');
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.onerror = () => {
      setImageUploadError('Error reading selected image file.');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  // PO Goods Receiving Handlers (Item-by-item Receiving)
  const handleOpenReceiveGoods = (po: PurchaseOrder) => {
    setReceivingPo(po);
    const initialInputs: Record<string, number> = {};
    po.items.forEach((item) => {
      const remaining = item.remainingQuantity !== undefined
        ? item.remainingQuantity
        : Math.max(0, item.reorderQuantity - (item.receivedQuantity || 0));
      initialInputs[item.productId] = remaining;
    });
    setReceivingInputs(initialInputs);
    setReceivingNotes('');
    setReceivingFeedback(null);
    setIsReceivingModalOpen(true);
  };

  const handleSubmitReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;

    setIsSubmittingReceiving(true);
    setReceivingFeedback(null);

    try {
      const itemsPayload = Object.entries(receivingInputs).map(([productId, qty]) => ({
        productId,
        receivedNow: Number(qty) || 0,
      }));

      const res = await fetch(`/api/admin/purchase-orders/${receivingPo.id}/receive-goods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: itemsPayload,
          notes: receivingNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to receive goods');
      }

      setReceivingFeedback({
        success: true,
        message: `Stock successfully received for PO ${receivingPo.poNumber}! Main Inventory Stock incremented atomically.`,
      });

      loadAllAdminData();
      onProductsUpdated?.();

      setTimeout(() => {
        setIsReceivingModalOpen(false);
        setReceivingPo(null);
      }, 1500);
    } catch (err: any) {
      setReceivingFeedback({
        success: false,
        message: err.message || 'Error processing goods receiving',
      });
    } finally {
      setIsSubmittingReceiving(false);
    }
  };

  // Database Cleanup (Fresh Start) Handler
  const handleSubmitCleanupDemoData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCleanup(true);
    setCleanupResult(null);

    try {
      const res = await fetch('/api/admin/database/cleanup-demo-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          adminPassword: cleanupPasswordInput,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cleanup failed. Please check the Admin password.');
      }

      setCleanupResult({
        success: true,
        message: data.message || 'Operational demo data cleared successfully! Central product catalogue preserved.',
        backupFile: data.backupFile,
      });

      loadAllAdminData();
      onProductsUpdated?.();
      setCleanupPasswordInput('');
    } catch (err: any) {
      setCleanupResult({
        success: false,
        message: err.message || 'Cleanup operation failed.',
      });
    } finally {
      setIsSubmittingCleanup(false);
    }
  };

  // Delivery Agent Management Handlers
  const handleSaveDeliveryAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAgentFeedback(null);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const agentName = (fd.get('name') as string || '').trim();
    const username = (fd.get('username') as string || '').trim().toLowerCase();
    const password = (fd.get('password') as string || '').trim();
    const mobilePhone = (fd.get('mobilePhone') as string || '').trim();
    const whatsappPhone = (fd.get('whatsappPhone') as string || '').trim();
    const vehicleType = (fd.get('vehicleType') as string || 'Three Wheeler').trim();
    const vehicleNumber = (fd.get('vehicleNumber') as string || '').trim();
    const defaultHireCharge = Number(fd.get('defaultHireCharge')) || 300;
    const address = (fd.get('address') as string || '').trim();
    const status = (fd.get('status') as string || 'Active');

    const agentData: any = {
      name: agentName,
      fullName: agentName,
      username: username || undefined,
      password: password || undefined,
      mobilePhone,
      whatsappPhone,
      whatsappNumber: whatsappPhone,
      vehicleType,
      vehicleNumber,
      vehicleRegistrationNumber: vehicleNumber,
      defaultHireCharge,
      address,
      status,
    };

    try {
      const url = editingAgent ? `/api/admin/delivery-agents/${editingAgent.id}` : '/api/admin/delivery-agents';
      const method = editingAgent ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(agentData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save delivery agent');

      setEditingAgent(null);
      setIsAddingAgent(false);
      setAgentFeedback({ success: true, message: `Delivery Agent ${data.agent.name} saved successfully!` });
      loadAllAdminData();
    } catch (err: any) {
      setAgentFeedback({ success: false, message: err.message || 'Error saving delivery agent' });
    }
  };

  const handleResetAgentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAgent) return;
    if (!resetPasswordInput || resetPasswordInput.length < 6) {
      setResetPasswordFeedback({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }
    setIsResettingPassword(true);
    setResetPasswordFeedback(null);
    try {
      const res = await fetch(`/api/admin/delivery-agents/${resetAgent.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ newPassword: resetPasswordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset driver password');
      setResetPasswordFeedback({
        success: true,
        message: `Password for driver ${resetAgent.name} successfully reset! All current active driver sessions revoked.`,
      });
      setResetPasswordInput('');
      loadAllAdminData();
      setTimeout(() => {
        setResetAgent(null);
        setResetPasswordFeedback(null);
      }, 2500);
    } catch (err: any) {
      setResetPasswordFeedback({ success: false, message: err.message || 'Error resetting password' });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleToggleAgentStatus = async (agentId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const res = await fetch(`/api/admin/delivery-agents/${agentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadAllAdminData();
      }
    } catch (e) {
      console.error('Error toggling agent status:', e);
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Are you sure you want to deactivate and remove agent "${agentName}"? Past orders and bills will retain their history.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/delivery-agents/${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setAgentFeedback({ success: true, message: `Agent ${agentName} removed successfully.` });
        loadAllAdminData();
      }
    } catch (e) {
      console.error('Error deleting agent:', e);
    }
  };

  const handleAssignAgentToOrder = async (orderId: string) => {
    if (!assignAgentId) {
      alert('Please select a delivery agent first.');
      return;
    }
    setAssigningAgent(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign-delivery-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          agentId: assignAgentId,
          hireCharge: assignHireCharge,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign agent');
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(data.order);
      }
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign delivery agent');
    } finally {
      setAssigningAgent(false);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, deliveryStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/delivery-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ deliveryStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
        loadAllAdminData();
      }
    } catch (err) {
      console.error('Error updating delivery status:', err);
    }
  };

  const handleToggleHirePayment = async (orderId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'paid_to_agent' ? 'unpaid' : 'paid_to_agent';
      const res = await fetch(`/api/admin/orders/${orderId}/agent-hire-payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ hireChargePaymentStatus: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
        loadAllAdminData();
      }
    } catch (err) {
      console.error('Error updating hire payment:', err);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOrder) return;
    if (paymentAmount <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }
    setPaymentSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${paymentOrder.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentMethod,
          notes: paymentNotes,
          receivedBy: paymentReceivedBy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      if (selectedOrder && selectedOrder.id === paymentOrder.id) {
        setSelectedOrder(data.order);
      }
      setIsPaymentModalOpen(false);
      setPaymentOrder(null);
      setPaymentAmount(0);
      setPaymentNotes('');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ recipientPhone: testPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult(
          data.result.status === 'sent'
            ? 'Success: Test template message sent through Meta WhatsApp Cloud API!'
            : `Simulation Record Created (${data.result.status}): ${data.result.errorMessage || 'No error'}`
        );
        loadAllAdminData();
      } else {
        setTestResult(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  };

  // Convert WhatsApp Intake Draft to live order
  const handleConvertIntakeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntakeError(null);
    setIntakeSuccess(null);

    if (intakeItems.length === 0) {
      setIntakeError('Please add at least one product to the order.');
      return;
    }

    if (!intakeConsent) {
      setIntakeError('Please confirm customer consent checkbox before creating order.');
      return;
    }

    setIntakeSubmitting(true);
    try {
      const res = await fetch('/api/admin/orders/draft-convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          customerName: intakeCustomerName,
          customerPhone: intakeCustomerPhone,
          deliveryArea: intakeDeliveryArea,
          deliveryAddress: intakeAddress,
          deliveryNotes: intakeRawMessage ? `WhatsApp Chat: "${intakeRawMessage}"` : undefined,
          deliveryType: 'delivery',
          paymentMethod: 'cash_on_delivery',
          items: intakeItems,
          customerConsentConfirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      setIntakeSuccess(`Order ${data.order.orderNumber} successfully created and tracking link dispatched!`);
      // Reset form
      setIntakeCustomerName('');
      setIntakeCustomerPhone('');
      setIntakeDeliveryArea('Katuloya');
      setIntakeAddress('Katuloya Area');
      setIntakeRawMessage('');
      setIntakeItems([]);
      setIntakeConsent(false);
      loadAllAdminData();
    } catch (err: any) {
      setIntakeError(err.message);
    } finally {
      setIntakeSubmitting(false);
    }
  };

  // Save product (Add or Edit) to central Firestore database
  const handleSaveProduct = async (productData: Partial<Product>) => {
    setIsSavingProduct(true);
    setProductFeedback(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(productData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product to central database');
      }

      setProductFeedback({
        success: true,
        message: `Product "${data.product.nameEn}" successfully updated in central database!`,
      });
      setEditingProduct(null);
      setIsAddingProduct(false);
      await loadAllAdminData();
      onProductsUpdated?.();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setProductFeedback({
        success: false,
        message: err.message || 'Error saving product to database',
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      orderFilter === 'all'
        ? true
        : orderFilter === 'pending'
        ? o.status === 'Order Received' || o.status === 'Order Confirmed'
        : orderFilter === 'preparing'
        ? o.status === 'Preparing Order' || o.status === 'Ready for Delivery'
        : orderFilter === 'dispatched'
        ? o.status === 'Out for Delivery'
        : orderFilter === 'delivered'
        ? o.status === 'Delivered'
        : o.status === 'Cancelled';

    const matchesSearch =
      !searchQuery.trim() ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-7xl h-[95vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Admin Navigation Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 border border-slate-700 overflow-hidden shrink-0 shadow-xs flex items-center justify-center">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-white">FOOD &amp; LIFE GROCERY</h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-md">
                  Admin System
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Katuloya, Thawalanthanne • WhatsApp: +94 71 259 5683 • Meta Cloud API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authToken && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Admin Portal"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* If not authenticated: Login View */}
        {!authToken ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-slate-100">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xl space-y-6">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-1 shadow-md mx-auto overflow-hidden">
                  <img
                    src="/logo.jpg"
                    alt="Food & Life Grocery"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Admin &amp; Staff Login
                  </h2>
                  <p className="text-xs text-emerald-800 font-bold mt-0.5">
                    අවසරලත් පරිපාලක පිවිසුම පමණි
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-semibold mt-2">
                    <Shield className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Authorized Food &amp; Life Staff Only</span>
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrator Username
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Username (e.g. Admin)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-sm shadow-md transition-all transform active:scale-98 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sign In as Administrator</span>
                </button>
              </form>

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Protected store system for <strong>FOOD &amp; LIFE GROCERY</strong> staff in Katuloya.
                  Unauthorized login attempts are logged and automatically locked after 5 failed attempts.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Admin Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            {/* Top Navigation Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-1 py-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'orders'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Orders &amp; Dispatch</span>
                  {orders.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                      {orders.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('live_tracking');
                    loadLiveDeliveries();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'live_tracking'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>Live GPS Tracking</span>
                  {orders.filter((o) => o.status === 'Out for Delivery').length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-extrabold text-[10px] animate-pulse">
                      {orders.filter((o) => o.status === 'Out for Delivery').length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('intake')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'intake'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <span>WhatsApp Order Intake</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'inventory'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Products &amp; Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('product_images')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'product_images'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-sky-500" />
                  <span>Product Images</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[10px]">
                    {products.filter((p) => p.imageUrl).length}/{products.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('purchase_orders')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'purchase_orders'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                  <span>Purchase Orders</span>
                  {purchaseOrders.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                      {purchaseOrders.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('delivery_agents')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'delivery_agents'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>Delivery Agents</span>
                  {deliveryAgents.filter((a) => !a.isDeleted).length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-700 font-extrabold text-[10px]">
                      {deliveryAgents.filter((a) => !a.isDeleted).length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'whatsapp'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp Cloud API Hub</span>
                  {waStatus && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        waStatus.isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'settings'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Store Settings &amp; Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reports_accounting')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'reports_accounting'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Management Reports &amp; Accounting</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    NEW
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('promotional_media')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'promotional_media'
                      ? 'bg-[#F36B16] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Film className="w-4 h-4 text-orange-400" />
                  <span>Promotional Media Management</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-[#F36B16] text-[10px] font-extrabold">
                    VIDEO &amp; ADS
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('customer_loyalty')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'customer_loyalty'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-400" />
                  <span>Customer Loyalty Management</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold">
                    STAR POINTS
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadAllAdminData}
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <a
                  href="/api/admin/export-csv"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CSV Export</span>
                </a>
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* ------------------------------------------------------------- */}
              {/* TAB 1: ORDERS & DISPATCH */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  {/* Daily Outstanding Payment & Credit Sales Dashboard Banner */}
                  {paymentSummary && (
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-3xl border border-slate-700 shadow-lg space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-emerald-400" />
                            <h2 className="font-black text-sm tracking-wide uppercase text-emerald-400">
                              Daily Outstanding Payment &amp; Credit Sales Dashboard
                            </h2>
                          </div>
                          <p className="text-xs text-slate-300">
                            Real-time tracking of cash, partial payments, credit balances, and collections across Katuloya
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await fetchCustomerAccounts();
                              setIsCustomerAccountsOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Customer Balances &amp; Statements</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch('/api/admin/delivery-accounting', {
                                headers: { Authorization: `Bearer ${authToken}` },
                              });
                              if (res.ok) {
                                setDeliveryAccounting(await res.json());
                                setIsDeliveryAccountingOpen(true);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Delivery Hire Accounting</span>
                          </button>
                        </div>
                      </div>

                      {/* Metric Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                          <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Today's Sales</span>
                          <div className="text-base sm:text-lg font-black text-white mt-0.5">
                            Rs. {(paymentSummary.todaySales ?? 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-emerald-500/20 backdrop-blur-xs p-3 rounded-2xl border border-emerald-500/30">
                          <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">Today's Payments</span>
                          <div className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">
                            Rs. {(paymentSummary.todayPayments ?? 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-amber-500/20 backdrop-blur-xs p-3 rounded-2xl border border-amber-500/30">
                          <span className="text-[10px] text-amber-300 font-bold block uppercase tracking-wider">Today's Outstanding</span>
                          <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                            Rs. {(paymentSummary.todayOutstanding ?? 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-rose-500/20 backdrop-blur-xs p-3 rounded-2xl border border-rose-500/30">
                          <span className="text-[10px] text-rose-300 font-bold block uppercase tracking-wider">Total Outstanding</span>
                          <div className="text-base sm:text-lg font-black text-rose-300 mt-0.5">
                            Rs. {(paymentSummary.totalOutstanding ?? 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Order Status</span>
                          <div className="text-xs font-bold text-slate-200 mt-1 space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-rose-300 font-semibold">Unpaid:</span>
                              <span className="font-black">{paymentSummary.unpaidCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-300 font-semibold">Partial:</span>
                              <span className="font-black">{paymentSummary.partiallyPaidCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPI Stats Bar */}
                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-slate-500 font-semibold">Total Revenue</div>
                        <div className="text-lg font-black text-slate-950 mt-1">
                          LKR {stats.totalRevenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-slate-500 font-semibold">Total Orders</div>
                        <div className="text-lg font-black text-slate-950 mt-1">
                          {stats.totalOrders}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-amber-600 font-semibold">New / Pending</div>
                        <div className="text-lg font-black text-amber-600 mt-1">
                          {stats.pendingOrders}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-blue-600 font-semibold">Preparing</div>
                        <div className="text-lg font-black text-blue-600 mt-1">
                          {stats.preparingOrders}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-purple-600 font-semibold">Out for Delivery</div>
                        <div className="text-lg font-black text-purple-600 mt-1">
                          {stats.outForDelivery}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <div className="text-xs text-emerald-600 font-semibold">Delivered</div>
                        <div className="text-lg font-black text-emerald-600 mt-1">
                          {stats.deliveredOrders}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    {/* Status filter chips */}
                    <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'pending', label: 'New / Received' },
                        { key: 'preparing', label: 'Preparing' },
                        { key: 'dispatched', label: 'Out for Delivery' },
                        { key: 'delivered', label: 'Delivered' },
                        { key: 'cancelled', label: 'Cancelled' },
                      ].map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setOrderFilter(chip.key)}
                          className={`px-3 py-1.5 rounded-lg transition-colors ${
                            orderFilter === chip.key
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Search query */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search order #, customer or phone..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    {filteredOrders.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs">
                        No orders matching the current criteria.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-4">Order Ref</th>
                              <th className="py-3 px-4">Customer &amp; Phone</th>
                              <th className="py-3 px-4">Delivery &amp; Area</th>
                              <th className="py-3 px-4">Payment &amp; Balance</th>
                              <th className="py-3 px-4">Delivery Agent</th>
                              <th className="py-3 px-4">Order Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map((ord, idx) => {
                              const amountPaid = ord.amountPaid || 0;
                              const outstanding =
                                ord.outstandingBalance !== undefined
                                  ? ord.outstandingBalance
                                  : Math.max(0, ord.total - amountPaid);
                              const payStatus =
                                ord.paymentStatus || (outstanding === 0 ? 'PAID' : amountPaid > 0 ? 'PARTIALLY PAID' : 'UNPAID');

                              return (
                                <tr
                                  key={ord.id ? `${ord.id}-${idx}` : (ord.orderNumber ? `${ord.orderNumber}-${idx}` : `ord-${idx}`)}
                                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                  onClick={() => setSelectedOrder(ord)}
                                >
                                  <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                                    {ord.orderNumber}
                                    {ord.source === 'whatsapp_intake' && (
                                      <span className="block text-[9px] text-emerald-600 font-sans font-bold">
                                        via WhatsApp
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="font-bold text-slate-900">{ord.customerName}</div>
                                    <div className="text-slate-500 font-mono text-[11px]">
                                      {formatPhoneForDisplay(ord.customerPhone)}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 max-w-xs text-slate-600">
                                    {ord.deliveryType === 'pickup' ? (
                                      <>
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 mb-1">
                                          🏪 Store Pickup (Katuloya)
                                        </span>
                                        <div className="truncate font-semibold text-slate-700">Collect at Counter • Rs. 0 Fee</div>
                                      </>
                                    ) : (
                                      <>
                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 mb-1">
                                          📍 {ord.deliveryArea || 'Katuloya'}
                                        </span>
                                        <div className="truncate">{ord.deliveryAddress}</div>
                                        {ord.deliveryLandmark && (
                                          <span className="block text-[10px] text-slate-400 truncate">
                                            Near: {ord.deliveryLandmark}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                          payStatus === 'PAID'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : payStatus === 'PARTIALLY PAID'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {payStatus}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-900">
                                      Total: Rs. {(ord.total ?? 0).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      Paid: <span className="font-semibold text-emerald-700">Rs. {(amountPaid ?? 0).toLocaleString()}</span> • Bal: <span className="font-black text-rose-600">Rs. {(outstanding ?? 0).toLocaleString()}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {ord.deliveryType === 'pickup' ? (
                                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                                        <ShoppingBag className="w-3 h-3 text-amber-700" />
                                        <span>Store Pickup (No Driver)</span>
                                      </span>
                                    ) : ord.deliveryAgent ? (
                                      <div className="text-xs">
                                        <div className="font-bold text-slate-900 flex items-center gap-1">
                                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                                          <span>{ord.deliveryAgent.name}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          {ord.deliveryAgent.vehicleNumber} • Hire: Rs. {ord.deliveryHireCharge || 0}
                                        </div>
                                        <span
                                          className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                            ord.deliveryAgent.hireChargePaymentStatus === 'paid_to_agent'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          {ord.deliveryAgent.hireChargePaymentStatus === 'paid_to_agent' ? 'Hire Paid' : 'Hire Unpaid'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        ord.status === 'Delivered'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : ord.status === 'Cancelled'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-900'
                                      }`}
                                    >
                                      {ord.status}
                                    </span>
                                  </td>
                                  <td
                                    className="py-3 px-4 text-right space-x-1.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {outstanding > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPaymentOrder(ord);
                                          setPaymentAmount(outstanding);
                                          setIsPaymentModalOpen(true);
                                        }}
                                        title="Record Payment Installment"
                                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[11px] shadow-2xs transition-all"
                                      >
                                        + Pay
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setSelectedOrder(ord)}
                                      title="Open Order Dispatch & Delivery Assignment Drawer"
                                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] transition-all"
                                    >
                                      Manage
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOrderForBill(ord);
                                        setIsBillModalOpen(true);
                                      }}
                                      title="View / Download Official PDF Bill"
                                      className="px-2 py-1 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg inline-flex items-center gap-1 font-bold text-[11px] transition-colors shadow-2xs"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>Bill</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onOpenOrderTracking(ord.trackingToken)}
                                      title="View public tracking page"
                                      className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB: LIVE GPS DELIVERIES & FLEET TRACKING */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'live_tracking' && (
                <div className="space-y-6">
                  {/* Top Header Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-xs">
                        <Navigation className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-slate-900">
                            Live GPS Deliveries &amp; Fleet Operations
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                            Live GPS Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Real-time delivery vehicle locations, dispatch statuses, and driver connectivity across Katuloya
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadLiveDeliveries}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLiveDeliveries ? 'animate-spin text-emerald-600' : ''}`} />
                        <span>Refresh GPS</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        En Route Deliveries
                      </span>
                      <span className="text-2xl font-black text-emerald-800">
                        {orders.filter((o) => o.status === 'Out for Delivery').length}
                      </span>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Assigned Dispatches
                      </span>
                      <span className="text-2xl font-black text-blue-700">
                        {orders.filter((o) => o.assignedDeliveryAgent && o.status !== 'Delivered' && o.status !== 'Cancelled').length}
                      </span>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Drivers Online
                      </span>
                      <span className="text-2xl font-black text-slate-900">
                        {deliveryAgents.filter((a) => a.isOnline && !a.isDeleted).length}
                      </span>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Total Fleet Agents
                      </span>
                      <span className="text-2xl font-black text-slate-600">
                        {deliveryAgents.filter((a) => !a.isDeleted).length}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Live Map Section */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          Live Katuloya Fleet GPS Map
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {selectedLiveOrder
                            ? `Tracking Order #${selectedLiveOrder.orderNumber} en route to ${selectedLiveOrder.deliveryArea || 'Katuloya'}`
                            : 'Showing central dispatch store and active delivery routes'}
                        </p>
                      </div>
                      {selectedLiveOrder && (
                        <button
                          type="button"
                          onClick={() => setSelectedLiveOrder(null)}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    <LiveDeliveryMap
                      agentLocation={selectedLiveOrder?.liveLocation}
                      customerArea={selectedLiveOrder?.deliveryArea}
                      customerAddress={selectedLiveOrder?.deliveryAddress}
                      agentName={selectedLiveOrder?.assignedDeliveryAgent?.agentName || selectedLiveOrder?.deliveryAgent?.agentName}
                      agentPhone={selectedLiveOrder?.assignedDeliveryAgent?.mobilePhone}
                      vehicleNumber={selectedLiveOrder?.assignedDeliveryAgent?.vehicleRegistrationNumber}
                      status={selectedLiveOrder?.status || 'Active Dispatch'}
                      isLiveActive={true}
                      orderNumber={selectedLiveOrder?.orderNumber}
                      heightClass="h-80 sm:h-96"
                    />
                  </div>

                  {/* Active Orders with Live GPS or Delivery Agents */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          Active Orders Under Delivery ({orders.filter((o) => o.assignedDeliveryAgent && o.status !== 'Delivered' && o.status !== 'Cancelled').length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Select an order to focus GPS tracking on the map above or change delivery status.
                        </p>
                      </div>
                    </div>

                    {orders.filter((o) => o.assignedDeliveryAgent && o.status !== 'Delivered' && o.status !== 'Cancelled').length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No orders currently assigned or out for delivery. Assign an agent from the Orders tab to begin tracking.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                              <th className="py-2.5 px-3">Order #</th>
                              <th className="py-2.5 px-3">Customer &amp; Area</th>
                              <th className="py-2.5 px-3">Assigned Driver</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Live GPS</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {orders
                              .filter((o) => o.assignedDeliveryAgent && o.status !== 'Delivered' && o.status !== 'Cancelled')
                              .map((ord, idx) => {
                                const isSelected = selectedLiveOrder?.id === ord.id;
                                return (
                                  <tr
                                    key={ord.id ? `${ord.id}-${idx}` : (ord.orderNumber ? `${ord.orderNumber}-${idx}` : `live-${idx}`)}
                                    className={`transition-colors ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50/70'}`}
                                  >
                                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                      {ord.orderNumber}
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-bold text-slate-800">{ord.customerName}</div>
                                      <div className="text-[11px] text-slate-500">
                                        📍 {ord.deliveryArea || 'Katuloya'}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-bold text-slate-800">
                                        {ord.assignedDeliveryAgent?.agentName}
                                      </div>
                                      <div className="text-[11px] text-slate-500 font-mono">
                                        {ord.assignedDeliveryAgent?.vehicleRegistrationNumber}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                          ord.status === 'Out for Delivery'
                                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {ord.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                                      {ord.liveLocation ? (
                                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                          {ord.liveLocation.latitude.toFixed(4)}, {ord.liveLocation.longitude.toFixed(4)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">Katuloya Hub</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedLiveOrder(ord)}
                                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                      >
                                        Track on Map
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onOpenOrderTracking(ord.trackingToken)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                                      >
                                        Customer View
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 2: WHATSAPP ORDER INTAKE ASSISTANT */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'intake' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900">
                          WhatsApp Order Intake Workflow
                        </h2>
                        <p className="text-xs text-slate-500">
                          Convert raw WhatsApp customer chats into verified grocery orders with automatic tracking links
                        </p>
                      </div>
                    </div>

                    {intakeSuccess && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold">
                        {intakeSuccess}
                      </div>
                    )}
                    {intakeError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-bold">
                        {intakeError}
                      </div>
                    )}

                    <form onSubmit={handleConvertIntakeOrder} className="space-y-4">
                      {/* Paste Customer Raw Message */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          1. Raw WhatsApp Message (Paste from WhatsApp)
                        </label>
                        <textarea
                          rows={3}
                          value={intakeRawMessage}
                          onChange={(e) => setIntakeRawMessage(e.target.value)}
                          placeholder="e.g. Kasun from Katuloya: I need 5kg Keeri Samba, 1kg Dhal, and 10 Eggs to Katuloya Bridge."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden"
                        />
                      </div>

                      {/* Customer Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Customer Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={intakeCustomerName}
                            onChange={(e) => setIntakeCustomerName(e.target.value)}
                            placeholder="Kasun Bandara"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Customer Phone (+94 / 07X) *
                          </label>
                          <input
                            type="tel"
                            required
                            value={intakeCustomerPhone}
                            onChange={(e) => setIntakeCustomerPhone(e.target.value)}
                            placeholder="077 123 4567"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Delivery Area *
                          </label>
                          <select
                            value={intakeDeliveryArea}
                            onChange={(e) => setIntakeDeliveryArea(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                          >
                            <option value="Katuloya">Katuloya (කැටුලෝය)</option>
                            <option value="Thawalanthanne">Thawalanthanne (තවලන්තැන්න)</option>
                            <option value="Babaralla">Babaralla (බඹරැල්ල)</option>
                            <option value="Goomaraya">Goomaraya (ගෝමරය)</option>
                            <option value="Thunisgala">Thunisgala (තුන්හිස්ගල)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Delivery Address *
                          </label>
                          <input
                            type="text"
                            required
                            value={intakeAddress}
                            onChange={(e) => setIntakeAddress(e.target.value)}
                            placeholder="e.g. Katuloya Bridge / Temple Rd"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      {/* Select Products */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          2. Add Items to Order from Live Inventory
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {products.map((p) => {
                            const isAdded = intakeItems.some((i) => i.productId === p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  if (isAdded) {
                                    setIntakeItems((prev) =>
                                      prev.filter((i) => i.productId !== p.id)
                                    );
                                  } else {
                                    setIntakeItems((prev) => [
                                      ...prev,
                                      { productId: p.id, quantity: 1 },
                                    ]);
                                  }
                                }}
                                className={`p-2 rounded-lg text-left text-xs border transition-colors ${
                                  isAdded
                                    ? 'bg-emerald-700 text-white border-emerald-700'
                                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="font-bold truncate">{p.nameEn}</div>
                                <div className="text-[10px] opacity-80">
                                  LKR {p.sellingPrice} &bull; Stock: {p.availableStock}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Configured Item Quantities */}
                      {intakeItems.length > 0 && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="text-xs font-bold text-slate-700">Selected Items:</div>
                          <div className="space-y-1.5">
                            {intakeItems.map((item) => {
                              const p = products.find((x) => x.id === item.productId);
                              if (!p) return null;
                              return (
                                <div
                                  key={item.productId}
                                  className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                                >
                                  <span className="font-bold">{p.nameEn}</span>
                                  <div className="flex items-center gap-2">
                                    <span>Quantity:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={p.availableStock}
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const q = Math.max(1, parseInt(e.target.value) || 1);
                                        setIntakeItems((prev) =>
                                          prev.map((i) =>
                                            i.productId === item.productId
                                              ? { ...i, quantity: q }
                                              : i
                                          )
                                        );
                                      }}
                                      className="w-16 px-2 py-1 border rounded text-center font-bold"
                                    />
                                    <span>{p.unit}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Consent & Conversion Gate */}
                      <label className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={intakeConsent}
                          onChange={(e) => setIntakeConsent(e.target.checked)}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>
                          <strong>Verification &amp; Consent Requirement:</strong> I confirm that product identities, quantities, prices, and delivery address have been agreed with the customer on WhatsApp.
                        </span>
                      </label>

                      <button
                        type="submit"
                        disabled={intakeSubmitting || !intakeConsent || intakeItems.length === 0}
                        className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
                      >
                        {intakeSubmitting
                          ? 'Creating & Sending WhatsApp Confirmation...'
                          : 'Create Confirmed Order & Send Tracking Link to Customer'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 3: PRODUCTS & INVENTORY */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-black text-slate-900">Inventory Catalog</h2>
                      <p className="text-xs text-slate-500">
                        Manage grocery prices, stock, discounts and Sinhala/English titles (Synced to central Firestore)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingProduct(true);
                        setEditingProduct(null);
                        setProductIsActive(true);
                        setProductFeedback(null);
                      }}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Product</span>
                    </button>
                  </div>

                  {productFeedback && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                        productFeedback.success
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      {productFeedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{productFeedback.message}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-16/9 bg-slate-100 rounded-xl overflow-hidden mb-3">
                            <img
                              src={p.imageUrl}
                              alt={p.nameEn}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>{p.category}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {p.isActive ? 'Active (Shop Visible)' : 'Hidden (Inactive)'}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm">{p.nameEn}</h4>
                          <p className="text-xs text-slate-500">{p.nameSi}</p>

                          <div className="mt-3 flex items-baseline justify-between text-xs">
                            <div>
                              <span className="text-base font-black text-slate-950">
                                LKR {p.sellingPrice}
                              </span>
                              <span className="text-slate-400 text-[11px] ml-1">/ {p.unit}</span>
                            </div>
                            <span
                              className={`font-bold ${
                                p.availableStock <= 5 ? 'text-amber-600' : 'text-emerald-700'
                              }`}
                            >
                              Stock: {p.availableStock}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setIsAddingProduct(false);
                            setProductIsActive(p.isActive !== undefined ? p.isActive : true);
                            setProductFeedback(null);
                          }}
                          className="mt-3 w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Edit Price &amp; Stock
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB: PRODUCT IMAGES (UNIVERSAL CLOUD IMAGE MANAGEMENT) */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'product_images' && (
                <AdminProductImageManager
                  products={products}
                  authToken={authToken}
                  onProductsUpdated={(updated) => {
                    setProducts(updated);
                    if (onProductsUpdated) onProductsUpdated();
                  }}
                />
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 4: WHATSAPP CLOUD API HUB */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'whatsapp' && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  {/* Status Banner */}
                  <div
                    className={`p-6 rounded-3xl border shadow-sm ${
                      waStatus?.isConfigured
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white ${
                            waStatus?.isConfigured ? 'bg-emerald-600' : 'bg-amber-600'
                          }`}
                        >
                          <Send className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-slate-900">
                              Meta WhatsApp Business Cloud API
                            </h2>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                waStatus?.isConfigured
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-amber-200 text-amber-900'
                              }`}
                            >
                              {waStatus?.isConfigured
                                ? 'CONFIGURED (Live Cloud API)'
                                : 'NOT CONFIGURED (Simulation Mode)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Official Meta Graph API version: <strong>{waStatus?.apiVersion}</strong> &bull; Total Notifications Sent: <strong>{waStatus?.totalSent}</strong> &bull; Failed: <strong>{waStatus?.totalFailed}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs space-y-1 text-slate-600 font-mono">
                        <div>
                          Webhook Callback:{' '}
                          <code className="text-emerald-800 bg-white/70 px-1 py-0.5 rounded">
                            {waStatus?.webhookCallbackUrl}
                          </code>
                        </div>
                        <div>
                          Verify Token:{' '}
                          <code className="text-emerald-800 bg-white/70 px-1 py-0.5 rounded">
                            food_and_life_verify_token_2026
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Notification Sender */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span>Test WhatsApp Notification Dispatch</span>
                    </h3>

                    <form onSubmit={handleSendTestMessage} className="flex gap-2">
                      <input
                        type="tel"
                        required
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="Recipient Phone (e.g. 077 123 4567)"
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                      />
                      <button
                        type="submit"
                        disabled={testSending || !testPhone}
                        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        {testSending ? 'Sending...' : 'Send Test Notification'}
                      </button>
                    </form>

                    {testResult && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
                        {testResult}
                      </div>
                    )}
                  </div>

                  {/* Message Delivery Logs */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Delivery Activity Logs ({waLogs.length})
                      </h3>
                      <button
                        type="button"
                        onClick={loadAllAdminData}
                        className="text-xs text-emerald-700 font-bold hover:underline"
                      >
                        Refresh Logs
                      </button>
                    </div>

                    {waLogs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No messages logged yet. Place an order or send a test notification.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                              <th className="py-2.5 px-4">Time</th>
                              <th className="py-2.5 px-4">Recipient</th>
                              <th className="py-2.5 px-4">Template</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4">Meta Msg ID / Info</th>
                              <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {waLogs.slice(0, 15).map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50">
                                <td className="py-2 px-4 text-slate-400 text-[11px]">
                                  {new Date(log.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="py-2 px-4 font-mono font-bold">
                                  {formatPhoneForDisplay(log.recipientPhone)}
                                </td>
                                <td className="py-2 px-4 font-mono text-slate-600">
                                  {log.templateName}
                                </td>
                                <td className="py-2 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      log.status === 'sent' || log.status === 'delivered' || log.status === 'read'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : log.status === 'not_configured'
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                </td>
                                <td className="py-2 px-4 max-w-xs truncate text-[11px] text-slate-500 font-mono">
                                  {log.metaMessageId || log.errorMessage || 'Logged'}
                                </td>
                                <td className="py-2 px-4 text-right">
                                  {(log.status === 'failed' || log.status === 'not_configured') && (
                                    <button
                                      type="button"
                                      onClick={() => handleRetryNotification(log.id)}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold"
                                    >
                                      Safe Retry
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Meta Approved Templates Reference */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Meta Approved Template Specifications (English &amp; Sinhala)
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      To send business-initiated notifications outside the 24-hour customer window on Meta WhatsApp Business Platform, register these templates under Meta Developer Portal &gt; WhatsApp &gt; Message Templates:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="font-bold text-emerald-800 mb-2">
                          1. English: foodlife_order_confirmation
                        </div>
                        <pre className="text-[11px] whitespace-pre-wrap text-slate-700">
{`Hello {{1}}, thank you for shopping with FOOD & LIFE GROCERY!

Order No: {{2}}
Order Total: LKR {{3}}
Current Status: {{4}}

Track your order:
{{5}}

Thank you for choosing Food & Life Grocery.`}
                        </pre>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="font-bold text-emerald-800 mb-2">
                          2. Sinhala: foodlife_order_confirmation_si
                        </div>
                        <pre className="text-[11px] whitespace-pre-wrap text-slate-700">
{`ආයුබෝවන් {{1}}, FOOD & LIFE GROCERY සමඟ ගනුදෙනු කිරීම ගැන ස්තූතියි!

ඇණවුම් අංකය: {{2}}
මුළු මුදල: LKR {{3}}
වත්මන් තත්ත්වය: {{4}}

ඔබේ ඇණවුම නිරීක්ෂණය කරන්න:
{{5}}

ස්තූතියි! FOOD & LIFE GROCERY - කැටුලෝය, තවලන්තැන්න.`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB: PURCHASE ORDERS (PO GENERATION, STOCK & VENDORS) */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'purchase_orders' && (
                <div className="space-y-6">
                  {/* Top Bar: View Mode Switch & Summary */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-900">
                            Purchase Orders &amp; Vendor Management
                          </h2>
                          <p className="text-xs text-slate-500">
                            භාණ්ඩ ඇණවුම් කිරීම සහ තොග නැවත පිරවීම (Restocking &amp; A4 PDF Generation)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setPoViewMode('builder')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            poViewMode === 'builder'
                              ? 'bg-white text-emerald-800 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Purchase Order</span>
                          {poSelectedItems.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                              {poSelectedItems.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPoViewMode('history')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            poViewMode === 'history'
                              ? 'bg-white text-emerald-800 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>PO History &amp; Stock Audit</span>
                          {purchaseOrders.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {purchaseOrders.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {poFeedback && (
                    <div
                      className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs ${
                        poFeedback.success
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {poFeedback.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{poFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPoFeedback(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {poViewMode === 'builder' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left: Product Selection Catalog (7 Cols) */}
                      <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">
                              Select Products for Procurement (Quantity-Only)
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Official Supplier PO: Enter required replenishment quantities only (costs/prices omitted).
                            </p>
                          </div>

                          {/* Quick Filter & Auto-fill */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleAddAllSuggestedPoItems}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs flex items-center gap-1"
                              title="Automatically add all products with suggested reorders based on target stock and pending orders"
                            >
                              <span>⚡ Auto-fill Suggested ({reorderSuggestions.filter((s) => s.suggestedReorderQuantity > 0).length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPoStockFilter('all')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                poStockFilter === 'all'
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              All ({products.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPoStockFilter('low')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                poStockFilter === 'low'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              Low (≤5)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPoStockFilter('out')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                poStockFilter === 'out'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              Out of Stock
                            </button>
                          </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={poSearch}
                            onChange={(e) => setPoSearch(e.target.value)}
                            placeholder="Search products by English or Sinhala name, category..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                          />
                        </div>

                        {/* Product Cards List */}
                        <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1">
                          {products
                            .filter((prod) => {
                              const matchesSearch =
                                !poSearch.trim() ||
                                prod.nameEn.toLowerCase().includes(poSearch.toLowerCase()) ||
                                prod.nameSi?.toLowerCase().includes(poSearch.toLowerCase()) ||
                                prod.category.toLowerCase().includes(poSearch.toLowerCase());
                              const matchesFilter =
                                poStockFilter === 'all'
                                  ? true
                                  : poStockFilter === 'low'
                                  ? prod.availableStock <= 5
                                  : prod.availableStock === 0;
                              return matchesSearch && matchesFilter;
                            })
                            .map((prod) => {
                              const isSelected = poSelectedItems.some((i) => i.productId === prod.id);
                              const isLow = prod.availableStock <= 5 && prod.availableStock > 0;
                              const isOut = prod.availableStock === 0;
                              const reorderInfo = reorderSuggestions.find((s) => s.productId === prod.id);
                              const suggestedQty =
                                reorderInfo?.suggestedReorderQuantity !== undefined
                                  ? reorderInfo.suggestedReorderQuantity
                                  : Math.max(0, (prod.targetStockLevel || 100) - prod.availableStock);

                              return (
                                <div
                                  key={prod.id}
                                  onClick={() => handleTogglePoProduct(prod)}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isSelected
                                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400 shadow-xs'
                                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                      <img
                                        src={prod.imageUrl}
                                        alt={prod.nameEn}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-2">
                                        <span>{prod.nameEn}</span>
                                        {prod.nameSi && (
                                          <span className="text-slate-400 font-normal text-[11px] truncate">
                                            ({prod.nameSi})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                          {prod.category}
                                        </span>
                                        <span>• {prod.unit}</span>
                                        <span className="text-slate-400">Target: {prod.targetStockLevel || 100}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {/* Stock Badge & Suggested Reorder */}
                                    <div className="text-right">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                                          isOut
                                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                            : isLow
                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        }`}
                                      >
                                        {isOut ? 'Out of Stock (0)' : `Stock: ${prod.availableStock}`}
                                      </span>
                                      <div className={`text-[10px] mt-0.5 font-bold ${suggestedQty > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                                        Suggested Reorder: {suggestedQty} {prod.unit}
                                      </div>
                                    </div>

                                    {/* Select Checkbox / Button */}
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                        isSelected
                                          ? 'bg-emerald-700 text-white'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                      }`}
                                    >
                                      {isSelected ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <Plus className="w-4 h-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Right: Purchase Order Builder & Review (5 Cols) */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                              <h3 className="font-black text-slate-900 text-sm">
                                Purchase Order Details (Quantity Only)
                              </h3>
                              <p className="text-[11px] text-slate-500">
                                PO #{`PO-${new Date().getFullYear()}-${String((purchaseOrders.length || 0) + 101).padStart(4, '0')}`} • Prices Excluded
                              </p>
                            </div>
                            {poSelectedItems.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setPoSelectedItems([])}
                                className="text-[11px] text-rose-600 hover:underline font-semibold"
                              >
                                Clear All
                              </button>
                            )}
                          </div>

                          {/* Vendor & Supplier Fields */}
                          <div className="space-y-3 text-xs">
                            <div>
                              <label className="block font-bold text-slate-700 mb-1">
                                Supplier / Vendor Name *
                              </label>
                              <input
                                type="text"
                                value={poSupplierName}
                                onChange={(e) => setPoSupplierName(e.target.value)}
                                placeholder="e.g. Katuloya Wholesale Distributors"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                  Supplier Phone / Contact
                                </label>
                                <input
                                  type="text"
                                  value={poSupplierContact}
                                  onChange={(e) => setPoSupplierContact(e.target.value)}
                                  placeholder="+94 81 247 6200"
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                  Order Date
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  value={new Date().toISOString().slice(0, 10)}
                                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-700 mb-1">
                                Delivery Notes &amp; Destination
                              </label>
                              <input
                                type="text"
                                value={poNotes}
                                onChange={(e) => setPoNotes(e.target.value)}
                                placeholder="Special instructions for supplier..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Selected Products Line Items (Quantity Only - No Prices) */}
                          <div className="pt-2">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                              <span>Selected Products ({poSelectedItems.length})</span>
                              <span>Required Order Quantity</span>
                            </div>

                            {poSelectedItems.length === 0 ? (
                              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                                <Package className="w-6 h-6 text-slate-300 mx-auto" />
                                <div className="text-xs font-bold text-slate-600">
                                  No Products Selected Yet
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Click any product on the left catalog or use Auto-fill to add replenishment quantities.
                                </p>
                              </div>
                            ) : (
                              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                                {poSelectedItems.map((item) => (
                                  <div
                                    key={item.productId}
                                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 truncate">
                                        {item.product.nameEn}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        Unit: <span className="font-semibold text-slate-700">{item.product.unit}</span> • Current Stock: {item.product.availableStock}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-200 rounded-lg shadow-2xs">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdatePoQty(item.productId, item.reorderQuantity - 1)}
                                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min={1}
                                          value={item.reorderQuantity}
                                          onChange={(e) =>
                                            handleUpdatePoQty(item.productId, Number(e.target.value))
                                          }
                                          className="w-14 px-1 py-0.5 text-center font-black text-slate-900 text-xs border-none outline-hidden"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdatePoQty(item.productId, item.reorderQuantity + 1)}
                                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                                        >
                                          +
                                        </button>
                                        <span className="text-[10px] font-semibold text-slate-500 pl-1">{item.product.unit}</span>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemovePoItem(item.productId)}
                                        className="text-slate-400 hover:text-rose-600 p-1"
                                        title="Remove product"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Total Units Ordered Display (No Currency / No Prices) */}
                          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-tight block">
                                Total Procurement Units
                              </span>
                              <span className="text-[10px] text-emerald-600">
                                {poSelectedItems.length} distinct products in order
                              </span>
                            </div>
                            <div className="text-xl font-black text-emerald-950">
                              {poTotalUnits} <span className="text-xs font-bold text-emerald-700">Units</span>
                            </div>
                          </div>

                          {/* People's Bank Official Information Box */}
                          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/90 text-xs text-amber-950 space-y-1">
                            <div className="font-bold text-[11px] flex items-center gap-1.5 text-amber-900">
                              <Building2 className="w-3.5 h-3.5 text-amber-700" />
                              Official People's Bank Supplier Payment Details
                            </div>
                            <p className="text-[11px] leading-relaxed text-amber-900">
                              <strong>Bank:</strong> People's Bank &bull; <strong>Branch:</strong> Panwila
                              <br />
                              <strong>Account Name:</strong> RG Nimal Rajapaksha &bull; <strong>A/C:</strong> 211200380039804
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleDownloadPoPdf()}
                              disabled={poSelectedItems.length === 0}
                              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download Official A4 PDF (with Logo &amp; Bank Details)</span>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleSharePoWhatsApp()}
                                disabled={poSelectedItems.length === 0}
                                className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Share WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSharePoEmail()}
                                disabled={poSelectedItems.length === 0}
                                className="py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Share via Email</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleSavePurchaseOrder(false)}
                                disabled={poSubmitting || poSelectedItems.length === 0}
                                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                              >
                                <span>Save &amp; Issue PO</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSavePurchaseOrder(true)}
                                disabled={poSubmitting || poSelectedItems.length === 0}
                                className="py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Receive Stock Now</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Purchase Orders History & Stock Movement Audit View */
                    <div className="space-y-6">
                      {/* PO Records */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-black text-slate-900 text-sm">
                              Issued Purchase Orders History
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Track previous purchase orders, reprint PDFs, and verify inventory restocking.
                            </p>
                          </div>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                            Total Orders: {purchaseOrders.length}
                          </span>
                        </div>

                        {purchaseOrders.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300" />
                            <div className="font-bold text-slate-600">No Purchase Orders Created Yet</div>
                            <p>Generate your first purchase order using the builder above.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                                  <th className="py-2.5 px-3">PO Number</th>
                                  <th className="py-2.5 px-3">Date</th>
                                  <th className="py-2.5 px-3">Supplier</th>
                                  <th className="py-2.5 px-3">Items</th>
                                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                                  <th className="py-2.5 px-3">Status</th>
                                  <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {purchaseOrders.map((po) => (
                                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3 px-3 font-bold text-slate-900">
                                      {po.poNumber}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600">{po.date}</td>
                                    <td className="py-3 px-3 font-medium text-slate-800">
                                      {po.supplierName}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600">
                                      {po.items.length} items
                                    </td>
                                    <td className="py-3 px-3 text-right font-black text-slate-900">
                                      {(po.grandTotal && po.grandTotal > 0) ? `LKR ${po.grandTotal.toLocaleString()}` : `${po.items.reduce((s, i) => s + (i.reorderQuantity || 0), 0)} units`}
                                    </td>
                                    <td className="py-3 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          po.status === 'Fully Received' || po.status === 'received'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            : po.status === 'Partially Received'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                                        }`}
                                      >
                                        {po.status === 'Fully Received' || po.status === 'received'
                                          ? 'Fully Received'
                                          : po.status === 'Partially Received'
                                          ? 'Partially Received'
                                          : 'Pending'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-right space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadPoPdf(po)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors"
                                      >
                                        PDF
                                      </button>
                                      {po.status !== 'Fully Received' && po.status !== 'received' ? (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenReceiveGoods(po)}
                                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <span>📦 Receive Goods</span>
                                        </button>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded border border-emerald-200">
                                          ✓ Restocked
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Stock Movement Audit Log */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-black text-slate-900 text-sm">
                              Stock Movement Audit History
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Real-time log of deductions on checkout, restorations on cancellation, and restocking.
                            </p>
                          </div>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                            Movements Logged: {stockMovements.length}
                          </span>
                        </div>

                        {stockMovements.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No stock movements recorded yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-[300px]">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                                  <th className="py-2 px-3">Date / Time</th>
                                  <th className="py-2 px-3">Product</th>
                                  <th className="py-2 px-3">Change</th>
                                  <th className="py-2 px-3">Stock Before &rarr; After</th>
                                  <th className="py-2 px-3">Reason</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {stockMovements.slice(0, 30).map((sm) => (
                                  <tr key={sm.id} className="hover:bg-slate-50/60">
                                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                                      {new Date(sm.date).toLocaleString()}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-800">
                                      {sm.productNameEn}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span
                                        className={`font-black ${
                                          sm.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                      >
                                        {sm.quantity > 0 ? `+${sm.quantity}` : sm.quantity}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 font-medium">
                                      {sm.previousStock} &rarr; {sm.newStock}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                          sm.reason === 'order_cancelled'
                                            ? 'bg-blue-100 text-blue-800'
                                            : sm.reason === 'purchase_order_received'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {sm.reason.replace(/_/g, ' ')}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 5: STORE SETTINGS & REPORTS */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'settings' && storeConfig && (
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Store &amp; Delivery Configuration
                    </h2>
                    <p className="text-xs text-slate-500">
                      Settings for Food &amp; Life Grocery in Katuloya, Thawalanthanne
                    </p>
                  </div>

                  {settingsFeedback && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 ${
                        settingsFeedback.success
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {settingsFeedback.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{settingsFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsFeedback(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Store Address (Official Invoice &amp; PO Header)
                      </label>
                      <input
                        type="text"
                        value={storeConfig.address || ''}
                        onChange={(e) =>
                          setStoreConfig({
                            ...storeConfig,
                            address: e.target.value,
                          })
                        }
                        placeholder="929, Kandy Road, Cross Waththegama, Katuloya, Thawalanthanne"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          value={storeConfig.email || ''}
                          onChange={(e) =>
                            setStoreConfig({
                              ...storeConfig,
                              email: e.target.value,
                            })
                          }
                          placeholder="foodandlifegrocery@gmail.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Hotline / WhatsApp Number
                        </label>
                        <input
                          type="text"
                          value={storeConfig.whatsappNumber || storeConfig.phone || ''}
                          onChange={(e) =>
                            setStoreConfig({
                              ...storeConfig,
                              whatsappNumber: e.target.value,
                              phone: e.target.value,
                            })
                          }
                          placeholder="+94 71 259 5683"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Official People's Bank Information */}
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <Building2 className="w-4 h-4 text-amber-700" />
                        <span>Official People's Bank Details (Checkout &amp; Purchase Orders)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            value={storeConfig.bankDetails?.bankName || "People's Bank"}
                            onChange={(e) =>
                              setStoreConfig({
                                ...storeConfig,
                                bankDetails: {
                                  bankName: e.target.value,
                                  branch: storeConfig.bankDetails?.branch || 'Panwila',
                                  accountName: storeConfig.bankDetails?.accountName || 'RG Nimal Rajapaksha',
                                  accountNumber: storeConfig.bankDetails?.accountNumber || '211200380039804',
                                },
                              })
                            }
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                            Branch
                          </label>
                          <input
                            type="text"
                            value={storeConfig.bankDetails?.branch || 'Panwila'}
                            onChange={(e) =>
                              setStoreConfig({
                                ...storeConfig,
                                bankDetails: {
                                  bankName: storeConfig.bankDetails?.bankName || "People's Bank",
                                  branch: e.target.value,
                                  accountName: storeConfig.bankDetails?.accountName || 'RG Nimal Rajapaksha',
                                  accountNumber: storeConfig.bankDetails?.accountNumber || '211200380039804',
                                },
                              })
                            }
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                            Account Name
                          </label>
                          <input
                            type="text"
                            value={storeConfig.bankDetails?.accountName || 'RG Nimal Rajapaksha'}
                            onChange={(e) =>
                              setStoreConfig({
                                ...storeConfig,
                                bankDetails: {
                                  bankName: storeConfig.bankDetails?.bankName || "People's Bank",
                                  branch: storeConfig.bankDetails?.branch || 'Panwila',
                                  accountName: e.target.value,
                                  accountNumber: storeConfig.bankDetails?.accountNumber || '211200380039804',
                                },
                              })
                            }
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                            Account Number
                          </label>
                          <input
                            type="text"
                            value={storeConfig.bankDetails?.accountNumber || '211200380039804'}
                            onChange={(e) =>
                              setStoreConfig({
                                ...storeConfig,
                                bankDetails: {
                                  bankName: storeConfig.bankDetails?.bankName || "People's Bank",
                                  branch: storeConfig.bankDetails?.branch || 'Panwila',
                                  accountName: storeConfig.bankDetails?.accountName || 'RG Nimal Rajapaksha',
                                  accountNumber: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Base Delivery Fee (LKR)
                        </label>
                        <input
                          type="number"
                          value={storeConfig.baseDeliveryFee}
                          onChange={(e) =>
                            setStoreConfig({
                              ...storeConfig,
                              baseDeliveryFee: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Free Delivery (LKR)
                        </label>
                        <input
                          type="number"
                          value={storeConfig.freeDeliveryThreshold}
                          onChange={(e) =>
                            setStoreConfig({
                              ...storeConfig,
                              freeDeliveryThreshold: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Radius (km)
                        </label>
                        <input
                          type="number"
                          value={storeConfig.deliveryRadiusKm}
                          onChange={(e) =>
                            setStoreConfig({
                              ...storeConfig,
                              deliveryRadiusKm: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await fetch('/api/admin/store-config', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${authToken}`,
                            },
                            body: JSON.stringify(storeConfig),
                          });
                          setSettingsFeedback({
                            success: true,
                            message: "Store settings and People's Bank details saved successfully!",
                          });
                        } catch (e: any) {
                          setSettingsFeedback({
                            success: false,
                            message: 'Error saving store configuration.',
                          });
                        }
                      }}
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors"
                    >
                      Save Configuration
                    </button>
                  </div>

                  {/* Staff Password Security Section */}
                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Staff Password Management
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          කාර්ය මණ්ඩල මුරපදය වෙනස් කිරීම (Restricted to authorized staff)
                        </p>
                      </div>
                    </div>

                    {passwordChangeStatus && (
                      <div
                        className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                          passwordChangeStatus.success
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                        }`}
                      >
                        {passwordChangeStatus.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{passwordChangeStatus.message}</span>
                      </div>
                    )}

                    <form onSubmit={handlePasswordChange} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Current Staff Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            New Password * (Min 6 chars)
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="New secure password"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Confirm New Password *
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPasswordInput}
                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>{isChangingPassword ? 'Updating Password...' : 'Update Staff Password'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Operational Launch & Database Cleanup (Fresh Start) */}
                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                          <Trash2 className="w-4 h-4 text-rose-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Operational Launch: Reset Demo Data (Fresh Start)
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Safely clear sample orders and demo purchase orders before live business operations. Central product catalogue (17+ items) and admin credentials are strictly preserved.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCleanupResult(null);
                          setCleanupPasswordInput('');
                          setIsCleanupModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clean Demo Data</span>
                      </button>
                    </div>

                    {cleanupResult && (
                      <div
                        className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                          cleanupResult.success
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                        }`}
                      >
                        {cleanupResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold">{cleanupResult.message}</span>
                          {cleanupResult.backupFile && (
                            <p className="text-[11px] font-mono text-emerald-700 mt-0.5">
                              Pre-cleanup snapshot saved to: {cleanupResult.backupFile}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB: DELIVERY AGENT MANAGEMENT DIRECTORY */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'delivery_agents' && (
                <div className="space-y-6">
                  {/* Top Bar */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shadow-xs">
                        <Truck className="w-5 h-5 text-blue-700" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900">
                          Delivery Agent Directory &amp; Fleet Management
                        </h2>
                        <p className="text-xs text-slate-500">
                          බෙදාහැරීමේ නියෝජිත කළමනාකරණය (Registration, hire charges, and dispatch status across Katuloya)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingAgent(null);
                        setIsAddingAgent(true);
                      }}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register New Agent</span>
                    </button>
                  </div>

                  {agentFeedback && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
                        agentFeedback.success
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      <span>{agentFeedback.message}</span>
                      <button
                        type="button"
                        onClick={() => setAgentFeedback(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Agents Directory Table */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-4">Agent Name</th>
                            <th className="py-3 px-4">Portal Username</th>
                            <th className="py-3 px-4">Mobile &amp; WhatsApp</th>
                            <th className="py-3 px-4">Vehicle Type &amp; Number</th>
                            <th className="py-3 px-4">Default Hire Charge</th>
                            <th className="py-3 px-4">Address / Base Area</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deliveryAgents.filter((a) => !a.isDeleted).length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400">
                                No delivery agents registered yet. Click &quot;Register New Agent&quot; to add your fleet.
                              </td>
                            </tr>
                          ) : (
                            deliveryAgents
                              .filter((a) => !a.isDeleted)
                              .map((agent) => (
                                <tr key={agent.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3.5 px-4 font-bold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-[11px]">
                                        {(agent.name || agent.fullName || 'A').charAt(0)}
                                      </div>
                                      <span>{agent.name || agent.fullName}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
                                      {agent.username || '—'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="font-mono text-slate-800 font-semibold">{agent.mobilePhone}</div>
                                    <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-mono">
                                      <MessageCircle className="w-3 h-3" />
                                      <span>{agent.whatsappPhone || agent.whatsappNumber}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="font-bold text-slate-800">{agent.vehicleType || 'Three Wheeler'}</span>
                                    <span className="block font-mono text-[11px] text-slate-500">{agent.vehicleNumber || agent.vehicleRegistrationNumber}</span>
                                  </td>
                                  <td className="py-3.5 px-4 font-black text-slate-900">
                                    Rs. {(agent.defaultHireCharge ?? 0).toLocaleString()}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                                    {agent.address}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                        agent.status === 'Active'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {agent.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setResetAgent(agent);
                                        setResetPasswordInput('');
                                        setResetPasswordFeedback(null);
                                      }}
                                      className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                      title="Reset Driver Portal Password"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAgent(agent);
                                        setIsAddingAgent(false);
                                      }}
                                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="Edit Agent Details"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleAgentStatus(agent.id, agent.status)}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                        agent.status === 'Active'
                                          ? 'text-amber-600 hover:bg-amber-50'
                                          : 'text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                      title={agent.status === 'Active' ? 'Deactivate Agent' : 'Activate Agent'}
                                    >
                                      {agent.status === 'Active' ? (
                                        <UserX className="w-3.5 h-3.5" />
                                      ) : (
                                        <UserCheck className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAgent(agent.id, agent.name || agent.fullName || 'Agent')}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Agent (Soft Delete - Past records preserved)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB: MANAGEMENT REPORTS & ACCOUNTING */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'reports_accounting' && (
                <div className="space-y-6">
                  <ManagementReportsModule
                    authToken={authToken}
                    currentUser={currentStaffUser}
                  />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB: PROMOTIONAL MEDIA MANAGEMENT */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'promotional_media' && (
                <div className="space-y-6">
                  <PromotionalMediaManager authToken={authToken} />
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB: CUSTOMER LOYALTY MANAGEMENT */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'customer_loyalty' && (
                <div className="space-y-6">
                  <CustomerLoyaltyManagement authToken={authToken} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Edit / Add Modal */}
      {(editingProduct || isAddingProduct) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">
                {isAddingProduct ? 'Add New Product' : `Edit: ${editingProduct?.nameEn}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingProduct(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {productFeedback && !productFeedback.success && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{productFeedback.message}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                handleSaveProduct({
                  id: editingProduct?.id,
                  nameEn: form.nameEn.value.trim(),
                  nameSi: form.nameSi.value.trim(),
                  sku: form.sku.value.trim() || undefined,
                  category: form.category.value.trim(),
                  unit: form.unit.value.trim(),
                  sellingPrice: Number(form.sellingPrice.value),
                  costPrice: form.costPrice.value ? Number(form.costPrice.value) : undefined,
                  availableStock: Number(form.availableStock.value),
                  minStockLevel: form.minStockLevel.value ? Number(form.minStockLevel.value) : undefined,
                  targetStockLevel: Number(form.targetStockLevel.value) || 100,
                  discountPercent: Number(form.discountPercent.value) || 0,
                  imageUrl:
                    productImageUrl.trim() ||
                    editingProduct?.imageUrl ||
                    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
                  isActive: Boolean(productIsActive),
                  badge: form.badge.value.trim() || undefined,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name (English) *</label>
                <input
                  name="nameEn"
                  required
                  defaultValue={editingProduct?.nameEn || ''}
                  placeholder="e.g. Fresh Red Onions"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name (Sinhala)</label>
                <input
                  name="nameSi"
                  defaultValue={editingProduct?.nameSi || ''}
                  placeholder="e.g. නැවුම් රතු ළූණු"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <input
                    name="category"
                    defaultValue={editingProduct?.category || 'Fresh Vegetables & Spices'}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    name="unit"
                    defaultValue={editingProduct?.unit || '1 kg'}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU / Item Code</label>
                  <input
                    name="sku"
                    defaultValue={editingProduct?.sku || editingProduct?.barcode || ''}
                    placeholder="e.g. GRO-RIC-001"
                    className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Price (LKR)</label>
                  <input
                    type="number"
                    name="costPrice"
                    min={0}
                    defaultValue={editingProduct?.costPrice || ''}
                    placeholder="e.g. 420"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (LKR) *</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    required
                    min={1}
                    defaultValue={editingProduct?.sellingPrice || 500}
                    className="w-full px-3 py-2 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock *</label>
                  <input
                    type="number"
                    name="availableStock"
                    required
                    min={0}
                    defaultValue={editingProduct?.availableStock !== undefined ? editingProduct.availableStock : 50}
                    className="w-full px-3 py-2 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1" title="Minimum alert level">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    name="minStockLevel"
                    min={0}
                    defaultValue={editingProduct?.minStockLevel !== undefined ? editingProduct.minStockLevel : 10}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1" title="Target inventory level for automatic replenishment">
                    Target Stock *
                  </label>
                  <input
                    type="number"
                    name="targetStockLevel"
                    required
                    min={0}
                    defaultValue={editingProduct?.targetStockLevel !== undefined ? editingProduct.targetStockLevel : 100}
                    className="w-full px-3 py-2 border rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Discount %</label>
                <input
                  type="number"
                  name="discountPercent"
                  min={0}
                  max={100}
                  defaultValue={editingProduct?.discountPercent || 0}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              {/* Product Image Section: Option A (Upload) + Option B (Paste URL) with Live Preview */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span>Product Image &amp; Visual Presentation</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">
                    Upload File or Paste URL
                  </span>
                </div>

                {imageUploadError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{imageUploadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Live Image Preview Container */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center p-1.5 bg-white rounded-xl border border-slate-200 relative aspect-square max-h-32 overflow-hidden shadow-xs">
                    {productImageUrl ? (
                      <img
                        src={productImageUrl}
                        alt="Product Preview"
                        className="w-full h-full object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-400 p-2">
                        <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                        <span className="text-[10px] font-bold block">No Image</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Live Preview
                    </span>
                  </div>

                  {/* Dual Input Controls: Option A & Option B */}
                  <div className="sm:col-span-8 space-y-2.5">
                    {/* Option A: Upload Product Image */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">
                        Option A: Upload Product Image (Phone Gallery / Desktop)
                      </span>
                      <label className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingImage ? 'Uploading & Processing...' : 'Choose Image File (.jpg, .png, .webp)'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleUploadImageFile}
                          disabled={isUploadingImage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Option B: Paste Image URL */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">
                        Option B: Paste Image URL
                      </span>
                      <input
                        type="url"
                        value={productImageUrl}
                        onChange={(e) => setProductImageUrl(e.target.value)}
                        placeholder="https://... or /uploads/..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Highlight Badge</label>
                <input
                  name="badge"
                  defaultValue={editingProduct?.badge || ''}
                  placeholder="e.g. Farm Fresh, Pure Ceylon"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={productIsActive}
                    onChange={(e) => setProductIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      Show to Customers (Active in Online Shop)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {productIsActive
                        ? '🟢 Active — Immediately visible in shop and can be added to cart'
                        : '⚪ Inactive — Hidden from shop catalog and cannot be ordered'}
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSavingProduct}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingProduct ? (
                  <span>Saving to Central Database...</span>
                ) : (
                  <span>{isAddingProduct ? 'Save & Publish Product' : 'Update Product & Sync'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Selected Order Detail & Dispatch Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base">
                      Order {selectedOrder.orderNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Destination Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer Details</span>
                <div className="font-black text-slate-900 text-sm">{selectedOrder.customerName}</div>
                <div className="text-slate-600 font-mono flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatPhoneForDisplay(selectedOrder.customerPhone)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {selectedOrder.deliveryType === 'pickup' ? 'Fulfillment Method' : 'Delivery Destination'}
                </span>
                {selectedOrder.deliveryType === 'pickup' ? (
                  <div className="space-y-1">
                    <span className="inline-block px-2.5 py-1 rounded text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      🏪 Store Pickup (Food &amp; Life Katuloya Store)
                    </span>
                    <div className="text-slate-800 font-bold">929, Kandy Road, Cross Waththegama, Katuloya</div>
                    <div className="text-slate-500 text-[11px]">Customer will collect in person &bull; Delivery Fee: Rs. 0</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      📍 {selectedOrder.deliveryArea || 'Katuloya'}
                    </span>
                    <div className="text-slate-800 font-medium">
                      {(selectedOrder.houseNumber || selectedOrder.streetName)
                        ? `${selectedOrder.houseNumber ? `${selectedOrder.houseNumber}, ` : ''}${selectedOrder.streetName ? `${selectedOrder.streetName}, ` : ''}${selectedOrder.deliveryAddress}`
                        : selectedOrder.deliveryAddress}
                    </div>
                    {selectedOrder.deliveryLandmark && (
                      <div className="text-slate-500 text-[11px]">Landmark: {selectedOrder.deliveryLandmark}</div>
                    )}
                    {selectedOrder.deliveryLatitude && selectedOrder.deliveryLongitude && (
                      <div className="pt-1.5 flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                          GPS: {selectedOrder.deliveryLatitude.toFixed(6)}, {selectedOrder.deliveryLongitude.toFixed(6)}
                        </span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.deliveryLatitude},${selectedOrder.deliveryLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>🧭 Open in Maps / Get Directions</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Order Items List */}
            <div className="space-y-2">
              <div className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Order Items ({selectedOrder.items.length})
              </div>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.nameEn}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.quantity} {item.unit} &times; Rs. {(item.effectivePrice ?? item.unitPrice ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="font-black text-slate-900">
                      Rs. {(item.lineTotal ?? 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PAYMENT STATUS & INSTALLMENT TRACKING */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span className="font-black text-xs text-amber-950 uppercase tracking-wider">
                    Customer Payment &amp; Credit Balance
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedOrder.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedOrder.paymentStatus === 'PARTIALLY PAID'
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedOrder.paymentStatus || 'UNPAID'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const bal =
                        selectedOrder.outstandingBalance !== undefined
                          ? selectedOrder.outstandingBalance
                          : Math.max(0, selectedOrder.total - (selectedOrder.amountPaid || 0));
                      setPaymentOrder(selectedOrder);
                      setPaymentAmount(bal);
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>

              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-amber-200/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Invoice Total</span>
                  <span className="text-sm font-black text-slate-900">
                    Rs. {(selectedOrder.total ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-200/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Delivery Hire Charge</span>
                  <span className="text-sm font-black text-blue-700">
                    Rs. {(selectedOrder.deliveryHireCharge ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-200/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Total Paid So Far</span>
                  <span className="text-sm font-black text-emerald-700">
                    Rs. {(selectedOrder.amountPaid ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-200/80">
                  <span className="text-[10px] text-slate-500 font-semibold block">Outstanding Balance</span>
                  <span className="text-sm font-black text-rose-600">
                    Rs. {(
                      selectedOrder.outstandingBalance !== undefined
                        ? (selectedOrder.outstandingBalance ?? 0)
                        : Math.max(0, (selectedOrder.total ?? 0) - (selectedOrder.amountPaid ?? 0))
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Installment History Table */}
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-700 block">Payment Installment Records:</span>
                  <div className="bg-white rounded-xl border border-amber-200/80 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="py-2 px-3">Receipt #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Method</th>
                          <th className="py-2 px-3">Received By</th>
                          <th className="py-2 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">{p.receiptNumber}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{new Date(p.paymentDate || p.date || Date.now()).toLocaleDateString()}</td>
                            <td className="py-2 px-3 font-black text-emerald-700">Rs. {(p.amount ?? 0).toLocaleString()}</td>
                            <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-600">{p.paymentMethod.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-3 text-slate-600">{p.receivedBy}</td>
                            <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{p.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* DELIVERY DISPATCH / STORE PICKUP FULFILLMENT SECTION */}
            {selectedOrder.deliveryType === 'pickup' ? (
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-700" />
                    <span className="font-black text-xs text-amber-950 uppercase tracking-wider">
                      Store Pickup Fulfillment (Katuloya Store Floor)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-950">
                    Store Pickup Order
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">
                    Direct Store Collection — No delivery driver or agent dispatch is required.
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Delivery Charge is LKR 0. Manage the preparation stages directly using the status selector below. Selecting <strong>&quot;Collected by Customer&quot;</strong> marks the order fulfilled and marks cash orders as paid.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">Update Store Pickup Status:</span>
                    <span className="text-[11px] text-slate-400">Updates customer tracking page immediately</span>
                  </div>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateDeliveryStatus(selectedOrder.id, e.target.value)}
                    className="px-3 py-2 bg-amber-50/60 border border-amber-300 rounded-xl font-bold text-xs text-slate-900"
                  >
                    <option value="Order Received">Order Received (ඇණවුම ලැබිණි)</option>
                    <option value="Preparing Order">Preparing Order (ඇණවුම සූදානම් කෙරේ)</option>
                    <option value="Ready for Pickup">Ready for Pickup (පැමිණ ලබාගැනීමට සූදානම්)</option>
                    <option value="Ready for Collection">Ready for Collection (ලබාගැනීමට සූදානම්)</option>
                    <option value="Collected by Customer">Collected by Customer (පාරිභෝගිකයා විසින් ලබාගන්නා ලදී)</option>
                    <option value="Cancelled">Cancelled (අවලංගුයි)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-blue-200/60">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-700" />
                    <span className="font-black text-xs text-blue-950 uppercase tracking-wider">
                      Delivery Dispatch &amp; Agent Assignment
                    </span>
                  </div>
                  {selectedOrder.deliveryAgent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-200 text-blue-900">
                      Agent Assigned
                    </span>
                  )}
                </div>

                {!selectedOrder.deliveryAgent ? (
                  /* Unassigned: Allow assignment */
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">
                      No delivery agent has been assigned to this order yet. Select a driver or rider to dispatch:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Select Delivery Agent *
                        </label>
                        <select
                          value={assignAgentId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setAssignAgentId(id);
                            const ag = deliveryAgents.find((a) => a.id === id);
                            if (ag) setAssignHireCharge(ag.defaultHireCharge);
                          }}
                          className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-800"
                        >
                          <option value="">-- Choose Agent --</option>
                          {deliveryAgents
                            .filter((a) => !a.isDeleted && a.status === 'Active')
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.vehicleType} • {a.vehicleNumber}) — Default Rs. {a.defaultHireCharge}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Hire Charge (Rs.) *
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={assignHireCharge}
                          onChange={(e) => setAssignHireCharge(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-black text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!assignAgentId || assigningAgent}
                      onClick={() => handleAssignAgentToOrder(selectedOrder.id)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{assigningAgent ? 'Assigning...' : 'Assign Delivery Agent & Update Order'}</span>
                    </button>
                  </div>
                ) : (
                  /* Assigned: Show details, WhatsApp link, status selector & hire payment toggle */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white border border-blue-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Driver / Rider</span>
                        <div className="font-black text-slate-900 text-sm mt-0.5">{selectedOrder.deliveryAgent.name}</div>
                        <div className="text-slate-600 font-mono mt-0.5">{selectedOrder.deliveryAgent.mobilePhone}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {selectedOrder.deliveryAgent.vehicleType} • <span className="font-mono font-bold text-slate-700">{selectedOrder.deliveryAgent.vehicleNumber}</span>
                        </div>
                      </div>

                      <div className="space-y-2 sm:text-right">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Hire Charge</span>
                          <div className="font-black text-blue-900 text-base">
                            Rs. {(selectedOrder.deliveryHireCharge ?? selectedOrder.deliveryAgent?.hireCharge ?? 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center sm:justify-end gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              selectedOrder.deliveryAgent.hireChargePaymentStatus === 'paid_to_agent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {selectedOrder.deliveryAgent.hireChargePaymentStatus === 'paid_to_agent' ? 'Paid to Agent' : 'Unpaid Hire'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleHirePayment(
                                selectedOrder.id,
                                selectedOrder.deliveryAgent?.hireChargePaymentStatus || 'unpaid'
                              )
                            }
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-colors"
                          >
                            Toggle Paid
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contact Agent on WhatsApp button */}
                    {selectedOrder.deliveryAgent.whatsappPhone && (
                      <a
                        href={`https://wa.me/${selectedOrder.deliveryAgent.whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hello ${selectedOrder.deliveryAgent.name}, regarding Food & Life Grocery order #${selectedOrder.orderNumber} for delivery to ${selectedOrder.customerName} at ${selectedOrder.deliveryAddress}, Katuloya.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Contact Delivery Agent on WhatsApp ({selectedOrder.deliveryAgent.whatsappPhone})</span>
                      </a>
                    )}

                    {/* Delivery Status Selector */}
                    <div className="p-3 bg-white rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">Update Live Delivery Status:</span>
                        <span className="text-[11px] text-slate-400">Updates customer tracking page immediately</span>
                      </div>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateDeliveryStatus(selectedOrder.id, e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-800"
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
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => onOpenOrderTracking(selectedOrder.trackingToken)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Public Tracking Page</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrderForBill(selectedOrder);
                    setIsBillModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View / Print PDF Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Delivery Agent Modal */}
      {(isAddingAgent || editingAgent) && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">
                {isAddingAgent ? 'Register New Delivery Agent' : `Edit Agent: ${editingAgent?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingAgent(null);
                  setIsAddingAgent(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeliveryAgent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingAgent?.name || ''}
                  placeholder="e.g. Ruwan Kumara"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    name="mobilePhone"
                    required
                    defaultValue={editingAgent?.mobilePhone || ''}
                    placeholder="077 123 4567"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp Phone *</label>
                  <input
                    name="whatsappPhone"
                    required
                    defaultValue={editingAgent?.whatsappPhone || ''}
                    placeholder="+94 77 123 4567"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Type *</label>
                  <select
                    name="vehicleType"
                    defaultValue={editingAgent?.vehicleType || 'Three Wheeler'}
                    className="w-full px-3 py-2 border rounded-xl font-medium"
                  >
                    <option value="Three Wheeler">Three Wheeler (ත්‍රිරෝද රථ)</option>
                    <option value="Motorcycle">Motorcycle (යතුරුපැදිය)</option>
                    <option value="Light Truck">Light Truck / Dimo Batta</option>
                    <option value="Van">Van / Delivery Van</option>
                    <option value="Car">Car</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Number *</label>
                  <input
                    name="vehicleNumber"
                    required
                    defaultValue={editingAgent?.vehicleNumber || ''}
                    placeholder="e.g. CP AB-4521"
                    className="w-full px-3 py-2 border rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Hire Charge (Rs.) *</label>
                  <input
                    type="number"
                    name="defaultHireCharge"
                    required
                    min={0}
                    defaultValue={editingAgent?.defaultHireCharge || 300}
                    className="w-full px-3 py-2 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    name="status"
                    defaultValue={editingAgent?.status || 'Active'}
                    className="w-full px-3 py-2 border rounded-xl font-medium"
                  >
                    <option value="Active">Active (Available for Orders)</option>
                    <option value="Inactive">Inactive (Unavailable)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Portal Username *</label>
                  <input
                    name="username"
                    required
                    defaultValue={editingAgent?.username || ''}
                    placeholder="e.g. driver_kamal"
                    className="w-full px-3 py-2 border rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingAgent ? 'New Password (Optional)' : 'Driver Password *'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    required={isAddingAgent}
                    minLength={6}
                    placeholder={editingAgent ? 'Leave blank to keep' : 'Min 6 characters'}
                    className="w-full px-3 py-2 border rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / Base Area</label>
                <input
                  name="address"
                  defaultValue={editingAgent?.address || 'Katuloya, Thawalanthanne'}
                  placeholder="e.g. Katuloya Junction"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>{isAddingAgent ? 'Register Delivery Agent' : 'Update Delivery Agent'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Driver Password Modal */}
      {resetAgent && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Reset Driver Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    {resetAgent.name} &bull; <span className="font-mono font-bold text-slate-700">{resetAgent.username}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetAgent(null);
                  setResetPasswordFeedback(null);
                  setResetPasswordInput('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetPasswordFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  resetPasswordFeedback.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {resetPasswordFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{resetPasswordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleResetAgentPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Enter New Password for Driver * (Min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="e.g. Driver@New2026"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Setting a new password will immediately revoke any current active sessions for this driver, forcing them to sign in with the new password.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setResetAgent(null);
                    setResetPasswordFeedback(null);
                    setResetPasswordInput('');
                  }}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || !resetPasswordInput}
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isResettingPassword ? 'Resetting...' : 'Reset Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Installment Modal */}
      {isPaymentModalOpen && paymentOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Record Customer Payment
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Order {paymentOrder.orderNumber} • {paymentOrder.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPaymentOrder(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Invoice</span>
                <span className="font-black text-slate-900">Rs. {(paymentOrder.total ?? 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Current Balance</span>
                <span className="font-black text-rose-600">
                  Rs. {(
                    paymentOrder.outstandingBalance !== undefined
                      ? (paymentOrder.outstandingBalance ?? 0)
                      : Math.max(0, (paymentOrder.total ?? 0) - (paymentOrder.amountPaid ?? 0))
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Payment Amount (LKR) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const bal =
                        paymentOrder.outstandingBalance !== undefined
                          ? paymentOrder.outstandingBalance
                          : Math.max(0, paymentOrder.total - (paymentOrder.amountPaid || 0));
                      setPaymentAmount(bal);
                    }}
                    className="text-[10px] text-emerald-700 hover:underline font-bold"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-black text-base text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl font-medium"
                >
                  <option value="cash">Cash (මුදල් ගෙවීම)</option>
                  <option value="bank_transfer">Bank Transfer (People's Bank Panwila)</option>
                  <option value="credit_card">Card Payment</option>
                  <option value="other">Other / Store Credit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Received By Staff *</label>
                <input
                  type="text"
                  required
                  value={paymentReceivedBy}
                  onChange={(e) => setPaymentReceivedBy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Memo / Receipt Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Partial cash received at shop counter"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={paymentSubmitting}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                <span>{paymentSubmitting ? 'Recording...' : 'Confirm & Save Payment Record'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Accounts & Statements Modal */}
      {isCustomerAccountsOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-6xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <CreditCard className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                      <span>Customer Accounts &amp; Outstanding Balances</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                        Live Auto-Sync
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Automated real-time customer financial tracking, credit sales management &amp; chronological ledger
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchCustomerAccounts}
                  disabled={isCustomerAccountsLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCustomerAccountsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomerAccountsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* REAL-TIME DASHBOARD: 4 KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4 rounded-2xl border border-blue-200/80">
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Total Customer Credit</span>
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  Rs.{' '}
                  {(
                    customerStats?.totalCustomerCredit ??
                    customerAccounts.reduce((sum, c) => sum + (c.totalOrdered || c.totalPurchases || 0), 0)
                  ).toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Sum of confirmed &amp; credit orders</p>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-orange-50/60 p-4 rounded-2xl border border-rose-200/80">
                <div className="flex items-center justify-between text-rose-700 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Total Outstanding</span>
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="text-lg sm:text-xl font-black text-rose-600">
                  Rs.{' '}
                  {(
                    customerStats?.totalOutstandingBalance ??
                    customerAccounts.reduce((sum, c) => sum + (c.outstandingBalance ?? c.totalOutstanding ?? 0), 0)
                  ).toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Total Ordered minus Total Paid</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 rounded-2xl border border-emerald-200/80">
                <div className="flex items-center justify-between text-emerald-700 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Payments Received</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-800">
                  Rs.{' '}
                  {(
                    customerStats?.totalPaymentsReceived ??
                    customerAccounts.reduce((sum, c) => sum + (c.totalPaid ?? c.paymentsReceived ?? 0), 0)
                  ).toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Verified cash, bank &amp; online receipts</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/60 p-4 rounded-2xl border border-purple-200/80">
                <div className="flex items-center justify-between text-purple-700 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Customer Orders</span>
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  {(
                    customerStats?.totalCustomerOrders ??
                    customerAccounts.reduce((sum, c) => sum + (c.totalOrders || c.orderCount || 0), 0)
                  ).toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Confirmed &amp; qualifying orders</p>
              </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerAccountSearch}
                  onChange={(e) => setCustomerAccountSearch(e.target.value)}
                  placeholder="Search by customer name, customer ID, or phone number..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={customerAccountFilterBalanceOnly}
                    onChange={(e) => setCustomerAccountFilterBalanceOnly(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 border-slate-300"
                  />
                  <span>Outstanding Balances Only (&gt; Rs. 0)</span>
                </label>
              </div>
            </div>

            {/* CUSTOMER ACCOUNTS TABLE */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Customer ID</th>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Contact Number</th>
                    <th className="py-3 px-3 text-right">Total Ordered</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-right">Outstanding Balance</th>
                    <th className="py-3 px-3 text-center">Last Order Date</th>
                    <th className="py-3 px-3 text-center">Last Payment Date</th>
                    <th className="py-3 px-3 text-center">Account Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerAccounts
                    .filter((c) => {
                      if (
                        customerAccountFilterBalanceOnly &&
                        (c.outstandingBalance ?? c.totalOutstanding ?? 0) <= 0
                      ) {
                        return false;
                      }
                      if (customerAccountSearch.trim()) {
                        const q = customerAccountSearch.trim().toLowerCase();
                        const nameMatch = (c.customerName || '').toLowerCase().includes(q);
                        const idMatch = (c.customerId || '').toLowerCase().includes(q);
                        const phoneMatch = (c.customerPhone || c.rawPhone || (c as any).phone || '').includes(q);
                        return nameMatch || idMatch || phoneMatch;
                      }
                      return true;
                    })
                    .map((c) => {
                      const balance = c.outstandingBalance ?? c.totalOutstanding ?? 0;
                      const ordered = c.totalOrdered ?? c.totalPurchases ?? 0;
                      const paid = c.totalPaid ?? c.paymentsReceived ?? 0;
                      const status = c.accountStatus || (balance > 0 ? 'Credit Active' : 'Good Standing');

                      return (
                        <tr key={c.customerId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-700 text-[11px]">
                            {c.customerId}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-900">{c.customerName}</div>
                            <div className="text-[10px] text-slate-400">{c.deliveryArea || 'Katuloya'}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                            {formatPhoneForDisplay(c.customerPhone || c.rawPhone || (c as any).phone)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">
                            Rs. {ordered.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-emerald-700">
                            Rs. {paid.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`font-black ${
                                balance > 0 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              Rs. {balance.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 text-[11px]">
                            {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 text-[11px]">
                            {c.lastPaymentDate ? (
                              new Date(c.lastPaymentDate).toLocaleDateString()
                            ) : (
                              <span className="text-slate-400 italic">No payments yet</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                status === 'Good Standing'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentModalCustomer(c);
                                setCustomerPaymentForm({
                                  amount: balance > 0 ? String(balance) : '',
                                  paymentMethod: 'cash',
                                  receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
                                  note: '',
                                  receivedBy: currentStaffUser?.name || 'Admin',
                                });
                                setCustomerPaymentErrorMsg('');
                                setCustomerPaymentSuccessMsg('');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs inline-flex items-center gap-1"
                              title="Record Direct Payment"
                            >
                              <Wallet className="w-3 h-3" />
                              <span>Record Payment</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerForLedger(c)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1"
                              title="View Chronological Ledger"
                            >
                              <History className="w-3 h-3" />
                              <span>Ledger</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD DIRECT CUSTOMER PAYMENT */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Wallet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Record Customer Payment</h3>
                  <p className="text-xs text-slate-500">
                    Direct payment credited to customer account &amp; allocated FIFO to unpaid orders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-black text-slate-900 text-sm">{paymentModalCustomer.customerName}</span>
                  <div className="text-[11px] font-mono text-slate-500">
                    ID: {paymentModalCustomer.customerId} • Contact: {formatPhoneForDisplay(paymentModalCustomer.customerPhone || paymentModalCustomer.rawPhone || '')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Current Balance</span>
                  <span className={`text-base font-black ${(paymentModalCustomer.outstandingBalance ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    Rs. {(paymentModalCustomer.outstandingBalance ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {(paymentModalCustomer.outstandingBalance ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setCustomerPaymentForm((prev) => ({
                      ...prev,
                      amount: String(paymentModalCustomer.outstandingBalance ?? 0),
                    }))
                  }
                  className="w-full py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all text-center"
                >
                  Quick Fill: Pay Full Outstanding Balance (Rs. {(paymentModalCustomer.outstandingBalance ?? 0).toLocaleString()})
                </button>
              )}
            </div>

            {customerPaymentErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{customerPaymentErrorMsg}</span>
              </div>
            )}

            {customerPaymentSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{customerPaymentSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRecordDirectCustomerPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (Rs.) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rs.</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={customerPaymentForm.amount}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="e.g. 5000"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={customerPaymentForm.paymentMethod}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="cash">Cash Payment</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online / Card</option>
                    <option value="other">Other Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receipt / Ref Number
                  </label>
                  <input
                    type="text"
                    value={customerPaymentForm.receiptNumber}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, receiptNumber: e.target.value }))
                    }
                    placeholder="e.g. RCP-0021"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Received By
                  </label>
                  <input
                    type="text"
                    value={customerPaymentForm.receivedBy}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, receivedBy: e.target.value }))
                    }
                    placeholder="Staff name"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Note / Memo (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerPaymentForm.note}
                    onChange={(e) =>
                      setCustomerPaymentForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="Settlement note"
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Balance preview */}
              {Number(customerPaymentForm.amount) > 0 && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                  <span className="text-slate-600 font-medium">New Outstanding Balance After Payment:</span>
                  <span className="font-black text-emerald-800 text-sm">
                    Rs.{' '}
                    {Math.max(
                      0,
                      (paymentModalCustomer.outstandingBalance ?? 0) - Number(customerPaymentForm.amount)
                    ).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomerPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingCustomerPayment ? 'Recording...' : 'Record & Synchronize Balance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER TRANSACTION HISTORY & STATEMENT LEDGER */}
      {selectedCustomerForLedger && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-lg">
                    {selectedCustomerForLedger.customerName}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedCustomerForLedger.accountStatus === 'Good Standing'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {selectedCustomerForLedger.accountStatus || 'Credit Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {selectedCustomerForLedger.customerId} • Phone:{' '}
                  {formatPhoneForDisplay(
                    selectedCustomerForLedger.customerPhone || selectedCustomerForLedger.rawPhone || ''
                  )}{' '}
                  • Area: {selectedCustomerForLedger.deliveryArea || 'Katuloya'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForLedger(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Summary Badges */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">TOTAL ORDERED</span>
                <span className="text-base font-black text-slate-900">
                  Rs.{' '}
                  {(
                    selectedCustomerForLedger.totalOrdered ??
                    selectedCustomerForLedger.totalPurchases ??
                    0
                  ).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 block">TOTAL PAID</span>
                <span className="text-base font-black text-emerald-800">
                  Rs.{' '}
                  {(
                    selectedCustomerForLedger.totalPaid ??
                    selectedCustomerForLedger.paymentsReceived ??
                    0
                  ).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-600 block">OUTSTANDING BALANCE</span>
                <span
                  className={`text-base font-black ${
                    (selectedCustomerForLedger.outstandingBalance ?? 0) > 0
                      ? 'text-rose-600'
                      : 'text-emerald-700'
                  }`}
                >
                  Rs. {(selectedCustomerForLedger.outstandingBalance ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Chronological Transaction History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">
                  Chronological Transaction Ledger
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalCustomer(selectedCustomerForLedger);
                    setCustomerPaymentForm({
                      amount:
                        (selectedCustomerForLedger.outstandingBalance ?? 0) > 0
                          ? String(selectedCustomerForLedger.outstandingBalance)
                          : '',
                      paymentMethod: 'cash',
                      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
                      note: '',
                      receivedBy: currentStaffUser?.name || 'Admin',
                    });
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Order / Payment ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Order Amount</th>
                      <th className="py-2.5 px-3 text-right">Payment Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedCustomerForLedger.transactions || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          No transactions recorded for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      selectedCustomerForLedger.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-[11px]">
                            {tx.orderNumber || tx.orderId || tx.receiptNumber || tx.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                tx.type === 'ORDER'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                            {tx.orderAmount
                              ? `Rs. ${tx.orderAmount.toLocaleString()}`
                              : tx.type === 'ORDER'
                              ? `Rs. ${tx.amount.toLocaleString()}`
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                            {tx.paymentAmount
                              ? `Rs. ${tx.paymentAmount.toLocaleString()}`
                              : tx.type !== 'ORDER'
                              ? `Rs. ${tx.amount.toLocaleString()}`
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 uppercase text-[10px]">
                            {tx.paymentMethod || 'CASH'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-bold uppercase">
                              {tx.transactionStatus || tx.status || 'CONFIRMED'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            Rs. {(tx.balanceAfter ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerForLedger(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Accounting Expenses Modal */}
      {isDeliveryAccountingOpen && deliveryAccounting && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-700" />
                  <span>Delivery Agent Hire Accounting &amp; Expense Summary</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Track delivery expenses, driver earnings, and settlement status
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryAccountingOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Delivery Hire</span>
                <span className="text-base font-black text-slate-900">Rs. {(deliveryAccounting?.totalHireCharges ?? 0).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase">Paid to Agents</span>
                <span className="text-base font-black text-emerald-800">Rs. {(deliveryAccounting?.paidToAgents ?? 0).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-[10px] text-amber-700 font-bold block uppercase">Pending Hire</span>
                <span className="text-base font-black text-amber-800">Rs. {(deliveryAccounting?.unpaidHireCharges ?? 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Agent-wise breakdown */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700">Breakdown by Delivery Agent:</span>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="py-2.5 px-3">Agent Name</th>
                      <th className="py-2.5 px-3">Dispatched Orders</th>
                      <th className="py-2.5 px-3">Total Hire Charges</th>
                      <th className="py-2.5 px-3">Paid to Agent</th>
                      <th className="py-2.5 px-3">Pending Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(deliveryAccounting?.agentWiseBreakdown || []).map((ag: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">{ag.agentName}</td>
                        <td className="py-3 px-3">{ag.orderCount} orders</td>
                        <td className="py-3 px-3 font-medium text-slate-800">Rs. {(ag.totalHire ?? 0).toLocaleString()}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">Rs. {(ag.paidHire ?? 0).toLocaleString()}</td>
                        <td className="py-3 px-3 font-black text-amber-700">Rs. {(ag.unpaidHire ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Bill & Invoice Modal */}
      <BillModal
        order={orderForBill}
        isOpen={isBillModalOpen}
        onClose={() => {
          setIsBillModalOpen(false);
          setOrderForBill(null);
        }}
      />

      {/* PO Item-by-Item Goods Receiving Modal */}
      {isReceivingModalOpen && receivingPo && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Goods Receiving: Purchase Order #{receivingPo.poNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify received physical quantities from supplier ({receivingPo.supplierName}). Atomically increments main inventory stock.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsReceivingModalOpen(false);
                  setReceivingPo(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {receivingFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  receivingFeedback.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {receivingFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{receivingFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReceiveGoods} className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-center">Ordered</th>
                      <th className="py-2.5 px-3 text-center">Prev. Received</th>
                      <th className="py-2.5 px-3 text-center">Remaining</th>
                      <th className="py-2.5 px-3 text-right">Received Now *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receivingPo.items.map((item) => {
                      const prevReceived = item.receivedQuantity || 0;
                      const remaining = item.remainingQuantity !== undefined
                        ? item.remainingQuantity
                        : Math.max(0, item.reorderQuantity - prevReceived);

                      return (
                        <tr key={item.productId} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{item.nameEn}</div>
                            {item.nameSi && <div className="text-[10px] text-slate-400">{item.nameSi}</div>}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-600">{item.unit}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {item.reorderQuantity}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">
                            {prevReceived}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                remaining === 0
                                  ? 'bg-slate-100 text-slate-400'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {remaining}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              disabled={remaining === 0}
                              value={receivingInputs[item.productId] ?? 0}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(remaining, Number(e.target.value) || 0));
                                setReceivingInputs({
                                  ...receivingInputs,
                                  [item.productId]: val,
                                });
                              }}
                              className="w-24 px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-right font-black text-xs focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Receiving Memo / Warehouse Inspector Notes
                </label>
                <input
                  type="text"
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g. Received intact at Katuloya dispatch bay by Nimal."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsReceivingModalOpen(false);
                    setReceivingPo(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceiving}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>
                    {isSubmittingReceiving ? 'Updating Inventory...' : 'Confirm Goods Received & Increment Stock'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Cleanup & Fresh Start Confirmation Modal */}
      {isCleanupModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5 text-rose-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Confirm Operational Fresh Start
                  </h3>
                  <p className="text-xs text-slate-500">
                    Purge test transactions while preserving core store data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCleanupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/90 text-xs text-amber-900 space-y-2">
              <div className="font-black text-amber-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Safe Operational Launch Protocol</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed">
                <li>
                  <strong>Automatic Safety Backup:</strong> Creates a full JSON snapshot in <code>data/backup_*.json</code> before executing.
                </li>
                <li>
                  <strong>What is Cleared:</strong> Demo orders, sample purchase orders, and test stock movement logs.
                </li>
                <li>
                  <strong>What is Strictly Preserved:</strong> All registered catalog products (17+ items), store information, People's Bank details, delivery fleet profiles, and admin credentials.
                </li>
              </ul>
            </div>

            <form onSubmit={handleSubmitCleanupDemoData} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter Admin Password to Authorize Reset *
                </label>
                <input
                  type="password"
                  required
                  value={cleanupPasswordInput}
                  onChange={(e) => setCleanupPasswordInput(e.target.value)}
                  placeholder="Enter FoodLife@Admin2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCleanupModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCleanup || !cleanupPasswordInput}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isSubmittingCleanup ? 'Executing Reset...' : 'Confirm & Reset Demo Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
