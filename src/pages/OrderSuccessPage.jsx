import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Package, 
  ArrowRight, 
  Clock, 
  Truck, 
  ShieldCheck, 
  Mail, 
  Check, 
  Lock,
  Loader2
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useStore } from '../context/StoreContext';
import ordersApi from '../api/ordersApi';

export default function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, register } = useAuthStore();
  const { wishlist } = useStore();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [password, setPassword] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [dismissCard, setDismissCard] = useState(() => {
    return sessionStorage.getItem(`techbazaar_dismiss_claim_${orderNumber}`) === 'true';
  });

  // Confetti on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF4D00', '#0A0A0A', '#10B981', '#F59E0B']
      });
    } catch {}
  }, []);

  // If order details not in location state, fetch via order tracking endpoint
  useEffect(() => {
    let isMounted = true;
    async function fetchOrder() {
      if (order || !orderNumber) return;
      setLoading(true);
      const res = await ordersApi.trackOrder({ orderNumber });
      if (isMounted && res.data?.order) {
        setOrder(res.data.order);
      }
      setLoading(false);
    }
    fetchOrder();
    return () => { isMounted = false; };
  }, [order, orderNumber]);

  const handleClaimAccount = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) return;

    setClaiming(true);
    const guestEmail = order?.customer?.email || location.state?.customerEmail;
    const guestName = order?.customer?.name || 'Customer';

    const res = await register(guestName, guestEmail, password, orderNumber);
    setClaiming(false);

    if (res.success) {
      setClaimSuccess(true);
      sessionStorage.setItem(`techbazaar_dismiss_claim_${orderNumber}`, 'true');
    }
  };

  const handleDismiss = () => {
    setDismissCard(true);
    sessionStorage.setItem(`techbazaar_dismiss_claim_${orderNumber}`, 'true');
  };

  // Delivery date estimation (3 days from now)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const customerEmail = order?.customer?.email || 'your email';

  return (
    <div className="bg-[#FAFAFA] min-h-screen py-12 md:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        
        {/* Main Confirmation Card */}
        <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 sm:p-10 shadow-sm text-center relative overflow-hidden">
          {/* Top orange accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF4D00]" />

          {/* Animated Green Checkmark */}
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={36} className="animate-scaleIn" />
          </div>

          <span className="text-[10px] uppercase tracking-[0.25em] text-[#FF4D00] font-bold block mb-1">
            Order Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-wider text-[#0A0A0A] mb-2">
            Thank You for Your Order
          </h1>
          <p className="text-xs text-[#6B6B6B] max-w-md mx-auto mb-6">
            We've sent order confirmation & receipt to <strong className="text-[#0A0A0A]">{customerEmail}</strong>.
          </p>

          {/* Order reference banner */}
          <div className="bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left mb-8">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">
                Order Reference
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-[#0A0A0A]">
                #{orderNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">
                Estimated Delivery
              </span>
              <span className="text-xs font-semibold text-[#0A0A0A] flex items-center gap-1.5">
                <Truck size={14} className="text-emerald-600" /> by {formattedDelivery}
              </span>
            </div>
          </div>

          {/* Status Timeline Preview */}
          <div className="border-t border-[#F2F2F2] pt-6 mb-8 text-left">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#0A0A0A] block mb-4">
              Fulfillment Timeline
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center mx-auto text-[10px] font-bold">
                  ✓
                </div>
                <span className="text-[11px] font-semibold text-[#0A0A0A] block">Placed</span>
                <span className="text-[9px] text-[#8A8A8A]">Confirmed</span>
              </div>
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-[#EAEAEA] text-[#6B6B6B] flex items-center justify-center mx-auto text-[10px]">
                  2
                </div>
                <span className="text-[11px] text-[#6B6B6B] block">Packed</span>
                <span className="text-[9px] text-[#8A8A8A]">In warehouse</span>
              </div>
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-[#EAEAEA] text-[#6B6B6B] flex items-center justify-center mx-auto text-[10px]">
                  3
                </div>
                <span className="text-[11px] text-[#6B6B6B] block">Shipped</span>
                <span className="text-[9px] text-[#8A8A8A]">Air express</span>
              </div>
              <div className="space-y-1">
                <div className="w-6 h-6 rounded-full bg-[#EAEAEA] text-[#6B6B6B] flex items-center justify-center mx-auto text-[10px]">
                  4
                </div>
                <span className="text-[11px] text-[#6B6B6B] block">Delivered</span>
                <span className="text-[9px] text-[#8A8A8A]">At door</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/track?number=${orderNumber}&contact=${encodeURIComponent(customerEmail)}`}
              className="py-3 px-6 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center justify-center gap-2"
            >
              Track Order Live <ArrowRight size={13} />
            </Link>
            <Link
              to="/shop"
              className="py-3 px-6 bg-white border border-[#EAEAEA] hover:border-[#0A0A0A] text-[#0A0A0A] text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Soft Guest Account Claim Card (Only shown to guests after value delivery) */}
        {!isAuthenticated && !dismissCard && (
          <div className="mt-8 bg-white border border-amber-200/90 rounded-[4px] p-6 shadow-sm relative animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Lock size={16} />
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#0A0A0A]">
                  Save your details for next time. Just add a password.
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-1 mb-4 leading-relaxed">
                  We'll create an account for <strong className="text-[#0A0A0A]">{customerEmail}</strong>, link this order, and save your bag and wishlist preferences automatically.
                </p>

                {claimSuccess ? (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-[4px] border border-emerald-200 flex items-center gap-2">
                    <Check size={14} /> Account created successfully! Order #{orderNumber} has been linked to your profile.
                  </div>
                ) : (
                  <form onSubmit={handleClaimAccount} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        placeholder="Create a password (min 6 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="flex-1 h-11 px-3.5 text-xs bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] focus:outline-none focus:border-[#0A0A0A]"
                      />
                      <button
                        type="submit"
                        disabled={claiming}
                        className="h-11 px-6 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {claiming ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Create Account</span>
                        )}
                      </button>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleDismiss}
                        className="text-[11px] text-[#8A8A8A] hover:text-[#0A0A0A] transition-colors"
                      >
                        No thanks, keep as guest
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
