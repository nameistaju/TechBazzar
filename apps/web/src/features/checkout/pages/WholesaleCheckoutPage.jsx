import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  CreditCard, 
  FileText, 
  AlertCircle,
  Loader2,
  Sparkles,
  ReceiptText
} from 'lucide-react';
import { useStore } from '@app/providers/StoreContext';
import { formatMoney } from '@shared/utils/formatters';
import useAuthStore from '@shared/store/authStore';
import addressesApi from '@shared/api/addressesApi';
import Breadcrumbs from '@shared/ui/Breadcrumbs';

export default function WholesaleCheckoutPage() {
  const { 
    cartItems, 
    cartSubtotal, 
    shippingFee, 
    cartTotal, 
    taxableValue, 
    totalTax, 
    cartSavings, 
    cartSavingsVsRetail, 
    groupDiscountTotal, 
    volumeDiscountAmount, 
    volumeDiscountPercent, 
    appliedCoupon,
    minOrderValue, 
    meetsMinOrderValue, 
    hasMoqViolations, 
    clearCart, 
    openWholesaleSheet 
  } = useStore();

  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Credit and Wholesale Status State
  const [creditData, setCreditData] = useState(null);
  const [_loadingCredit, setLoadingCredit] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    businessName: user?.businessName || '',
    contactName: user?.name || '',
    gstin: user?.gstin || '',
    email: user?.email || '',
    phone: user?.phone || '',
    addressLine: '',
    city: user?.city || '',
    state: 'Karnataka',
    pincode: '',
    sameAsBilling: true,
    billingAddressLine: '',
    billingCity: '',
    billingState: 'Karnataka',
    billingPincode: '',
    poNumber: '',
    deliveryNotes: ''
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isAddingNewAddress, _setIsAddingNewAddress] = useState(false);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer'); // 'bank_transfer', 'credit_terms', 'advance_50', 'card'
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch buyer's credit status
  useEffect(() => {
    if (isAuthenticated && user?.wholesaleStatus === 'approved') {
      setLoadingCredit(true);
      fetch('/api/wholesale/credit', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('techbazaar_token')}` }
      })
        .then(r => r.json())
        .then(res => {
          if (res.data) setCreditData(res.data);
        })
        .catch(() => {})
        .finally(() => setLoadingCredit(false));
    }
  }, [isAuthenticated, user]);

  // Fetch saved addresses
  useEffect(() => {
    if (isAuthenticated) {
      addressesApi.getAddresses().then((res) => {
        if (res.data?.addresses?.length > 0) {
          setSavedAddresses(res.data.addresses);
          const defaultAddr = res.data.addresses.find(a => a.isDefault) || res.data.addresses[0];
          setSelectedAddressId(defaultAddr.id);
          setFormData(prev => ({
            ...prev,
            businessName: user?.businessName || prev.businessName,
            contactName: defaultAddr.name || user?.name || prev.contactName,
            phone: defaultAddr.phone || user?.phone || prev.phone,
            addressLine: defaultAddr.addressLine,
            city: defaultAddr.city,
            state: defaultAddr.state || 'Karnataka',
            pincode: defaultAddr.pincode
          }));
        }
      }).catch(() => {});
    }
  }, [isAuthenticated, user]);

  // Guard: if not authenticated or not approved wholesale buyer
  if (!isAuthenticated || user?.wholesaleStatus !== 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-full flex items-center justify-center text-[#FF4D00]">
          <Building2 size={32} />
        </div>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-[#0A0A0A] mb-3">
          Wholesale Account Required
        </h1>
        <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-md mx-auto mb-8">
          The B2B procurement checkout is reserved exclusively for verified wholesale and distribution partners with approved credit lines and GSTIN records.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openWholesaleSheet('login')}
            className="w-full sm:w-auto px-6 py-3 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] hover:bg-[#FF4D00] transition-colors"
          >
            Sign In to Wholesale
          </button>
          <button
            type="button"
            onClick={() => openWholesaleSheet('apply')}
            className="w-full sm:w-auto px-6 py-3 border border-[#EAEAEA] text-[#0A0A0A] text-xs font-semibold uppercase tracking-widest rounded-[4px] hover:bg-[#FAFAFA] transition-colors"
          >
            Apply for Business Account
          </button>
        </div>
      </div>
    );
  }

  // Guard: empty wholesale cart
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ReceiptText size={40} className="mx-auto text-[#A1A1AA] mb-4" />
        <h1 className="text-xl font-bold uppercase tracking-wider text-[#0A0A0A] mb-2">
          Your Wholesale Bag is Empty
        </h1>
        <p className="text-xs text-[#6B6B6B] mb-6">
          Add bulk items or upload a SKU order sheet to proceed with B2B purchase order generation.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] hover:bg-[#FF4D00] transition-colors"
        >
          Browse Wholesale Catalog <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const validate = () => {
    const errs = {};
    if (!formData.businessName?.trim()) errs.businessName = 'Business name is required';
    if (!formData.contactName?.trim()) errs.contactName = 'Contact person name is required';
    if (!formData.phone || formData.phone.trim().length < 10) errs.phone = 'Valid 10-digit phone number is required';
    if (!formData.email?.includes('@')) errs.email = 'Valid business email is required';
    if (!formData.addressLine?.trim()) errs.addressLine = 'Warehouse / delivery address is required';
    if (!formData.city?.trim()) errs.city = 'City is required';
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode.trim())) errs.pincode = 'Valid 6-digit postal PIN code is required';

    if (!formData.sameAsBilling) {
      if (!formData.billingAddressLine?.trim()) errs.billingAddressLine = 'Registered billing address is required';
      if (!formData.billingCity?.trim()) errs.billingCity = 'Billing city is required';
      if (!formData.billingPincode || !/^\d{6}$/.test(formData.billingPincode.trim())) errs.billingPincode = 'Valid 6-digit billing PIN is required';
    }

    if (!meetsMinOrderValue) {
      errs.mov = `Minimum wholesale order value of ${formatMoney(minOrderValue)} required. Current taxable subtotal: ${formatMoney(cartSubtotal)}`;
    }

    if (hasMoqViolations) {
      errs.moq = 'Some items do not meet Minimum Order Quantity (MOQ). Please adjust your bag.';
    }

    if (paymentMethod === 'credit_terms' && creditData) {
      if (creditData.paymentTerms === 'prepaid' || creditData.creditLimit <= 0) {
        errs.payment = 'Credit terms are not available on your tier. Please use Bank Transfer.';
      } else if (cartTotal > creditData.availableCredit) {
        errs.payment = `Order total (${formatMoney(cartTotal)}) exceeds available credit line (${formatMoney(creditData.availableCredit)}).`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        shippingAddress: {
          addressLine: formData.addressLine,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        },
        billingAddress: formData.sameAsBilling ? {
          addressLine: formData.addressLine,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        } : {
          addressLine: formData.billingAddressLine,
          city: formData.billingCity,
          state: formData.billingState,
          pincode: formData.billingPincode
        },
        paymentMethod,
        poNumber: formData.poNumber?.trim() || undefined,
        deliveryNotes: formData.deliveryNotes?.trim() || undefined,
        discountCode: appliedCoupon?.code || undefined
      };

      const res = await fetch('/api/wholesale/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('techbazaar_token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setSubmitError(data.error || 'Failed to process wholesale order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Order created successfully! Clear wholesale cart and redirect
      clearCart();
      navigate(`/order-success/${data.data.order.order_number}`, {
        state: {
          order: data.data.order,
          invoice: data.data.invoice,
          channel: 'wholesale',
          poNumber: formData.poNumber
        }
      });
    } catch (err) {
      setSubmitError(err.message || 'Network error occurred while submitting order.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs 
          items={[
            { label: 'Wholesale Procurement', link: '/shop' },
            { label: 'B2B Checkout' }
          ]} 
        />

        {/* Page Header */}
        <div className="mt-4 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EAEAEA] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FF4D00] text-white mb-2">
              <Sparkles size={11} /> B2B Commercial Order
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-[#0A0A0A]">
              Wholesale Purchase Order
            </h1>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Buyer Account: <strong className="text-[#0A0A0A]">{user?.businessName || user?.name}</strong> · Tier: <strong className="text-[#FF4D00]">{user?.groupName || 'Bronze'} Buyer</strong>
            </p>
          </div>

          {creditData && creditData.creditLimit > 0 && (
            <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-3 text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">
                Available B2B Credit Line
              </span>
              <span className="text-sm font-bold text-[#0A0A0A]">
                {formatMoney(creditData.availableCredit)}
              </span>
              <span className="text-[10px] text-[#6B6B6B] block">
                of {formatMoney(creditData.creditLimit)} limit
              </span>
            </div>
          )}
        </div>

        {/* Error Banners */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[4px] text-xs text-red-700 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Order Placement Error</strong>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {errors.mov && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-[4px] text-xs text-amber-800 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Minimum Order Value Threshold</strong>
              <span>{errors.mov}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 7 Columns: B2B Business Forms */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Card 1: Verified Business Profile */}
              <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F0F0F0]">
                  <Building2 size={16} className="text-[#FF4D00]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                    1. Registered Commercial Entity
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      Business Legal Entity Name *
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] font-medium focus:border-[#0A0A0A] outline-none"
                    />
                    {errors.businessName && <span className="text-[10px] text-red-600 mt-1 block">{errors.businessName}</span>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      GSTIN (for B2B Tax Credit)
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] font-mono focus:border-[#0A0A0A] outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      Authorized Contact Person *
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none"
                    />
                    {errors.contactName && <span className="text-[10px] text-red-600 mt-1 block">{errors.contactName}</span>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      Direct Mobile Number (for dispatch SMS) *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none"
                    />
                    {errors.phone && <span className="text-[10px] text-red-600 mt-1 block">{errors.phone}</span>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      Billing / Invoicing Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none"
                    />
                    {errors.email && <span className="text-[10px] text-red-600 mt-1 block">{errors.email}</span>}
                  </div>
                </div>
              </div>

              {/* Card 2: Warehouse / Destination Address */}
              <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-[#FF4D00]" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                      2. Delivery / Warehouse Destination
                    </h2>
                  </div>
                </div>

                {savedAddresses.length > 0 && !isAddingNewAddress && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => {
                          setSelectedAddressId(addr.id);
                          setFormData(prev => ({
                            ...prev,
                            addressLine: addr.addressLine,
                            city: addr.city,
                            state: addr.state || 'Karnataka',
                            pincode: addr.pincode
                          }));
                        }}
                        className={`p-3 border rounded-[4px] cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-[#0A0A0A] bg-[#FAFAFA] ring-1 ring-[#0A0A0A]'
                            : 'border-[#EAEAEA] hover:border-[#BDBDBD]'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-[#0A0A0A]">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="text-[9px] uppercase tracking-wider bg-[#0A0A0A] text-white px-1.5 py-0.5 rounded-[2px]">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B6B6B] truncate">{addr.addressLine}</p>
                        <p className="text-xs text-[#6B6B6B]">{addr.city}, {addr.pincode}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      Street Address / Warehouse Unit *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Unit 4B, Industrial Estate, Phase 2"
                      value={formData.addressLine}
                      onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none"
                    />
                    {errors.addressLine && <span className="text-[10px] text-red-600 mt-1 block">{errors.addressLine}</span>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none"
                      />
                      {errors.city && <span className="text-[10px] text-red-600 mt-1 block">{errors.city}</span>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                        State (Place of Supply) *
                      </label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none"
                      >
                        <option value="Karnataka">Karnataka (29)</option>
                        <option value="Maharashtra">Maharashtra (27)</option>
                        <option value="Delhi">Delhi (07)</option>
                        <option value="Tamil Nadu">Tamil Nadu (33)</option>
                        <option value="Gujarat">Gujarat (24)</option>
                        <option value="Telangana">Telangana (36)</option>
                        <option value="Uttar Pradesh">Uttar Pradesh (09)</option>
                        <option value="Haryana">Haryana (06)</option>
                        <option value="Rajasthan">Rajasthan (08)</option>
                        <option value="West Bengal">West Bengal (19)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none"
                      />
                      {errors.pincode && <span className="text-[10px] text-red-600 mt-1 block">{errors.pincode}</span>}
                    </div>
                  </div>

                  {/* Billing address toggle */}
                  <div className="pt-3 border-t border-[#F0F0F0]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sameAsBilling}
                        onChange={(e) => setFormData({ ...formData, sameAsBilling: e.target.checked })}
                        className="accent-[#0A0A0A] rounded w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-[#0A0A0A]">
                        Billing address is identical to delivery warehouse address
                      </span>
                    </label>

                    {!formData.sameAsBilling && (
                      <div className="mt-4 p-4 bg-[#F9F9F9] border border-[#EAEAEA] rounded-[4px] space-y-3">
                        <span className="text-xs font-bold text-[#0A0A0A] block uppercase tracking-wider">
                          Official Billing Address (for GST Invoice)
                        </span>
                        <div>
                          <input
                            type="text"
                            placeholder="Registered office address"
                            value={formData.billingAddressLine}
                            onChange={(e) => setFormData({ ...formData, billingAddressLine: e.target.value })}
                            className="w-full bg-white border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Billing City"
                            value={formData.billingCity}
                            onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                            className="w-full bg-white border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A]"
                          />
                          <input
                            type="text"
                            placeholder="Billing PIN"
                            value={formData.billingPincode}
                            onChange={(e) => setFormData({ ...formData, billingPincode: e.target.value })}
                            className="w-full bg-white border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Purchase Order Details (PO & Notes) */}
              <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F0F0F0]">
                  <FileText size={16} className="text-[#FF4D00]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                    3. Purchase Order (PO) & Logistics Instructions
                  </h2>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      Customer PO Number (Optional, printed on Tax Invoice)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PO-BLR-2026-9041"
                      value={formData.poNumber}
                      onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] font-mono focus:border-[#0A0A0A] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] mb-1">
                      Warehouse Unloading & Freight Delivery Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Call 1 hr before arrival; hydraulic tailgate or dock loading required."
                      value={formData.deliveryNotes}
                      onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                      className="w-full bg-[#FAFAFA] border border-[#EAEAEA] p-2.5 rounded-[4px] text-xs text-[#0A0A0A] focus:border-[#0A0A0A] outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Wholesale Payment Methods & Terms */}
              <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#F0F0F0]">
                  <CreditCard size={16} className="text-[#FF4D00]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                    4. Commercial Payment Terms
                  </h2>
                </div>

                {errors.payment && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[4px] text-xs text-red-700">
                    {errors.payment}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Option A: Bank Transfer / RTGS / NEFT */}
                  <label className={`block p-4 border rounded-[4px] cursor-pointer transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#0A0A0A] bg-[#FAFAFA] ring-1 ring-[#0A0A0A]'
                      : 'border-[#EAEAEA] hover:border-[#CCCCCC]'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={() => setPaymentMethod('bank_transfer')}
                        className="mt-0.5 accent-[#0A0A0A]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0A0A0A]">
                            Direct Bank Transfer (NEFT / RTGS)
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Recommended · 0% Surcharge
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] mt-1 leading-relaxed">
                          Pay directly to TechBazaar HDFC Current Account upon proforma invoice issue. Orders dispatch immediately upon UTR receipt.
                        </p>
                        {paymentMethod === 'bank_transfer' && (
                          <div className="mt-3 p-3 bg-white border border-[#EAEAEA] rounded-[4px] text-[11px] font-mono text-[#0A0A0A] space-y-1">
                            <div>Bank: <strong>HDFC Bank Ltd (Koramangala Branch)</strong></div>
                            <div>A/C Name: <strong>TECHBAZAAR COMMERCE PVT LTD</strong></div>
                            <div>A/C No: <strong>50200084729104</strong></div>
                            <div>IFSC: <strong>HDFC0000053</strong></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Option B: Credit Terms (Net 15 / Net 30) */}
                  <label className={`block p-4 border rounded-[4px] cursor-pointer transition-all ${
                    paymentMethod === 'credit_terms'
                      ? 'border-[#0A0A0A] bg-[#FAFAFA] ring-1 ring-[#0A0A0A]'
                      : 'border-[#EAEAEA] hover:border-[#CCCCCC]'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="credit_terms"
                        checked={paymentMethod === 'credit_terms'}
                        onChange={() => setPaymentMethod('credit_terms')}
                        className="mt-0.5 accent-[#0A0A0A]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0A0A0A]">
                              Commercial Credit Line ({creditData?.paymentTerms?.toUpperCase() || 'NET 30'})
                            </span>
                            <span className="text-[10px] font-bold text-[#FF4D00] bg-[#FFF0EB] px-2 py-0.5 rounded">
                              Approved Facility
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] mt-1">
                          Zero upfront payment required. Full GST Tax Invoice generated with 30-day settlement window.
                        </p>
                        {creditData && (
                          <div className="mt-2 text-[11px] text-[#0A0A0A]">
                            Available Credit: <strong>{formatMoney(creditData.availableCredit)}</strong> of {formatMoney(creditData.creditLimit)}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Option C: 50% Advance Booking */}
                  <label className={`block p-4 border rounded-[4px] cursor-pointer transition-all ${
                    paymentMethod === 'advance_50'
                      ? 'border-[#0A0A0A] bg-[#FAFAFA] ring-1 ring-[#0A0A0A]'
                      : 'border-[#EAEAEA] hover:border-[#CCCCCC]'
                  }`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="advance_50"
                        checked={paymentMethod === 'advance_50'}
                        onChange={() => setPaymentMethod('advance_50')}
                        className="mt-0.5 accent-[#0A0A0A]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0A0A0A]">
                            50% Advance Booking · 50% on Delivery
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] mt-1">
                          Lock inventory with 50% deposit ({formatMoney(Math.round((cartTotal || 0) / 2))}). Remainder settled upon delivery inspection.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Sticky Order & Tax Summary */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
              <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A]">
                    Wholesale Order Summary ({cartItems.length} {cartItems.length === 1 ? 'Line' : 'Lines'})
                  </h3>
                  <Link to="/cart" className="text-[11px] text-[#FF4D00] hover:underline">
                    Edit Bag
                  </Link>
                </div>

                {/* Items preview list */}
                <div className="my-4 max-h-60 overflow-y-auto divide-y divide-[#F5F5F5] pr-1">
                  {cartItems.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center gap-3 text-xs">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-10 h-10 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded p-1 shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#0A0A0A] truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-[#8A8A8A] mt-0.5">
                          <span>SKU: {item.sku || 'N/A'}</span>
                          <span>·</span>
                          <span className="font-semibold text-[#0A0A0A]">{item.quantity} units</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-medium">Tier {item.tierIndex || 1}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-[#0A0A0A]">
                          {formatMoney(item.lineTotal || 0)}
                        </span>
                        <div className="text-[9.5px] text-[#8A8A8A]">
                          @ {formatMoney(item.unitPrice || 0)}/u
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 pt-3 border-t border-[#F0F0F0] text-xs">
                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>MRP Subtotal</span>
                    <span className="tabular-nums">
                      {formatMoney((cartSubtotal + cartSavings) || 0)}
                    </span>
                  </div>

                  {cartSavings > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Volume Tier Savings</span>
                      <span className="tabular-nums font-medium">
                        -{formatMoney(cartSavings)}
                      </span>
                    </div>
                  )}

                  {groupDiscountTotal > 0 && (
                    <div className="flex justify-between text-[#FF4D00]">
                      <span>Group Discount ({user?.groupName || 'Buyer'})</span>
                      <span className="tabular-nums font-semibold">
                        -{formatMoney(groupDiscountTotal)}
                      </span>
                    </div>
                  )}

                  {volumeDiscountAmount > 0 && (
                    <div className="flex justify-between text-[#FF4D00]">
                      <span>Large Volume Order Incentive ({volumeDiscountPercent}%)</span>
                      <span className="tabular-nums font-semibold">
                        -{formatMoney(volumeDiscountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#0A0A0A] font-medium pt-1 border-t border-[#F5F5F5]">
                    <span>Taxable Value</span>
                    <span className="tabular-nums">
                      {formatMoney(taxableValue || cartSubtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Applicable GST (CGST/SGST or IGST)</span>
                    <span className="tabular-nums">
                      +{formatMoney(totalTax || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[#6B6B6B]">
                    <span>Commercial Freight & Handling</span>
                    <span>
                      {shippingFee === 0 ? (
                        <strong className="text-emerald-700 uppercase font-bold text-[11px]">Free</strong>
                      ) : (
                        formatMoney(shippingFee)
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-3 border-t border-[#0A0A0A] text-sm">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[#0A0A0A] block">
                        Net Invoice Total
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">Inclusive of all taxes & logistics</span>
                    </div>
                    <span className="text-xl font-black text-[#0A0A0A] tabular-nums">
                      {formatMoney(cartTotal || 0)}
                    </span>
                  </div>

                  {cartSavingsVsRetail > 0 && (
                    <div className="mt-2 p-2 bg-[#FFF0EB] border border-[#FFD9CC] rounded text-[11px] text-[#FF4D00] font-semibold text-center">
                      You save {formatMoney(cartSavingsVsRetail)} vs Retail Customer Price
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !meetsMinOrderValue || hasMoqViolations}
                  className="w-full mt-6 py-3.5 bg-[#0A0A0A] text-white text-xs font-bold uppercase tracking-widest rounded-[4px] hover:bg-[#FF4D00] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Generating Purchase Order...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Confirm & Generate Purchase Order</span>
                    </>
                  )}
                </button>

                <div className="mt-4 pt-3 border-t border-[#F0F0F0] text-[10.5px] text-[#8A8A8A] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <ReceiptText size={12} className="text-[#FF4D00]" />
                    <span>Instant GST E-Way Bill & B2B Tax Invoice</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-[#FF4D00]" />
                    <span>Brand Warranty with Commercial RMA Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}