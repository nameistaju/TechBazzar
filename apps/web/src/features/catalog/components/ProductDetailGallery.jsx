import React from 'react';

export default function ProductDetailGallery({
  product,
  discountPercent,
  isZoomed,
  setIsZoomed,
  mousePos,
  handleMouseMove
}) {
  return (
    <div className="lg:col-span-6 space-y-4">
      <div 
        className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[4px] aspect-square p-8 sm:p-12 flex items-center justify-center relative overflow-hidden group cursor-crosshair"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {discountPercent && (
          <span className="absolute top-4 left-4 bg-accent text-accent-contrast text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-[2px] uppercase z-10">
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
  );
}
