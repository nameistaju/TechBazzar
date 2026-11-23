import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Truck, RotateCcw, Lock } from 'lucide-react';
import { categories } from '../../data/categories';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
      setSubscribed(false);
    }, 4000);
  };

  return (
    <footer className="bg-[#0A0A0A] text-white border-t border-[#222222]">
      {/* Newsletter Bar */}
      <div className="border-b border-[#222222] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-site mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-semibold block mb-2">
              Stay Connected
            </span>
            <h3 className="text-xl md:text-2xl font-light uppercase tracking-wide text-white">
              Subscribe for Private Releases & Member Drops
            </h3>
            <p className="text-xs text-[#8A8A8A] mt-2 max-w-md leading-relaxed">
              Curated hardware reviews, seasonal collections, and subscriber-only flash sales delivered fortnightly.
            </p>
          </div>

          <div>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-[#1A1A1A] border border-[#333333] focus:border-[#FF4D00] text-xs text-white placeholder-[#666666] px-4 py-3 rounded-[4px] outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-semibold uppercase tracking-wider px-6 py-3 rounded-[4px] transition-colors flex items-center gap-1.5 shrink-0"
              >
                {subscribed ? (
                  <>
                    <Check size={14} /> Subscribed
                  </>
                ) : (
                  <>
                    Subscribe <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
            <span className="text-[10px] text-[#666666] mt-2 block">
              Zero spam. Unsubscribe with one click anytime.
            </span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Manifesto */}
          <div className="col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <img 
                src="/logo.png" 
                alt="TechBazaar" 
                className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(255,77,0,0.3)] group-hover:scale-105 transition-transform" 
              />
              <div className="flex items-center gap-1">
                <span className="font-light tracking-[0.2em] text-xl uppercase text-white group-hover:text-[#FF4D00] transition-colors">
                  TECH<strong className="font-semibold">BAZAAR</strong>
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF4D00] -mt-1" />
              </div>
            </Link>
            <p className="text-xs text-[#8A8A8A] leading-relaxed max-w-sm mb-6">
              Curating modern electronics and tactical gadgets through an editorial architectural lens. 
              Precision acoustics, wearable computers, power essentials, and intelligent optics.
            </p>
            <div className="flex items-center gap-3 text-xs text-[#A0A0A0]">
              <span className="hover:text-white cursor-pointer transition-colors">Instagram</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Twitter / X</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">YouTube</span>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Categories
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8A8A8A]">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link to={`/shop?category=${cat.id}`} className="hover:text-[#FF4D00] transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8A8A8A]">
              <li><Link to="/cart" className="hover:text-[#FF4D00] transition-colors">Track Order</Link></li>
              <li><Link to="/shop" className="hover:text-[#FF4D00] transition-colors">Shipping & Delivery</Link></li>
              <li><Link to="/shop" className="hover:text-[#FF4D00] transition-colors">7-Day Easy Returns</Link></li>
              <li><Link to="/shop" className="hover:text-[#FF4D00] transition-colors">Warranty Claim</Link></li>
              <li><Link to="/shop" className="hover:text-[#FF4D00] transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          {/* About & Trust */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              TechBazaar
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8A8A8A]">
              <li><Link to="/shop?brand=all" className="hover:text-[#FF4D00] transition-colors">Authorized Brands</Link></li>
              <li><Link to="/shop?sale=true" className="hover:text-[#FF4D00] transition-colors">Flash Deals</Link></li>
              <li><Link to="/shop?plus=true" className="hover:text-[#FF4D00] transition-colors">TechBazaar Plus</Link></li>
              <li><Link to="/shop" className="hover:text-[#FF4D00] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/shop" className="hover:text-[#FF4D00] transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright and Payment Strip */}
        <div className="mt-16 pt-8 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#666666]">
          <div>
            © {new Date().getFullYear()} TechBazaar Electronics Private Limited. All Rights Reserved.
          </div>
          <div className="flex items-center gap-4 text-[#8A8A8A]">
            <span>UPI / GPay</span>
            <span>•</span>
            <span>RuPay & Visa</span>
            <span>•</span>
            <span>Net Banking</span>
            <span>•</span>
            <span>Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
