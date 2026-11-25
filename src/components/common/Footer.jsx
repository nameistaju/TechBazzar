import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Truck, RotateCcw, Lock } from 'lucide-react';
import { categories } from '../../data/categories';
import { useBranding } from '../../context/BrandingContext';

export default function Footer() {
  const { branding } = useBranding();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subError, setSubError] = useState('');

  const brandName = branding.brand_name || 'TechBazaar';
  const brandPart1 = branding.brand_name_part1 || (brandName.length > 4 ? brandName.slice(0, 4).toUpperCase() : brandName.toUpperCase());
  const brandPart2 = branding.brand_name_part2 || (brandName.length > 4 ? brandName.slice(4).toUpperCase() : '');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubError('');
    if (!email || !email.includes('@')) return;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setSubError(json.error || 'Failed to subscribe.');
        return;
      }
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 4000);
    } catch {
      setSubError('Network error. Please try again.');
    }
  };

  return (
    <footer className="bg-[#0A0A0A] text-white border-t border-[#222222]">
      {/* Newsletter Bar */}
      <div className="border-b border-[#222222] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-site mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-pop font-semibold block mb-2">
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
                className="flex-1 bg-[#1A1A1A] border border-[#333333] focus:border-pop text-xs text-white placeholder-[#666666] px-4 py-3 rounded-[4px] outline-none transition-colors"
              />
              <button
                type="submit"
                className="bg-pop hover:opacity-90 text-white text-xs font-semibold uppercase tracking-wider px-6 py-3 rounded-[4px] transition-colors flex items-center gap-1.5 shrink-0"
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
            {subError && (
              <span className="text-[11px] text-red-400 mt-1.5 block">{subError}</span>
            )}
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
                src={branding.logo_dark || branding.logo_mark || '/logo.png'} 
                alt={brandName} 
                className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" 
              />
              <div className="flex items-center gap-1">
                {branding.use_split_name ? (
                  <span className="font-light tracking-[0.2em] text-xl uppercase text-white group-hover:text-pop transition-colors">
                    {brandPart1}<strong className="font-semibold">{brandPart2}</strong>
                  </span>
                ) : (
                  <span className="font-semibold tracking-[0.15em] text-xl uppercase text-white group-hover:text-pop transition-colors">
                    {brandName}
                  </span>
                )}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-pop -mt-1" />
              </div>
            </Link>
            <p className="text-xs text-[#8A8A8A] leading-relaxed max-w-sm mb-6">
              {branding.tagline || 'Curating modern electronics and tactical gadgets through an editorial architectural lens.'}
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
                  <Link to={`/shop?category=${cat.id}`} className="hover:text-pop transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* B2B Services */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Wholesale Hub
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8A8A8A]">
              <li><Link to="/quick-order" className="hover:text-pop transition-colors">Quick Order Matrix</Link></li>
              <li><Link to="/quote" className="hover:text-pop transition-colors">Request Custom Quote</Link></li>
              <li><Link to="/track" className="hover:text-pop transition-colors">Track Pallet Consignment</Link></li>
              <li><Link to="/contact" className="hover:text-pop transition-colors">Logistics & Warehouse</Link></li>
              <li><Link to="/shop?flag=flashSale" className="hover:text-pop transition-colors">Bulk Clearance Lots</Link></li>
            </ul>
          </div>

          {/* About & Trust */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              {brandName} B2B
            </h4>
            <ul className="space-y-2.5 text-xs text-[#8A8A8A]">
              <li><Link to="/contact" className="hover:text-pop transition-colors">Contact Wholesale Desk</Link></li>
              <li><Link to="/shop" className="hover:text-pop transition-colors">Authorized OEM Brands</Link></li>
              <li><Link to="/admin" className="hover:text-pop transition-colors">Back-Office Portal</Link></li>
              <li><Link to="/quote" className="hover:text-pop transition-colors">GST Input Tax Credit Guide</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright and Payment Strip */}
        <div className="mt-16 pt-8 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#666666]">
          <div>
            © {new Date().getFullYear()} {brandName} Electronics Private Limited. All Rights Reserved.
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
