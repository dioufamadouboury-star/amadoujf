import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Gift, Truck, Percent } from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NOTIFICATION_ICONS = {
  promo: Percent,
  shipping: Truck,
  gift: Gift,
  default: Bell,
};

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [lastDismissed, setLastDismissed] = useState(null);

  useEffect(() => {
    // Check if user dismissed recently
    const dismissedTime = localStorage.getItem("notificationDismissed");
    if (dismissedTime) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 1) {
        setDismissed(true);
        return;
      }
    }

    fetchNotifications();
  }, []);

  // Auto-rotate notifications
  useEffect(() => {
    if (notifications.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [notifications.length]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/recent`);
      if (response.data && response.data.length > 0) {
        setNotifications(response.data);
      }
    } catch (error) {
      // Silently fail - notifications are not critical
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notificationDismissed", Date.now().toString());
  };

  if (dismissed || notifications.length === 0) {
    return null;
  }

  const current = notifications[currentIndex];
  const Icon = NOTIFICATION_ICONS[current?.type] || NOTIFICATION_ICONS.default;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-primary via-primary/90 to-primary text-white overflow-hidden"
      >
        <div className="container-lumina py-2 flex items-center justify-center gap-4 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-sm"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{current?.title}</span>
              <span className="hidden sm:inline opacity-90">{current?.message}</span>
              {current?.url && current?.url !== "/" && (
                <Link
                  to={current.url}
                  className="underline hover:no-underline font-medium ml-1"
                >
                  En savoir plus
                </Link>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Dots for multiple notifications */}
          {notifications.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 ml-4">
              {notifications.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
