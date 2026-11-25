// src/components/admin/CustomersView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  GitMerge, 
  Mail, 
  Phone, 
  Building2,
  ShieldCheck
} from 'lucide-react';
import adminApi from '@shared/api/adminApi';
import { formatINR } from '@shared/utils/formatters';
import useToastStore from '@shared/store/toastStore';
import WholesaleApplicationsTab from '@features/admin/components/customers/WholesaleApplicationsTab';
import WholesaleGroupsTab from '@features/admin/components/customers/WholesaleGroupsTab';
import CustomerModals from '@features/admin/components/customers/CustomerModals';

export default function CustomersView({ initialCustomerId, onClearInitialCustomer, _onNavigate }) {
  const addToast = useToastStore((s) => s.addToast);

  // Active top-level tab
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'applications' | 'groups'

  // Customers State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Wholesale Applications State
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appFilter, setAppFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  // Wholesale Groups State
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Customer Detail Drawer
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Convert to Wholesale Modal
  const [convertModalUser, setConvertModalUser] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(3); // Gold default
  const [converting, setConverting] = useState(false);

  // Rejection Dialog State
  const [rejectAppId, setRejectAppId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Merge Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [primaryMergeId, setPrimaryMergeId] = useState('');
  const [secondaryMergeId, setSecondaryMergeId] = useState('');
  const [submittingMerge, setSubmittingMerge] = useState(false);

  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', email: '', phone: '', gstin: '', notes: '' });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await adminApi.getCustomers({ search });
    if (res.data?.customers) setCustomers(res.data.customers);
    setLoading(false);
  };

  const fetchApplications = async () => {
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/admin/wholesale/applications?status=${appFilter}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('techbazaar_token')}` }
      });
      const data = await res.json();
      if (data.data?.applications) setApplications(data.data.applications);
    } catch {}
    setLoadingApps(false);
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/admin/wholesale/groups', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('techbazaar_token')}` }
      });
      const data = await res.json();
      if (data.data?.groups) setGroups(data.data.groups);
    } catch {}
    setLoadingGroups(false);
  };

  useEffect(() => {
    fetchCustomers();
    fetchApplications();
    fetchGroups();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    } else if (activeTab === 'groups') {
      fetchGroups();
    }
  }, [activeTab, appFilter]);

  useEffect(() => {
    if (initialCustomerId) {
      openCustomerDetail(initialCustomerId);
      if (onClearInitialCustomer) onClearInitialCustomer();
    }
  }, [initialCustomerId]);

  const openCustomerDetail = async (id) => {
    setLoadingDetail(true);
    const res = await adminApi.getCustomer(id);
    setLoadingDetail(false);
    if (res.data?.customer) {
      setSelectedCustomer(res.data.customer);
    }
  };

  // 1-Click Approve Application
  const handleApproveApp = async (appId, groupId) => {
    try {
      const res = await fetch(`/api/admin/wholesale/applications/${appId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('techbazaar_token')}`
        },
        body: JSON.stringify({ groupId: Number(groupId) })
      });
      const data = await res.json();
      if (data.error) {
        addToast({ type: 'error', message: data.error });
      } else {
        addToast({ type: 'success', message: data.data.message });
        fetchApplications();
        fetchCustomers();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to approve application' });
    }
  };

  // Reject Application
  const handleRejectApp = async (e) => {
    e.preventDefault();
    if (!rejectAppId) return;

    setSubmittingReject(true);
    try {
      const res = await fetch(`/api/admin/wholesale/applications/${rejectAppId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('techbazaar_token')}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      const data = await res.json();
      if (data.error) {
        addToast({ type: 'error', message: data.error });
      } else {
        addToast({ type: 'success', message: data.data.message });
        setRejectAppId(null);
        setRejectReason('');
        fetchApplications();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to reject application' });
    } finally {
      setSubmittingReject(false);
    }
  };

  // Convert Retail Customer to Wholesale
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertModalUser) return;

    setConverting(true);
    try {
      const res = await fetch('/api/admin/wholesale/convert-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('techbazaar_token')}`
        },
        body: JSON.stringify({
          userId: convertModalUser.user_id || convertModalUser.id,
          groupId: Number(selectedGroupId),
          businessName: convertModalUser.businessName || convertModalUser.name,
          gstin: convertModalUser.gstin
        })
      });
      const data = await res.json();
      if (data.error) {
        addToast({ type: 'error', message: data.error });
      } else {
        addToast({ type: 'success', message: data.data.message });
        setConvertModalUser(null);
        fetchCustomers();
      }
    } catch {
      addToast({ type: 'error', message: 'Failed to convert customer' });
    } finally {
      setConverting(false);
    }
  };

  // Merge Submit
  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (!primaryMergeId || !secondaryMergeId || primaryMergeId === secondaryMergeId) {
      addToast({ type: 'error', message: 'Please select two distinct accounts to merge.' });
      return;
    }

    setSubmittingMerge(true);
    const res = await adminApi.mergeCustomers({
      primaryId: primaryMergeId,
      secondaryId: secondaryMergeId
    });
    setSubmittingMerge(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: 'Customer records merged successfully!' });
      setIsMergeModalOpen(false);
      setPrimaryMergeId('');
      setSecondaryMergeId('');
      fetchCustomers();
    }
  };

  // Add Customer Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newCust.name || !newCust.email) return;

    setSubmittingAdd(true);
    const res = await adminApi.createCustomer(newCust);
    setSubmittingAdd(false);

    if (res.error) {
      addToast({ type: 'error', message: res.error });
    } else {
      addToast({ type: 'success', message: `Customer profile for ${newCust.name} created.` });
      setIsAddModalOpen(false);
      setNewCust({ name: '', email: '', phone: '', gstin: '', notes: '' });
      fetchCustomers();
    }
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAEAEA]">
        <div>
          <h1 className="text-xl font-bold font-mono uppercase tracking-tight text-[#0A0A0A]">
            Customer CRM & B2B Wholesale Accounts
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Manage retail buyers, onboard verified wholesale clients, and configure credit tiers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMergeModalOpen(true)}
            className="px-3 py-1.5 border border-[#EAEAEA] bg-white text-xs font-mono uppercase tracking-wider text-[#0A0A0A] hover:border-[#0A0A0A] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitMerge className="w-3.5 h-3.5" />
            Merge Accounts
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF4D00] flex items-center gap-1.5 transition-colors font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-[#EAEAEA] pb-px">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'border-[#FF4D00] text-[#0A0A0A] font-bold bg-white'
              : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
          }`}
        >
          <Users size={14} />
          <span>All Customers ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'applications'
              ? 'border-[#FF4D00] text-[#0A0A0A] font-bold bg-white'
              : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
          }`}
        >
          <Building2 size={14} />
          <span>Wholesale Applications</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 bg-[#FF4D00] text-white text-[10px] font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-[#FF4D00] text-[#0A0A0A] font-bold bg-white'
              : 'border-transparent text-[#6B6B6B] hover:text-[#0A0A0A]'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Wholesale Groups ({groups.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ALL CUSTOMERS DIRECTORY */}
      {/* ======================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="p-4 bg-white border border-[#EAEAEA] flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6B6B6B]" />
              <input
                type="text"
                placeholder="Search by name, email, phone, GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-[#EAEAEA] text-xs font-mono outline-none"
              />
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
                  <th className="p-3">Customer / Entity</th>
                  <th className="p-3">Buyer Type</th>
                  <th className="p-3">Contact Information</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3 text-center">Orders</th>
                  <th className="p-3 text-right">Lifetime Spend</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                      Loading customer database...
                    </td>
                  </tr>
                )}

                {!loading && customers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-[#6B6B6B]">
                      No customers found matching search.
                    </td>
                  </tr>
                )}

                {!loading && customers.map(c => {
                  const hasB2BTag = Array.isArray(c.tags)
                    ? c.tags.some(t => String(t).toLowerCase().includes('b2b'))
                    : String(c.tags || '').toLowerCase().includes('b2b');
                  const isWholesale = c.buyer_type === 'wholesale' || hasB2BTag;

                  return (
                    <tr key={c.id} className="hover:bg-[#FBFBFB]">
                      <td className="p-3">
                        <div className="font-semibold text-[#0A0A0A]">{c.name}</div>
                        {c.business_name && (
                          <div className="text-[10px] text-[#6B6B6B] font-mono">{c.business_name}</div>
                        )}
                      </td>
                      <td className="p-3">
                        {isWholesale ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFF0EB] text-[#FF4D00] border border-[#FFD9CC]">
                            Wholesale · {c.group_name || 'Gold'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-neutral-100 text-[#6B6B6B]">
                            Retail
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-xs font-mono text-[#6B6B6B]">
                        <div className="flex items-center gap-1.5 text-[#0A0A0A]">
                          <Mail className="w-3 h-3 text-[#9E9E9E]" />
                          <span>{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-[#9E9E9E]" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {c.gstin ? (
                          <span className="text-[#0A0A0A] font-semibold">{c.gstin}</span>
                        ) : (
                          <span className="text-[#A1A1AA] text-[10px]">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {c.total_orders || 0}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-[#0A0A0A]">
                        {formatINR(c.total_spend || 0)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isWholesale && (
                            <button
                              onClick={() => setConvertModalUser(c)}
                              className="px-2 py-1 text-[10px] font-mono uppercase bg-neutral-100 hover:bg-[#FF4D00] hover:text-white rounded transition-colors cursor-pointer"
                              title="Upgrade this client to approved wholesale account"
                            >
                              + Wholesale
                            </button>
                          )}
                          <button
                            onClick={() => openCustomerDetail(c.id)}
                            className="px-2 py-1 text-[10px] font-mono uppercase text-[#0A0A0A] border border-[#EAEAEA] hover:border-[#0A0A0A] transition-colors cursor-pointer"
                          >
                            Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <WholesaleApplicationsTab
          appFilter={appFilter}
          setAppFilter={setAppFilter}
          fetchApplications={fetchApplications}
          loadingApps={loadingApps}
          applications={applications}
          handleApproveApp={handleApproveApp}
          setRejectAppId={setRejectAppId}
        />
      )}

      {activeTab === 'groups' && (
        <WholesaleGroupsTab groups={groups} />
      )}

      <CustomerModals
        convertModalUser={convertModalUser}
        setConvertModalUser={setConvertModalUser}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        groups={groups}
        converting={converting}
        handleConvertSubmit={handleConvertSubmit}
        rejectAppId={rejectAppId}
        setRejectAppId={setRejectAppId}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        submittingReject={submittingReject}
        handleRejectApp={handleRejectApp}
        isMergeModalOpen={isMergeModalOpen}
        setIsMergeModalOpen={setIsMergeModalOpen}
        primaryMergeId={primaryMergeId}
        setPrimaryMergeId={setPrimaryMergeId}
        secondaryMergeId={secondaryMergeId}
        setSecondaryMergeId={setSecondaryMergeId}
        customers={customers}
        submittingMerge={submittingMerge}
        handleMergeSubmit={handleMergeSubmit}
        isAddModalOpen={isAddModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
        newCust={newCust}
        setNewCust={setNewCust}
        submittingAdd={submittingAdd}
        handleAddSubmit={handleAddSubmit}
      />
    </div>
  );
}