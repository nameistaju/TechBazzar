import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import useAuthStore from '@shared/store/authStore';
import { useStore } from '@app/providers/StoreContext';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalTab, setAuthModalTab: _setAuthModalTab, login, register, pendingGuestOrder } = useAuthStore();
  const { cart, wishlist } = useStore();

  const [tab, setTab] = useState(authModalTab || 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailInputRef = useRef(null);

  useEffect(() => {
    setTab(authModalTab);
    setErrors({});
  }, [authModalTab]);

  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
      setName('');
      setPassword('');
      setErrors({});
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthModalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  // Password strength calculator
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, text: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, text: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, text: 'Good', color: 'bg-emerald-500' };
    return { score: 4, text: 'Strong', color: 'bg-emerald-600' };
  };

  const strength = getPasswordStrength(password);

  const validateField = (field, val) => {
    const newErrors = { ...errors };
    if (field === 'email') {
      if (!val || !val.includes('@') || !val.includes('.')) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        delete newErrors.email;
      }
    }
    if (field === 'password') {
      if (!val || val.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else {
        delete newErrors.password;
      }
    }
    if (field === 'name' && tab === 'register') {
      if (!val || val.trim().length < 2) {
        newErrors.name = 'Full name must be at least 2 characters';
      } else {
        delete newErrors.name;
      }
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentErrors = {};

    if (!email || !email.includes('@') || !email.includes('.')) {
      currentErrors.email = 'Please enter a valid email address';
    }
    if (!password || password.length < 6) {
      currentErrors.password = 'Password must be at least 6 characters';
    }
    if (tab === 'register' && (!name || name.trim().length < 2)) {
      currentErrors.name = 'Please enter your full name';
    }

    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (tab === 'login') {
        const localCartItems = cart.map(i => ({ product: i, quantity: i.quantity }));
        const localWishlistIds = wishlist.map(w => w.id);
        const res = await login(email, password, localCartItems, localWishlistIds);
        if (!res.success) {
          setErrors({ form: res.error || 'Invalid credentials' });
        }
      } else {
        const res = await register(name, email, password, pendingGuestOrder);
        if (!res.success) {
          setErrors({ form: res.error || 'Registration failed' });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={closeAuthModal} />

      {/* Modal Dialog / Mobile Sheet */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative bg-white w-full max-w-md rounded-[4px] border border-[#EAEAEA] shadow-2xl overflow-hidden z-10 transition-transform duration-300 transform scale-100"
      >
        {/* Header / Tabs */}
        <div className="flex items-center justify-between border-b border-[#EAEAEA] px-6 pt-5 pb-4">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrors({}); }}
              className={`text-xs font-semibold uppercase tracking-wider pb-1 transition-all ${
                tab === 'login'
                  ? 'text-[#0A0A0A] border-b-2 border-[#0A0A0A]'
                  : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrors({}); }}
              className={`text-xs font-semibold uppercase tracking-wider pb-1 transition-all ${
                tab === 'register'
                  ? 'text-[#0A0A0A] border-b-2 border-[#0A0A0A]'
                  : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
              }`}
            >
              Create Account
            </button>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1 rounded-full text-[#8A8A8A] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="mb-2 flex items-center gap-3">
            <img src="/logo.png" alt="TechBazaar" className="w-10 h-10 object-contain drop-shadow-sm shrink-0" />
            <div>
              <h2 id="auth-modal-title" className="text-base font-medium tracking-tight text-[#0A0A0A]">
                {tab === 'login' ? 'Welcome Back to TechBazaar' : 'Join the TechBazaar Collective'}
              </h2>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                {tab === 'login' 
                  ? 'Sign in to access your order history, saved addresses, and synced bag.'
                  : 'Create an account to streamline checkout and track delivery timelines.'}
              </p>
            </div>
          </div>

          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[4px] leading-relaxed">
              {errors.form}
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => validateField('name', e.target.value)}
                placeholder="Aarav Sharma"
                required
                className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                  errors.name ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                }`}
              />
              {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
              Email Address
            </label>
            <input
              ref={emailInputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validateField('email', e.target.value)}
              placeholder="you@domain.com"
              autoComplete="email"
              required
              className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                errors.email ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
              }`}
            />
            {errors.email && <p className="text-[10px] text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Password
              </label>
              {tab === 'register' && password && (
                <span className="text-[10px] text-[#8A8A8A]">
                  Strength: <span className="font-semibold text-[#0A0A0A]">{strength.text}</span>
                </span>
              )}
            </div>
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={(e) => validateField('password', e.target.value)}
                placeholder="••••••••"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
                className={`w-full h-11 px-3.5 pr-10 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                  errors.password ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#0A0A0A]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}

            {/* Password strength bar */}
            {tab === 'register' && password && (
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 rounded-full ${
                      strength.score >= level ? strength.color : 'bg-[#EAEAEA]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Guest Order Claim Notice */}
          {pendingGuestOrder && tab === 'register' && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/80 border border-amber-200/80 rounded-[4px] text-xs text-amber-900">
              <ShieldCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                Creating an account now will link Order <strong>#{pendingGuestOrder}</strong> to your profile immediately.
              </span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#0A0A0A] hover:bg-accent text-accent-contrast text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In to Account' : 'Create Account'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

          {/* Guest Checkout Note */}
          {tab === 'register' && (
            <div className="pt-3 border-t border-[#F2F2F2] text-[11px] text-[#8A8A8A] text-center">
              <span>
                Guest-first: You can also shop & place orders without an account.
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
