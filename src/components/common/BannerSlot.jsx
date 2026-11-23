import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Tag } from 'lucide-react';

export default function BannerSlot({ slot, className = '' }) {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const trackedImpressions = useRef(new Set());
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Fetch banners for this slot
  useEffect(() => {
    let isMounted = true;
    async function loadBanners() {
      try {
        const res = await fetch(`/api/banners?slot=${encodeURIComponent(slot)}`);
        const json = await res.json();
        if (isMounted && json.data) {
          setBanners(json.data);
        }
      } catch (err) {
        console.error(`Failed to load banners for slot "${slot}":`, err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadBanners();
    return () => { isMounted = false; };
  }, [slot]);

  // Track impressions when banner is 50% visible in viewport
  useEffect(() => {
    if (!banners.length || !containerRef.current) return;
    const currentBanner = banners[currentIndex];
    if (!currentBanner || trackedImpressions.current.has(currentBanner.id)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!trackedImpressions.current.has(currentBanner.id)) {
              trackedImpressions.current.add(currentBanner.id);
              fetch(`/api/banners/${currentBanner.id}/impression`, { method: 'POST' }).catch(() => {});
            }
          }
        });
      },
      { threshold: [0.5] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [banners, currentIndex]);

  // Auto-advance carousel every 5s if 2+ banners, paused on hover/touch
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timerRef.current);
  }, [banners.length, isPaused]);

  // Handle banner click + analytics
  const handleClick = (banner, e) => {
    // Record click stat non-blocking
    fetch(`/api/banners/${banner.id}/click`, { method: 'POST' }).catch(() => {});

    if (!banner.link_type || banner.link_type === 'none') return;

    if (banner.link_type === 'external') {
      if (banner.new_tab) {
        window.open(banner.link_target, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = banner.link_target;
      }
      return;
    }

    if (banner.link_type === 'coupon') {
      if (banner.link_target) {
        navigator.clipboard.writeText(banner.link_target);
        alert(`Coupon code "${banner.link_target}" copied to clipboard! Apply it at checkout for instant wholesale discounts.`);
      }
      return;
    }

    if (banner.link_type === 'product') {
      navigate(`/product/${banner.link_target}`);
      return;
    }

    if (banner.link_type === 'category') {
      navigate(`/shop?category=${encodeURIComponent(banner.link_target)}`);
      return;
    }

    if (banner.link_type === 'brand') {
      navigate(`/shop?brand=${encodeURIComponent(banner.link_target)}`);
      return;
    }

    if (banner.link_type === 'page') {
      navigate(banner.link_target.startsWith('/') ? banner.link_target : `/${banner.link_target}`);
      return;
    }
  };

  // Touch Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      // Swiped left -> next
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    } else if (diff < -50) {
      // Swiped right -> prev
      setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // If no banners and not loading, render NOTHING (zero layout shift, disappears completely)
  if (!loading && (!banners || banners.length === 0)) {
    return null;
  }

  // Skeleton while loading
  if (loading) {
    return (
      <div className={`w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 animate-pulse aspect-[3/1] max-md:aspect-[4/3] ${className}`} />
    );
  }

  const currentBanner = banners[currentIndex];
  const isClickable = currentBanner.link_type && currentBanner.link_type !== 'none';

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-md border border-neutral-200/80 bg-neutral-50 shadow-sm group select-none ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Media Frame with locked aspect ratios: 3:1 Desktop, 4:3 Mobile */}
      <div
        className={`w-full aspect-[3/1] max-md:aspect-[4/3] relative overflow-hidden ${
          isClickable ? 'cursor-pointer' : ''
        }`}
        onClick={(e) => isClickable && handleClick(currentBanner, e)}
      >
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet={currentBanner.mobile_image || currentBanner.desktop_image}
          />
          <img
            src={currentBanner.desktop_image}
            alt={currentBanner.alt || currentBanner.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.01]"
            style={{
              objectPosition: `${currentBanner.focal_x ?? 50}% ${currentBanner.focal_y ?? 50}%`
            }}
          />
        </picture>

        {/* Optional Label Pill (Ad, Offer, Bulk Deal, etc.) */}
        {currentBanner.label && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider uppercase bg-black/80 backdrop-blur-sm text-white shadow-sm border border-white/10">
              <Tag size={10} className="text-[#FF4D00]" />
              {currentBanner.label}
            </span>
          </div>
        )}

        {/* Link indicator overlay icon on hover */}
        {isClickable && (
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="p-1.5 rounded-full bg-white/90 text-neutral-800 shadow-sm flex items-center justify-center">
              <ExternalLink size={12} />
            </span>
          </div>
        )}
      </div>

      {/* Carousel Controls (if 2+ banners) */}
      {banners.length > 1 && (
        <>
          {/* Previous Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
            }}
            aria-label="Previous banner"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 text-neutral-800 hover:bg-white hover:text-black flex items-center justify-center shadow-md border border-neutral-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Next Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev + 1) % banners.length);
            }}
            aria-label="Next banner"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 text-neutral-800 hover:bg-white hover:text-black flex items-center justify-center shadow-md border border-neutral-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight size={16} />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 px-2 py-1 rounded-full bg-black/40 backdrop-blur-xs">
            {banners.map((b, idx) => (
              <button
                key={b.id || idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to banner ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex
                    ? 'w-4 h-1.5 bg-[#FF4D00]'
                    : 'w-1.5 h-1.5 bg-white/70 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
