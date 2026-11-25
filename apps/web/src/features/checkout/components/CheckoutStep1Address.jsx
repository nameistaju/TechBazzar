import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';

export default function CheckoutStep1Address({
  handleNextToPayment,
  isAuthenticated,
  savedAddresses,
  isAddingNewAddress,
  setIsAddingNewAddress,
  selectedAddressId,
  setSelectedAddressId,
  handleSelectSavedAddress,
  user,
  formData,
  setFormData,
  errors,
  validateField,
  isWholesale
}) {
  return (
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
            className="text-xs font-semibold text-accent-text hover:underline flex items-center gap-1 pt-1"
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
              {isWholesale ? 'GSTIN (For 18% Input Tax Credit)' : 'GSTIN (Optional — for tax invoice)'}
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
                className="accent-accent"
              />
              <span>Billing address is same as delivery destination</span>
            </label>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-[#F2F2F2] flex justify-end">
        <button
          type="submit"
          className="py-3.5 px-8 bg-[#0A0A0A] hover:bg-accent text-accent-contrast text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer"
        >
          Continue to Payment <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
