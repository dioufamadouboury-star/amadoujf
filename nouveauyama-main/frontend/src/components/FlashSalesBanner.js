import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Clock, Flame, Sparkles } from "lucide-react";
import axios from "axios";
import { formatPrice, calculateDiscount } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

function CountdownTimer({ endDate }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = new Date(endDate) - new Date();
    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, expired: true };
    }
    return {
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      expired: false
    };
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft.expired) return null;

  return (
    <div className="flex items-center gap-1 text-white font-mono">
      <Clock className="w-4 h-4" />
      <span className="bg-white/20 px-2 py-0.5 rounded">
        {String(timeLeft.hours).padStart(2, '0')}
      </span>
      <span>:</span>
      <span className="bg-white/20 px-2 py-0.5 rounded">
        {String(timeLeft.minutes).padStart(2, '0')}
      </span>
      <span>:</span>
      <motion.span 
        className="bg-white/20 px-2 py-0.5 rounded"
        key={timeLeft.seconds}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
      >
        {String(timeLeft.seconds).padStart(2, '0')}
      </motion.span>
    </div>
  );
}

export default function FlashSalesBanner() {
  const [flashSales, setFlashSales] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/flash-sales`);
        setFlashSales(response.data || []);
      } catch (error) {
        console.error("Error fetching flash sales:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFlashSales();
  }, []);

  // Auto-rotate products
  useEffect(() => {
    if (flashSales.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flashSales.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [flashSales.length]);

  if (loading || flashSales.length === 0) return null;

  const currentProduct = flashSales[currentIndex];
  const discount = calculateDiscount(currentProduct.price, currentProduct.flash_sale_price);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl mb-6"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:200%_100%] animate-gradient" />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Flash sale badge + product info */}
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full"
            >
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
              <span className="text-white font-bold text-sm md:text-base">VENTE FLASH</span>
              <Flame className="w-4 h-4 text-orange-300 animate-pulse" />
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentProduct.product_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3"
              >
                {currentProduct.images?.[0] && (
                  <img
                    src={currentProduct.images[0].startsWith('http') 
                      ? currentProduct.images[0] 
                      : `${API_URL}${currentProduct.images[0]}`}
                    alt={currentProduct.name}
                    className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg border-2 border-white/30"
                  />
                )}
                <div className="text-white">
                  <p className="font-semibold text-sm md:text-base line-clamp-1">{currentProduct.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg md:text-xl font-bold">{formatPrice(currentProduct.flash_sale_price)}</span>
                    <span className="text-xs md:text-sm line-through opacity-70">{formatPrice(currentProduct.price)}</span>
                    <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                      -{discount}%
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Countdown + CTA */}
          <div className="flex items-center gap-4">
            <CountdownTimer endDate={currentProduct.flash_sale_end} />
            
            <Link
              to={`/product/${currentProduct.product_id}`}
              className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-yellow-400 hover:text-black transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Voir l'offre</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Product indicators */}
        {flashSales.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {flashSales.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </motion.div>
  );
}
