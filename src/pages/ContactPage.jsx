import React from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { Link } from 'react-router-dom';

export default function ContactPage() {
  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'B2B Contact & Support' }]} />

        {/* Header */}
        <div className="py-6 border-b border-[#EAEAEA] mb-10">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold block mb-1">
            Direct Trade Support
          </span>
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A]">
            B2B Trade & Distribution Desk
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1.5 max-w-xl">
            Direct access to dedicated account executives, freight dispatch coordinators, and billing specialists.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Direct Contact Channels */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* WhatsApp Direct Action Box */}
            <div className="p-6 bg-emerald-50/60 border border-emerald-200 rounded-[4px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <MessageCircle size={15} /> Instant WhatsApp Support
                </span>
                <p className="text-xs text-emerald-950">
                  Chat directly with our B2B procurement managers for immediate stock checks, quotes, and sample requests.
                </p>
              </div>
              <a
                href="https://wa.me/919845012345?text=Hello%20TechBazaar%2C%20I%20have%20a%20wholesale%20procurement%20inquiry"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider px-6 py-3 rounded transition-colors shrink-0 shadow-sm"
              >
                Chat on WhatsApp
              </a>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 border border-[#EAEAEA] rounded-[4px] bg-[#FAFAFA] space-y-2">
                <div className="w-8 h-8 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center text-[#FF4D00]">
                  <Phone size={15} />
                </div>
                <div className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">B2B Sales Desk</div>
                <div className="text-xs font-mono font-medium text-[#0A0A0A]">+91 98450 12345</div>
                <div className="text-[11px] text-[#6B6B6B]">Mon–Sat, 9:00 AM – 7:30 PM IST</div>
              </div>

              <div className="p-5 border border-[#EAEAEA] rounded-[4px] bg-[#FAFAFA] space-y-2">
                <div className="w-8 h-8 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center text-[#FF4D00]">
                  <Mail size={15} />
                </div>
                <div className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">Official Wholesale RFQ</div>
                <div className="text-xs font-mono font-medium text-[#0A0A0A]">b2b@techbazaar.com</div>
                <div className="text-[11px] text-[#6B6B6B]">Average reply time: under 4 hours</div>
              </div>

              <div className="p-5 border border-[#EAEAEA] rounded-[4px] bg-[#FAFAFA] space-y-2">
                <div className="w-8 h-8 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center text-[#FF4D00]">
                  <Clock size={15} />
                </div>
                <div className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">Freight & Dispatch Desk</div>
                <div className="text-xs font-mono font-medium text-[#0A0A0A]">logistics@techbazaar.com</div>
                <div className="text-[11px] text-[#6B6B6B]">Same-day dispatch before 2:00 PM IST</div>
              </div>

              <div className="p-5 border border-[#EAEAEA] rounded-[4px] bg-[#FAFAFA] space-y-2">
                <div className="w-8 h-8 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center text-[#FF4D00]">
                  <Building size={15} />
                </div>
                <div className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">Tax & Billing Division</div>
                <div className="text-xs font-mono font-medium text-[#0A0A0A]">accounts@techbazaar.com</div>
                <div className="text-[11px] text-[#6B6B6B]">GSTIN: 29ABCDE1234F1Z5</div>
              </div>
            </div>

            {/* Warehouse Location */}
            <div className="p-5 border border-[#EAEAEA] rounded-[4px] bg-white space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
                <MapPin size={15} className="text-[#FF4D00]" /> Central Warehousing & Fulfilment Hub
              </div>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                TechBazaar Logistics Park, Plot 42/B, Peenya Industrial Area, Phase 2, Bangalore, Karnataka — 560058, India.
              </p>
              <div className="text-[11px] text-[#8A8A8A]">
                Dock Hours: 8:00 AM – 8:00 PM IST for commercial carrier pick-ups (BlueDart Apex, Delhivery Freight, TCI Express).
              </div>
            </div>

          </div>

          {/* Right Column: Quick Links & FAQ helper */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#0A0A0A]">
                Fast Self-Service Tools
              </h2>
              <div className="space-y-2 text-xs">
                <Link
                  to="/quick-order"
                  className="p-3 bg-white border border-[#EAEAEA] rounded flex items-center justify-between hover:border-[#0A0A0A] transition-colors"
                >
                  <span className="font-medium text-[#0A0A0A]">Bulk SKU Order Matrix</span>
                  <ArrowRight size={13} className="text-[#FF4D00]" />
                </Link>
                <Link
                  to="/quote"
                  className="p-3 bg-white border border-[#EAEAEA] rounded flex items-center justify-between hover:border-[#0A0A0A] transition-colors"
                >
                  <span className="font-medium text-[#0A0A0A]">Request Factory Quote / RFQ</span>
                  <ArrowRight size={13} className="text-[#FF4D00]" />
                </Link>
                <Link
                  to="/track"
                  className="p-3 bg-white border border-[#EAEAEA] rounded flex items-center justify-between hover:border-[#0A0A0A] transition-colors"
                >
                  <span className="font-medium text-[#0A0A0A]">Track Freight Consignment</span>
                  <ArrowRight size={13} className="text-[#FF4D00]" />
                </Link>
              </div>
            </div>

            <div className="p-6 border border-[#EAEAEA] rounded-[4px] bg-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0A0A] uppercase tracking-wider">
                <ShieldCheck size={16} className="text-emerald-600" /> Genuine Hardware Assurance
              </div>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                All devices distributed through TechBazaar carry standard 1-year brand warranty, official BIS certifications, and manufacturer seals intact.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
