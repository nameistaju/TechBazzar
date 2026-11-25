import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import ordersApi from '@shared/api/ordersApi';
import Breadcrumbs from '@shared/ui/Breadcrumbs';

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const urlOrderNumber = searchParams.get('number') || '';
  const urlContact = searchParams.get('contact') || '';
  const urlToken = searchParams.get('token') || '';

  const [orderNumber, setOrderNumber] = useState(urlOrderNumber);
  const [contact, setContact] = useState(urlContact);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-search if URL parameters are provided
  useEffect(() => {
    if ((urlOrderNumber && urlContact) || urlToken) {
      handleLookup(urlOrderNumber, urlContact, urlToken);
    }
  }, [urlOrderNumber, urlContact, urlToken]);

  const handleLookup = async (num = orderNumber, cont = contact, token = urlToken) => {
    if (!token && (!num || !cont)) {
      setError('Please provide both Order Number and matching Email/Phone.');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    const res = await ordersApi.trackOrder({
      orderNumber: num ? num.trim() : undefined,
      contact: cont ? cont.trim() : undefined,
      trackingToken: token || undefined
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setOrder(res.data.order);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLookup();
  };

  const steps = ['Placed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];
  const currentStatusIndex = order ? steps.indexOf(order.status) : 0;

  return (
    <div className="bg-[#FAFAFA] min-h-screen pb-20">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: 'Shop', link: '/shop' },
            { label: 'Track Consignment' }
          ]}
        />

        {/* Heading */}
        <div className="text-center max-w-xl mx-auto my-8">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold block mb-1">
            Real-Time Logistics
          </span>
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A] mb-2">
            Track Order Status
          </h1>
          <p className="text-xs text-[#6B6B6B]">
            Look up your parcel dispatch milestone using your order reference code and the email or mobile number provided at checkout.
          </p>
        </div>

        {/* Lookup Card */}
        <div className="max-w-xl mx-auto bg-white border border-[#EAEAEA] rounded-[4px] p-6 sm:p-8 shadow-sm mb-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                Order Reference Number *
              </label>
              <input
                type="text"
                placeholder="e.g. TB-2026-89412"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                required
                className="w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border border-[#EAEAEA] focus:border-[#0A0A0A] focus:bg-white rounded-[4px] outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                Email Address or 10-Digit Mobile Phone *
              </label>
              <input
                type="text"
                placeholder="e.g. customer@example.com or 9876543210"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                className="w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border border-[#EAEAEA] focus:border-[#0A0A0A] focus:bg-white rounded-[4px] outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[4px] flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Searching Waybill...</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>Track Package</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Order Timeline Result */}
        {order && (
          <div className="max-w-3xl mx-auto bg-white border border-[#EAEAEA] rounded-[4px] p-6 sm:p-10 shadow-sm animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#F2F2F2] gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">
                  Consignment #{order.orderNumber}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-xl font-semibold text-[#0A0A0A]">
                    Status: <span className="text-[#FF4D00]">{order.status}</span>
                  </h2>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">
                  Booked On
                </span>
                <span className="text-xs font-medium text-[#0A0A0A]">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Step Progress Tracker */}
            <div className="py-8">
              <div className="relative flex justify-between">
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-[#EAEAEA] z-0" />
                <div 
                  className="absolute top-1/2 left-0 -translate-y-1/2 h-[2px] bg-[#FF4D00] z-0 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, (currentStatusIndex / (steps.length - 1)) * 100)}%`
                  }}
                />

                {steps.map((st, idx) => {
                  const isDone = idx <= currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;

                  return (
                    <div key={st} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-[#FF4D00] text-white ring-4 ring-[#FFF0EB]'
                            : 'bg-white border-2 border-[#EAEAEA] text-[#8A8A8A]'
                        }`}
                      >
                        {isDone ? <Check size={14} className="stroke-[3]" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider font-semibold mt-2 ${
                        isCurrent ? 'text-[#FF4D00]' : isDone ? 'text-[#0A0A0A]' : 'text-[#8A8A8A]'
                      }`}>
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Status History Log */}
            <div className="mt-6 pt-6 border-t border-[#F2F2F2]">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#0A0A0A] mb-4">
                Milestone History
              </h3>
              <div className="space-y-4">
                {(order.statusHistory || []).map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#FF4D00] mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="font-semibold text-[#0A0A0A] mr-2">{h.status}</span>
                      <span className="text-[#6B6B6B]">{h.note}</span>
                    </div>
                    <span className="text-[10px] text-[#8A8A8A] shrink-0 tabular-nums">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Package Contents */}
            <div className="mt-8 pt-6 border-t border-[#F2F2F2]">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-[#0A0A0A] mb-4">
                Package Contents ({order.items?.length || 0} items)
              </h3>
              <div className="divide-y divide-[#F2F2F2]">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="py-3 flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0A0A0A] truncate">{item.name}</p>
                      <p className="text-[11px] text-[#6B6B6B]">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
