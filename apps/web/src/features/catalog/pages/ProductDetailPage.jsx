import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Check, 
  Star, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  MapPin, 
  Share2,
  Package
} from 'lucide-react';
import { useStore } from '@app/providers/StoreContext';
import { useCategories, useProduct, useProducts } from '@shared/hooks/useCatalog';
import Breadcrumbs from '@shared/ui/Breadcrumbs';
import ProductCard from '@shared/ui/ProductCard';
import BannerSlot from '@shared/ui/BannerSlot';
import ProductDetailGallery from '@features/catalog/components/ProductDetailGallery';
import ProductDetailPricingBox from '@features/catalog/components/ProductDetailPricingBox';
import ProductDetailPurchaseActions from '@features/catalog/components/ProductDetailPurchaseActions';
import ProductDetailTabs from '@features/catalog/components/ProductDetailTabs';
import miscApi from '@shared/api/miscApi';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mode, switchMode, addToCart, toggleWishlist, isInWishlist, recordViewedProduct, showToast } = useStore();

  const isWholesale = mode === 'wholesale';

  const { data: productData, isLoading: loading } = useProduct(id);
  const { data: categories = [] } = useCategories();
  const product = productData?.product || null;

  useEffect(() => {
    if (productData?.redirectedFrom && productData?.canonicalId && productData.canonicalId !== id) {
      navigate(`/product/${productData.canonicalId}`, { replace: true });
    }
  }, [productData, id, navigate]);

  const { data: relatedData } = useProducts(
    { category: product?.category, limit: 5 },
    { enabled: Boolean(product?.category) }
  );

  const moq = Number(product?.moq || 10);
  const packSize = Number(product?.packSize || 5);
  const [quantity, setQuantity] = useState(isWholesale ? moq : 1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs', 'description', 'reviews'
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // Sync quantity with mode switch
  useEffect(() => {
    if (isWholesale) {
      setQuantity(prev => Math.max(moq, prev));
    } else {
      setQuantity(prev => (prev > 10 ? 1 : Math.max(1, prev)));
    }
  }, [isWholesale, moq]);

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

  if (loading) {
    return (
      <div className="bg-white min-h-screen pb-24">
        <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: 'Shop', link: '/shop' }, { label: 'Loading...' }]} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 py-8 items-start animate-pulse">
            <div className="lg:col-span-6 aspect-square bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px]" />
            <div className="lg:col-span-6 space-y-5">
              <div className="h-3 w-28 bg-[#F0F0F0] rounded" />
              <div className="h-8 w-3/4 bg-[#EAEAEA] rounded" />
              <div className="h-4 w-40 bg-[#F0F0F0] rounded" />
              <div className="h-10 w-48 bg-[#EAEAEA] rounded" />
              <div className="h-24 w-full bg-[#F5F5F5] rounded" />
              <div className="h-12 w-full bg-[#EAEAEA] rounded-[4px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  const _savingsAmount = product.originalPrice && product.originalPrice > product.price
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
    if (isWholesale) {
      navigate('/wholesale-checkout');
    } else {
      navigate('/checkout');
    }
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

  const categoryObj = categories.find((c) => c.id === String(product.category || '').toLowerCase());
  const relatedProducts = (relatedData?.products || [])
    .filter((p) => p.id !== product.id)
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
          <ProductDetailGallery
            product={product}
            discountPercent={discountPercent}
            isZoomed={isZoomed}
            setIsZoomed={setIsZoomed}
            mousePos={mousePos}
            handleMouseMove={handleMouseMove}
          />

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

            {/* Mode-Aware Pricing Block */}
            <ProductDetailPricingBox
              isWholesale={isWholesale}
              product={product}
              quantity={quantity}
              setQuantity={setQuantity}
              switchMode={switchMode}
            />

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
            <ProductDetailPurchaseActions
              product={product}
              isOutOfStock={isOutOfStock}
              isWholesale={isWholesale}
              quantity={quantity}
              setQuantity={setQuantity}
              moq={moq}
              packSize={packSize}
              stock={stock}
              isAdded={isAdded}
              handleAddToCart={handleAddToCart}
              handleBuyNow={handleBuyNow}
              toggleWishlist={toggleWishlist}
              inWishlist={inWishlist}
              navigate={navigate}
              notifySuccess={notifySuccess}
              handleNotifyMe={handleNotifyMe}
              notifyEmail={notifyEmail}
              setNotifyEmail={setNotifyEmail}
              notifyLoading={notifyLoading}
            />

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
        <ProductDetailTabs product={product} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Slot 6: product-below Banner */}
        <div className="my-12">
          <BannerSlot slot="product-below" />
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
