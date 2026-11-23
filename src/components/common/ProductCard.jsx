import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Check, Star } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const [isAdded, setIsAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const inWishlist = isInWishlist(product.id);

  // Discount percentage calculation
  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
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
      
      {/* Top Badges: Discount & Wishlist */}
      <div className="flex items-center justify-between mb-2 z-10">
        <div>
          {discountPercent ? (
            <span className="inline-block bg-[#FF4D00] text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-[2px] uppercase">
              -{discountPercent}%
            </span>
          ) : product.isNew ? (
            <span className="inline-block bg-[#0A0A0A] text-white text-[10px] font-medium tracking-widest px-2 py-0.5 rounded-[2px] uppercase">
              NEW
            </span>
          ) : (
            <span />
          )}
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
      <Link to={`/product/${product.id}`} className="block relative aspect-square w-full mb-4 bg-[#FAFAFA] rounded-[4px] overflow-hidden p-4 flex items-center justify-center">
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
          {/* Brand */}
          <div className="text-[10px] uppercase tracking-widest text-[#6B6B6B] font-medium mb-1">
            {product.brand}
          </div>

          {/* Product Title */}
          <Link 
            to={`/product/${product.id}`}
            className="block text-xs font-medium text-[#0A0A0A] hover:text-[#FF4D00] line-clamp-2 transition-colors mb-2 leading-relaxed"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B] mb-3">
            <span className="flex items-center text-amber-500 font-semibold tabular-nums">
              <Star size={12} className="fill-current text-amber-400 mr-0.5" />
              {product.rating}
            </span>
            <span className="text-[#D4D4D4]">•</span>
            <span className="tabular-nums">({product.reviewsCount})</span>
          </div>
        </div>

        {/* Pricing and Quick Add to Cart */}
        <div className="pt-3 border-t border-[#F2F2F2] flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[#0A0A0A] tabular-nums">
              ₹{product.price.toLocaleString('en-IN')}
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <div className="text-[11px] text-[#8A8A8A] line-through tabular-nums">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`px-3 py-2 rounded-[4px] text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 ${
              isAdded 
                ? 'bg-emerald-600 text-white' 
                : 'bg-[#F7F7F7] text-[#0A0A0A] hover:bg-[#FF4D00] hover:text-white border border-[#EAEAEA] hover:border-[#FF4D00]'
            }`}
            aria-label="Add to cart"
          >
            {isAdded ? (
              <>
                <Check size={13} className="stroke-[2.5]" />
                <span className="text-[10px]">Added</span>
              </>
            ) : (
              <>
                <ShoppingBag size={13} strokeWidth={1.75} />
                <span className="text-[10px]">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
