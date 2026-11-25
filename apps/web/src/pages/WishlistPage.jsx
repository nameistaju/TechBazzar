import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import Breadcrumbs from '../components/common/Breadcrumbs';

export default function WishlistPage() {
  const { wishlist, wishlistCount, addToCart, removeFromWishlist } = useStore();

  const handleMoveToCart = (product) => {
    addToCart(product, 1);
    removeFromWishlist(product.id);
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Saved Wishlist' }]} />

        {/* Title */}
        <div className="py-6 border-b border-[#EAEAEA] mb-8">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF4D00] font-bold block mb-1">
            Curated Shortlist
          </span>
          <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-widest text-[#0A0A0A]">
            Saved Wishlist ({wishlistCount})
          </h1>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20 bg-[#F7F7F7] border border-[#EAEAEA] rounded-[4px] p-8 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#9E9E9E] mx-auto mb-4 shadow-sm">
              <Heart size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-[#0A0A0A] mb-1">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto mb-6">
              Bookmark headphones, smartwatches, power banks, and accessories while you browse.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white text-xs font-semibold uppercase tracking-widest px-6 py-3 rounded-[4px] hover:bg-[#FF4D00] transition-colors"
            >
              Explore Products <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlist.map((product) => (
              <div 
                key={product.id}
                className="bg-white border border-[#EAEAEA] rounded-[4px] p-4 flex flex-col justify-between group hover:border-[#D4D4D4] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all relative"
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFromWishlist(product.id)}
                  className="absolute top-3 right-3 text-[#9E9E9E] hover:text-red-500 p-1 rounded-full z-10 transition-colors"
                  title="Remove from wishlist"
                >
                  <Trash2 size={15} />
                </button>

                {/* Image */}
                <Link to={`/product/${product.id}`} className="block aspect-square w-full mb-3 bg-[#FAFAFA] rounded-[4px] p-4 flex items-center justify-center">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Details */}
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#6B6B6B] font-medium block mb-1">
                    {product.brand}
                  </span>
                  <Link
                    to={`/product/${product.id}`}
                    className="text-xs font-medium text-[#0A0A0A] hover:text-[#FF4D00] line-clamp-1 transition-colors block mb-2"
                  >
                    {product.name}
                  </Link>
                  <div className="text-sm font-semibold text-[#0A0A0A] tabular-nums mb-3">
                    ₹{product.price.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Move to Cart CTA */}
                <button
                  type="button"
                  onClick={() => handleMoveToCart(product)}
                  className="w-full bg-[#0A0A0A] hover:bg-[#FF4D00] text-white text-xs font-semibold uppercase tracking-wider py-2.5 rounded-[4px] transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag size={14} /> Move to Bag
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
