import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Share2, Copy, Check, ExternalLink, ShoppingCart } from "lucide-react";
import axios from "axios";
import { formatPrice, getImageUrl } from "../lib/utils";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SharedWishlistPage() {
  const { shareId } = useParams();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchSharedWishlist();
  }, [shareId]);

  const fetchSharedWishlist = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/wishlist/shared/${shareId}`);
      setWishlist(response.data);
    } catch (error) {
      console.error("Error fetching shared wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToCart = (product) => {
    addToCart(product.product_id, 1);
    toast.success(`${product.name} ajouté au panier`);
  };

  if (loading) {
    return (
      <main className="min-h-screen pt-20">
        <div className="container-lumina py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!wishlist) {
    return (
      <main className="min-h-screen pt-20">
        <div className="container-lumina py-16 text-center">
          <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Liste introuvable</h1>
          <p className="text-muted-foreground mb-6">
            Cette liste de souhaits n'existe pas ou a été supprimée
          </p>
          <Link to="/" className="btn-primary">
            Retour à l'accueil
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20">
      <div className="container-lumina py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              Liste partagée par
            </div>
            <h1 className="text-2xl font-bold">
              Liste de {wishlist.owner_name || "quelqu'un"}
            </h1>
            <p className="text-muted-foreground">
              {wishlist.items?.length || 0} article(s)
            </p>
          </div>

          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copié !" : "Copier le lien"}
          </button>
        </div>

        {/* Products Grid */}
        {wishlist.items && wishlist.items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {wishlist.items.map((product, index) => (
              <motion.div
                key={product.product_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <Link to={`/product/${product.product_id}`}>
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={getImageUrl(product.images?.[0], '/placeholder.jpg')}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-primary">
                        {formatPrice(product.price)}
                      </p>
                      {product.original_price && product.original_price > product.price && (
                        <p className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.original_price)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                
                <button
                  onClick={() => handleAddToCart(product)}
                  className="absolute bottom-4 right-4 p-2 bg-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90"
                  title="Ajouter au panier"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Heart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted-foreground">Cette liste est vide</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center p-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl">
          <h2 className="text-xl font-bold mb-2">Vous aussi, créez votre liste !</h2>
          <p className="text-muted-foreground mb-4">
            Inscrivez-vous pour sauvegarder et partager vos articles préférés
          </p>
          <Link to="/login" className="btn-primary">
            Commencer
          </Link>
        </div>
      </div>
    </main>
  );
}
