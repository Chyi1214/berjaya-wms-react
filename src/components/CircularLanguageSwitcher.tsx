// Circular Rotating Language Switcher - Eliminates hierarchy perception
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface CircularLanguageSwitcherProps {
  className?: string;
  size?: number; // Diameter of the circle in pixels
  showLabels?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number; // Degrees per second
}

export function CircularLanguageSwitcher({ 
  className = '',
  size = 200,
  showLabels = false,
  autoRotate = true,
  autoRotateSpeed = 6 // 1 full rotation per 60 seconds
}: CircularLanguageSwitcherProps) {
  const { currentLanguage, setLanguage, languages } = useLanguage();
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastAngle, setLastAngle] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // Auto rotation
  useEffect(() => {
    if (!autoRotate || isDragging) return;

    const animate = () => {
      setRotation(prev => prev + autoRotateSpeed / 60); // 60fps
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoRotate, autoRotateSpeed, isDragging]);

  // Calculate position for each language flag
  const getLanguagePositions = () => {
    const radius = (size - 120) / 2; // Leave more space for larger flags
    const center = size / 2;
    const angleStep = 360 / languages.length;

    return languages.map((lang, index) => {
      const angle = (rotation + (index * angleStep)) * (Math.PI / 180);
      const isSelected = lang.code === currentLanguage;
      
      // Selected language goes to center, others on circle
      const x = isSelected ? center : center + radius * Math.cos(angle - Math.PI / 2);
      const y = isSelected ? center : center + radius * Math.sin(angle - Math.PI / 2);
      
      return {
        ...lang,
        x,
        y,
        isSelected,
        scale: isSelected ? 1.3 : 1,
        zIndex: isSelected ? 10 : 1
      };
    });
  };

  // Handle touch/mouse interactions
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const center = { x: size / 2, y: size / 2 };
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - center.x;
      const y = clientY - rect.top - center.y;
      const angle = Math.atan2(y, x) * (180 / Math.PI);
      setLastAngle(angle);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const center = { x: size / 2, y: size / 2 };
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - center.x;
      const y = clientY - rect.top - center.y;
      const angle = Math.atan2(y, x) * (180 / Math.PI);
      
      const deltaAngle = angle - lastAngle;
      setRotation(prev => prev + deltaAngle);
      setLastAngle(angle);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Handle language selection
  const handleLanguageSelect = (languageCode: string) => {
    setLanguage(languageCode as any);
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const positions = getLanguagePositions();

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="relative cursor-grab active:cursor-grabbing select-none"
        style={{ width: size, height: size }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        {/* Background circle */}
        <div
          className="absolute border-2 border-gray-200 border-dashed rounded-full opacity-30"
          style={{
            width: size - 120,
            height: size - 120,
            top: 60,
            left: 60
          }}
        />

        {/* Center selection area */}
        <div
          className="absolute border-2 border-blue-300 bg-blue-50 rounded-full"
          style={{
            width: 80,
            height: 80,
            top: size / 2 - 40,
            left: size / 2 - 40
          }}
        />

        {/* Language flags */}
        {positions.map((pos) => (
          <button
            key={pos.code}
            onClick={() => handleLanguageSelect(pos.code)}
            className={`
              absolute transition-all duration-500 ease-out rounded-full
              hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500
              touch-manipulation
              ${pos.isSelected 
                ? 'shadow-lg bg-white border-3 border-blue-500' 
                : 'hover:shadow-md bg-white border-2 border-gray-300'
              }
            `}
            style={{
              left: pos.x - 35,
              top: pos.y - 35,
              width: 70,
              height: 70,
              transform: `scale(${pos.scale})`,
              zIndex: pos.zIndex,
              minHeight: '44px', // iOS minimum touch target
              minWidth: '44px'
            }}
            aria-label={`Switch to ${pos.name}`}
          >
            <span className="text-3xl">{pos.flag}</span>
          </button>
        ))}

        {/* Labels if enabled */}
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 text-center">
            <p className="text-sm text-gray-600">
              {languages.find(l => l.code === currentLanguage)?.nativeName}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute -bottom-8 left-0 right-0 text-center">
          <p className="text-xs text-gray-500">
            {isDragging ? '🔄 Rotating...' : '🌐 Drag to rotate • Tap to select'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CircularLanguageSwitcher;