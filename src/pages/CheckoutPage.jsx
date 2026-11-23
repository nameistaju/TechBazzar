import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  CreditCard, 
  Truck, 
  MapPin, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  ArrowLeft, 
  QrCode, 
  Banknote, 
  Building2, 
  Package,
  AlertCircle,
  Loader2,
  Lock,
  Plus
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import useAuthStore from '../store/authStore';
import ordersApi from '../api/ordersApi';
import addressesApi from '../api/addressesApi';
import Breadcrumbs from '../components/common/Breadcrumbs';

export default function CheckoutPage() {
  const { cart, cartItems, cartSubtotal, shippingFee, cartTotal, minOrderValue, meetsMinOrderValue, clearCart } = useStore();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const navigate = useNavigate();

  // Multi-step: 1 = Contact & Address, 2 = Payment Method, 3 = Order Review
  const [currentStep, setCurrentStep] = useState(1);

  // Form State (autofill friendly)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    businessName: '',
    gstin: '',
    email: user?.email || '',
    phone: '',
    addressLine: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    sameAsBilling: true,
    billingAddressLine: '',
    billingCity: '',
    billingState: 'Karnataka',
    billingPincode: ''
  });

  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const advanceAmount = Math.round(cartTotal / 2);
  const balanceAmount = cartTotal - advanceAmount;

  // Saved addresses for logged-in users
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  // Fetch saved addresses if logged in
  useEffect(() => {
    if (isAuthenticated) {
      addressesApi.getAddresses().then((res) => {
        if (res.data?.addresses?.length > 0) {
          setSavedAddresses(res.data.addresses);
          const defaultAddr = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0];
          setSelectedAddressId(defaultAddr.id);
          setFormData(prev => ({
            ...prev,
            name: defaultAddr.name || prev.name,
            phone: defaultAddr.phone || prev.phone,
            addressLine: defaultAddr.addressLine,
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.pincode
          }));
        }
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'upi', 'cod'
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockError, setStockError] = useState(null);
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  // Validation
  const validateField = (field, val) => {
    const errs = { ...errors };
    if (field === 'name' && (!val || val.trim().length < 2)) {
      errs.name = 'Full name is required (min 2 characters)';
    } else if (field === 'name') {
      delete errs.name;
    }

    if (field === 'email' && (!val || !val.includes('@') || !val.includes('.'))) {
      errs.email = 'Valid email is required for order receipts';
    } else if (field === 'email') {
      delete errs.email;
    }

    if (field === 'phone' && (!val || val.replace(/\D/g, '').length < 10)) {
      errs.phone = 'Valid 10-digit mobile number required for dispatch updates';
    } else if (field === 'phone') {
      delete errs.phone;
    }

    if (field === 'addressLine' && (!val || val.trim().length < 5)) {
      errs.addressLine = 'Detailed street address is required';
    } else if (field === 'addressLine') {
      delete errs.addressLine;
    }

    if (field === 'city' && (!val || val.trim().length < 2)) {
      errs.city = 'City is required';
    } else if (field === 'city') {
      delete errs.city;
    }

    if (field === 'pincode' && (!val || !/^\d{6}$/.test(val.trim()))) {
      errs.pincode = 'Valid 6-digit Indian PIN code required';
    } else if (field === 'pincode') {
      delete errs.pincode;
    }

    setErrors(errs);
  };

  const validateAddressStep = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errs.email = 'Valid email is required';
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) errs.phone = 'Valid 10-digit phone number required';
    if (!formData.addressLine.trim()) errs.addressLine = 'Street address is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode.trim())) errs.pincode = 'Valid 6-digit PIN code required';
    if (formData.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin.trim().toUpperCase())) {
      errs.gstin = 'Invalid GSTIN format. Expected 15-character code (e.g. 29ABCDE1234F1Z5)';
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setIsAddingNewAddress(false);
    setFormData(prev => ({
      ...prev,
      name: addr.name,
      phone: addr.phone,
      addressLine: addr.addressLine,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode
    }));
  };

  const handleNextToPayment = (e) => {
    e.preventDefault();
    if (!meetsMinOrderValue) {
      setStockError(`Minimum Wholesale Order Value is ₹${minOrderValue.toLocaleString('en-IN')}. Your cart subtotal is ₹${cartSubtotal.toLocaleString('en-IN')}.`);
      return;
    }
    if (validateAddressStep()) {
      setCurrentStep(2);
      window.scrollTo(0, 0);
    }
  };

  const handleNextToReview = (e) => {
    e.preventDefault();
    setCurrentStep(3);
    window.scrollTo(0, 0);
  };

  // Submit Order to Backend
  const handlePlaceOrder = async () => {
    if (isSubmitting) return; // Prevent double submit
    setIsSubmitting(true);
    setStockError(null);

    const payload = {
      customer: {
        name: formData.name.trim(),
        businessName: formData.businessName.trim() || undefined,
        gstin: formData.gstin.trim().toUpperCase() || undefined,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim()
      },
      shippingAddress: {
        addressLine: formData.addressLine.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim()
      },
      billingAddress: formData.sameAsBilling ? {
        addressLine: formData.addressLine.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim()
      } : {
        addressLine: formData.billingAddressLine.trim() || formData.addressLine.trim(),
        city: formData.billingCity.trim() || formData.city.trim(),
        state: formData.billingState.trim() || formData.state.trim(),
        pincode: formData.billingPincode.trim() || formData.pincode.trim()
      },
      items: cart.map((i) => ({
        productId: i.id,
        quantity: i.quantity
      })),
      paymentMethod,
      isAdvancePayment
    };

    const res = await ordersApi.createOrder(payload);

    if (res.error) {
      setIsSubmitting(false);
      // Stay on Review step and highlight exact failing item
      setStockError(res.error);
      window.scrollTo(0, 0);
      return;
    }

    // Success: clear cart and navigate to order success page
    clearCart();
    navigate(`/order-success/${res.data.order.orderNumber}`, {
      state: {
        order: res.data.order,
        customerEmail: formData.email.trim()
      }
    });
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-light uppercase tracking-widest text-[#0A0A0A] mb-2">
          Your Shopping Bag is Empty
        </h2>
        <p className="text-xs text-[#6B6B6B] max-w-sm mb-6">
          Add items to your cart before proceeding to checkout.
        </p>
        <Link
          to="/shop"
          className="bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-6 py-3.5 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
        >
          Explore Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] min-h-screen pb-20">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Shop', link: '/shop' },
            { label: 'Shopping Bag', link: '/cart' },
            { label: 'Express Checkout' }
          ]}
        />

        {/* Guest sign-in hint banner (non-blocking) */}
        {!isAuthenticated && (
          <div className="my-4 p-3 bg-white border border-[#EAEAEA] rounded-[4px] flex items-center justify-between text-xs">
            <span className="text-[#6B6B6B]">
              Already registered with TechBazaar?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="text-[#FF4D00] font-semibold hover:underline"
              >
                Sign in for faster checkout
              </button>
            </span>
            <span className="hidden sm:inline text-[11px] text-[#8A8A8A]">
              Guest checkout active — no login required
            </span>
          </div>
        )}

        {/* Step Progress Bar (Thin, Minimal) */}
        <div className="my-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#EAEAEA] z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#0A0A0A] z-0 transition-all duration-300" 
              style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
            />

            {[
              { num: 1, label: 'Contact & Delivery' },
              { num: 2, label: 'Payment Method' },
              { num: 3, label: 'Review & Confirm' }
            ].map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <div key={step.num} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isDone
                        ? 'bg-[#0A0A0A] text-white'
                        : isCurrent
                        ? 'bg-[#FF4D00] text-white ring-4 ring-[#FFF0EB]'
                        : 'bg-white border-2 border-[#EAEAEA] text-[#8A8A8A]'
                    }`}
                  >
                    {isDone ? <Check size={14} className="stroke-[2.5]" /> : step.num}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold mt-1.5 ${
                    isCurrent ? 'text-[#0A0A0A]' : 'text-[#8A8A8A]'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Error Banner if validation failed */}
        {stockError && (
          <div className="mb-6 max-w-4xl mx-auto p-4 bg-red-50 border border-red-200 rounded-[4px] text-xs text-red-700 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Inventory Alert</strong>
              <span>{stockError}</span>
            </div>
          </div>
        )}

        {/* Main Grid: Forms Left (7 cols), Sticky Summary Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Multi-Step Forms */}
          <div className="lg:col-span-7 bg-white border border-[#EAEAEA] rounded-[4px] p-6 sm:p-8 shadow-sm">
            
            {/* STEP 1: Contact & Address */}
            {currentStep === 1 && (
              <form onSubmit={handleNextToPayment} className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1">
                    1. Shipping Information
                  </h2>
                  <p className="text-xs text-[#6B6B6B]">
                    Enter your delivery destination. All orders are packed in sealed tamper-evident boxes.
                  </p>
                </div>

                {/* Logged in saved addresses selector */}
                {isAuthenticated && savedAddresses.length > 0 && !isAddingNewAddress && (
                  <div className="space-y-3 mb-6">
                    <span className="text-xs uppercase tracking-wider font-semibold text-[#0A0A0A] block">
                      Saved Shipping Addresses
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`p-3.5 border rounded-[4px] cursor-pointer transition-all ${
                            selectedAddressId === addr.id
                              ? 'border-[#0A0A0A] bg-[#FAFAFA] ring-1 ring-[#0A0A0A]'
                              : 'border-[#EAEAEA] hover:border-[#BDBDBD]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#0A0A0A]">{addr.name}</span>
                            {addr.isDefault && (
                              <span className="text-[9px] uppercase tracking-wider bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded-[2px]">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6B6B6B] truncate">{addr.addressLine}</p>
                          <p className="text-xs text-[#6B6B6B]">{addr.city}, {addr.pincode}</p>
                          <p className="text-[11px] text-[#8A8A8A] mt-1">{addr.phone}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewAddress(true);
                        setSelectedAddressId(null);
                        setFormData({
                          name: user?.name || '',
                          email: user?.email || '',
                          phone: '',
                          addressLine: '',
                          city: '',
                          state: 'Karnataka',
                          pincode: ''
                        });
                      }}
                      className="text-xs font-semibold text-[#FF4D00] hover:underline flex items-center gap-1 pt-1"
                    >
                      <Plus size={14} /> Add new address
                    </button>
                  </div>
                )}

                {/* Form Inputs (Autofill Friendly) */}
                {(!isAuthenticated || isAddingNewAddress || savedAddresses.length === 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder="Aarav Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        onBlur={(e) => validateField('name', e.target.value)}
                        required
                        className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                          errors.name ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                        }`}
                      />
                      {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* Wholesale Business Details */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        Business / Trade Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Apex Electronics LLP"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] focus:outline-none focus:bg-white focus:border-[#0A0A0A] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        GSTIN (For 18% Input Tax Credit)
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="29ABCDE1234F1Z5"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        className={`w-full h-11 px-3.5 text-xs font-mono uppercase bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                          errors.gstin ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                        }`}
                      />
                      {errors.gstin && <p className="text-[10px] text-red-500 mt-1">{errors.gstin}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="aarav@domain.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onBlur={(e) => validateField('email', e.target.value)}
                        required
                        className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                          errors.email ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                        }`}
                      />
                      {errors.email && <p className="text-[10px] text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        Mobile Phone *
                      </label>
                      <input
                        type="tel"
                        name="tel"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        onBlur={(e) => validateField('phone', e.target.value)}
                        required
                        className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                          errors.phone ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                        }`}
                      />
                      {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        Flat / House No. & Street Address *
                      </label>
                      <input
                        type="text"
                        name="street-address"
                        autoComplete="street-address"
                        placeholder="42, Brigade Road, Indiranagar"
                        value={formData.addressLine}
                        onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                        onBlur={(e) => validateField('addressLine', e.target.value)}
                        required
                        className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                          errors.addressLine ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                        }`}
                      />
                      {errors.addressLine && <p className="text-[10px] text-red-500 mt-1">{errors.addressLine}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        City *
                      </label>
                      <input
                        type="text"
                        name="address-level2"
                        autoComplete="address-level2"
                        placeholder="Bengaluru"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        onBlur={(e) => validateField('city', e.target.value)}
                        required
                        className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                          errors.city ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                        }`}
                      />
                      {errors.city && <p className="text-[10px] text-red-500 mt-1">{errors.city}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5">
                        Postal PIN Code *
                      </label>
                      <input
                        type="text"
                        name="postal-code"
                        autoComplete="postal-code"
                        maxLength={6}
                        placeholder="560038"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                        onBlur={(e) => validateField('pincode', e.target.value)}
                        required
                        className={`w-full h-11 px-3.5 text-xs bg-[#FAFAFA] border rounded-[4px] focus:outline-none focus:bg-white transition-colors ${
                          errors.pincode ? 'border-red-400 bg-red-50/20' : 'border-[#EAEAEA] focus:border-[#0A0A0A]'
                        }`}
                      />
                      {errors.pincode && <p className="text-[10px] text-red-500 mt-1">{errors.pincode}</p>}
                    </div>

                    {/* Same as billing toggle */}
                    <div className="sm:col-span-2 pt-2">
                      <label className="flex items-center gap-2.5 text-xs text-[#0A0A0A] font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.sameAsBilling}
                          onChange={(e) => setFormData({ ...formData, sameAsBilling: e.target.checked })}
                          className="accent-[#FF4D00]"
                        />
                        <span>Billing address is same as delivery destination</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#F2F2F2] flex justify-end">
                  <button
                    type="submit"
                    className="py-3.5 px-8 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    Continue to Payment <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Payment Method */}
            {currentStep === 2 && (
              <form onSubmit={handleNextToReview} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1">
                      2. Payment Method
                    </h2>
                    <p className="text-xs text-[#6B6B6B]">
                      Transactions are processed over encrypted 256-bit SSL tunnels.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-[#8A8A8A] hover:text-[#0A0A0A] flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft size={13} /> Edit Address
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'card', title: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay, Corporate Amex', icon: CreditCard },
                    { id: 'upi', title: 'UPI Instant QR / VPA', desc: 'Google Pay, PhonePe, Paytm, CRED Business', icon: QrCode },
                    { id: 'bank_transfer', title: 'Direct Bank Transfer (NEFT / RTGS / IMPS)', desc: 'HDFC Bank • A/C: 50200098765432 • IFSC: HDFC0001234', icon: Building2 },
                    { id: 'cod', title: 'Cash / Pay on Delivery', desc: 'Available for wholesale orders under ₹50,000', icon: Banknote }
                  ].map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;

                    return (
                      <div key={method.id} className="space-y-2">
                        <label
                          className={`flex items-start gap-4 p-4 border rounded-[4px] cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#0A0A0A] bg-[#FAFAFA] ring-1 ring-[#0A0A0A]'
                              : 'border-[#EAEAEA] hover:border-[#BDBDBD]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            checked={isSelected}
                            onChange={() => setPaymentMethod(method.id)}
                            className="mt-1 accent-[#FF4D00]"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#0A0A0A]">{method.title}</span>
                              {method.id === 'bank_transfer' && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">
                                  RECOMMENDED FOR BULK
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#6B6B6B] mt-0.5">{method.desc}</p>
                          </div>
                          <Icon size={18} className="text-[#6B6B6B]" />
                        </label>

                        {/* Direct Bank Transfer Details Card */}
                        {isSelected && method.id === 'bank_transfer' && (
                          <div className="p-4 bg-white border border-[#EAEAEA] rounded-[4px] text-xs space-y-2 ml-4 animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-[#F2F2F2] pb-2">
                              <span className="font-semibold text-[#0A0A0A] uppercase tracking-wider text-[10px]">
                                Beneficiary Bank Details
                              </span>
                              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                                CURRENT A/C
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#6B6B6B]">
                              <div>
                                <span className="text-[10px] uppercase text-[#8A8A8A] block">Account Name</span>
                                <strong className="text-[#0A0A0A]">TechBazaar Electronics Pvt Ltd</strong>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-[#8A8A8A] block">Bank & Branch</span>
                                <strong className="text-[#0A0A0A]">HDFC Bank, Peenya Ind. Area</strong>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-[#8A8A8A] block">Account Number</span>
                                <strong className="text-[#0A0A0A] font-mono text-sm">50200098765432</strong>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-[#8A8A8A] block">IFSC Code</span>
                                <strong className="text-[#0A0A0A] font-mono text-sm">HDFC0001234</strong>
                              </div>
                            </div>
                            <p className="text-[11px] text-[#8A8A8A] pt-1 border-t border-[#F2F2F2]">
                              * Bank transfer instructions and auto-generated Tax Invoice will be sent instantly to <strong>{formData.email}</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Wholesale 50% Advance Booking Card */}
                <div className="p-4 bg-orange-50/60 border border-orange-200/80 rounded-[4px]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAdvancePayment}
                      onChange={(e) => setIsAdvancePayment(e.target.checked)}
                      className="mt-1 accent-[#FF4D00] w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
                          Opt for 50% Advance Booking
                        </span>
                        <span className="bg-[#FF4D00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          B2B CREDIT
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                        Pay only <strong>₹{advanceAmount.toLocaleString('en-IN')}</strong> now to confirm order and lock stock. The remaining balance of <strong>₹{balanceAmount.toLocaleString('en-IN')}</strong> is payable upon dispatch notification before carrier handover.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-4 border-t border-[#F2F2F2] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] font-semibold uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="py-3.5 px-8 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    Review Order <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Order Review & Place Order */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-1">
                      3. Review & Confirm
                    </h2>
                    <p className="text-xs text-[#6B6B6B]">
                      Final inspection before inventory reservation and dispatch generation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-[#8A8A8A] hover:text-[#0A0A0A] flex items-center gap-1 font-medium"
                  >
                    <ArrowLeft size={13} /> Change Payment
                  </button>
                </div>

                {/* Shipping & Payment Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-[#8A8A8A]">
                        Delivery & Business Details
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="text-[#FF4D00] font-semibold text-[10px] uppercase hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="font-semibold text-[#0A0A0A]">{formData.name}</p>
                    {formData.businessName && (
                      <p className="text-xs font-semibold text-[#0A0A0A] mt-0.5">{formData.businessName}</p>
                    )}
                    {formData.gstin && (
                      <p className="text-[11px] font-mono text-[#0A0A0A] bg-white px-1.5 py-0.5 rounded border border-[#EAEAEA] inline-block mt-1">
                        GSTIN: {formData.gstin}
                      </p>
                    )}
                    <p className="text-[#6B6B6B] mt-1">{formData.addressLine}</p>
                    <p className="text-[#6B6B6B]">{formData.city}, {formData.pincode}</p>
                    <p className="text-[#8A8A8A] mt-1">Phone: {formData.phone}</p>
                  </div>

                  <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-[#8A8A8A]">
                        Payment Structure
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="text-[#FF4D00] font-semibold text-[10px] uppercase hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="font-semibold text-[#0A0A0A] uppercase tracking-wider">
                      {paymentMethod === 'bank_transfer'
                        ? 'Direct Bank Transfer (NEFT/RTGS)'
                        : paymentMethod === 'cod'
                        ? 'Cash on Delivery'
                        : paymentMethod === 'upi'
                        ? 'UPI Instant Pay'
                        : 'Credit / Debit Card'}
                    </p>
                    {isAdvancePayment ? (
                      <div className="mt-2 pt-2 border-t border-[#EAEAEA] space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-[#FF4D00]">
                          <span>50% Advance Today:</span>
                          <span className="tabular-nums">₹{advanceAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-[#6B6B6B]">
                          <span>Balance on Dispatch:</span>
                          <span className="tabular-nums">₹{balanceAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700 font-medium mt-1">
                        Full Order Payment: ₹{cartTotal.toLocaleString('en-IN')}
                      </p>
                    )}
                    <p className="text-[#8A8A8A] text-[11px] mt-1">
                      Tax Invoice sent to: <strong className="text-[#0A0A0A]">{formData.email}</strong>
                    </p>
                  </div>
                </div>

                {/* Items snapshot */}
                <div className="divide-y divide-[#F2F2F2]">
                  {cart.map((item) => (
                    <div key={item.id} className="py-3 flex items-center gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0A0A0A] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#6B6B6B]">
                          Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')} / unit
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#F2F2F2] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] font-semibold uppercase tracking-wider"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="py-4 px-10 bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Reserving Wholesale Stock...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>
                          {isAdvancePayment
                            ? `Confirm & Pay 50% Advance (₹${advanceAmount.toLocaleString('en-IN')})`
                            : `Confirm Wholesale Order (₹${cartTotal.toLocaleString('en-IN')})`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Order Summary */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F2F2F2] pb-3 mb-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-[#0A0A0A]">
                  Wholesale Summary ({cart.reduce((s, i) => s + i.quantity, 0)} units)
                </span>
                <Link to="/cart" className="text-[11px] text-[#FF4D00] hover:underline font-medium">
                  Modify Bag
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Wholesale Subtotal (excl. GST)</span>
                  <span className="tabular-nums">₹{Math.round(cartSubtotal / 1.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>GST (18% ITC Eligible)</span>
                  <span className="tabular-nums">₹{Math.round(cartSubtotal - (cartSubtotal / 1.18)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#6B6B6B]">
                  <span>Pallet Freight / Express Logistics</span>
                  <span className="tabular-nums">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 font-semibold uppercase text-[10px]">FREE FREIGHT</span>
                    ) : (
                      `₹${shippingFee}`
                    )}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#F2F2F2] flex justify-between items-baseline font-bold text-sm text-[#0A0A0A]">
                  <span>Total Order Value</span>
                  <span className="text-base text-[#0A0A0A] tabular-nums">
                    ₹{cartTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* 50% Advance Breakdown */}
                {isAdvancePayment && (
                  <div className="mt-3 pt-3 border-t border-dashed border-[#EAEAEA] space-y-1.5 bg-[#FAFAFA] p-2.5 rounded-[4px]">
                    <div className="flex justify-between text-xs font-bold text-[#FF4D00]">
                      <span>50% Advance Due Today</span>
                      <span className="tabular-nums">₹{advanceAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#6B6B6B]">
                      <span>Balance Due on Dispatch</span>
                      <span className="tabular-nums">₹{balanceAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Guarantees */}
              <div className="mt-6 pt-4 border-t border-[#F2F2F2] space-y-2 text-[11px] text-[#6B6B6B]">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#0A0A0A]" />
                  <span>100% Genuine Sealed Electronics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-[#0A0A0A]" />
                  <span>Free Express Air Shipping over ₹999</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
