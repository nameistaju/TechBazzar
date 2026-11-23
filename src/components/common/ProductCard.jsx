import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Check, Star, Plus, Minus } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { getWholesaleTier } from '../../utils/wholesaleCalculation';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const [isAdded, setIsAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const moq = Number(product.moq || 10);
  const packSize = Number(product.packSize || 5);
  const [qty, setQty] = useState(moq);

  const inWishlist = isInWishlist(product.id);

  // Wholesale tier pricing calculations
  const currentTier = getWholesaleTier(product, qty);
  const lowestPrice = product.tier3Price || Math.round((product.price || 1000) * 0.8);
  const mrp = Number(product.mrp || product.originalPrice || Math.round((product.price || 1000) * 1.35));
  const maxSavingsPercent = mrp > 0 ? Math.round(((mrp - lowestPrice) / mrp) * 100) : 25;

  const handleStepDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(prev => Math.max(moq, prev - packSize));
  };

  const handleStepUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(prev => prev + packSize);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, qty);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div className="group bg-white border border-[#EAEAEA] rounded-[4px] p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#D4D4D4] hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.06)] relative">
      
      {/* Top Badges: Savings & MOQ & Wishlist */}
      <div className="flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          {maxSavingsPercent > 0 && (
            <span className="inline-block bg-[#FF4D00] text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-[2px] uppercase">
              Save up to {maxSavingsPercent}%
            </span>
          )}
          <span className="inline-flex items-center gap-0.5 bg-[#0A0A0A] text-white text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded-[2px] uppercase">
            MOQ {moq}
          </span>
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          className={`p-1.5 rounded-full transition-all duration-200 ${
            inWishlist 
              ? 'text-[#FF4D00] bg-[#FFF0EB] scale-110' 
              : 'text-[#8A8A8A] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
          }`}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart 
            size={16} 
            strokeWidth={1.75} 
            className={`transition-all duration-200 ${inWishlist ? 'fill-current animate-heart' : ''}`} 
          />
        </button>
      </div>

      {/* Product Image with Skeleton Loading */}
      <Link to={`/product/${product.id}`} className="block relative aspect-square w-full mb-3 bg-[#FAFAFA] rounded-[4px] overflow-hidden p-3 flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className="w-full h-full object-contain img-zoom-hover transition-transform duration-300 relative z-10"
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#F5F5F5] animate-pulse z-0" />
        )}
      </Link>

      {/* Product Information */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & SKU */}
          <div className="flex items-center justify-between text-[10px] text-[#6B6B6B] font-medium mb-1">
            <span className="uppercase tracking-widest">{product.brand}</span>
            <span className="font-mono text-[9px] text-[#8A8A8A]">{product.sku || 'B2B'}</span>
          </div>

          {/* Product Title */}
          <Link 
            to={`/product/${product.id}`}
            className="block text-xs font-medium text-[#0A0A0A] hover:text-[#FF4D00] line-clamp-2 transition-colors mb-2 leading-relaxed"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Rating & Stock */}
          <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] mb-2.5">
            <div className="flex items-center gap-1">
              <span className="flex items-center text-amber-500 font-semibold tabular-nums">
                <Star size={11} className="fill-current text-amber-400 mr-0.5" />
                {product.rating || '4.5'}
              </span>
              <span className="text-[#D4D4D4]">•</span>
              <span className="text-[10px] text-[#8A8A8A]">({product.reviewsCount || 12})</span>
            </div>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {product.stock > 0 ? `${product.stock} in bulk` : 'In Stock'}
            </span>
          </div>
        </div>

        {/* Pricing and Tier Stepper */}
        <div className="pt-2.5 border-t border-[#F2F2F2]">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="text-[10px] text-[#6B6B6B] uppercase tracking-wider">
                From <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">₹{lowestPrice.toLocaleString('en-IN')}</span> / unit
              </div>
              <div className="text-[10px] text-[#8A8A8A] line-through tabular-nums">
                MRP ₹{mrp.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[#FF4D00] tabular-nums">
                ₹{currentTier.unitPrice.toLocaleString('en-IN')}
              </div>
              <div className="text-[9px] text-[#6B6B6B]">
                Tier {currentTier.activeTier} ({qty} pcs)
              </div>
            </div>
          </div>

          {/* Stepper + Add to Cart Button */}
          <div className="flex items-center gap-1.5">
            {/* Quantity Stepper */}
            <div className="flex items-center border border-[#EAEAEA] rounded-[3px] bg-[#FAFAFA] overflow-hidden h-7">
              <button
                type="button"
                onClick={handleStepDown}
                disabled={qty <= moq}
                className="w-6 h-full flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-neutral-200/50 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Decrease quantity"
              >
                <Minus size={11} />
              </button>
              <span className="w-8 text-center text-[11px] font-semibold text-[#0A0A0A] tabular-nums select-none">
                {qty}
              </span>
              <button
                type="button"
                onClick={handleStepUp}
                className="w-6 h-full flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-neutral-200/50"
                aria-label="Increase quantity"
              >
                <Plus size={11} />
              </button>
            </div>

            {/* Quick Add Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex-1 h-7 rounded-[3px] text-[10px] font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1 ${
                isAdded 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-[#0A0A0A] text-white hover:bg-[#FF4D00] hover:text-white border border-[#0A0A0A] hover:border-[#FF4D00]'
              }`}
              aria-label={`Add ${qty} units to wholesale cart`}
            >
              {isAdded ? (
                <>
                  <Check size={12} className="stroke-[2.5]" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={11} strokeWidth={1.75} />
                  <span>Add {qty}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}