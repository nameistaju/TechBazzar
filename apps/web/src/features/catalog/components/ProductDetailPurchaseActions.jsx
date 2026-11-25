import React from 'react';
import {
  Heart,
  ShoppingBag,
  Check,
  Plus,
  Minus,
  ArrowRight,
  Bell,
  AlertCircle
} from 'lucide-react';

export default function ProductDetailPurchaseActions({
  product,
  isOutOfStock,
  isWholesale,
  quantity,
  setQuantity,
  moq,
  packSize,
  stock,
  isAdded,
  handleAddToCart,
  handleBuyNow,
  toggleWishlist,
  inWishlist,
  navigate,
  notifySuccess,
  handleNotifyMe,
  notifyEmail,
  setNotifyEmail,
  notifyLoading
}) {
  return (
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
                onClick={() => {
                  if (isWholesale) {
                    setQuantity(Math.max(moq, quantity - packSize));
                  } else {
                    setQuantity(Math.max(1, quantity - 1));
                  }
                }}
                disabled={isWholesale ? quantity <= moq : quantity <= 1}
                className="p-2 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors disabled:opacity-30 cursor-pointer"
              >
                <Minus size={14} />
              </button>
              <span className="px-4 text-xs font-semibold tabular-nums text-[#0A0A0A]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isWholesale) {
                    setQuantity(Math.min(stock, quantity + packSize));
                  } else {
                    setQuantity(Math.min(stock, quantity + 1));
                  }
                }}
                className="p-2 hover:bg-[#F7F7F7] text-[#0A0A0A] transition-colors disabled:opacity-40 cursor-pointer"
                disabled={quantity >= stock}
              >
                <Plus size={14} />
              </button>
            </div>

            {isWholesale ? (
              <span className="text-[11px] text-[#6B6B6B]">
                MOQ: <strong className="text-[#0A0A0A]">{moq}</strong> (Pack: {packSize})
              </span>
            ) : (
              <span className="text-[11px] text-[#6B6B6B]">
                Single unit purchase
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
                  <Check size={16} /> Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag size={16} strokeWidth={1.75} />
                  <span>{isWholesale ? `Add ${quantity} Units` : 'Add to Bag'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 py-4 px-6 rounded-[4px] text-xs font-semibold uppercase tracking-widest bg-[#FF4D00] hover:bg-[#E04400] text-white transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isWholesale ? 'Bulk Checkout' : 'Buy Now'}</span>
              <ArrowRight size={15} />
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

          {/* Wholesale Quote CTA */}
          {isWholesale && (
            <button
              type="button"
              onClick={() => navigate(`/quote?productId=${product.id}&qty=${quantity}`)}
              className="w-full py-2.5 px-4 rounded-[4px] border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              Request Custom Bulk Quote →
            </button>
          )}
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
  );
}
