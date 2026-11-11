/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Calendar,
  Clock,
  Layers,
  Smartphone,
  Check,
} from 'lucide-react';
import type { PromotionalMedia, PromotionalMediaType } from '../types/index.ts';
import { validateMediaUpload } from '../utils/promotions.ts';

interface PromotionalMediaManagerProps {
  authToken: string | null;
}

export const PromotionalMediaManager: React.FC<PromotionalMediaManagerProps> = ({
  authToken,
}) => {
  const [promotions, setPromotions] = useState<PromotionalMedia[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, active: 0, videos: 0, images: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter tabs
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'videos' | 'images'>('all');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadFileType, setUploadFileType] = useState<PromotionalMediaType>('image');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubtitle, setUploadSubtitle] = useState('');
  const [uploadBadge, setUploadBadge] = useState('SPECIAL PROMOTION');
  const [uploadCtaText, setUploadCtaText] = useState('SHOP NOW');
  const [uploadCtaLink, setUploadCtaLink] = useState('#catalog-section');
  const [uploadStartDate, setUploadStartDate] = useState('');
  const [uploadEndDate, setUploadEndDate] = useState('');
  const [uploadDuration, setUploadDuration] = useState('6');
  const [isUploading, setIsUploading] = useState(false);

  // Edit modal state
  const [editingPromotion, setEditingPromotion] = useState<PromotionalMedia | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editCtaText, setEditCtaText] = useState('');
  const [editCtaLink, setEditCtaLink] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDuration, setEditDuration] = useState('6');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Preview modal state
  const [previewMedia, setPreviewMedia] = useState<PromotionalMedia | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch all promotional media
  const loadPromotions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/promotions', {
        headers: {
          Authorization: `Bearer ${authToken || ''}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions || []);
        if (data.stats) setStats(data.stats);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to fetch promotional media.');
      }
    } catch (err: any) {
      setError('Network error loading promotional media: ' + (err?.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, [authToken]);

  // Handle direct file selection from gallery or camera
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateMediaUpload({ size: file.size, mimeType: file.type });

    if (!validation.valid) {
      setError(validation.error || 'Invalid file format or size.');
      return;
    }

    setUploadFile(file);
    setUploadFileType(validation.type);
    if (!uploadTitle) {
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadTitle(cleanBaseName.slice(0, 50));
    }

    // Generate local preview URL
    const objectUrl = URL.createObjectURL(file);
    setUploadPreviewUrl(objectUrl);
    setIsUploadModalOpen(true);
  };

  // Convert file to Base64 and submit to backend
  const handlePublishUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select an image or video file.');
      return;
    }
    if (!uploadTitle.trim()) {
      setError('Please provide a title for this promotional banner.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const payload = {
            mediaBase64: base64Data,
            filename: uploadFile.name,
            type: uploadFileType,
            title: uploadTitle.trim(),
            subtitle: uploadSubtitle.trim(),
            badge: uploadBadge.trim(),
            callToActionText: uploadCtaText.trim() || 'SHOP NOW',
            callToActionLink: uploadCtaLink.trim() || '#catalog-section',
            startDate: uploadStartDate || undefined,
            endDate: uploadEndDate || undefined,
            durationSeconds: Number(uploadDuration) || (uploadFileType === 'video' ? 10 : 6),
          };

          const res = await fetch('/api/admin/promotions/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken || ''}`,
            },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            setSuccessMessage('Promotional media successfully uploaded and published!');
            setTimeout(() => setSuccessMessage(null), 4000);
            setIsUploadModalOpen(false);
            setUploadFile(null);
            setUploadPreviewUrl(null);
            setUploadTitle('');
            setUploadSubtitle('');
            loadPromotions();
          } else {
            const errData = await res.json().catch(() => ({}));
            setError(errData.error || 'Failed to upload promotional media.');
          }
        } catch (innerErr: any) {
          setError('Failed to process media file: ' + (innerErr?.message || String(innerErr)));
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Error reading media file from device.');
        setIsUploading(false);
      };

      reader.readAsDataURL(uploadFile);
    } catch (err: any) {
      setError('Upload error: ' + (err?.message || String(err)));
      setIsUploading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/promotions/${id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken || ''}`,
        },
      });
      if (res.ok) {
        loadPromotions();
      }
    } catch (err) {
      console.error('Error toggling active state:', err);
    }
  };

  // Delete promotion
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/promotions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken || ''}`,
        },
      });
      if (res.ok) {
        setSuccessMessage(`Promotion "${title}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        loadPromotions();
      }
    } catch (err) {
      console.error('Error deleting promotion:', err);
    }
  };

  // Reorder promotions (Move Up / Down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= promotions.length) return;

    const reordered = [...promotions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setPromotions(reordered);

    try {
      await fetch('/api/admin/promotions/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken || ''}`,
        },
        body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
      });
    } catch (err) {
      console.error('Error reordering promotions:', err);
      loadPromotions();
    }
  };

  // Open Edit Modal
  const openEditModal = (promo: PromotionalMedia) => {
    setEditingPromotion(promo);
    setEditTitle(promo.title);
    setEditSubtitle(promo.subtitle || '');
    setEditBadge(promo.badge || '');
    setEditCtaText(promo.callToActionText || 'SHOP NOW');
    setEditCtaLink(promo.callToActionLink || '#catalog-section');
    setEditStartDate(promo.startDate || '');
    setEditEndDate(promo.endDate || '');
    setEditDuration(String(promo.durationSeconds || 6));
    setEditIsActive(promo.isActive);
  };

  // Save Edit Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromotion) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/promotions/${editingPromotion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken || ''}`,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          subtitle: editSubtitle.trim(),
          badge: editBadge.trim(),
          callToActionText: editCtaText.trim(),
          callToActionLink: editCtaLink.trim(),
          startDate: editStartDate || null,
          endDate: editEndDate || null,
          durationSeconds: Number(editDuration) || 6,
          isActive: editIsActive,
        }),
      });

      if (res.ok) {
        setSuccessMessage('Promotion updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        setEditingPromotion(null);
        loadPromotions();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to update promotion.');
      }
    } catch (err: any) {
      setError('Save error: ' + (err?.message || String(err)));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filter list
  const filteredPromotions = promotions.filter((p) => {
    if (filterTab === 'active') return p.isActive;
    if (filterTab === 'videos') return p.type === 'video';
    if (filterTab === 'images') return p.type === 'image';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Title and Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#F36B16]">
              <Film className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Promotional Media Management
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload videos and photos directly from your phone gallery or computer. Media automatically plays on the Customer Dashboard.
          </p>
        </div>

        {/* Hidden File Input for Direct Phone Gallery / Camera / File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F36B16] hover:bg-[#d85605] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video / Photo</span>
          </button>

          <button
            type="button"
            onClick={loadPromotions}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh Promotions"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-center justify-between gap-2.5 text-xs sm:text-sm font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Promotions
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">{promotions.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Active on Dashboard
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {promotions.filter((p) => p.isActive).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F36B16]">
            Video Ads
          </span>
          <div className="text-2xl font-black text-[#F36B16] mt-1">
            {promotions.filter((p) => p.type === 'video').length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">
            Image Banners
          </span>
          <div className="text-2xl font-black text-sky-600 mt-1">
            {promotions.filter((p) => p.type === 'image').length}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Media ({promotions.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'active'
              ? 'bg-[#078B48] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Active Now ({promotions.filter((p) => p.isActive).length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('videos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'videos'
              ? 'bg-[#F36B16] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Videos ({promotions.filter((p) => p.type === 'video').length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('images')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'images'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Images ({promotions.filter((p) => p.type === 'image').length})
        </button>
      </div>

      {/* Promotions List Grid / Table */}
      {filteredPromotions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Film className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700">No promotional media found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Upload Video / Photo" to select promotional media from your phone gallery or computer.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#F36B16] text-white text-xs font-bold rounded-xl hover:bg-[#d85605]"
          >
            Upload Media Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPromotions.map((promo, idx) => (
            <div
              key={promo.id}
              className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                promo.isActive ? 'border-orange-200' : 'border-slate-200 opacity-65'
              }`}
            >
              {/* Left Column: Media Thumbnail & Info */}
              <div className="flex items-center gap-3.5 w-full md:w-auto">
                {/* Reorder Arrows */}
                <div className="flex flex-col gap-1 text-slate-400">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-1 hover:text-[#F36B16] disabled:opacity-20 cursor-pointer"
                    title="Move Up in order"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === filteredPromotions.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-1 hover:text-[#F36B16] disabled:opacity-20 cursor-pointer"
                    title="Move Down in order"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Thumbnail Display */}
                <div
                  onClick={() => setPreviewMedia(promo)}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 shrink-0 cursor-pointer group/thumb border border-slate-200 shadow-inner"
                  title="Click to preview"
                >
                  {promo.type === 'video' ? (
                    <video
                      src={promo.url}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={promo.url}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Type Badge on Thumbnail */}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white font-extrabold text-[9px] flex items-center gap-1 backdrop-blur-xs">
                    {promo.type === 'video' ? <Film className="w-3 h-3 text-orange-400" /> : <ImageIcon className="w-3 h-3 text-emerald-400" />}
                    <span>{promo.type.toUpperCase()}</span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                      {promo.title}
                    </span>
                    {promo.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#F36B16] font-bold text-[10px] uppercase">
                        {promo.badge}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        promo.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {promo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {promo.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-1">{promo.subtitle}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                    <span>Order: #{promo.order}</span>
                    <span>•</span>
                    <span>Duration: {promo.durationSeconds || (promo.type === 'video' ? 10 : 6)}s</span>
                    <span>•</span>
                    <span>CTA: "{promo.callToActionText || 'SHOP NOW'}"</span>
                    {(promo.startDate || promo.endDate) && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {promo.startDate ? new Date(promo.startDate).toLocaleDateString() : 'Now'} -{' '}
                            {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : 'Forever'}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {/* Active / Inactive Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleActive(promo.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    promo.isActive
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                  }`}
                  title={promo.isActive ? 'Click to Deactivate' : 'Click to Activate'}
                >
                  {promo.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{promo.isActive ? 'Active' : 'Hidden'}</span>
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => openEditModal(promo)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={() => setPreviewMedia(promo)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="Preview Media"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDelete(promo.id, promo.title)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                  title="Delete Promotion"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-orange-200 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-100 text-[#F36B16] flex items-center justify-center font-bold">
                  {uploadFileType === 'video' ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    Publish Promotional {uploadFileType === 'video' ? 'Video' : 'Photo'}
                  </h3>
                  <p className="text-xs text-slate-500">Preview media and configure promotion details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media Preview Player */}
            {uploadPreviewUrl && (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                {uploadFileType === 'video' ? (
                  <video
                    src={uploadPreviewUrl}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={uploadPreviewUrl}
                    alt="Upload Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white font-bold text-[10px] backdrop-blur-xs">
                  {uploadFile?.name} ({(uploadFile?.size ? uploadFile.size / (1024 * 1024) : 0).toFixed(1)} MB)
                </div>
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handlePublishUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Promotional Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. 100% Fresh Farm Vegetables & Fruits"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subtitle / Description
                </label>
                <input
                  type="text"
                  value={uploadSubtitle}
                  onChange={(e) => setUploadSubtitle(e.target.value)}
                  placeholder="e.g. Handpicked daily • 45-90 min rapid doorstep delivery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={uploadBadge}
                    onChange={(e) => setUploadBadge(e.target.value)}
                    placeholder="e.g. SPECIAL OFFER, DAILY FRESH"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={uploadDuration}
                    onChange={(e) => setUploadDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Action Text</label>
                  <input
                    type="text"
                    value={uploadCtaText}
                    onChange={(e) => setUploadCtaText(e.target.value)}
                    placeholder="e.g. SHOP NOW"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Target Link</label>
                  <input
                    type="text"
                    value={uploadCtaLink}
                    onChange={(e) => setUploadCtaLink(e.target.value)}
                    placeholder="#catalog-section"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={uploadStartDate}
                    onChange={(e) => setUploadStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={uploadEndDate}
                    onChange={(e) => setUploadEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#F36B16] hover:bg-[#d85605] text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Publishing to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Publish Promotion</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPromotion && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setEditingPromotion(null)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-orange-200 space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#F36B16]" />
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  Edit Promotion Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPromotion(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Display Duration (Seconds)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Action Text</label>
                  <input
                    type="text"
                    value={editCtaText}
                    onChange={(e) => setEditCtaText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Target Link</label>
                  <input
                    type="text"
                    value={editCtaLink}
                    onChange={(e) => setEditCtaLink(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F36B16] focus:outline-hidden text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#F36B16] rounded border-slate-300 focus:ring-[#F36B16]"
                />
                <label htmlFor="editIsActive" className="font-bold text-slate-800">
                  Active (Display on Customer Dashboard)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPromotion(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-[#F36B16] hover:bg-[#d85605] text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PREVIEW LIGHTBOX MODAL */}
      {previewMedia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border-2 border-orange-200 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-orange-100">
              <h4 className="font-black text-slate-900 text-base">{previewMedia.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center">
              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.title}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              {previewMedia.subtitle && <p className="font-semibold text-slate-800">{previewMedia.subtitle}</p>}
              <p>Type: <span className="font-bold uppercase text-[#F36B16]">{previewMedia.type}</span> • Status: <span className="font-bold text-emerald-600">{previewMedia.isActive ? 'Active' : 'Inactive'}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
