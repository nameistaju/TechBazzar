import React from 'react';
import { Crop, X } from 'lucide-react';

export default function BannerCropModal({
  cropModalOpen,
  setCropModalOpen,
  cropTargetDevice,
  canvasRef,
  cropZoom,
  setCropZoom,
  cropFocalPoint,
  setCropFocalPoint,
  handleApplyCrop,
}) {
  if (!cropModalOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 animate-fadeIn">
      <div className="bg-white rounded-[4px] shadow-2xl max-w-2xl w-full p-6 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
          <div className="flex items-center gap-2">
            <Crop size={16} className="text-[#FF4D00]" />
            <h3 className="font-bold uppercase text-[#0A0A0A]">
              Precision Aspect Ratio Crop ({cropTargetDevice === 'desktop' ? '3:1 Desktop' : '4:3 Mobile'})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setCropModalOpen(false)}
            className="p-1 hover:bg-[#EAEAEA] rounded"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex justify-center bg-[#111] p-2 rounded overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-h-72 w-auto shadow-md border border-[#333]"
          />
        </div>

        {/* Controls */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-[#6B6B6B]">Zoom:</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={cropZoom}
              onChange={(e) => setCropZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#FF4D00]"
            />
            <span className="text-[11px] w-8 text-right font-bold">{cropZoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#6B6B6B]">Focal Alignment:</span>
            <div className="inline-flex rounded border border-[#EAEAEA] p-0.5">
              {['top', 'center', 'bottom'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCropFocalPoint(f)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold rounded ${
                    cropFocalPoint === f ? 'bg-[#0A0A0A] text-white' : 'text-[#6B6B6B]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 bg-orange-50 border border-orange-200 text-orange-800 text-[10px] rounded">
            Orange dashed rectangle indicates the 80% Safe Zone. Keep critical text and logos within this boundary.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAEAEA]">
          <button
            type="button"
            onClick={() => setCropModalOpen(false)}
            className="px-4 py-2 border border-[#EAEAEA] text-xs uppercase font-bold rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2 bg-[#FF4D00] hover:bg-[#E04400] text-white text-xs uppercase font-bold rounded"
          >
            Apply & Save WebP
          </button>
        </div>
      </div>
    </div>
  );
}
