import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { Plus, Minus } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
  aspect?: number;
  cropShape?: 'rect' | 'round';
  title?: string;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  image,
  onCropComplete,
  onCancel,
  aspect = 1,
  cropShape = 'round',
  title = 'Crop Image'
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropAreaChange = useCallback((_showedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      if (!croppedAreaPixels) return;

      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = image;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      }, 'image/jpeg');
    } catch (e) {
      console.error('Error cropping image:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 animate-in fade-in duration-300">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
        <p className="text-white/50 text-sm">Drag to reposition, scroll to zoom</p>
      </div>

      <div className="relative w-full max-w-[600px] h-[400px] md:h-[500px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/20">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropAreaChange}
          onZoomChange={onZoomChange}
          cropShape={cropShape}
          showGrid={false}
        />
      </div>

      <div className="mt-8 w-full max-w-[500px] flex flex-col gap-6 px-4">
        <div className="flex items-center gap-4 group">
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
            <Minus className="h-4 w-4 text-white/70" />
          </div>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
            <Plus className="h-4 w-4 text-white/70" />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-6 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-all duration-200 border border-white/10 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={createCroppedImage}
            className="flex-1 py-3 px-6 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all duration-200 shadow-xl shadow-blue-500/30 active:scale-95 ring-1 ring-blue-400/50"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;