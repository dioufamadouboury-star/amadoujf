import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Shield, CreditCard, Headphones, RotateCcw, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const trustItems = [
  { icon: Truck, text: "Livraison rapide", subtext: "24-48h Dakar" },
  { icon: Shield, text: "Paiement sécurisé", subtext: "Wave, OM, CB" },
  { icon: RotateCcw, text: "Retour 7 jours", subtext: "Satisfait ou remboursé" },
  { icon: Headphones, text: "Support 24/7", subtext: "WhatsApp" },
];

export default function TrustBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate every 3 seconds
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trustItems.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goTo = (index) => {
    setCurrentIndex(index);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % trustItems.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + trustItems.length) % trustItems.length);
  };

  return (
    <section 
      className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-3 border-y border-black/5 dark:border-white/5 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="container-lumina">
        {/* Mobile Carousel View */}
        <div className="md:hidden relative">
          <div className="flex items-center justify-center min-h-[60px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex items-center gap-3 px-4"
              >
                <div className="w-11 h-11 rounded-xl bg-black dark:bg-white flex items-center justify-center flex-shrink-0 shadow-lg">
                  {(() => {
                    const Icon = trustItems[currentIndex].icon;
                    return <Icon className="w-5 h-5 text-white dark:text-black" />;
                  })()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{trustItems[currentIndex].text}</p>
                  <p className="text-xs text-muted-foreground">{trustItems[currentIndex].subtext}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-2">
            {trustItems.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? "w-6 bg-black dark:bg-white" 
                    : "w-2 bg-black/40 dark:bg-white/40 hover:bg-black/60 dark:hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop - Animated Marquee Style */}
        <div className="hidden md:block relative overflow-hidden">
          <motion.div 
            className="flex items-center justify-center gap-12"
            initial={false}
          >
            {trustItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ 
                  opacity: index === currentIndex ? 1 : 0.6,
                  scale: index === currentIndex ? 1.05 : 0.95,
                }}
                transition={{ duration: 0.3 }}
                onClick={() => goTo(index)}
                className={`flex items-center gap-3 cursor-pointer transition-all ${
                  index === currentIndex ? "" : "hover:opacity-80"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center flex-shrink-0 shadow-md transition-shadow ${
                  index === currentIndex ? "shadow-lg" : ""
                }`}>
                  <item.icon className="w-5 h-5 text-white dark:text-black" />
                </div>
                <div>
                  <p className={`font-medium text-sm transition-colors ${
                    index === currentIndex ? "text-foreground" : "text-muted-foreground"
                  }`}>{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.subtext}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
          
          {/* Subtle progress bar */}
          <div className="flex justify-center gap-1.5 mt-3">
            {trustItems.map((_, index) => (
              <div
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? "w-8 bg-black dark:bg-white" 
                    : "w-2 bg-black/30 dark:bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustBannerCompact() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trustItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-3 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          {(() => {
            const Icon = trustItems[currentIndex].icon;
            return <Icon className="w-4 h-4" />;
          })()}
          <span>{trustItems[currentIndex].text}</span>
          <span className="text-[10px]">• {trustItems[currentIndex].subtext}</span>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-center gap-1 mt-2">
        {trustItems.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-4 bg-black dark:bg-white" : "w-1.5 bg-black/40 dark:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
