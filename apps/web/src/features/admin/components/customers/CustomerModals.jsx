import React from 'react';
import { X } from 'lucide-react';

export default function CustomerModals({
  convertModalUser,
  setConvertModalUser,
  selectedGroupId,
  setSelectedGroupId,
  groups,
  converting,
  handleConvertSubmit,
  rejectAppId,
  setRejectAppId,
  rejectReason,
  setRejectReason,
  submittingReject,
  handleRejectApp,
  isMergeModalOpen,
  setIsMergeModalOpen,
  primaryMergeId,
  setPrimaryMergeId,
  secondaryMergeId,
  setSecondaryMergeId,
  customers,
  submittingMerge,
  handleMergeSubmit,
  isAddModalOpen,
  setIsAddModalOpen,
  newCust,
  setNewCust,
  submittingAdd,
  handleAddSubmit,
}) {
  return (
    <>
      {/* CONVERT CUSTOMER TO WHOLESALE MODAL */}
      {convertModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#0A0A0A] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                Upgrade to Wholesale Buyer
              </h3>
              <button onClick={() => setConvertModalUser(null)} className="p-1 cursor-pointer">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
              <p className="text-[#6B6B6B] leading-relaxed">
                Assign <strong>{convertModalUser.name}</strong> ({convertModalUser.email}) to a B2B wholesale tier to unlock bulk tier pricing, MOQs, and credit terms.
              </p>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                  Assign Wholesale Group *
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full p-2 border border-[#EAEAEA] rounded text-xs font-mono outline-none"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} Tier (+{g.extra_discount_percent}% off, {g.payment_terms.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                  Business Entity Name
                </label>
                <input
                  type="text"
                  defaultValue={convertModalUser.business_name || convertModalUser.name}
                  onChange={(e) => setConvertModalUser({ ...convertModalUser, businessName: e.target.value })}
                  className="w-full p-2 border border-[#EAEAEA] rounded text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  defaultValue={convertModalUser.gstin || ''}
                  onChange={(e) => setConvertModalUser({ ...convertModalUser, gstin: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-[#EAEAEA] rounded text-xs font-mono uppercase outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConvertModalUser(null)}
                  className="flex-1 py-2 border border-[#CCC] uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white uppercase hover:bg-[#FF4D00] transition-colors font-bold cursor-pointer"
                >
                  {converting ? 'Converting...' : 'Confirm Upgrade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT APPLICATION DIALOG */}
      {rejectAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white border border-[#0A0A0A] p-6 shadow-2xl relative">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-red-600 mb-2">
              Reject Wholesale Application
            </h3>
            <p className="text-xs text-[#6B6B6B] mb-4">
              Specify the reason for declining this commercial account application:
            </p>

            <form onSubmit={handleRejectApp} className="space-y-4">
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Unverified GSTIN record or invalid commercial premises address."
                className="w-full p-2 border border-[#EAEAEA] text-xs outline-none resize-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectAppId(null)}
                  className="flex-1 py-2 border border-[#CCC] text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="flex-1 py-2 bg-red-600 text-white text-xs uppercase hover:bg-red-700 transition-colors font-bold cursor-pointer"
                >
                  {submittingReject ? 'Rejecting...' : 'Reject Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MERGE CUSTOMERS MODAL */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border border-[#0A0A0A] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  Merge Duplicate Customer Accounts
                </h3>
              </div>
              <button onClick={() => setIsMergeModalOpen(false)} className="p-1 cursor-pointer">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                  Primary Customer (Target to Keep) *
                </label>
                <select
                  value={primaryMergeId}
                  onChange={(e) => setPrimaryMergeId(e.target.value)}
                  className="w-full p-2 border border-[#CCC] text-xs font-mono outline-none"
                  required
                >
                  <option value="">-- Choose Account to Keep --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">
                  Secondary Customer (Account to Absorb) *
                </label>
                <select
                  value={secondaryMergeId}
                  onChange={(e) => setSecondaryMergeId(e.target.value)}
                  className="w-full p-2 border border-[#CCC] text-xs font-mono outline-none"
                  required
                >
                  <option value="">-- Choose Account to Merge --</option>
                  {customers.filter(c => String(c.id) !== String(primaryMergeId)).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="flex-1 py-2 border border-[#CCC] uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMerge}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white uppercase hover:bg-[#FF4D00] transition-colors font-bold cursor-pointer"
                >
                  {submittingMerge ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#0A0A0A] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAEAEA]">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
                  New Customer Profile
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 cursor-pointer">
                <X className="w-4 h-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">GSTIN (Optional B2B)</label>
                <input
                  type="text"
                  value={newCust.gstin}
                  onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#CCC] text-xs font-mono outline-none uppercase"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 border border-[#CCC] text-xs font-mono uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="flex-1 py-2 bg-[#0A0A0A] text-white text-xs font-mono uppercase hover:bg-[#FF4D00] transition-colors font-bold cursor-pointer"
                >
                  {submittingAdd ? 'Saving...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
