import React, { useState, useRef, useCallback } from 'react';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageFile, onCropComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      // Store original image dimensions
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });

      // Calculate display dimensions to fit container while maintaining aspect ratio
      const containerWidth = 700; // Fixed container width
      const containerHeight = 500; // Fixed container height
      
      const imageAspectRatio = img.naturalWidth / img.naturalHeight;
      const containerAspectRatio = containerWidth / containerHeight;
      
      let displayWidth, displayHeight;
      
      if (imageAspectRatio > containerAspectRatio) {
        // Image is wider than container
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspectRatio;
      } else {
        // Image is taller than container
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspectRatio;
      }
      
      setDisplayDimensions({ width: displayWidth, height: displayHeight });

      // Center the crop area - start with a reasonable size
      const initialSize = Math.min(displayWidth, displayHeight) * 0.4;
      setCrop({
        x: (displayWidth - initialSize) / 2,
        y: (displayHeight - initialSize) / 2,
        size: initialSize
      });
      
      setImageLoaded(true);
    }
  };

  // Handle crop area dragging
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - crop.x, 
      y: e.clientY - crop.y 
    });
  };

  // Handle resize handle dragging
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!imageLoaded) return;

    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      setCrop(prev => ({
        ...prev,
        x: Math.max(0, Math.min(newX, displayDimensions.width - prev.size)),
        y: Math.max(0, Math.min(newY, displayDimensions.height - prev.size))
      }));
    }

    if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const delta = Math.max(deltaX, deltaY);

      setCrop(prev => {
        const newSize = Math.max(50, Math.min(
          prev.size + delta,
          Math.min(
            displayDimensions.width - prev.x,
            displayDimensions.height - prev.y
          )
        ));
        
        return { ...prev, size: newSize };
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, isResizing, dragStart, displayDimensions, imageLoaded]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const cropImage = async () => {
    if (!imageRef.current || !canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;

    // Calculate the scale factors from display to original image
    const scaleX = imageDimensions.width / displayDimensions.width;
    const scaleY = imageDimensions.height / displayDimensions.height;

    // Calculate crop coordinates in original image space
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropSize = crop.size * scaleX; // Use scaleX since we maintain square crop

    // Set canvas size to desired output size (square)
    const outputSize = 400; // Higher resolution for better quality
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Clear canvas
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Draw the cropped portion from the FULL original image
    ctx.drawImage(
      img,
      cropX, cropY, cropSize, cropSize, // Source rectangle from original image
      0, 0, outputSize, outputSize       // Destination rectangle on canvas
    );

    // Convert canvas to blob with high quality
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], `cropped_${imageFile.name}`, {
          type: imageFile.type,
          lastModified: Date.now()
        });
        onCropComplete(croppedFile);
      }
    }, imageFile.type, 0.95); // High quality
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Crop Profile Picture</h3>
              <p className="text-slate-600 text-sm mt-1">
                Drag the square to position and resize to adjust your crop from the full image
              </p>
              {imageLoaded && (
                <p className="text-slate-500 text-xs mt-1">
                  Original: {imageDimensions.width} × {imageDimensions.height}px • 
                  Output: 400 × 400px (square)
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image Preview */}
        <div className="flex-1 p-6 flex items-center justify-center bg-slate-50 overflow-auto">
          <div 
            ref={containerRef}
            className="relative bg-white rounded-lg shadow-lg overflow-hidden flex items-center justify-center"
            style={{ width: '750px', height: '550px' }}
          >
            {imageUrl && (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="block"
                  style={{
                    width: `${displayDimensions.width}px`,
                    height: `${displayDimensions.height}px`,
                    maxWidth: 'none'
                  }}
                  onLoad={handleImageLoad}
                />
                
                {/* Crop Area */}
                {imageLoaded && (
                  <div className="absolute inset-0">
                    {/* Dark overlay covering the entire image */}
                    <div className="absolute inset-0 bg-black bg-opacity-60 pointer-events-none" />
                    
                    {/* Clear crop area */}
                    <div
                      className="absolute border-4 border-white shadow-xl cursor-move"
                      style={{
                        left: `${crop.x}px`,
                        top: `${crop.y}px`,
                        width: `${crop.size}px`,
                        height: `${crop.size}px`,
                        boxShadow: `
                          0 0 0 ${crop.x}px rgba(0, 0, 0, 0.6),
                          0 0 0 9999px rgba(0, 0, 0, 0.6)
                        `
                      }}
                      onMouseDown={handleCropMouseDown}
                    >
                      {/* Blue resize handle in bottom-right corner */}
                      <div
                        className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 border-2 border-white cursor-se-resize transform translate-x-2 translate-y-2 rounded-sm shadow-lg hover:bg-blue-700 transition-colors"
                        onMouseDown={handleResizeMouseDown}
                      />
                      
                      {/* Grid lines for rule of thirds */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/3 left-0 right-0 border-t border-white opacity-40" />
                        <div className="absolute top-2/3 left-0 right-0 border-t border-white opacity-40" />
                        <div className="absolute left-1/3 top-0 bottom-0 border-l border-white opacity-40" />
                        <div className="absolute left-2/3 top-0 bottom-0 border-l border-white opacity-40" />
                      </div>

                      {/* Corner indicators */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-white opacity-60"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-white opacity-60"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-white opacity-60"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white opacity-60"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center justify-center space-x-8 text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-blue-600 bg-white cursor-move rounded"></div>
              <span className="font-medium">Drag square to move position</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 border border-blue-700 rounded-sm"></div>
              <span className="font-medium">Drag blue corner to resize</span>
            </div>
            <div className="text-blue-700">
              <span className="font-medium">Cropping from full {imageDimensions.width}×{imageDimensions.height}px image</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="px-8 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={cropImage}
              disabled={!imageLoaded}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default ImageCropper;