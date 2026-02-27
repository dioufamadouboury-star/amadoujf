import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

export default function LazyImage({ 
  src, 
  alt, 
  className = "", 
  placeholderSrc = null,
  aspectRatio = null,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  // Default placeholder - a simple gradient
  const defaultPlaceholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23f5f5f7' width='400' height='400'/%3E%3C/svg%3E";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  // Build srcSet for responsive images
  const buildSrcSet = (originalSrc) => {
    if (!originalSrc || originalSrc.startsWith('data:')) return null;
    // For uploaded images, we don't have different sizes
    // This is a placeholder for future CDN integration
    return null;
  };

  const aspectRatioStyle = aspectRatio ? { aspectRatio } : {};

  return (
    <div 
      ref={imgRef}
      className={cn("relative overflow-hidden bg-[#F5F5F7] dark:bg-[#2C2C2E]", className)}
      style={aspectRatioStyle}
    >
      {/* Placeholder/Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
      )}
      
      {/* Actual Image */}
      {isInView && (
        <img
          src={error ? (placeholderSrc || defaultPlaceholder) : src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

// Optimized product image component
export function ProductImage({ product, size = "medium", className = "" }) {
  const sizes = {
    small: "w-16 h-16",
    medium: "w-full aspect-square",
    large: "w-full aspect-[4/3]"
  };

  const imageUrl = product?.images?.[0] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400";
  
  // Add width parameter for optimization if using external URLs
  const optimizedUrl = imageUrl.includes('unsplash.com') 
    ? imageUrl.replace(/w=\d+/, 'w=400') 
    : imageUrl;

  return (
    <LazyImage
      src={optimizedUrl}
      alt={product?.name || "Product"}
      className={cn(sizes[size], "rounded-xl", className)}
      aspectRatio={size === "medium" ? "1/1" : undefined}
    />
  );
}
