import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format price in FCFA
export function formatPrice(price) {
  if (price === null || price === undefined) return "";
  return new Intl.NumberFormat("fr-SN", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + " FCFA";
}

// Truncate text
export function truncateText(text, maxLength) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

// Get category display name
export function getCategoryName(categoryId) {
  const categories = {
    electronique: "Électronique",
    electromenager: "Électroménager",
    decoration: "Décoration & Mobilier",
    beaute: "Beauté & Bien-être",
    automobile: "Automobile",
  };
  return categories[categoryId] || categoryId || "";
}

// Calculate discount percentage
export function calculateDiscount(originalPrice, currentPrice) {
  if (!originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

// Format date
export function formatDate(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-SN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

// Format date with time
export function formatDateTime(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-SN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

// Get order status display
export function getOrderStatusDisplay(status) {
  const statuses = {
    pending: { label: "En attente", class: "status-pending" },
    processing: { label: "En traitement", class: "status-processing" },
    shipped: { label: "Expédié", class: "status-shipped" },
    delivered: { label: "Livré", class: "status-delivered" },
    cancelled: { label: "Annulé", class: "status-cancelled" },
  };
  return statuses[status] || { label: status, class: "" };
}

// Get payment status display
export function getPaymentStatusDisplay(status) {
  const statuses = {
    pending: { label: "En attente", class: "status-pending" },
    paid: { label: "Payé", class: "status-delivered" },
    failed: { label: "Échoué", class: "status-cancelled" },
  };
  return statuses[status] || { label: status, class: "" };
}

// Local storage helpers
export function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

// Validate email
export function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone (Senegal format)
export function isValidPhone(phone) {
  if (!phone) return false;
  const phoneRegex = /^(\+221|221)?[7][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

// Generate WhatsApp link for order
export function generateWhatsAppLink(phone, message) {
  if (!phone) return "";
  const encodedMessage = encodeURIComponent(message || "");
  const cleanPhone = phone.replace(/\s/g, "").replace(/^\+/, "");
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Generate order message for WhatsApp
export function generateOrderMessage(items, total, shipping) {
  let message = "🛒 *Nouvelle Commande - GROUPE YAMA+*\n\n";
  message += "*Produits:*\n";
  
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name || "Produit"} x${item.quantity || 1} - ${formatPrice((item.price || 0) * (item.quantity || 1))}\n`;
    });
  }
  
  message += `\n*Total:* ${formatPrice(total)}\n\n`;
  
  if (shipping) {
    message += "*Livraison:*\n";
    message += `Nom: ${shipping.full_name || ""}\n`;
    message += `Téléphone: ${shipping.phone || ""}\n`;
    message += `Adresse: ${shipping.address || ""}\n`;
    message += `Ville: ${shipping.city || ""}\n`;
    message += `Région: ${shipping.region || ""}\n`;
    if (shipping.notes) message += `Notes: ${shipping.notes}\n`;
  }
  
  return message;
}

// ============================================
// IMAGE URL HANDLING - SIMPLIFIED AND ROBUST
// ============================================

// Placeholder image (SVG data URI - always works)
export const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f5f5f7' width='400' height='400'/%3E%3Ctext fill='%23999' font-family='system-ui,sans-serif' font-size='16' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EImage%3C/text%3E%3C/svg%3E";

// Get the base URL for API calls
function getBaseUrl() {
  // Use environment variable if available
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL.replace(/\/$/, "");
  }
  // Fallback to current origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/**
 * Convert any image URL to a working URL
 * Handles: external URLs, relative URLs, uploaded files
 */
export function getImageUrl(imageUrl, fallback = PLACEHOLDER_IMAGE) {
  // No URL provided - return fallback
  if (!imageUrl || typeof imageUrl !== "string") {
    return fallback;
  }

  const trimmedUrl = imageUrl.trim();
  
  // Empty string - return fallback
  if (!trimmedUrl) {
    return fallback;
  }

  // Already a complete URL (http/https) - return as-is
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }

  // Data URI - return as-is
  if (trimmedUrl.startsWith("data:")) {
    return trimmedUrl;
  }

  const baseUrl = getBaseUrl();

  // Relative URL starting with /api/ - prepend base URL
  if (trimmedUrl.startsWith("/api/")) {
    return `${baseUrl}${trimmedUrl}`;
  }

  // Relative URL starting with / - return as-is (local asset)
  if (trimmedUrl.startsWith("/")) {
    return trimmedUrl;
  }

  // Just a filename - assume it's an upload
  return `${baseUrl}/api/uploads/${trimmedUrl}`;
}

/**
 * Get array of resolved image URLs
 */
export function getImageUrls(images, fallback = PLACEHOLDER_IMAGE) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [fallback];
  }
  return images.map(img => getImageUrl(img, fallback));
}
