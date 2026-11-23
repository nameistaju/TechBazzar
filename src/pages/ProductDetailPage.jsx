import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ShoppingBag, 
  Check, 
  Star, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Plus, 
  Minus, 
  MapPin, 
  Share2,
  ArrowRight,
  Package,
  Bell,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { products as localProducts } from '../data/products';
import { categories } from '../data/categories';
import Breadcrumbs from '../components/common/Breadcrumbs';
import ProductCard from '../components/common/ProductCard';
import productsApi from '../api/productsApi';
import miscApi from '../api/miscApi';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist, recordViewedProduct, showToast } = useStore();

  const [product, setProduct] = useState(() => {
    return localProducts.find((p) => p.id === id) || null;
  });
  const [loading, setLoading] = useState(false);

  // Fetch live product from API
  useEffect(() => {
    let isMounted = true;
    async function loadLiveProduct() {
      if (!id) return;
      const res = await productsApi.getProductById(id);
      if (isMounted && res.data?.product) {
        setProduct(res.data.product);
      }
    }
    loadLiveProduct();
    return () => { isMounted = false; };
  }, [id]);

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs', 'description', 'reviews'
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // Notify Me state for out-of-stock items
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (product) {
      recordViewedProduct(product);
    }
  }, [id, product]);

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-light uppercase tracking-widest text-[#0A0A0A] mb-2">
          Product Not Found
        </h2>
        <p className="text-xs text-[#6B6B6B] max-w-sm mb-6">
          The gadget you are looking for might have been moved or is out of catalog.
        </p>
        <Link
          to="/shop"
          className="bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const stock = product.stock !== undefined ? product.stock : 10;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 3;

  const inWishlist = isInWishlist(product.id);

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const savingsAmount = product.originalPrice && product.originalPrice > product.price
    ? product.originalPrice - product.price
    : 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, false);
    navigate('/checkout');
  };

  const handleCheckPincode = (e) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setPincodeStatus({ valid: false, text: 'Please enter a valid 6-digit Indian PIN code' });
      return;
    }
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);
    const dateStr = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    setPincodeStatus({
      valid: true,
      text: `FREE Express Delivery to ${pincode} by ${dateStr}`
    });
  };

  const handleNotifyMe = async (e) => {
    e.preventDefault();
    if (!notifyEmail || !notifyEmail.includes('@')) {
      showToast('Please enter a valid email address');
      return;
    }
    setNotifyLoading(true);
    const res = await miscApi.notifyMe(product.id, notifyEmail);
    setNotifyLoading(false);
    if (!res.error) {
      setNotifySuccess(true);
      showToast("We'll email you the moment this item is restocked!");
    } else {
      showToast(res.error);
    }
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  const categoryObj = categories.find((c) => c.id === product.category);
  const relatedProducts = localProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Shop', link: '/shop' },
            ...(categoryObj ? [{ label: categoryObj.name, link: `/shop?category=${categoryObj.id}` }] : []),
            { label: product.name }
          ]}
        />

        {/* Top Product Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 py-8 items-start">
          
          {/* Left Column: Image Gallery with Zoom */}
          <div className="lg:col-span-6 space-y-4">
            <div 
              className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] aspect-square p-8 sm:p-12 flex items-center justify-center relative overflow-hidden group cursor-crosshair"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              {discountPercent && (
                <span className="absolute top-4 left-4 bg-[#FF4D00] text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-[2px] uppercase z-10">
                  Save {discountPercent}%
                </span>
              )}

              {/* Zoomable Image Container */}
              <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-100"
                style={{
                  transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                  transform: isZoomed ? 'scale(1.8)' : 'scale(1)'
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.06)]"
                />
              </div>

              {/* Hover Zoom hint */}
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-[10px] uppercase tracking-wider text-[#6B6B6B] px-2 py-1 rounded border border-[#EAEAEA] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                Hover to Zoom
              </div>
            </div>

            {/* Thumbnail preview */}
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-[4px] border-2 border-[#0A0A0A] p-1 bg-white cursor-pointer">
                <img src={product.image} alt="Thumbnail 1" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          {/* Right Column: Details, Pricing, CTAs */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              {/* Brand & Share */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#6B6B6B]">
                  {product.brand}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast('Product link copied to clipboard!');
                  }}
                  className="text-xs text-[#8A8A8A] hover:text-[#0A0A0A] flex items-center gap-1 transition-colors"
                >
                  <Share2 size={13} /> Share
                </button>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-wide text-[#0A0A0A] leading-tight mb-3">
                {product.name}
              </h1>

              {/* Rating & Stock Status */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B6B6B]">
                <div className="flex items-center text-amber-500 font-semibold tabular-nums">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < Math.floor(product.rating || 4.5) ? 'fill-current text-amber-400' : 'text-gray-300'}
                    />
                  ))}
                  <span className="ml-1.5 text-[#0A0A0A]">{product.rating}</span>
                </div>
                <span>•</span>
                <span className="tabular-nums">{product.reviewsCount || 420} verified reviews</span>
                <span>•</span>
                {isOutOfStock ? (
                  <span className="text-red-600 font-semibold uppercase tracking-wider text-[11px] bg-red-50 px-2 py-0.5 rounded-[2px] border border-red-200">
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="text-[#FF4D00] font-bold tracking-wider text-[11px] bg-[#FFF0EB] px-2 py-0.5 rounded-[2px] border border-[#FFD4C2]">
                    Only {stock} left
                  </span>
                ) : (
                  <span className="text-emerald-600 font-medium">In Stock ({stock} units)</span>
                )}
              </div>
            </div>

            {/* Pricing Section */}
            <div className="p-4 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#0A0A0A] tabular-nums">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-base text-[#8A8A8A] line-through tabular-nums">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                {savingsAmount > 0 && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[2px]">
                    You save ₹{savingsAmount.toLocaleString('en-IN')} ({discountPercent}%)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#6B6B6B]">
                Inclusive of all taxes. Free express shipping on this item.
              </p>
            </div>

            {/* Spec Highlights Chips */}
            <div className="flex flex-wrap gap-2">
              {(product.tags || []).map((tag, i) => (
                <span
                  key={i}
                  className="bg-white border border-[#EAEAEA] text-[#0A0A0A] text-xs font-medium px-3 py-1.5 rounded-[4px]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Short Description */}
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              {product.shortDescription}
            </p>

            {/* Quantity Stepper & CTAs or Notify Me Form */}
            <div className="pt-2 space-y-3">
              {!isOutOfStock ? (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-xs uppercase tracking-wider text-[#6B6B6B] font-medium">
                      Quantity:
                    </span>
                    <div className="flex items-center border border-[#EAEAEA] rounded-[4px] bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-4 text-xs font-semibold tabular-nums text-[#0A0A0A]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                        className="p-2 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors disabled:opacity-40"
                        disabled={quantity >= stock}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {isLowStock && (
                      <span className="text-[11px] text-[#FF4D00] font-medium">
                        Max available: {stock}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons: Add to Cart, Buy Now, Wishlist */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`flex-1 py-4 px-6 rounded-[4px] text-xs font-semibold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                        isAdded 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-[#0A0A0A] text-white hover:bg-[#FF4D00]'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={16} /> Added to Bag
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={16} strokeWidth={1.75} /> Add to Bag
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="flex-1 py-4 px-6 rounded-[4px] text-xs font-semibold uppercase tracking-widest bg-[#FF4D00] hover:bg-[#E04400] text-white transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      Buy Now <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(product)}
                      className={`p-4 rounded-[4px] border border-[#EAEAEA] transition-colors flex items-center justify-center cursor-pointer ${
                        inWishlist ? 'text-[#FF4D00] bg-[#FFF0EB] border-[#FF4D00]' : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
                      }`}
                      aria-label="Wishlist"
                    >
                      <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
                    </button>
                  </div>
                </>
              ) : (
                /* Out of stock: disabled buttons + Notify Me form */
                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-gray-50 border border-[#EAEAEA] rounded-[4px]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0A0A] mb-1">
                      <AlertCircle size={16} className="text-[#FF4D00]" />
                      <span>This product is currently out of stock</span>
                    </div>
                    <p className="text-xs text-[#6B6B6B] mb-3">
                      Leave your email below and we will notify you immediately once new inventory arrives.
                    </p>

                    {notifySuccess ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-[4px] flex items-center gap-2">
                        <Check size={14} /> You're on the priority notification list!
                      </div>
                    ) : (
                      <form onSubmit={handleNotifyMe} className="flex gap-2">
                        <input
                          type="email"
                          required
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="flex-1 h-10 px-3 text-xs bg-white border border-[#EAEAEA] rounded-[4px] focus:outline-none focus:border-[#0A0A0A]"
                        />
                        <button
                          type="submit"
                          disabled={notifyLoading}
                          className="h-10 px-4 bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider rounded-[4px] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Bell size={13} /> {notifyLoading ? 'Saving...' : 'Notify Me'}
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-3 px-4 bg-[#EAEAEA] text-[#8A8A8A] text-xs font-semibold uppercase tracking-widest rounded-[4px] cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(product)}
                      className={`p-3 rounded-[4px] border border-[#EAEAEA] transition-colors flex items-center justify-center cursor-pointer ${
                        inWishlist ? 'text-[#FF4D00] bg-[#FFF0EB] border-[#FF4D00]' : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
                      }`}
                      aria-label="Wishlist"
                    >
                      <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pincode Delivery Check */}
            <div className="pt-4 border-t border-[#EAEAEA]">
              <span className="text-xs uppercase tracking-wider text-[#0A0A0A] font-semibold block mb-2">
                Estimated Delivery & Pincode Check
              </span>
              <form onSubmit={handleCheckPincode} className="flex gap-2 max-w-sm">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN code (e.g. 560001)"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-[#EAEAEA] text-xs text-[#0A0A0A] pl-8 pr-3 py-2.5 rounded-[4px] outline-none focus:border-[#0A0A0A]"
                  />
                  <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                </div>
                <button
                  type="submit"
                  className="bg-[#F7F7F7] border border-[#EAEAEA] hover:border-[#0A0A0A] text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-[4px] transition-colors cursor-pointer"
                >
                  Check
                </button>
              </form>

              {pincodeStatus && (
                <div className={`mt-2 text-xs flex items-center gap-1.5 ${
                  pincodeStatus.valid ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {pincodeStatus.valid ? <Check size={14} /> : <span className="font-bold">•</span>}
                  <span>{pincodeStatus.text}</span>
                </div>
              )}
            </div>

            {/* Trust highlights */}
            <div className="grid grid-cols-2 gap-3 pt-3 text-xs text-[#6B6B6B]">
              <div className="flex items-center gap-2">
                <Truck size={15} className="text-[#0A0A0A]" />
                <span>Pan-India Air Dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#0A0A0A]" />
                <span>1-Year Official Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw size={15} className="text-[#0A0A0A]" />
                <span>7 Days Return Window</span>
              </div>
              <div className="flex items-center gap-2">
                <Package size={15} className="text-[#0A0A0A]" />
                <span>Brand Sealed Packaging</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Info Section: Specs, Description, Reviews */}
        <div className="mt-16 pt-10 border-t border-[#EAEAEA]">
          <div className="flex gap-8 border-b border-[#EAEAEA] mb-8">
            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'specs'
                  ? 'border-b-2 border-[#FF4D00] text-[#0A0A0A]'
                  : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
              }`}
            >
              Technical Specifications
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'description'
                  ? 'border-b-2 border-[#FF4D00] text-[#0A0A0A]'
                  : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
              }`}
            >
              Overview & Architecture
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'border-b-2 border-[#FF4D00] text-[#0A0A0A]'
                  : 'text-[#8A8A8A] hover:text-[#0A0A0A]'
              }`}
            >
              Reviews ({product.reviewsCount || 420})
            </button>
          </div>

          <div className="max-w-3xl">
            {activeTab === 'specs' && (
              <div className="divide-y divide-[#F2F2F2]">
                {Object.entries(product.specs || {}).map(([key, value]) => (
                  <div key={key} className="py-3 grid grid-cols-3 gap-4 text-xs">
                    <span className="font-semibold text-[#0A0A0A]">{key}</span>
                    <span className="col-span-2 text-[#6B6B6B]">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'description' && (
              <div className="space-y-4 text-xs text-[#6B6B6B] leading-relaxed">
                <p>
                  The {product.name} represents high-precision industrial craft tailored for discerning technology enthusiasts. Every component is rigorously calibrated for enduring performance, tactile satisfaction, and minimalist elegance.
                </p>
                <p>
                  Engineered with premium materials and backed by TechBazaar's 100% authenticity guarantee, this hardware is inspected, sealed, and dispatched with climate-conscious packaging.
                </p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="p-4 bg-[#F7F7F7] rounded-[4px] border border-[#EAEAEA] flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-[#0A0A0A] tabular-nums">
                      {product.rating} / 5.0
                    </div>
                    <p className="text-xs text-[#6B6B6B]">Based on verified customer purchases across India</p>
                  </div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} className="fill-current" />
                    ))}
                  </div>
                </div>

                <div className="space-y-4 divide-y divide-[#F2F2F2]">
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#0A0A0A]">Kavya M. (Bengaluru)</span>
                      <span className="text-[10px] text-[#8A8A8A]">3 days ago</span>
                    </div>
                    <p className="text-xs text-[#6B6B6B] leading-relaxed">
                      "Spectacular build quality and the finish is even cleaner in person. Fast dispatch by TechBazaar — reached me in 48 hours."
                    </p>
                  </div>
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#0A0A0A]">Rohan S. (Mumbai)</span>
                      <span className="text-[10px] text-[#8A8A8A]">1 week ago</span>
                    </div>
                    <p className="text-xs text-[#6B6B6B] leading-relaxed">
                      "Authentic sealed unit. Battery life and acoustic fidelity easily match the manufacturer claims. Highly recommended!"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#FF4D00] font-semibold block mb-1">
                  Complementary Hardware
                </span>
                <h3 className="text-xl sm:text-2xl font-light uppercase tracking-wider text-[#0A0A0A]">
                  You May Also Like
                </h3>
              </div>
              <Link
                to={`/shop?category=${product.category}`}
                className="text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] hover:text-[#FF4D00] transition-colors"
              >
                View Category →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((relProduct) => (
                <ProductCard key={relProduct.id} product={relProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
