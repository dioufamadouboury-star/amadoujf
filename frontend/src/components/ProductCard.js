import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { formatPrice, calculateDiscount, getImageUrls, cn } from "../lib/utils";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";

export default function ProductCard({ product, index = 0 }) {
  const { addToCart, loading: cartLoading } = useCart();
  const { isInWishlist, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [addedToCart, setAddedToCart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const discount = calculateDiscount(product.original_price, product.price);
  const inWishlist = isInWishlist(product.product_id);
  
  // Auto-scroll images if product has multiple images (max 3)
  // Use centralized getImageUrls for consistent URL resolution
  const images = getImageUrls(product.images?.slice(0, 3), "/placeholder.jpg");
  
  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [images.length]);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.product_id, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.product_id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1]
      }}
      className="product-card group relative bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
      data-testid={`product-card-${product.product_id}`}
    >
      {/* Image Container with Carousel */}
      <Link
        to={`/product/${product.product_id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-[#F5F5F7] dark:bg-[#2C2C2E]"
      >
        {/* Image Carousel */}
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIndex}
            src={images[currentImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            loading="lazy"
          />
        </AnimatePresence>

        {/* Image indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, idx) => (
              <div 
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  idx === currentImageIndex 
                    ? 'bg-white w-3 shadow-sm' 
                    : 'bg-white/50'
                )}
              />
            ))}
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {product.is_new && (
            <span className="bg-black dark:bg-white text-white dark:text-black text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
              Nouveau
            </span>
          )}
          {product.is_promo && discount > 0 && (
            <span className="bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          {product.is_on_order && (
            <span className="bg-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
              Sur commande
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          disabled={wishlistLoading}
          className={cn(
            "absolute top-2 right-2 p-1.5 sm:p-2 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-sm shadow-md transition-all hover:scale-110 z-10",
            inWishlist && "text-red-500"
          )}
          aria-label={inWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
          data-testid={`wishlist-btn-${product.product_id}`}
        >
          <Heart className={cn("w-4 h-4", inWishlist && "fill-current")} />
        </button>

        {/* Stock badge */}
        {product.stock === 0 && !product.is_on_order && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
              Rupture
            </span>
          </div>
        )}
        
        {/* On Order delivery info */}
        {product.is_on_order && product.order_delivery_days && (
          <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {product.order_delivery_days}j
          </div>
        )}
      </Link>

      {/* Product Info - Compact */}
      <div className="p-2.5 sm:p-3">
        <Link to={`/product/${product.product_id}`} className="block">
          <h3 className="font-semibold text-xs sm:text-sm line-clamp-1 mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        
        {/* Price section - Compact */}
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-sm sm:text-base font-bold text-[#1D1D1F] dark:text-white">
            {formatPrice(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
        
        {/* Add to cart button - Compact */}
        <motion.button
          onClick={handleAddToCart}
          disabled={cartLoading || product.stock === 0}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "w-full py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all",
            addedToCart 
              ? "bg-green-500 text-white" 
              : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90",
            product.stock === 0 && "opacity-50 cursor-not-allowed"
          )}
          data-testid={`add-to-cart-btn-${product.product_id}`}
        >
          {addedToCart ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajouté</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{product.stock === 0 ? "Rupture" : "Ajouter"}</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
