import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronLeft, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { products } from '../../data/products';
import ProductCard from '../common/ProductCard';

export default function FlashSaleSection() {
  const flashProducts = products.filter(p => p.isFlashSale);
  const carouselRef = useRef(null);

  // Live countdown timer (calculating till midnight or rolling 14h window)
  const [timeLeft, setTimeLeft] = useState({
    hours: 11,
    minutes: 42,
    seconds: 18
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scroll = (direction) => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollAmount = clientWidth * 0.75;
      carouselRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-16 bg-[#F7F7F7] border-y border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Countdown */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold mb-1">
              <Zap size={14} className="fill-current" /> Limited Window Deals
            </div>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
              Flash Sale Event
            </h2>
          </div>

          {/* Countdown Clock Box */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white border border-[#EAEAEA] px-4 py-2.5 rounded-[4px] shadow-sm">
              <Clock size={16} className="text-[#FF4D00]" />
              <span className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wider mr-1">
                Ends In:
              </span>
              <div className="flex items-center gap-1 font-mono font-semibold text-xs sm:text-sm text-[#0A0A0A] tabular-nums">
                <span className="bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded-[2px]">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded-[2px]">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="bg-[#FF4D00] text-white px-1.5 py-0.5 rounded-[2px]">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="w-9 h-9 rounded-[4px] border border-[#EAEAEA] bg-white flex items-center justify-center text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="w-9 h-9 rounded-[4px] border border-[#EAEAEA] bg-white flex items-center justify-center text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Row */}
        <div 
          ref={carouselRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none scroll-smooth"
        >
          {flashProducts.map((product) => (
            <div 
              key={product.id}
              className="w-64 sm:w-72 shrink-0"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Bottom Link */}
        <div className="mt-8 text-center">
          <Link
            to="/shop?sale=true"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#0A0A0A] hover:text-[#FF4D00] transition-colors group"
          >
            Explore All Flash Sale Offers <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
