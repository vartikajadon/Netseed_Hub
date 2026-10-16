import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import {
  ZoomIn, ZoomOut, Move, RotateCcw, Check, X, Camera, RefreshCw
} from 'lucide-react';

interface PhotoAdjusterModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
  isSaving?: boolean;
}

export const PhotoAdjusterModal: React.FC<PhotoAdjusterModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset controls whenever modal opens with a new image
  useEffect(() => {
    if (isOpen) {
      setScale(1.0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleReset = () => {
    setScale(1.0);
    setPosition({ x: 0, y: 0 });
  };

  const handleCropAndSave = () => {
    const canvas = document.createElement('canvas');
    const targetSize = 400; // Output high-res 400x400 avatar
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');

    if (!ctx || !imageRef.current) return;

    const img = imageRef.current;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetSize, targetSize);

    // Frame preview box size in UI is 220x220
    const frameSizeInUi = 220;
    const factor = targetSize / frameSizeInUi;

    const drawWidth = (img.naturalWidth || 300) * scale * (frameSizeInUi / (img.naturalWidth || 300));
    const drawHeight = (img.naturalHeight || 300) * scale * (frameSizeInUi / (img.naturalWidth || 300));

    // Calculate center offset with user position dragging
    const offsetX = (frameSizeInUi - drawWidth) / 2 + position.x;
    const offsetY = (frameSizeInUi - drawHeight) / 2 + position.y;

    ctx.drawImage(
      img,
      offsetX * factor,
      offsetY * factor,
      drawWidth * factor,
      drawHeight * factor
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
    onSave(croppedDataUrl);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Photo to Fit Profile Frame">
      <div className="space-y-4 font-sans text-xs">
        <p className="text-slate-600 dark:text-slate-300 font-medium">
          Drag the photo or use the zoom slider to position your face centered inside the frame guide.
        </p>

        {/* Interactive Viewport Canvas Area */}
        <div className="flex justify-center my-2">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className="relative w-[240px] h-[240px] bg-slate-900 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none border-2 border-indigo-500/50 shadow-inner flex items-center justify-center"
          >
            {/* Image Element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Photo Adjuster"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              className="pointer-events-none"
            />

            {/* Circular / Rounded Frame Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[200px] h-[200px] rounded-full border-2 border-dashed border-emerald-400 ring-[999px] ring-black/60 shadow-2xl flex items-center justify-center">
                <div className="w-[190px] h-[190px] rounded-full border border-white/40" />
              </div>
            </div>

            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-xs text-white rounded-md text-[10px] font-medium flex items-center gap-1">
              <Move className="w-3 h-3 text-emerald-400" /> Drag to move
            </div>
          </div>
        </div>

        {/* Control Sliders & Quick Buttons */}
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          {/* Scale / Zoom Control */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold text-xs">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-indigo-500" /> Zoom Level:
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{Math.round(scale * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setScale((prev) => Math.max(0.6, prev - 0.1))}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setScale((prev) => Math.min(3.0, prev + 0.1))}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" size="sm" variant="ghost" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Fit
            </Button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Position centered</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCropAndSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Saving...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 mr-1" /> Save Fitted Photo
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
