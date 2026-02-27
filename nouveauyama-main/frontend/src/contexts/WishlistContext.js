import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch wishlist
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist({ items: [] });
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/wishlist`, {
        withCredentials: true,
      });
      setWishlist(response.data);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Add to wishlist
  const addToWishlist = async (productId) => {
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour ajouter aux favoris");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/wishlist/add/${productId}`,
        {},
        { withCredentials: true }
      );
      await fetchWishlist();
      toast.success("Ajouté aux favoris");
    } catch (error) {
      toast.error("Erreur lors de l'ajout aux favoris");
    } finally {
      setLoading(false);
    }
  };

  // Remove from wishlist
  const removeFromWishlist = async (productId) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}/api/wishlist/remove/${productId}`, {
        withCredentials: true,
      });
      await fetchWishlist();
      toast.success("Retiré des favoris");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  // Check if product is in wishlist
  const isInWishlist = (productId) => {
    return wishlist.items.some((item) => item.product_id === productId);
  };

  // Toggle wishlist
  const toggleWishlist = async (productId) => {
    if (isInWishlist(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  };

  const value = {
    wishlist,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    fetchWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
