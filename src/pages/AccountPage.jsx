import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  LogOut, 
  Check, 
  Clock, 
  Truck, 
  ArrowRight, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit3,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useStore } from '../context/StoreContext';
import ordersApi from '../api/ordersApi';
import addressesApi from '../api/addressesApi';
import Breadcrumbs from '../components/common/Breadcrumbs';

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, logout, openAuthModal } = useAuthStore();
  const { addToCart, wishlist, removeFromWishlist, setIsCartOpen } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'overview', 'orders', 'wishlist', 'addresses', 'profile'
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // New address form state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    addressLine: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
    isDefault: false
  });

  // If not authenticated and not loading, open auth modal
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal('login');
    }
  }, [isLoading, isAuthenticated, openAuthModal]);

  // Load user data
  useEffect(() => {
    if (isAuthenticated) {
      setLoadingOrders(true);
      ordersApi.getMyOrders().then(res => {
        if (res.data?.orders) setOrders(res.data.orders);
        setLoadingOrders(false);
      }).catch(() => setLoadingOrders(false));

      addressesApi.getAddresses().then(res => {
        if (res.data?.addresses) setAddresses(res.data.addresses);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-light uppercase tracking-wider text-[#0A0A0A] mb-2">
          Member Access
        </h2>
        <p className="text-xs text-[#6B6B6B] max-w-sm mb-6">
          Please sign in to view your orders, saved addresses, and profile.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="py-3 px-8 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleReorder = (order) => {
    order.items.forEach((item) => {
      addToCart({
        id: item.productId,
        name: item.name,
        price: item.price,
        image: item.image
      }, item.quantity, false);
    });
    setIsCartOpen(true);
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    const res = await addressesApi.createAddress(newAddress);
    if (res.data?.address) {
      setAddresses([res.data.address, ...addresses]);
      setIsAddingAddress(false);
      setNewAddress({
        name: '',
        phone: '',
        addressLine: '',
        city: '',
        state: 'Karnataka',
        pincode: '',
        isDefault: false
      });
    }
  };

  const handleDeleteAddress = async (id) => {
    await addressesApi.deleteAddress(id);
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const handleSetDefaultAddress = async (id) => {
    await addressesApi.setDefaultAddress(id);
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
  };

  return (
    <div className="bg-[#FAFAFA] min-h-screen pb-20">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Breadcrumb */}
        <Breadcrumbs
          items={[
            { label: 'Shop', link: '/shop' },
            { label: 'My Account' }
          ]}
        />

        {/* Account Header */}
        <div className="bg-white border border-[#EAEAEA] rounded-[4px] p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center text-xl font-bold tracking-wider">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#0A0A0A]">{user.name}</h1>
              <p className="text-xs text-[#6B6B6B]">{user.email}</p>
              <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[2px] bg-[#F7F7F7] border border-[#EAEAEA] text-[#0A0A0A]">
                {user.role === 'admin' ? 'Administrator' : 'Verified Member'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-colors"
              >
                Admin Panel
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="py-2.5 px-4 bg-white border border-[#EAEAEA] hover:border-red-300 text-red-600 text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>

        {/* Tabs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Tab Sidebar */}
          <div className="lg:col-span-3 bg-white border border-[#EAEAEA] rounded-[4px] p-2 shadow-sm space-y-1">
            {[
              { id: 'orders', label: 'Order History', icon: Package, badge: orders.length },
              { id: 'wishlist', label: 'My Wishlist', icon: Heart, badge: wishlist.length },
              { id: 'addresses', label: 'Saved Addresses', icon: MapPin, badge: addresses.length },
              { id: 'profile', label: 'Profile Details', icon: User }
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setActiveTab(t.id); setSelectedOrder(null); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-[4px] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} />
                    <span>{t.label}</span>
                  </div>
                  {t.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#EAEAEA] text-[#0A0A0A]'
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Tab Content */}
          <div className="lg:col-span-9 bg-white border border-[#EAEAEA] rounded-[4px] p-6 sm:p-8 shadow-sm">
            
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div>
                {selectedOrder ? (
                  /* Order Detail Sub-view */
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between pb-4 border-b border-[#F2F2F2]">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(null)}
                        className="text-xs font-semibold uppercase tracking-wider text-[#FF4D00] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        ← Back to all orders
                      </button>
                      <span className="text-xs font-mono font-bold text-[#0A0A0A]">
                        #{selectedOrder.orderNumber}
                      </span>
                    </div>

                    {/* Timeline & Status */}
                    <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">
                          Current Status
                        </span>
                        <span className="text-sm font-bold text-[#0A0A0A]">
                          {selectedOrder.status}
                        </span>
                      </div>
                      <Link
                        to={`/track?number=${selectedOrder.orderNumber}&contact=${encodeURIComponent(user.email)}`}
                        className="py-2 px-4 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-colors"
                      >
                        Live Tracking
                      </Link>
                    </div>

                    {/* Item list snapshot */}
                    <div>
                      <h3 className="text-xs uppercase tracking-wider font-semibold text-[#0A0A0A] mb-3">
                        Purchased Items
                      </h3>
                      <div className="divide-y divide-[#F2F2F2] border border-[#EAEAEA] rounded-[4px]">
                        {selectedOrder.items.map((item) => (
                          <div key={item.id} className="p-4 flex items-center gap-4">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-1"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-semibold text-[#0A0A0A] truncate">{item.name}</h4>
                              <p className="text-[11px] text-[#6B6B6B]">
                                Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
                              ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary & Reorder CTA */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-[#F2F2F2]">
                      <div>
                        <span className="text-xs text-[#6B6B6B]">Total Paid:</span>
                        <span className="text-base font-bold text-[#0A0A0A] ml-2 tabular-nums">
                          ₹{selectedOrder.total.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReorder(selectedOrder)}
                        className="py-3 px-6 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw size={14} /> Reorder All Items
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Orders List */
                  <div className="space-y-4">
                    <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-4">
                      Order History ({orders.length})
                    </h2>

                    {orders.length === 0 ? (
                      <div className="py-12 text-center">
                        <Package size={36} className="text-[#BDBDBD] mx-auto mb-3" />
                        <p className="text-xs text-[#6B6B6B] mb-4">You have not placed any orders yet.</p>
                        <Link
                          to="/shop"
                          className="py-2.5 px-6 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors"
                        >
                          Start Shopping
                        </Link>
                      </div>
                    ) : (
                      orders.map((o) => {
                        const isDelivered = o.status === 'Delivered';
                        const isTransit = o.status === 'Shipped' || o.status === 'Out for delivery';

                        return (
                          <div
                            key={o.id}
                            className="border border-[#EAEAEA] rounded-[4px] p-5 hover:border-[#BDBDBD] transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F2F2F2]">
                              <div>
                                <span className="font-mono text-xs font-bold text-[#0A0A0A] mr-3">
                                  #{o.orderNumber}
                                </span>
                                <span className="text-[11px] text-[#8A8A8A]">
                                  {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] ${
                                  isTransit
                                    ? 'bg-[#FFF0EB] text-[#FF4D00] border border-[#FFD4C2]'
                                    : isDelivered
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-[#F2F2F2] text-[#6B6B6B]'
                                }`}>
                                  {o.status}
                                </span>
                                <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
                                  ₹{o.total.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Item thumbnails row (up to 4 thumbnails + "+X") */}
                            <div className="pt-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {o.items.slice(0, 4).map((it, idx) => (
                                  <img
                                    key={idx}
                                    src={it.image}
                                    alt={it.name}
                                    title={it.name}
                                    className="w-10 h-10 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-1"
                                  />
                                ))}
                                {o.items.length > 4 && (
                                  <div className="w-10 h-10 rounded-[4px] bg-[#F7F7F7] border border-[#EAEAEA] flex items-center justify-center text-xs font-bold text-[#6B6B6B]">
                                    +{o.items.length - 4}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedOrder(o)}
                                className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:text-[#FF4D00] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                View Details <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <div>
                <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-4">
                  My Wishlist ({wishlist.length})
                </h2>

                {wishlist.length === 0 ? (
                  <div className="py-12 text-center">
                    <Heart size={36} className="text-[#BDBDBD] mx-auto mb-3" />
                    <p className="text-xs text-[#6B6B6B] mb-4">Your wishlist is currently empty.</p>
                    <Link
                      to="/shop"
                      className="py-2.5 px-6 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-widest rounded-[4px] transition-colors"
                    >
                      Explore Trending
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border border-[#EAEAEA] rounded-[4px] flex items-center gap-4 hover:border-[#BDBDBD] transition-all"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 object-contain bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-1 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-[#0A0A0A] truncate">{item.name}</h4>
                          <span className="text-xs font-bold text-[#0A0A0A] block tabular-nums mt-0.5">
                            ₹{item.price.toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              type="button"
                              onClick={() => addToCart(item, 1)}
                              className="text-[11px] font-semibold text-[#FF4D00] hover:underline uppercase"
                            >
                              Move to Bag
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromWishlist(item.id)}
                              className="text-[11px] text-[#8A8A8A] hover:text-red-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A]">
                    Saved Delivery Addresses ({addresses.length})
                  </h2>
                  {!isAddingAddress && (
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(true)}
                      className="py-2 px-3.5 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider rounded-[4px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus size={14} /> Add Address
                    </button>
                  )}
                </div>

                {isAddingAddress ? (
                  <form onSubmit={handleCreateAddress} className="space-y-4 border border-[#EAEAEA] p-5 rounded-[4px] bg-[#FAFAFA] animate-fadeIn">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A] block">
                      New Address Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-[#6B6B6B] mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.name}
                          onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                          className="w-full h-10 px-3 text-xs bg-white border border-[#EAEAEA] rounded-[4px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-[#6B6B6B] mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          className="w-full h-10 px-3 text-xs bg-white border border-[#EAEAEA] rounded-[4px]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold uppercase text-[#6B6B6B] mb-1">
                          Street Address
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.addressLine}
                          onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                          className="w-full h-10 px-3 text-xs bg-white border border-[#EAEAEA] rounded-[4px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-[#6B6B6B] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className="w-full h-10 px-3 text-xs bg-white border border-[#EAEAEA] rounded-[4px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-[#6B6B6B] mb-1">
                          PIN Code
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={newAddress.pincode}
                          onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                          className="w-full h-10 px-3 text-xs bg-white border border-[#EAEAEA] rounded-[4px]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        className="py-2.5 px-6 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-colors"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="py-2.5 px-4 bg-white border border-[#EAEAEA] text-[#6B6B6B] text-xs font-semibold uppercase tracking-wider rounded-[4px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <div
                        key={a.id}
                        className={`p-4 border rounded-[4px] relative ${
                          a.isDefault ? 'border-[#0A0A0A] bg-[#FAFAFA]' : 'border-[#EAEAEA]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#0A0A0A]">{a.name}</span>
                          {a.isDefault && (
                            <span className="text-[9px] uppercase tracking-wider bg-[#0A0A0A] text-white px-2 py-0.5 rounded-[2px] font-semibold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B6B6B] leading-relaxed">{a.addressLine}</p>
                        <p className="text-xs text-[#6B6B6B]">{a.city}, {a.pincode}</p>
                        <p className="text-[11px] text-[#8A8A8A] mt-1">Phone: {a.phone}</p>

                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#F2F2F2] text-xs">
                          {!a.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(a.id)}
                              className="text-[#0A0A0A] hover:text-[#FF4D00] font-semibold uppercase text-[10px]"
                            >
                              Set as Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(a.id)}
                            className="text-red-600 hover:text-red-700 font-semibold uppercase text-[10px] ml-auto flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-4 max-w-md">
                <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A] mb-4">
                  Account Details
                </h2>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.name}
                    className="w-full h-11 px-3.5 text-xs bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] text-[#0A0A0A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full h-11 px-3.5 text-xs bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] text-[#0A0A0A]"
                  />
                </div>

                <div className="pt-4 border-t border-[#F2F2F2]">
                  <p className="text-[11px] text-[#8A8A8A] leading-relaxed">
                    TechBazaar accounts use encrypted password hashes (bcrypt salt rounds = 10) and secure httpOnly session cookies.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
