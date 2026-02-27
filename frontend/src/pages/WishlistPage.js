import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useWishlist } from "../contexts/WishlistContext";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { formatPrice } from "../lib/utils";
import { Heart, ShoppingBag, Trash2, Share2, Copy, Check } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, loading } = useWishlist();
  const { addToCart } = useCart();
  const { isAuthenticated, token, loading: authLoading } = useAuth();
  const [shareLink, setShareLink] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/wishlist/share`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fullUrl = `${window.location.origin}${response.data.share_url}`;
      setShareLink(fullUrl);
      toast.success("Lien de partage créé !");
    } catch (error) {
      toast.error("Erreur lors de la création du lien");
    } finally {
      setSharing(false);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center bg-[#F5F5F7] dark:bg-[#0B0B0B]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center bg-[#F5F5F7] dark:bg-[#0B0B0B]">
        <div className="text-center px-6">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-4">Connectez-vous</h1>
          <p className="text-muted-foreground mb-6">
            Connectez-vous pour voir vos produits favoris
          </p>
          <Link to="/login" className="btn-primary">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20" data-testid="wishlist-page">
      {/* Header */}
      <section className="py-12 md:py-16 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="heading-section mb-4">Mes Favoris</h1>
            <p className="text-body-lg mb-6">
              {wishlist.items.length} produit{wishlist.items.length > 1 ? "s" : ""} dans votre liste
            </p>
            
            {/* Share Button */}
            {wishlist.items.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {!shareLink ? (
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    {sharing ? "Création..." : "Partager ma liste"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="bg-transparent text-sm w-64 outline-none"
                    />
                    <button
                      onClick={copyShareLink}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Wishlist Items */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          {wishlist.items.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Aucun favori</h2>
              <p className="text-muted-foreground mb-6">
                Vous n'avez pas encore ajouté de produits à vos favoris
              </p>
              <Link to="/" className="btn-primary">
                Découvrir les produits
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlist.items.map((item, index) => (
                <motion.div
                  key={item.product_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-white dark:bg-[#1C1C1E] rounded-3xl overflow-hidden shadow-subtle"
                >
                  <Link
                    to={`/product/${item.product_id}`}
                    className="block aspect-square bg-[#F5F5F7] dark:bg-[#2C2C2E]"
                  >
                    <img
                      src={item.image || "/placeholder.jpg"}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                  <div className="p-4">
                    <Link to={`/product/${item.product_id}`}>
                      <h3 className="font-medium mb-1 line-clamp-1 group-hover:text-[#0071E3] transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="font-semibold mb-4">{formatPrice(item.price)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToCart(item.product_id)}
                        disabled={item.stock === 0}
                        className="flex-1 btn-primary py-2 text-sm justify-center"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        {item.stock === 0 ? "Rupture" : "Ajouter"}
                      </button>
                      <button
                        onClick={() => removeFromWishlist(item.product_id)}
                        disabled={loading}
                        className="p-2 border border-black/10 dark:border-white/10 rounded-full hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                        aria-label="Retirer des favoris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
