/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  ExternalLink,
  Sparkles,
  Cloud,
  Check,
  X,
  Eye,
  Camera,
  Layers,
} from 'lucide-react';
import type { Product } from '../types/index.ts';

interface AdminProductImageManagerProps {
  products: Product[];
  authToken: string | null;
  onProductsUpdated: (products: Product[]) => void;
}

export const AdminProductImageManager: React.FC<AdminProductImageManagerProps> = ({
  products,
  authToken,
  onProductsUpdated,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_images' | 'without_images' | 'recent'>('all');

  // Active Upload State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewFileSize, setPreviewFileSize] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Full-size Preview Modal
  const [viewingImageProduct, setViewingImageProduct] = useState<Product | null>(null);

  // Delete Confirmation Modal
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hidden File Input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Search Match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesNameEn = prod.nameEn.toLowerCase().includes(query);
        const matchesNameSi = (prod.nameSi || '').toLowerCase().includes(query);
        const matchesId = prod.id.toLowerCase().includes(query);
        const matchesSku = (prod.sku || '').toLowerCase().includes(query);
        if (!matchesNameEn && !matchesNameSi && !matchesId && !matchesSku) return false;
      }

      // Category Match
      if (categoryFilter !== 'all' && prod.category !== categoryFilter) {
        return false;
      }

      // Status Match
      const hasImage = Boolean(prod.imageUrl && prod.imageUrl.trim().length > 0);
      if (statusFilter === 'with_images' && !hasImage) return false;
      if (statusFilter === 'without_images' && hasImage) return false;
      if (statusFilter === 'recent') {
        if (!prod.imageUpdatedAt) return false;
        const diffHours = (Date.now() - new Date(prod.imageUpdatedAt).getTime()) / (1000 * 60 * 60);
        if (diffHours > 72) return false; // within 72 hours
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const withImages = products.filter((p) => p.imageUrl && p.imageUrl.trim().length > 0).length;
    const withoutImages = total - withImages;
    const cloudSynced = products.filter(
      (p) => p.imageUrl?.startsWith('/uploads/') || p.imageUrl?.includes('/api/cloud-images/') || p.imageSource === 'cloud_storage'
    ).length;
    return { total, withImages, withoutImages, cloudSynced };
  }, [products]);

  // Client-Side Image Optimizer
  const optimizeImage = (file: File): Promise<{ dataUrl: string; width: number; height: number; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            } else {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: e.target?.result as string,
              width: img.width,
              height: img.height,
              size: file.size,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, 0.85);
          const approxSize = Math.round((dataUrl.length * 3) / 4);

          resolve({
            dataUrl,
            width,
            height,
            size: approxSize,
          });
        };
        img.onerror = () => reject(new Error('Failed to load selected image into memory.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error reading device file.'));
      reader.readAsDataURL(file);
    });
  };

  // Open native picker for specific product
  const handleStartUploadForProduct = (product: Product) => {
    setSelectedProduct(product);
    setPreviewDataUrl(null);
    setPreviewFileName('');
    setPreviewDimensions(null);
    setPreviewFileSize(0);
    setUploadError(null);
    setUploadSuccess(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle native file selection
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      setUploadError('Unsupported format. Please select a JPG, JPEG, PNG, or WEBP photo.');
      setIsUploadModalOpen(true);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Image size exceeds 20MB. Please choose a smaller photo.');
      setIsUploadModalOpen(true);
      return;
    }

    try {
      setIsCompressing(true);
      setIsUploadModalOpen(true);
      setUploadError(null);
      setPreviewFileName(file.name);

      const optimized = await optimizeImage(file);
      setPreviewDataUrl(optimized.dataUrl);
      setPreviewDimensions({ width: optimized.width, height: optimized.height });
      setPreviewFileSize(optimized.size);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process image file.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Save to Cloud Storage Endpoint
  const handleConfirmCloudUpload = async () => {
    if (!selectedProduct || !previewDataUrl) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await fetch('/api/admin/upload-product-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          imageBase64: previewDataUrl,
          filename: previewFileName || `${selectedProduct.id}.jpg`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server rejected cloud upload.');
      }

      setUploadSuccess(`Image for "${selectedProduct.nameEn}" successfully uploaded to central cloud storage and synced!`);

      // Update in-memory state
      const updated = products.map((p) => {
        if (p.id === selectedProduct.id) {
          return {
            ...p,
            imageUrl: data.imageUrl,
            imageId: data.imageId,
            imageUpdatedAt: new Date().toISOString(),
            imageSource: 'cloud_storage' as const,
          };
        }
        return p;
      });

      onProductsUpdated(updated);

      // Close modal after brief success presentation
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setPreviewDataUrl(null);
        setSelectedProduct(null);
        setUploadSuccess(null);
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || 'Network error uploading to cloud storage.');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove Image Handler
  const handleConfirmDeleteImage = async () => {
    if (!deleteConfirmProduct) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteConfirmProduct.id}/remove-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove image.');
      }

      const updated = products.map((p) => {
        if (p.id === deleteConfirmProduct.id) {
          return {
            ...p,
            imageUrl: '',
            imageId: undefined,
            imageUpdatedAt: new Date().toISOString(),
            imageSource: undefined,
          };
        }
        return p;
      });

      onProductsUpdated(updated);
      setDeleteConfirmProduct(null);
    } catch (err: any) {
      alert(`Error removing image: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Picker Input (Universal Android Gallery / iPhone Photos / Desktop File Picker) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Cloud Storage Status Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Cloud className="w-64 h-64" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Central Cloud Storage &amp; Live Cross-Device Synchronization
            </div>
            <h2 className="text-xl sm:text-2xl font-black">Universal Product Image Hub</h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
              Upload from any phone Gallery, iPhone Photos, tablet, or desktop. Uploaded images are stored permanently in central cloud storage and instantly synchronized across all connected devices in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetch('/api/products')
                  .then((r) => r.json())
                  .then((data) => onProductsUpdated(data))
                  .catch(() => {});
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Cloud Sync</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <div className="text-[11px] text-emerald-200 font-medium">Total Products</div>
            <div className="text-xl font-black mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <div className="text-[11px] text-emerald-200 font-medium">With Images</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{stats.withImages}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <div className="text-[11px] text-emerald-200 font-medium">Missing Images</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">{stats.withoutImages}</div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur-xs">
            <div className="text-[11px] text-emerald-200 font-medium">Permanent Cloud URLs</div>
            <div className="text-xl font-black text-sky-300 mt-0.5">{stats.cloudSynced}</div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, SKU, or ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="sm:w-56">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => {
                const sample = products.find((p) => p.category === c);
                const label = sample?.categorySi ? `${c} (${sample.categorySi})` : c;
                return (
                  <option key={c} value={c}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('with_images')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'with_images'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            With Images ({stats.withImages})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('without_images')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'without_images'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            No Images ({stats.withoutImages})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('recent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'recent'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            Recently Updated
          </button>
        </div>
      </div>

      {/* Products Grid with Dedicated Image Controls */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No products match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting your search query or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((prod) => {
            const hasImage = Boolean(prod.imageUrl && prod.imageUrl.trim().length > 0);
            const isCloudUpload = prod.imageUrl?.startsWith('/uploads/') || prod.imageSource === 'cloud_storage';

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Image Card Container */}
                <div>
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden group">
                    {hasImage ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.nameEn}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4">
                        <ImageIcon className="w-10 h-10 text-slate-300 mb-1" />
                        <span className="text-xs font-bold text-slate-500">No Image Uploaded</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Click "Upload Image" to add</span>
                      </div>
                    )}

                    {/* Image Status Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {isCloudUpload ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                          <Cloud className="w-3 h-3" />
                          Cloud Synced
                        </span>
                      ) : hasImage ? (
                        <span className="px-2 py-0.5 rounded-md bg-sky-600/90 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                          CDN Reference
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs">
                          Missing Image
                        </span>
                      )}
                    </div>

                    {/* Unit Badge */}
                    <div className="absolute bottom-2 right-2 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                        {prod.unit}
                      </span>
                    </div>

                    {/* View Full Size Overlay Button */}
                    {hasImage && (
                      <button
                        type="button"
                        onClick={() => setViewingImageProduct(prod)}
                        title="View Full Size Photo"
                        className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity gap-1.5 text-xs font-bold"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Full Size</span>
                      </button>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-mono text-emerald-800 font-semibold">{prod.id}</span>
                      <span className="truncate max-w-[140px] text-slate-500">{prod.category}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">{prod.nameEn}</h4>
                    {prod.nameSi && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{prod.nameSi}</p>}

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Selling Price</span>
                        <span className="font-extrabold text-slate-900">LKR {prod.sellingPrice.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Available Stock</span>
                        <span className={`font-bold ${prod.availableStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {prod.availableStock} {prod.unit}
                        </span>
                      </div>
                    </div>

                    {prod.imageUpdatedAt && (
                      <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                        <span>Updated:</span>
                        <span className="font-medium text-slate-600">
                          {new Date(prod.imageUpdatedAt).toLocaleDateString()} {new Date(prod.imageUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartUploadForProduct(prod)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{hasImage ? 'Change Image' : 'Upload Image'}</span>
                  </button>

                  {hasImage && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmProduct(prod)}
                      title="Remove product image"
                      className="p-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload & Preview Modal */}
      {isUploadModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload Product Image</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Permanent cloud storage &amp; cross-device sync
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isUploading) {
                    setIsUploadModalOpen(false);
                    setPreviewDataUrl(null);
                    setSelectedProduct(null);
                  }
                }}
                disabled={isUploading}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Product Info Bar */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Target Product
                  </div>
                  <div className="font-black text-slate-900 text-sm">{selectedProduct.nameEn}</div>
                  <div className="text-xs text-slate-500">{selectedProduct.category} • ID: {selectedProduct.id}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-950">LKR {selectedProduct.sellingPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Compression state */}
              {isCompressing && (
                <div className="p-8 text-center text-slate-600">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
                  <p className="text-xs font-bold">Optimizing image for fast universal loading...</p>
                </div>
              )}

              {/* Image Preview Box */}
              {previewDataUrl && !isCompressing && (
                <div className="space-y-3">
                  <div className="relative aspect-4/3 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                    <img
                      src={previewDataUrl}
                      alt="Selected Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                      {previewDimensions ? `${previewDimensions.width} × ${previewDimensions.height} px` : ''} • {Math.round(previewFileSize / 1024)} KB
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span className="truncate max-w-[240px] font-mono">{previewFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                          fileInputRef.current.click();
                        }
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline"
                    >
                      Choose Different Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Status & Feedback Messages */}
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Cross-Device Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Cloud className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Once saved, this photo will automatically become visible across all Android phones, iPhones, tablets, computers, and customer order screens.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setPreviewDataUrl(null);
                  setSelectedProduct(null);
                }}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCloudUpload}
                disabled={!previewDataUrl || isUploading || isCompressing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading to Cloud...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save to Central Cloud Storage</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size Image Viewer Modal */}
      {viewingImageProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{viewingImageProduct.nameEn}</h3>
                <p className="text-xs text-slate-300">{viewingImageProduct.category} • ID: {viewingImageProduct.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingImageProduct(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={viewingImageProduct.imageUrl}
                alt={viewingImageProduct.nameEn}
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-600 truncate max-w-md">{viewingImageProduct.imageUrl}</span>
              <a
                href={viewingImageProduct.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>Open in Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-base text-slate-900">Remove Product Image?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove the image for <span className="font-bold text-slate-800">"{deleteConfirmProduct.nameEn}"</span>?
                This will revert the product image across all devices to the default placeholder.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteImage}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
