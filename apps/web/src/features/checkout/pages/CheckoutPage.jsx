import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Check, 
  AlertCircle
} from 'lucide-react';
import { useStore } from '@app/providers/StoreContext';
import { formatMoney } from '@shared/utils/formatters';
import useAuthStore from '@shared/store/authStore';
import ordersApi from '@shared/api/ordersApi';
import addressesApi from '@shared/api/addressesApi';
import Breadcrumbs from '@shared/ui/Breadcrumbs';
import CheckoutStep1Address from '@features/checkout/components/CheckoutStep1Address';
import CheckoutStep2Payment from '@features/checkout/components/CheckoutStep2Payment';
import CheckoutStep3Review from '@features/checkout/components/CheckoutStep3Review';
import CheckoutOrderSummary from '@features/checkout/components/CheckoutOrderSummary';

export default function CheckoutPage() {
  const { mode, cart, cartItems, cartSubtotal, shippingFee, cartTotal, minOrderValue, meetsMinOrderValue, appliedCoupon, couponDiscountAmount, clearCart } = useStore();
  const isWholesale = mode === 'wholesale';
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
    if (isWholesale && !meetsMinOrderValue) {
      setStockError(`Minimum Wholesale Order Value is ${formatMoney(minOrderValue)}. Your cart subtotal is ${formatMoney(cartSubtotal)}.`);
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
      isAdvancePayment: isWholesale ? isAdvancePayment : false,
      discountCode: appliedCoupon?.code || undefined,
      channel: isWholesale ? 'wholesale' : 'retail'
    };

    const res = await ordersApi.createOrder(payload);

    if (res.error) {
      setIsSubmitting(false);
      // Stay on Review step and highlight exact failing item
      setStockError(res.error);
      window.scrollTo(0, 0);
      return;
    }

    // Success: clear cart and navigate to order success page with trackingToken for reload safety
    clearCart();
    const tok = res.data.order.trackingToken ? `?token=${encodeURIComponent(res.data.order.trackingToken)}` : '';
    navigate(`/order-success/${res.data.order.orderNumber}${tok}`, {
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

        <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A] mt-4 mb-2">
          {isWholesale ? 'Wholesale Checkout' : 'Express Checkout'}
        </h1>

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
            {currentStep === 1 && (
              <CheckoutStep1Address
                handleNextToPayment={handleNextToPayment}
                isAuthenticated={isAuthenticated}
                savedAddresses={savedAddresses}
                isAddingNewAddress={isAddingNewAddress}
                setIsAddingNewAddress={setIsAddingNewAddress}
                selectedAddressId={selectedAddressId}
                setSelectedAddressId={setSelectedAddressId}
                handleSelectSavedAddress={handleSelectSavedAddress}
                user={user}
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                validateField={validateField}
                isWholesale={isWholesale}
              />
            )}

            {currentStep === 2 && (
              <CheckoutStep2Payment
                handleNextToReview={handleNextToReview}
                setCurrentStep={setCurrentStep}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                formData={formData}
                isWholesale={isWholesale}
                isAdvancePayment={isAdvancePayment}
                setIsAdvancePayment={setIsAdvancePayment}
                advanceAmount={advanceAmount}
                balanceAmount={balanceAmount}
              />
            )}

            {currentStep === 3 && (
              <CheckoutStep3Review
                setCurrentStep={setCurrentStep}
                formData={formData}
                paymentMethod={paymentMethod}
                isAdvancePayment={isAdvancePayment}
                advanceAmount={advanceAmount}
                balanceAmount={balanceAmount}
                cartTotal={cartTotal}
                cart={cart}
                isSubmitting={isSubmitting}
                isWholesale={isWholesale}
                handlePlaceOrder={handlePlaceOrder}
              />
            )}
          </div>

          {/* Right Column: Sticky Order Summary */}
          <CheckoutOrderSummary
            isWholesale={isWholesale}
            cart={cart}
            cartSubtotal={cartSubtotal}
            couponDiscountAmount={couponDiscountAmount}
            appliedCoupon={appliedCoupon}
            shippingFee={shippingFee}
            cartTotal={cartTotal}
            isAdvancePayment={isAdvancePayment}
            advanceAmount={advanceAmount}
            balanceAmount={balanceAmount}
          />
        </div>
      </div>
    </div>
  );
}
