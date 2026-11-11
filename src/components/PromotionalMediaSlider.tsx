/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import type { PromotionalMedia } from '../types/index.ts';

interface PromotionalMediaSliderProps {
  onShopNowClick?: () => void;
}

export const PromotionalMediaSlider: React.FC<PromotionalMediaSliderProps> = ({
  onShopNowClick,
}) => {
  const [promotions, setPromotions] = useState<PromotionalMedia[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Fetch active promotional media from backend
  const fetchPromotions = useCallback(async () => {
    try {
      const res = await fetch('/api/promotions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.promotions) && data.promotions.length > 0) {
          setPromotions(data.promotions);
        }
      }
    } catch (err) {
      console.warn('[Promotions] Error fetching media promotions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and periodic background sync (every 30s)
  useEffect(() => {
    fetchPromotions();
    const syncInterval = setInterval(fetchPromotions, 30000);
    return () => clearInterval(syncInterval);
  }, [fetchPromotions]);

  const currentMedia = promotions[currentIndex];

  // Advance to next media slide
  const goToNext = useCallback(() => {
    if (promotions.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % promotions.length);
    setProgress(0);
  }, [promotions.length]);

  // Go to previous media slide
  const goToPrev = useCallback(() => {
    if (promotions.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + promotions.length) % promotions.length);
    setProgress(0);
  }, [promotions.length]);

  // Handle slide timer & auto-rotation
  useEffect(() => {
    if (!currentMedia || isHovered || !isPlaying) return;

    // Clear previous timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    setProgress(0);

    // Duration for current item
    const durationMs = (currentMedia.durationSeconds || (currentMedia.type === 'video' ? 10 : 6)) * 1000;
    const intervalStepMs = 100;
    const totalSteps = durationMs / intervalStepMs;
    let currentStep = 0;

    progressIntervalRef.current = setInterval(() => {
      currentStep++;
      setProgress(Math.min(100, (currentStep / totalSteps) * 100));
    }, intervalStepMs);

    // If multiple media items exist, advance after duration
    if (promotions.length > 1) {
      timerRef.current = setTimeout(() => {
        goToNext();
      }, durationMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentMedia, currentIndex, promotions.length, isHovered, isPlaying, goToNext]);

  // Handle video element play state, autoplay, and mute changes
  useEffect(() => {
    if (currentMedia?.type === 'video' && videoRef.current) {
      const vid = videoRef.current;
      vid.muted = isMuted;

      if (isPlaying) {
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setAutoplayBlocked(false);
            })
            .catch((err) => {
              console.warn('[Video Autoplay] Playback blocked by browser policy:', err);
              setAutoplayBlocked(true);
            });
        }
      } else {
        vid.pause();
      }
    }
  }, [currentMedia, currentIndex, isPlaying, isMuted]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying((prev) => !prev);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (videoRef.current) {
        videoRef.current.muted = nextMuted;
      }
      return nextMuted;
    });
  };

  const handleManualPlayFallback = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    setAutoplayBlocked(false);
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleActionClick = () => {
    if (currentMedia?.callToActionLink === '#catalog-section' || !currentMedia?.callToActionLink) {
      if (onShopNowClick) {
        onShopNowClick();
      } else {
        const el = document.getElementById('catalog-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (currentMedia.callToActionLink.startsWith('http')) {
      window.open(currentMedia.callToActionLink, '_blank', 'noopener,noreferrer');
    } else {
      const el = document.querySelector(currentMedia.callToActionLink);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading && promotions.length === 0) {
    return (
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-full aspect-square bg-white rounded-3xl p-4 shadow-xl border-2 border-orange-200/90 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#F36B16] animate-spin" />
        <span className="text-xs font-bold text-slate-500">Loading promotional media...</span>
      </div>
    );
  }

  if (promotions.length === 0) {
    return (
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-full aspect-square bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-6 shadow-xl border-2 border-orange-200 flex flex-col items-center justify-center text-center text-white space-y-3">
        <Sparkles className="w-12 h-12 text-amber-200" />
        <h3 className="text-xl font-black">FOOD &amp; LIFE GROCERY</h3>
        <p className="text-sm opacity-90">Freshness You Deserve • Daily Farm Deliveries</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md sm:max-w-lg lg:max-w-full">
      {/* Outer Card Container */}
      <div
        className="relative group bg-white rounded-3xl p-3 sm:p-4 shadow-xl border-2 border-orange-200/90 transition-transform duration-300 hover:scale-[1.01]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Visual Ambient Glow behind media player */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#F36B16]/25 via-amber-400/25 to-[#078B48]/25 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-300 -z-10" />

        {/* Media Player Container - Aspect Square matching previous banner */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 select-none shadow-inner">
          {/* Active Media Rendering */}
          {currentMedia?.type === 'video' ? (
            <video
              ref={videoRef}
              key={currentMedia.id}
              src={currentMedia.url}
              autoPlay
              playsInline
              loop={promotions.length === 1}
              muted={isMuted}
              onEnded={() => {
                if (promotions.length > 1) {
                  goToNext();
                }
              }}
              className="w-full h-full object-cover"
              poster={currentMedia.thumbnailUrl || '/logo.jpg'}
            />
          ) : (
            <img
              key={currentMedia?.id}
              src={currentMedia?.url}
              alt={currentMedia?.title || 'FOOD & LIFE Promotion'}
              className="w-full h-full object-cover transition-opacity duration-500"
              loading="eager"
            />
          )}

          {/* Top Overlay Strip: Badge & Media Type Indicator */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-20 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F36B16] text-white font-black text-[11px] sm:text-xs shadow-md tracking-wider uppercase backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>{currentMedia?.badge || 'SPECIAL PROMOTION'}</span>
            </span>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {currentMedia?.type === 'video' ? (
                <>
                  {/* Sound Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-xs cursor-pointer"
                    aria-label={isMuted ? 'Unmute video audio' : 'Mute video audio'}
                    title={isMuted ? 'Click to Unmute Sound' : 'Click to Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-orange-300" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>

                  {/* Play / Pause Toggle Button */}
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-xs cursor-pointer"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>
                </>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-black/50 text-white font-bold text-[10px] flex items-center gap-1 backdrop-blur-xs">
                  <ImageIcon className="w-3 h-3 text-orange-300" />
                  <span>Image Banner</span>
                </span>
              )}
            </div>
          </div>

          {/* Autoplay Blocked Fallback Overlay */}
          {autoplayBlocked && currentMedia?.type === 'video' && (
            <div
              onClick={handleManualPlayFallback}
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 cursor-pointer z-30 transition-all hover:bg-black/40"
            >
              <div className="w-14 h-14 rounded-full bg-[#F36B16] text-white flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 fill-current ml-0.5" />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/95 text-slate-900 font-bold text-xs shadow-md">
                Tap to Play Promotional Video
              </span>
            </div>
          )}

          {/* Previous / Next Manual Navigation Arrows */}
          {promotions.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-md"
                aria-label="Previous promotional slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer shadow-md"
                aria-label="Next promotional slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Bottom Dark Gradient Caption Bar */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 sm:p-5 pt-12 flex flex-col justify-end text-white z-10 pointer-events-none">
            <div className="space-y-1 pointer-events-auto">
              <h4 className="font-black text-sm sm:text-base text-white line-clamp-1 drop-shadow-sm">
                {currentMedia?.title}
              </h4>
              {currentMedia?.subtitle && (
                <p className="text-xs text-slate-200 line-clamp-2 font-medium drop-shadow-xs">
                  {currentMedia.subtitle}
                </p>
              )}
            </div>

            {/* Call To Action Button */}
            <div className="mt-3 flex items-center justify-between gap-3 pointer-events-auto">
              <button
                type="button"
                onClick={handleActionClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#078B48] hover:bg-[#06733b] text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{currentMedia?.callToActionText || 'SHOP NOW'}</span>
              </button>

              {/* Slide Counter */}
              {promotions.length > 1 && (
                <span className="text-[11px] font-bold text-white/80 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                  {currentIndex + 1} / {promotions.length}
                </span>
              )}
            </div>
          </div>

          {/* Top Slim Progress Bar */}
          {promotions.length > 1 && (
            <div className="absolute top-0 inset-x-0 h-1 bg-black/30 z-30">
              <div
                className="h-full bg-gradient-to-r from-[#F36B16] to-amber-400 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Micro-bar underneath: Slideshow Navigation Dots & Status */}
        <div className="mt-3 px-2 pt-1 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            {currentMedia?.type === 'video' ? (
              <Film className="w-4 h-4 text-[#F36B16]" />
            ) : (
              <ImageIcon className="w-4 h-4 text-[#078B48]" />
            )}
            <span className="font-bold text-slate-800">
              {currentMedia?.type === 'video' ? 'Promotional Video' : 'Featured Grocery Offer'}
            </span>
          </div>

          {/* Dots Indicator */}
          {promotions.length > 1 && (
            <div className="flex items-center gap-1.5">
              {promotions.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setProgress(0);
                  }}
                  className={`transition-all rounded-full ${
                    idx === currentIndex
                      ? 'w-5 h-2 bg-[#F36B16]'
                      : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trust & Guarantee Micro-Bar */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
        <div className="bg-white/80 border border-orange-100 rounded-xl p-2 shadow-2xs">
          <div className="font-extrabold text-[#F36B16]">100% Fresh</div>
          <div className="text-slate-500 font-medium">Daily Farm Stock</div>
        </div>
        <div className="bg-white/80 border border-orange-100 rounded-xl p-2 shadow-2xs">
          <div className="font-extrabold text-[#078B48]">45-90 Min</div>
          <div className="text-slate-500 font-medium">Doorstep Delivery</div>
        </div>
        <div className="bg-white/80 border border-orange-100 rounded-xl p-2 shadow-2xs">
          <div className="font-extrabold text-[#171717]">COD / Cash</div>
          <div className="text-slate-500 font-medium">Safe Local Pay</div>
        </div>
      </div>
    </div>
  );
};
