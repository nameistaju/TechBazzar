import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const heroSlides = [
  {
    tagline: null,
    title: 'ACOUSTIC PURITY',
    subtitle: 'Sennheiser Momentum 4 Wireless Audiophile ANC',
    description: 'Engineered with 42mm audiophile transducers and 60-hour marathon battery reserves.',
    price: '₹27,990',
    originalPrice: '₹34,990',
    link: '/product/sennheiser-momentum-4-wireless',
    image: '/images/image-149.png',
    category: 'headphones'
  },
  {
    tagline: 'AEROSPACE GRADE TITANIUM',
    title: 'WRIST ARCHITECTURE',
    subtitle: 'Apple Watch Ultra Dual-Frequency GPS',
    description: 'Precision sapphire crystal, 2000 nits brightness, and high-endurance trail band.',
    price: '₹79,900',
    originalPrice: '₹89,900',
    link: '/product/apple-watch-ultra-titanium-ocean',
    image: '/images/image-150.webp',
    category: 'smartwatches'
  },
  {
    tagline: 'TIMELESS VINTAGE VINYL',
    title: 'ANALOG PRESENCE',
    subtitle: 'Marshall Acton III Bluetooth Home Audio',
    description: 'Re-engineered outward-angled tweeters producing room-filling acoustic realism.',
    price: '₹27,999',
    originalPrice: '₹31,999',
    link: '/product/marshall-acton-iii-bluetooth-speaker',
    image: '/images/image-101.png',
    category: 'speakers'
  }
];

export default function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto advance slides every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = heroSlides[activeSlide];

  return (
    <section className="relative bg-gradient-to-b from-[#F2F2F2] via-[#F7F7F7] to-white pt-12 pb-24 md:pt-16 md:pb-32 overflow-hidden border-b border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Editorial Copy */}
          <div className="lg:col-span-7 space-y-6">
            {slide.tagline && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[#EAEAEA] rounded-[2px] text-[10px] font-semibold tracking-[0.2em] uppercase text-[#6B6B6B]">
                <Sparkles size={11} className="text-accent-text" />
                {slide.tagline}
              </div>
            )}

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-light tracking-[0.05em] sm:tracking-[0.12em] uppercase text-[#0A0A0A] leading-[1.1] break-words">
                {slide.title}
              </h1>
              <p className="text-base sm:text-xl font-normal text-[#2A2A2A] tracking-wide">
                {slide.subtitle}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-[#6B6B6B] max-w-lg leading-relaxed">
              {slide.description}
            </p>

            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-2xl sm:text-3xl font-semibold text-[#0A0A0A] tabular-nums">
                {slide.price}
              </span>
              <span className="text-sm text-[#8A8A8A] line-through tabular-nums">
                {slide.originalPrice}
              </span>
              <span className="text-xs font-semibold text-accent-text uppercase tracking-wider">
                Limited Time Offer
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
              <Link
                to={slide.link}
                className="bg-[#0A0A0A] text-accent-contrast text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-[4px] hover:bg-accent transition-all flex items-center justify-center gap-2 group shadow-sm text-center"
              >
                Explore Product <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to={`/shop?category=${slide.category}`}
                className="border border-[#D4D4D4] bg-white text-[#0A0A0A] text-xs font-semibold uppercase tracking-widest px-8 py-4 rounded-[4px] hover:border-[#0A0A0A] hover:bg-[#F7F7F7] transition-all text-center justify-center flex items-center"
              >
                View Category
              </Link>
            </div>

            {/* Slider Dots */}
            <div className="flex items-center gap-2.5 pt-6">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 transition-all duration-300 rounded-full ${
                    activeSlide === idx 
                      ? 'w-8 bg-accent' 
                      : 'w-2 bg-[#D4D4D4] hover:bg-[#8A8A8A]'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Floating Product Visual with Subtle Parallax Float */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="relative w-72 sm:w-96 lg:w-[420px] aspect-square flex items-center justify-center">
              
              {/* Radial backdrop halo */}
              <div className="absolute inset-0 bg-white/70 rounded-full filter blur-2xl transform scale-90 -z-0" />
              
              <div className="relative z-10 w-full h-full p-6 sm:p-10 flex items-center justify-center animate-[pulse_4s_ease-in-out_infinite]">
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.title}
                  width={420}
                  height={420}
                  className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.12)] transition-all duration-700 animate-in fade-in zoom-in-95 hover:scale-105"
                />
              </div>

              {/* Floating Specification Tag (positioned cleanly below image to avoid overlap) */}
              <div className="absolute -bottom-3 left-2 sm:left-4 z-20 bg-white/95 backdrop-blur-md border border-[#EAEAEA] p-2.5 sm:p-3 rounded-[4px] shadow-lg text-left hidden md:block animate-in slide-in-from-bottom-2 duration-500">
                <span className="text-[9px] uppercase tracking-widest text-accent-text font-bold block">
                  Official Verification
                </span>
                <span className="text-xs font-semibold text-[#0A0A0A] block mt-0.5">
                  100% Brand Sealed
                </span>
                <span className="text-[10px] text-[#6B6B6B]">
                  Dispatched within 24 Hours
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Wave Bottom Curve */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-white hero-wave-mask" />
    </section>
  );
}
