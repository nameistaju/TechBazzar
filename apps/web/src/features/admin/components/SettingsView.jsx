// src/components/admin/SettingsView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Save, 
  RefreshCw 
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import useToastStore from '@shared/store/toastStore';
import BrandingThemeTab from '@features/admin/components/BrandingThemeTab';

export default function SettingsView() {
  const addToast = useToastStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState('business'); // business, invoice, store, backup, account
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Admin Account settings state
  const [adminProfile, setAdminProfile] = useState({ name: '', email: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const [sRes, aRes] = await Promise.all([
      adminApi.getSettings(),
      adminApi.getAdminMe()
    ]);

    if (sRes.data?.settings) setSettings(sRes.data.settings);
    if (aRes.data?.admin) setAdminProfile({ name: aRes.data.admin.name, email: aRes.data.admin.email });
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await adminApi.saveSettings(settings);
    setSaving(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: 'Settings saved successfully' });
    }
  };

  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    setSavingAccount(true);
    const res = await adminApi.updateProfile(adminProfile);
    setSavingAccount(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: 'Admin profile updated' });
    }
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      addToast({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    setSavingAccount(true);
    const res = await adminApi.changePassword({ currentPassword, newPassword });
    setSavingAccount(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  const handlePurgeLogs = async () => {
    if (window.confirm('Purge activity logs older than 90 days? This action cannot be undone.')) {
      const res = await adminApi.purgeLogs();
      if (!res.error) {
        addToast({ type: 'info', message: `Purged ${res.data?.deletedCount || 0} old activity records.` });
      }
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono text-[#6B6B6B]">
        <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Back-Office Settings & Configuration
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Configure business identity, GST details, bank/UPI accounts, invoice layout templates, and database backups
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-4 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase tracking-wider hover:bg-accent flex items-center gap-1.5 transition-colors font-semibold"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-[#EAEAEA] bg-white px-2 text-xs font-mono uppercase tracking-wider">
        {[
          { id: 'business', label: '1. Business Profile' },
          { id: 'invoice', label: '2. Invoicing & Bank / UPI' },
          { id: 'store', label: '3. Store Preferences' },
          { id: 'backup', label: '4. Database Backup' },
          { id: 'account', label: '5. Admin Owner Account' },
          { id: 'branding', label: '6. Branding & Theme' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-3 px-4 border-b-2 font-semibold transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-pop text-[#0A0A0A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BUSINESS PROFILE */}
      {activeTab === 'business' && (
        <div className="p-6 bg-white border border-[#EAEAEA] space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Trade Name (Brand Name)</label>
              <input
                type="text"
                value={settings.business_trade_name || ''}
                onChange={(e) => handleChange('business_trade_name', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Legal Entity Name</label>
              <input
                type="text"
                value={settings.business_legal_name || ''}
                onChange={(e) => handleChange('business_legal_name', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Registered Business Address</label>
              <input
                type="text"
                value={settings.business_address || ''}
                onChange={(e) => handleChange('business_address', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">GSTIN Number</label>
              <input
                type="text"
                value={settings.business_gstin || ''}
                onChange={(e) => handleChange('business_gstin', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono uppercase outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">PAN Number</label>
              <input
                type="text"
                value={settings.business_pan || ''}
                onChange={(e) => handleChange('business_pan', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono uppercase outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Official Support Phone</label>
              <input
                type="text"
                value={settings.business_phone || ''}
                onChange={(e) => handleChange('business_phone', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Official Support Email</label>
              <input
                type="text"
                value={settings.business_email || ''}
                onChange={(e) => handleChange('business_email', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICING & BANK / UPI */}
      {activeTab === 'invoice' && (
        <div className="p-6 bg-white border border-[#EAEAEA] space-y-6 max-w-3xl">
          {/* Prefix Settings */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A] mb-3">
              Document Numbering Sequences
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Tax Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.invoice_prefix || 'INV-2026-'}
                  onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Quotation / Estimate Prefix</label>
                <input
                  type="text"
                  value={settings.estimate_prefix || 'EST-'}
                  onChange={(e) => handleChange('estimate_prefix', e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Bank & UPI Details */}
          <div className="pt-4 border-t border-[#F0F0F0]">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A] mb-3">
              Bank Details & UPI Payment QR
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Bank Name</label>
                <input
                  type="text"
                  value={settings.bank_name || ''}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Account Number</label>
                <input
                  type="text"
                  value={settings.bank_account_no || ''}
                  onChange={(e) => handleChange('bank_account_no', e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={settings.bank_ifsc || ''}
                  onChange={(e) => handleChange('bank_ifsc', e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">UPI ID (VPA)</label>
                <input
                  type="text"
                  value={settings.upi_id || ''}
                  onChange={(e) => handleChange('upi_id', e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Template Choice & Live Preview */}
          <div className="pt-4 border-t border-[#F0F0F0] space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
              PDF Invoice Template Choice
            </h3>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <label className={`p-4 border cursor-pointer ${
                settings.template === 'standard' ? 'border-accent bg-accent-tint' : 'border-[#EAEAEA]'
              }`}>
                <input
                  type="radio"
                  name="tmplChoice"
                  checked={settings.template === 'standard'}
                  onChange={() => handleChange('template', 'standard')}
                  className="accent-accent mr-2"
                />
                <span className="font-bold">Standard Layout</span>
                <p className="text-[11px] text-[#6B6B6B] font-sans mt-1">
                  Full corporate header, separated Billed To / Shipped To boxes, comprehensive tax slab totals.
                </p>
              </label>

              <label className={`p-4 border cursor-pointer ${
                settings.template === 'compact' ? 'border-accent bg-accent-tint' : 'border-[#EAEAEA]'
              }`}>
                <input
                  type="radio"
                  name="tmplChoice"
                  checked={settings.template === 'compact'}
                  onChange={() => handleChange('template', 'compact')}
                  className="accent-accent mr-2"
                />
                <span className="font-bold">Compact Layout</span>
                <p className="text-[11px] text-[#6B6B6B] font-sans mt-1">
                  Dense single-page design, reduced padding, optimized for high item volume orders.
                </p>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STORE PREFERENCES */}
      {activeTab === 'store' && (
        <div className="p-6 bg-white border border-[#EAEAEA] space-y-4 max-w-3xl font-mono text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol || '₹'}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-[#6B6B6B] mb-1">Default Low Stock Threshold</label>
              <input
                type="number"
                value={settings.default_low_stock_threshold || '3'}
                onChange={(e) => handleChange('default_low_stock_threshold', e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DATABASE BACKUP */}
      {activeTab === 'backup' && (
        <div className="p-6 bg-white border border-[#EAEAEA] space-y-6 max-w-2xl">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A] mb-1">
              Complete SQLite Database Download
            </h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed mb-4">
              Download a 1-click binary backup of the entire local SQLite database (including all products, orders, customers, invoices, and activity history).
            </p>
            <a
              href={adminApi.getBackupUrl()}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase hover:bg-accent transition-colors font-bold"
            >
              <Download className="w-4 h-4" />
              Download techbazaar.db Backup
            </a>
          </div>

          <div className="pt-6 border-t border-[#F0F0F0]">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-red-600 mb-1">
              Prune Activity Audit Logs
            </h3>
            <p className="text-xs text-[#6B6B6B] leading-relaxed mb-4">
              Purge audit logs older than 90 days to reduce database file size while preserving essential financial records.
            </p>
            <button
              onClick={handlePurgeLogs}
              className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-mono uppercase font-bold"
            >
              Purge Logs (&gt; 90 Days Old)
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: ADMIN OWNER ACCOUNT */}
      {activeTab === 'account' && (
        <div className="p-6 bg-white border border-[#EAEAEA] space-y-6 max-w-2xl">
          <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
              Owner Profile Information
            </h3>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={adminProfile.name}
                onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Registered Owner Email</label>
              <input
                type="email"
                required
                value={adminProfile.email}
                onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-4 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase hover:bg-accent font-bold"
            >
              Update Owner Profile
            </button>
          </form>

          <form onSubmit={handleChangeAdminPassword} className="space-y-4 pt-6 border-t border-[#F0F0F0]">
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
              Change Password
            </h3>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#6B6B6B] mb-1">New Password (Min 6 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 border border-[#EAEAEA] text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-4 py-2 bg-[#0A0A0A] text-white hover:text-accent-contrast text-xs font-mono uppercase hover:bg-accent font-bold"
            >
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: BRANDING & THEME */}
      {activeTab === 'branding' && (
        <BrandingThemeTab />
      )}
    </div>
  );
}
