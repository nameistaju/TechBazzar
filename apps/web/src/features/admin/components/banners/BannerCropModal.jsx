import React, { useRef, useState } from 'react';
import { Crop, X, Eye, EyeOff } from 'lucide-react';

export default function BannerCropModal({
  cropModalOpen,
  setCropModalOpen,
  cropTargetDevice,
  canvasRef,
  cropZoom,
  setCropZoom,
  cropPan,
  setCropPan,
  cropFocalPoint,
  setCropFocalPoint,
  showSafeZone,
  setShowSafeZone,
  handleApplyCrop,
  uploadingCrop,
}) {
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  if (!cropModalOpen) return null;

  const startDrag = (clientX, clientY) => {
    setDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: cropPan?.x || 0,
      panY: cropPan?.y || 0,
    };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragging || !setCropPan) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setCropPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const endDrag = () => setDragging(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 animate-fadeIn">
      <div className="bg-white rounded-[4px] shadow-2xl max-w-2xl w-full p-6 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
          <div className="flex items-center gap-2">
            <Crop size={16} className="text-accent-text" />
            <h3 className="font-bold uppercase text-[#0A0A0A]">
              Crop &amp; Frame ({cropTargetDevice === 'desktop' ? '3:1 Desktop (1800×600)' : '4:3 Mobile (1200×900)'})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setCropModalOpen(false)}
            className="p-1 hover:bg-[#EAEAEA] rounded cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div
          className="flex justify-center bg-[#111] p-2 rounded overflow-hidden select-none cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => e.touches[0] && startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => e.touches[0] && moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={endDrag}
        >
          <canvas
            ref={canvasRef}
            className="max-h-72 w-auto shadow-md border border-[#333]"
          />
        </div>

        <div className="text-[10px] text-[#6B6B6B] flex items-center justify-between">
          <span>Drag image to pan • Use slider to zoom</span>
          <button
            type="button"
            onClick={() => setShowSafeZone?.(!showSafeZone)}
            className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#EAEAEA] rounded hover:border-[#0A0A0A] text-[#0A0A0A] cursor-pointer"
          >
            {showSafeZone ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showSafeZone ? 'Hide Safe Zone' : 'Show Safe Zone'}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-[#6B6B6B]">Zoom:</span>
            <input
              type="range"
              aria-label="Crop zoom"
              min="1"
              max="3"
              step="0.05"
              value={cropZoom}
              onChange={(e) => setCropZoom(parseFloat(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="text-[11px] w-10 text-right font-bold">{cropZoom.toFixed(2)}x</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[#6B6B6B]">Focal Alignment:</span>
            <div className="inline-flex rounded border border-[#EAEAEA] p-0.5">
              {['top', 'center', 'bottom'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCropFocalPoint(f)}
                  className={`px-3 py-1 text-[10px] uppercase font-bold rounded cursor-pointer ${
                    cropFocalPoint === f ? 'bg-[#0A0A0A] text-white' : 'text-[#6B6B6B]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {showSafeZone && (
            <div className="p-2 bg-accent-tint border border-accent-border text-accent-text text-[10px] rounded">
              Dashed rectangle indicates the 80% safe zone. Keep critical text and logos inside it.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAEAEA]">
          <button
            type="button"
            onClick={() => setCropModalOpen(false)}
            className="px-4 py-2 border border-[#EAEAEA] text-xs uppercase font-bold rounded cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={uploadingCrop}
            onClick={handleApplyCrop}
            className="px-5 py-2 bg-accent hover:bg-accent-hover text-accent-contrast text-xs uppercase font-bold rounded cursor-pointer disabled:opacity-50"
          >
            {uploadingCrop ? 'Uploading...' : 'Apply & Save WebP'}
          </button>
        </div>
      </div>
    </div>
  );
}
