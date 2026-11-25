import React from 'react';
import { X } from 'lucide-react';

export default function ProductImagePickerModal({
  showImagePicker,
  setShowImagePicker,
  availableImages,
  imagePickerSearch,
  setImagePickerSearch,
  form,
  setForm,
}) {
  if (!showImagePicker) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white border border-[#0A0A0A] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-[#EAEAEA] flex items-center justify-between bg-white">
          <div>
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#0A0A0A]">
              Select from /public/images ({availableImages.length} items)
            </h3>
            <p className="text-[11px] text-[#6B6B6B]">Click an image to add it to this product's gallery</p>
          </div>
          <button onClick={() => setShowImagePicker(false)} className="p-1">
            <X className="w-5 h-5 text-[#6B6B6B]" />
          </button>
        </div>

        <div className="p-3 border-b border-[#EAEAEA] bg-gray-50">
          <input
            type="text"
            placeholder="Filter by image filename..."
            value={imagePickerSearch}
            onChange={(e) => setImagePickerSearch(e.target.value)}
            className="w-full px-3 py-1.5 border border-[#CCC] text-xs bg-white"
          />
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-6 gap-3">
          {availableImages
            .filter(img => img.filename.toLowerCase().includes(imagePickerSearch.toLowerCase()))
            .map((img) => {
              const isAssigned = form.images?.includes(img.path);
              return (
                <div
                  key={img.filename}
                  onClick={() => {
                    if (isAssigned) {
                      setForm({ ...form, images: form.images.filter(x => x !== img.path) });
                    } else {
                      const updated = [...(form.images || []), img.path];
                      setForm({ ...form, images: updated, image: updated[0] });
                    }
                  }}
                  className={`p-2 border cursor-pointer hover:border-[#0A0A0A] transition-all relative ${
                    isAssigned ? 'border-accent bg-accent-tint' : 'border-[#EAEAEA] bg-white'
                  }`}
                >
                  <img
                    src={img.path}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/placeholder-product.svg';
                    }}
                    className="w-full h-16 object-contain"
                  />
                  <div className="text-[10px] font-mono text-[#6B6B6B] truncate mt-1 text-center">
                    {img.filename}
                  </div>
                  {isAssigned && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-accent text-black rounded-full flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <div className="p-3 border-t border-[#EAEAEA] bg-gray-50 flex justify-end">
          <button
            onClick={() => setShowImagePicker(false)}
            className="px-4 py-1.5 bg-[#0A0A0A] text-white text-xs font-mono uppercase"
          >
            Done Selecting
          </button>
        </div>
      </div>
    </div>
  );
}
