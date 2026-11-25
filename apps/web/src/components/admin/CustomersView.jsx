// src/components/admin/CustomersView.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  GitMerge, 
  Mail, 
  Phone, 
  X,
  RefreshCw,
  Building2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { formatINR } from '../../utils/formatters';
import useToastStore from '../../store/toastStore';

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

      {/* ======================================================== */}
      {/* TAB 2: WHOLESALE APPLICATIONS INBOX */}
      {/* ======================================================== */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="p-4 bg-white border border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase text-[#6B6B6B]">Filter Status:</span>
              {['all', 'pending', 'approved', 'rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setAppFilter(st)}
                  className={`px-3 py-1 rounded text-xs font-mono uppercase transition-colors cursor-pointer ${
                    appFilter === st
                      ? 'bg-[#0A0A0A] text-white font-bold'
                      : 'bg-neutral-100 text-[#6B6B6B] hover:text-[#0A0A0A]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={fetchApplications}
              className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] border border-[#EAEAEA] rounded cursor-pointer"
              title="Refresh applications list"
            >
              <RefreshCw size={13} className={loadingApps ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Applications Table */}
          <div className="bg-white border border-[#EAEAEA] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F7F7] border-b border-[#EAEAEA] font-mono uppercase text-[#6B6B6B] text-[11px]">
                  <th className="p-3">Company / Applicant</th>
                  <th className="p-3">Type & City</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Monthly Volume</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {loadingApps && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs font-mono text-[#6B6B6B]">
                      Loading wholesale applications...
                    </td>
                  </tr>
                )}

                {!loadingApps && applications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-[#6B6B6B]">
                      No wholesale applications found in this status.
                    </td>
                  </tr>
                )}

                {!loadingApps && applications.map(app => (
                  <tr key={app.id} className="hover:bg-[#FBFBFB]">
                    <td className="p-3">
                      <div className="font-bold text-[#0A0A0A]">{app.business_name}</div>
                      <div className="text-[11px] text-[#6B6B6B]">{app.contact_name} · {app.email}</div>
                      <div className="text-[10px] text-[#8A8A8A] font-mono">{app.phone}</div>
                    </td>
                    <td className="p-3 font-mono">
                      <div className="uppercase text-[#0A0A0A] font-medium">{app.business_type}</div>
                      <div className="text-[10px] text-[#8A8A8A]">{app.city}</div>
                    </td>
                    <td className="p-3 font-mono">
                      {app.gstin ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 size={12} />
                          <span>{app.gstin}</span>
                        </div>
                      ) : (
                        <span className="text-[#A1A1AA] text-[10px]">No GSTIN provided</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[#0A0A0A]">
                      {app.expected_monthly_volume}
                    </td>
                    <td className="p-3 font-mono">
                      {app.status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Approved ({app.assigned_group_name || 'Gold'})
                        </span>
                      ) : app.status === 'rejected' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-800 border border-red-200">
                          Rejected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {app.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveApp(app.id, 3)}
                            className="px-2.5 py-1 text-[10px] font-mono uppercase bg-[#0A0A0A] text-white hover:bg-emerald-600 rounded transition-colors font-semibold cursor-pointer"
                            title="Approve immediately as Gold Buyer"
                          >
                            Approve (Gold)
                          </button>
                          <button
                            onClick={() => setRejectAppId(app.id)}
                            className="px-2 py-1 text-[10px] font-mono uppercase border border-red-200 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#A1A1AA] font-mono">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WHOLESALE GROUPS & CREDIT TIERS */}
      {/* ======================================================== */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groups.map((grp) => (
              <div key={grp.id} className="bg-white border border-[#EAEAEA] p-5 rounded-[4px] space-y-3 relative">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0]">
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#0A0A0A]">
                    {grp.name} Tier
                  </h3>
                  <span className="text-[10px] font-mono text-[#8A8A8A]">
                    {grp.member_count || 0} members
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Extra Margin:</span>
                    <strong className="text-[#FF4D00] font-bold">+{grp.extra_discount_percent}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Credit Facility:</span>
                    <strong className="text-[#0A0A0A] font-mono">
                      {grp.credit_limit > 0 ? formatINR(grp.credit_limit) : 'Prepaid Only'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Payment Terms:</span>
                    <strong className="uppercase font-mono text-[#0A0A0A]">{grp.payment_terms}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Minimum Order (MOV):</span>
                    <strong className="font-mono text-[#0A0A0A]">
                      {formatINR(grp.min_order_value || 250000)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Free Freight at:</span>
                    <strong className="font-mono text-[#0A0A0A]">
                      {formatINR(grp.free_shipping_threshold || 1000000)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONVERT CUSTOMER TO WHOLESALE MODAL */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* REJECT APPLICATION DIALOG */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* MERGE CUSTOMERS MODAL */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* ADD CUSTOMER MODAL */}
      {/* ======================================================== */}
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
    </div>
  );
}