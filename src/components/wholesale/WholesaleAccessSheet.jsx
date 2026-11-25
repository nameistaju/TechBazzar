// src/components/wholesale/WholesaleAccessSheet.jsx
// Friendly side sheet for wholesale login & B2B application (never blocks retail browsing)

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  CreditCard, 
  Truck
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useStore } from '../../context/StoreContext';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function WholesaleAccessSheet({ isOpen, onClose, initialTab = 'apply' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, login } = useAuthStore();
  const { setModeDirect, showToast } = useStore();

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Application Form State
  const [applyForm, setApplyForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    gstin: '',
    city: '',
    businessType: 'shop',
    expectedMonthlyVolume: '₹1,00,000 - ₹5,00,000',
    password: ''
  });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await login(loginEmail, loginPassword);
      setLoginLoading(false);

      if (!res.success) {
        setLoginError(res.error || 'Invalid credentials');
        return;
      }

      const loggedUser = res.user;
      if (loggedUser.buyerType === 'wholesale' && loggedUser.wholesaleStatus === 'approved') {
        setModeDirect('wholesale');
        showToast(`Welcome to Wholesale Mode, ${loggedUser.businessName || loggedUser.name}!`);
        onClose();
      } else if (loggedUser.wholesaleStatus === 'pending') {
        setLoginError('Your wholesale application is currently pending admin approval.');
      } else if (loggedUser.wholesaleStatus === 'rejected') {
        setLoginError('Your wholesale application was not approved. Please contact wholesale support.');
      } else {
        // Retail user trying wholesale login
        setLoginError('This account does not have wholesale access yet. Please submit an application below.');
        setActiveTab('apply');
        setApplyForm(prev => ({
          ...prev,
          email: loggedUser.email,
          contactName: loggedUser.name
        }));
      }
    } catch (err) {
      setLoginLoading(false);
      setLoginError(err.message || 'Login failed. Please try again.');
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError('');

    // Client validation
    if (applyForm.gstin && !GSTIN_REGEX.test(applyForm.gstin.trim().toUpperCase())) {
      setApplyError('Please enter a valid 15-character GSTIN (e.g. 29ABCDE1234F1Z5) or leave it blank.');
      return;
    }

    setApplyLoading(true);

    try {
      const res = await fetch('/api/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applyForm)
      });
      const data = await res.json();
      setApplyLoading(false);

      if (!res.ok || data.error) {
        setApplyError(data.error || 'Application failed. Please verify your details.');
        return;
      }

      setApplySuccess(data.data);

      if (data.data.isAutoApproved) {
        setModeDirect('wholesale');
        showToast('Wholesale account approved and activated!');
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1800);
      }
    } catch (err) {
      setApplyLoading(false);
      setApplyError(err.message || 'Network error. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="p-6 border-b border-[#EAEAEA]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#FF4D00]" />
                <h2 className="text-xs font-mono uppercase font-bold tracking-widest text-[#0A0A0A]">
                  Wholesale Procurement Desk
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7] rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Wholesale pricing, 3-tier bulk brackets, GST input tax credit, and credit terms are reserved for verified business accounts.
            </p>

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 mt-4 bg-[#F7F7F7] p-1 border border-[#EAEAEA]">
              <button
                type="button"
                onClick={() => { setActiveTab('apply'); setLoginError(''); }}
                className={`py-2 text-xs font-mono uppercase font-semibold transition-all ${
                  activeTab === 'apply'
                    ? 'bg-white text-[#0A0A0A] shadow-sm border-b-2 border-[#FF4D00]'
                    : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Apply for Wholesale
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setApplyError(''); }}
                className={`py-2 text-xs font-mono uppercase font-semibold transition-all ${
                  activeTab === 'login'
                    ? 'bg-white text-[#0A0A0A] shadow-sm border-b-2 border-[#FF4D00]'
                    : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                }`}
              >
                Wholesale Sign In
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* TAB 1: APPLY FOR WHOLESALE */}
            {activeTab === 'apply' && (
              <div>
                {applySuccess ? (
                  <div className="space-y-4 py-8 text-center animate-in fade-in">
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
                      <CheckCircle2 size={30} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-[#0A0A0A]">
                        {applySuccess.isAutoApproved ? 'Wholesale Account Activated!' : 'Application Received'}
                      </h3>
                      <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed px-4">
                        {applySuccess.message}
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={onClose}
                        className="w-full bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-mono uppercase font-bold py-3 transition-colors"
                      >
                        Continue Browsing
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApplySubmit} className="space-y-4">
                    {applyError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{applyError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                        Business / Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Apex Electronics Retails Pvt Ltd"
                        value={applyForm.businessName}
                        onChange={(e) => setApplyForm({ ...applyForm, businessName: e.target.value })}
                        className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={applyForm.contactName}
                          onChange={(e) => setApplyForm({ ...applyForm, contactName: e.target.value })}
                          className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile"
                          value={applyForm.phone}
                          onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                          className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                          Official Email *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="procurement@company.com"
                          value={applyForm.email}
                          onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                          className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                          City / District *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Mumbai, Bengaluru"
                          value={applyForm.city}
                          onChange={(e) => setApplyForm({ ...applyForm, city: e.target.value })}
                          className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-mono uppercase text-[#6B6B6B]">
                          GSTIN (Optional — Boosts Approval)
                        </label>
                        <span className="text-[10px] text-[#888]">15 characters</span>
                      </div>
                      <input
                        type="text"
                        placeholder="29ABCDE1234F1Z5"
                        maxLength={15}
                        value={applyForm.gstin}
                        onChange={(e) => setApplyForm({ ...applyForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 text-xs font-mono uppercase border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none tracking-wider"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                          Business Type
                        </label>
                        <select
                          value={applyForm.businessType}
                          onChange={(e) => setApplyForm({ ...applyForm, businessType: e.target.value })}
                          className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                        >
                          <option value="shop">Retail Store / Shop</option>
                          <option value="reseller">Online Reseller</option>
                          <option value="corporate">Corporate / Institutional</option>
                          <option value="distributor">Regional Distributor</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                          Monthly Volume
                        </label>
                        <select
                          value={applyForm.expectedMonthlyVolume}
                          onChange={(e) => setApplyForm({ ...applyForm, expectedMonthlyVolume: e.target.value })}
                          className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                        >
                          <option value="Under ₹1,00,000">Under ₹1,00,000</option>
                          <option value="₹1,00,000 - ₹5,00,000">₹1,00,000 - ₹5,00,000</option>
                          <option value="₹5,00,000 - ₹20,00,000">₹5,00,000 - ₹20,00,000</option>
                          <option value="₹20,00,000+">₹20,00,000+ (Master)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                        Create Account Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="At least 6 characters"
                        value={applyForm.password}
                        onChange={(e) => setApplyForm({ ...applyForm, password: e.target.value })}
                        className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={applyLoading}
                      className="w-full bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-mono uppercase font-bold py-3 transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                      {applyLoading ? 'Submitting Application...' : 'Submit Wholesale Application'}
                      <ArrowRight size={14} />
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: SIGN IN TO WHOLESALE */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                    Registered Business Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="procurement@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#6B6B6B] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#EAEAEA] bg-[#FAFAFA] focus:bg-white focus:border-[#0A0A0A] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-mono uppercase font-bold py-3 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {loginLoading ? 'Signing In...' : 'Sign In to Wholesale'}
                  <ArrowRight size={14} />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('apply')}
                    className="text-xs text-[#6B6B6B] hover:text-[#FF4D00] transition-colors"
                  >
                    Don't have a wholesale account? Apply for access →
                  </button>
                </div>
              </form>
            )}

            {/* Wholesale Buyer Perks Strip */}
            <div className="border-t border-[#EAEAEA] pt-5 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8A8A8A]">
                Wholesale Account Advantages
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#444]">
                <div className="flex items-center gap-2 p-2 bg-[#F9F9F9] border border-[#EAEAEA]">
                  <Percent size={13} className="text-[#FF4D00] shrink-0" />
                  <span>Up to 40% Tier Savings</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#F9F9F9] border border-[#EAEAEA]">
                  <CreditCard size={13} className="text-[#FF4D00] shrink-0" />
                  <span>Net 15 / 30 Credit Lines</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#F9F9F9] border border-[#EAEAEA]">
                  <ShieldCheck size={13} className="text-[#FF4D00] shrink-0" />
                  <span>B2B GST Tax Invoices</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#F9F9F9] border border-[#EAEAEA]">
                  <Truck size={13} className="text-[#FF4D00] shrink-0" />
                  <span>Pallet Freight Logistics</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Note */}
          <div className="p-4 bg-[#F7F7F7] border-t border-[#EAEAEA] text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] font-mono uppercase"
            >
              Continue in Retail Mode
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
