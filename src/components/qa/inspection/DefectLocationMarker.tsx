// Defect Location Marker - Canvas for marking defect locations on section images
import React, { useState, useRef, useEffect } from 'react';
import type { DefectLocation, SectionImage } from '../../../types/inspection';

interface DefectLocationMarkerProps {
  images: SectionImage[];
  existingLocation?: DefectLocation;
  dotNumber: number;
  itemName: string;
  defectType: string;
  onLocationSet: (location: DefectLocation) => void;
  onCancel: () => void;
}

export const DefectLocationMarker: React.FC<DefectLocationMarkerProps> = ({
  images,
  existingLocation,
  dotNumber,
  itemName,
  defectType,
  onLocationSet,
  onCancel,
}) => {
  const [selectedImageId, setSelectedImageId] = useState<string>(
    existingLocation?.imageId || images[0]?.imageId || ''
  );
  const [dotPosition, setDotPosition] = useState<{ x: number; y: number } | null>(
    existingLocation ? { x: existingLocation.x, y: existingLocation.y } : null
  );
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedImage = images.find((img) => img.imageId === selectedImageId);

  useEffect(() => {
    // Reset dot position when switching images (unless we're loading existing location)
    if (!existingLocation || existingLocation.imageId !== selectedImageId) {
      setDotPosition(null);
    }
  }, [selectedImageId, existingLocation]);

  const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !containerRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setDotPosition({ x: clampedX, y: clampedY });
  };

  const handleConfirm = () => {
    if (!dotPosition || !selectedImageId) return;

    const location: DefectLocation = {
      x: dotPosition.x,
      y: dotPosition.y,
      imageId: selectedImageId,
      dotNumber,
    };

    onLocationSet(location);
  };

  const handleClearDot = () => {
    setDotPosition(null);
  };

  if (!selectedImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">❌</div>
            <div className="text-red-800 font-medium">No images available for this section</div>
            <p className="text-sm text-gray-600 mt-2">
              Please ask your manager to upload section images first.
            </p>
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📍</span>
            <h3 className="text-xl font-bold text-gray-900">Mark Defect Location</h3>
          </div>
          <p className="text-sm text-gray-700">
            <strong>Item:</strong> {itemName} | <strong>Defect:</strong> {defectType} | <strong>Dot #:</strong> {dotNumber}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Click on the image to place the defect location marker.
          </p>
        </div>

        {/* Image Selector (if multiple images) */}
        {images.length > 1 && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Image:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <button
                  key={img.imageId}
                  onClick={() => setSelectedImageId(img.imageId)}
                  className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                    selectedImageId === img.imageId
                      ? 'border-blue-600 ring-2 ring-blue-300'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.imageName}
                    className="w-full h-20 object-cover"
                  />
                  {selectedImageId === img.imageId && (
                    <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                  <p className="text-xs p-1 bg-white bg-opacity-90 truncate">{img.imageName}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Canvas */}
        <div className="p-6 bg-gray-100">
          <div ref={containerRef} className="relative bg-white rounded-lg shadow-inner overflow-hidden">
            <img
              ref={imageRef}
              src={selectedImage.imageUrl}
              alt={selectedImage.imageName}
              onClick={handleImageClick}
              className="w-full h-auto cursor-crosshair select-none"
              draggable={false}
            />

            {/* Dot Marker */}
            {dotPosition && (
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${dotPosition.x}%`,
                  top: `${dotPosition.y}%`,
                }}
              >
                <div className="relative">
                  {/* Outer glow */}
                  <div className="absolute inset-0 bg-red-500 rounded-full w-6 h-6 -translate-x-1/2 -translate-y-1/2 opacity-30 animate-ping"></div>
                  {/* Dot circle */}
                  <div className="relative bg-red-600 border-2 border-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg -translate-x-1/2 -translate-y-1/2">
                    <span className="text-white font-bold text-xs">{dotNumber}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Click anywhere on the image to place or move the marker.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {dotPosition && (
              <button
                onClick={handleClearDot}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Clear Marker
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={!dotPosition}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {dotPosition ? '✓ Confirm Location' : 'Place Marker First'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
