import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";

const CartContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Generate or get cart session ID from localStorage
const getCartSessionId = () => {
  let sessionId = localStorage.getItem("cart_session");
  if (!sessionId) {
    sessionId = `cart_${Math.random().toString(36).substr(2, 12)}`;
    localStorage.setItem("cart_session", sessionId);
  }
  return sessionId;
};

// Create axios instance with cart session header
const cartApi = axios.create({
  baseURL: API_URL,
});

// Add cart session header to all requests
cartApi.interceptors.request.use((config) => {
  config.headers["X-Cart-Session"] = getCartSessionId();
  return config;
});

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch cart
  const fetchCart = useCallback(async () => {
    try {
      const response = await cartApi.get("/api/cart");
      setCart(response.data);
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add to cart
  const addToCart = async (productId, quantity = 1) => {
    setLoading(true);
    try {
      await cartApi.post("/api/cart/add", { product_id: productId, quantity });
      await fetchCart();
      toast.success("Produit ajouté au panier");
      setIsOpen(true);
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'ajout au panier";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Update cart item quantity
  const updateQuantity = async (productId, quantity) => {
    setLoading(true);
    try {
      await cartApi.put("/api/cart/update", { product_id: productId, quantity });
      await fetchCart();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  // Remove from cart
  const removeFromCart = async (productId) => {
    setLoading(true);
    try {
      await cartApi.delete(`/api/cart/remove/${productId}`);
      await fetchCart();
      toast.success("Produit retiré du panier");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    setLoading(true);
    try {
      await cartApi.delete("/api/cart/clear");
      setCart({ items: [], total: 0 });
    } catch (error) {
      toast.error("Erreur lors du vidage du panier");
    } finally {
      setLoading(false);
    }
  };

  // Get cart count
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    loading,
    isOpen,
    setIsOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart,
    cartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
