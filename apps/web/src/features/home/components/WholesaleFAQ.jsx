import React, { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';

export default function WholesaleFAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: 'What is the Minimum Order Value (MOV) and MOQ per product?',
      a: 'The minimum order value for any wholesale order is ₹2,500. Individual product MOQs range from 2 units (laptops, premium smartphones) to 20 units (braided cables, silicone cases). You can mix and match products in one order as long as each product meets its individual MOQ and the cart reaches ₹2,500.'
    },
    {
      q: 'How does GST Input Tax Credit (ITC) work?',
      a: 'During checkout, enter your registered business name and 15-character GSTIN. A computerized GST Tax Invoice (with CGST/SGST for intra-state or IGST for inter-state) will be generated automatically and downloadable as PDF. All GST entries are filed monthly with the GSTN portal for seamless ITC claim.'
    },
    {
      q: 'Can I order samples before placing a 100+ unit order?',
      a: 'Yes! Shop owners can place a test order at the MOQ tier (e.g. 5–10 units) to verify packaging, barcode labels, and build quality. When you follow up with a 100+ unit order within 30 days, we credit back the price difference from your initial sample order.'
    },
    {
      q: 'What payment terms are available for verified businesses?',
      a: 'We support instant UPI, NEFT / RTGS / IMPS Bank Transfer with automated confirmation, Credit/Debit cards, and a 50% Advance Booking option where 50% is paid upon order placement and the 50% balance is cleared prior to pallet dispatch from our central distribution hub.'
    },
    {
      q: 'What is the standard delivery timeframe for bulk pallets?',
      a: 'Orders placed before 2:00 PM IST are packaged and palletized on the same business day. Delivery takes 24–48 hours for Metro cities and 3–5 business days for Tier 2/3 locations via insured express surface freight.'
    }
  ];

  return (
    <section className="py-16 bg-white border-t border-[#EAEAEA]">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold block mb-1">
              Clear Wholesale Policies
            </span>
            <h2 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-2">
              Everything you need to know about bulk purchasing, GST invoicing, and pallet dispatch.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-[#EAEAEA] rounded-[4px] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                    className="w-full text-left p-4 bg-[#FAFAFA] hover:bg-[#F2F2F2] flex items-center justify-between gap-4 transition-colors text-xs font-semibold text-[#0A0A0A]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={15}
                      className={`text-[#6B6B6B] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#FF4D00]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-4 bg-white text-xs text-[#6B6B6B] leading-relaxed border-t border-[#EAEAEA]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* WhatsApp Support Strip */}
          <div className="mt-8 p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-[#0A0A0A]">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MessageCircle size={16} />
              </div>
              <div>
                <span className="font-semibold block">Have special custom requirements or 500+ unit order?</span>
                <span className="text-[11px] text-[#6B6B6B]">Our B2B key account managers reply in minutes.</span>
              </div>
            </div>
            <a
              href="https://wa.me/919845012345?text=Hello%20TechBazaar%2C%20I%20want%20to%20discuss%20a%20wholesale%20order"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold uppercase tracking-wider transition-colors shrink-0"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
