import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Check, Star } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function ProductListRow({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const [isAdded, setIsAdded] = useState(false);
  const inWishlist = isInWishlist(product.id);

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
    <div className="group bg-white border border-[#EAEAEA] rounded-[4px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[#D4D4D4] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all">
      
      {/* Product Image */}
      <Link to={`/product/${product.id}`} className="w-28 h-28 sm:w-36 sm:h-36 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] p-3 shrink-0 flex items-center justify-center relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
        {discountPercent && (
          <span className="absolute top-2 left-2 bg-[#FF4D00] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-[2px]">
            -{discountPercent}%
          </span>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="text-[10px] uppercase tracking-widest text-[#6B6B6B] font-medium">
          {product.brand}
        </div>
        <Link 
          to={`/product/${product.id}`}
          className="text-sm font-semibold text-[#0A0A0A] hover:text-[#FF4D00] transition-colors line-clamp-1"
        >
          {product.name}
        </Link>
        <p className="text-xs text-[#6B6B6B] line-clamp-2 leading-relaxed">
          {product.shortDescription}
        </p>
        
        {/* Spec Tags */}
        <div className="flex items-center flex-wrap gap-1.5 pt-1">
          {product.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] bg-[#F7F7F7] border border-[#EAEAEA] text-[#6B6B6B] px-2 py-0.5 rounded-[2px]">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Pricing & Actions */}
      <div className="w-full sm:w-48 shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F2F2F2]">
        <div className="text-left sm:text-right">
          <div className="text-base font-semibold text-[#0A0A0A] tabular-nums">
            ₹{product.price.toLocaleString('en-IN')}
          </div>
          {product.originalPrice && product.originalPrice > product.price && (
            <div className="text-xs text-[#8A8A8A] line-through tabular-nums">
              ₹{product.originalPrice.toLocaleString('en-IN')}
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] text-amber-500 font-medium pt-1">
            <Star size={11} className="fill-current" />
            <span>{product.rating}</span>
            <span className="text-[#8A8A8A]">({product.reviewsCount})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleWishlist}
            className={`p-2 rounded-[4px] border border-[#EAEAEA] transition-colors ${
              inWishlist ? 'text-[#FF4D00] bg-[#FFF0EB]' : 'text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F7F7F7]'
            }`}
            aria-label="Wishlist"
          >
            <Heart size={15} className={inWishlist ? 'fill-current' : ''} />
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`px-4 py-2 rounded-[4px] text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              isAdded 
                ? 'bg-emerald-600 text-white' 
                : 'bg-[#0A0A0A] text-white hover:bg-[#FF4D00]'
            }`}
          >
            {isAdded ? (
              <>
                <Check size={14} /> Added
              </>
            ) : (
              <>
                <ShoppingBag size={14} /> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
