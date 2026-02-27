import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    // Don't show on unsupported browsers
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Check if already denied
    if (Notification.permission === 'denied') {
      return;
    }

    // Check if already subscribed
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setIsSubscribed(true);
          return;
        }
      } catch (e) {
        console.error('Error checking subscription:', e);
      }
    }

    // Show prompt after delay (not on first visit)
    const hasSeenPrompt = localStorage.getItem('push_prompt_seen');
    const visitCount = parseInt(localStorage.getItem('visit_count') || '0') + 1;
    localStorage.setItem('visit_count', visitCount.toString());

    if (!hasSeenPrompt && visitCount >= 2) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }
  };

  const subscribe = async () => {
    setIsLoading(true);
    
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        setShowPrompt(false);
        localStorage.setItem('push_prompt_seen', 'true');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend
      await axios.post(`${API_URL}/api/push/subscribe`, {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        }
      });

      setIsSubscribed(true);
      setShowPrompt(false);
      localStorage.setItem('push_prompt_seen', 'true');
      
      console.log('Push notification subscription successful');
      
    } catch (error) {
      console.error('Error subscribing to push:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('push_prompt_seen', 'true');
  };

  if (!showPrompt || isSubscribed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-24 right-4 z-[60] max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        data-testid="push-notification-prompt"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-white" />
            <span className="font-semibold text-white text-sm">Notifications</span>
          </div>
          <button
            onClick={dismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Restez informé ! 🔔
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Recevez des alertes pour les promotions exclusives, le suivi de vos commandes et les nouveautés.
          </p>

          <div className="flex gap-2">
            <button
              onClick={subscribe}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "Activation..." : "Activer"}
            </button>
            <button
              onClick={dismiss}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium text-sm transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
