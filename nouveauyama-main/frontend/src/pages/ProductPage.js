import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  ChevronRight,
  Heart,
  ShoppingBag,
  Truck,
  Shield,
  RotateCcw,
  MessageCircle,
  Minus,
  Plus,
  ChevronDown,
  Bell,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import {
  formatPrice,
  calculateDiscount,
  getCategoryName,
  generateWhatsAppLink,
  generateOrderMessage,
  getImageUrl,
} from "../lib/utils";
import { cn } from "../lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import ProductReviews from "../components/ProductReviews";
import SimilarProducts from "../components/SimilarProducts";
import FrequentlyBoughtTogether from "../components/FrequentlyBoughtTogether";
import SEO from "../components/SEO";
import AppointmentModal from "../components/AppointmentModal";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const WHATSAPP_NUMBER = "+221783827575";

// Categories that allow visit appointments
const APPOINTMENT_CATEGORIES = ["automobile", "mobilier", "electromenager", "automobiles", "meubles"];

export default function ProductPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  
  // Price Alert state
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [priceAlertEmail, setPriceAlertEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [priceAlertLoading, setPriceAlertLoading] = useState(false);

  const { addToCart, loading: cartLoading } = useCart();
  const { isInWishlist, toggleWishlist, loading: wishlistLoading } = useWishlist();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/products/${productId}`);
        setProduct(response.data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <main className="min-h-screen pt-20">
        <div className="container-lumina py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square rounded-3xl skeleton" />
            <div className="space-y-6">
              <div className="h-8 w-32 rounded skeleton" />
              <div className="h-12 w-3/4 rounded skeleton" />
              <div className="h-6 w-full rounded skeleton" />
              <div className="h-6 w-2/3 rounded skeleton" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Produit non trouvé</h1>
          <Link to="/" className="btn-primary">
            Retour à l'accueil
          </Link>
        </div>
      </main>
    );
  }

  const discount = calculateDiscount(product.original_price, product.price);
  const inWishlist = isInWishlist(product.product_id);

  const handleAddToCart = () => {
    addToCart(product.product_id, quantity);
  };

  const handleWhatsAppOrder = () => {
    const items = [
      {
        name: product.name,
        price: product.price,
        quantity: quantity,
      },
    ];
    const message = generateOrderMessage(items, product.price * quantity, null);
    window.open(generateWhatsAppLink(WHATSAPP_NUMBER, message), "_blank");
  };

  const handleNotifyStock = async (e) => {
    e.preventDefault();
    if (!notifyEmail) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    
    setNotifyLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/products/${productId}/notify-stock`, {
        email: notifyEmail,
        product_id: productId
      });
      
      if (response.data.already_subscribed) {
        toast.info("Vous êtes déjà inscrit pour ce produit");
      } else {
        toast.success("Vous serez notifié dès que le produit sera disponible !");
      }
      setShowNotifyModal(false);
      setNotifyEmail("");
    } catch (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setNotifyLoading(false);
    }
  };

  const handlePriceAlert = async (e) => {
    e.preventDefault();
    if (!priceAlertEmail) {
      toast.error("Veuillez entrer votre email");
      return;
    }
    
    setPriceAlertLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/products/${productId}/price-alert`, {
        email: priceAlertEmail,
        product_id: productId,
        target_price: targetPrice ? parseInt(targetPrice) : null
      });
      
      if (response.data.already_subscribed) {
        toast.info(response.data.message);
      } else {
        toast.success(response.data.message);
      }
      setShowPriceAlertModal(false);
      setPriceAlertEmail("");
      setTargetPrice("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Une erreur est survenue");
    } finally {
      setPriceAlertLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-20" data-testid="product-page">
      <SEO 
        title={product.name}
        description={product.short_description || product.description?.slice(0, 160)}
        image={getImageUrl(product.images?.[0])}
        url={`/product/${product.product_id}`}
        type="product"
        product={product}
      />
      {/* Breadcrumb */}
      <div className="bg-[#F5F5F7] dark:bg-[#1C1C1E] py-4">
        <div className="container-lumina">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Accueil
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Link
              to={`/category/${product.category}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {getCategoryName(product.category)}
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Content */}
      <section className="py-12 md:py-16">
        <div className="container-lumina">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square rounded-3xl overflow-hidden bg-[#F5F5F7] dark:bg-[#1C1C1E]"
              >
                <img
                  src={getImageUrl(product.images?.[selectedImage], "/placeholder.jpg")}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Thumbnails */}
              {product.images?.length > 1 && (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={cn(
                        "w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all",
                        selectedImage === index
                          ? "border-black dark:border-white"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <img
                        src={getImageUrl(image)}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              {/* Badges */}
              <div className="flex gap-2 mb-4">
                {product.is_new && <span className="badge-new">Nouveau</span>}
                {product.is_promo && discount > 0 && (
                  <span className="badge-promo">-{discount}%</span>
                )}
              </div>

              {/* Title */}
              <h1
                className="text-3xl md:text-4xl font-semibold tracking-tight mb-4"
                data-testid="product-name"
              >
                {product.name}
              </h1>

              {/* Short Description */}
              <p className="text-body-lg mb-6">{product.short_description}</p>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-4">
                <span
                  className="text-3xl font-semibold price-fcfa"
                  data-testid="product-price"
                >
                  {formatPrice(product.price)}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-xl text-muted-foreground line-through price-fcfa">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>

              {/* On Order Badge */}
              {product.is_on_order && (
                <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-orange-700 dark:text-orange-300">Disponible sur commande</p>
                      {product.order_delivery_days && (
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          Livraison estimée : {product.order_delivery_days} jours
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Price Alert Button */}
              {(product.stock > 0 || product.is_on_order) && (
                <button
                  onClick={() => setShowPriceAlertModal(true)}
                  className="mb-8 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                  data-testid="price-alert-btn"
                >
                  <TrendingDown className="w-4 h-4" />
                  Alerte baisse de prix
                </button>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Quantité</label>
                <div className="flex items-center border border-black/10 dark:border-white/10 rounded-xl w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="quantity-btn rounded-l-xl"
                    aria-label="Diminuer la quantité"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-16 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                    disabled={quantity >= product.stock}
                    className="quantity-btn rounded-r-xl"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {product.stock <= 5 && product.stock > 0 && (
                  <p className="text-sm text-orange-500 mt-2">
                    Plus que {product.stock} en stock
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mb-8">
                {product.stock === 0 && !product.is_on_order ? (
                  <button
                    onClick={() => setShowNotifyModal(true)}
                    className="btn-primary w-full justify-center py-4 text-base bg-orange-500 border-orange-500 hover:bg-orange-600"
                    data-testid="notify-stock-btn"
                  >
                    <Bell className="w-5 h-5" />
                    Prévenez-moi quand disponible
                  </button>
                ) : product.is_on_order ? (
                  <button
                    onClick={handleAddToCart}
                    disabled={cartLoading}
                    className="btn-primary w-full justify-center py-4 text-base bg-orange-500 border-orange-500 hover:bg-orange-600"
                    data-testid="add-to-cart-btn"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Commander ce produit
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={cartLoading}
                    className="btn-primary w-full justify-center py-4 text-base"
                    data-testid="add-to-cart-btn"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Ajouter au panier
                  </button>
                )}

                <button
                  onClick={handleWhatsAppOrder}
                  className="btn-secondary w-full justify-center py-4 text-base bg-[#25D366] border-[#25D366] text-white hover:bg-[#25D366]/90"
                  data-testid="whatsapp-order-btn"
                >
                  <MessageCircle className="w-5 h-5" />
                  Commander via WhatsApp
                </button>

                <button
                  onClick={() => toggleWishlist(product.product_id)}
                  disabled={wishlistLoading}
                  className={cn(
                    "btn-secondary w-full justify-center py-4 text-base",
                    inWishlist && "bg-red-50 border-red-200 text-red-600"
                  )}
                  data-testid="wishlist-btn"
                >
                  <Heart className={cn("w-5 h-5", inWishlist && "fill-current")} />
                  {inWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
                </button>

                {/* Appointment Button for large items */}
                {APPOINTMENT_CATEGORIES.includes(product.category?.toLowerCase()) && (
                  <button
                    onClick={() => setShowAppointmentModal(true)}
                    className="btn-secondary w-full justify-center py-4 text-base bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                    data-testid="appointment-btn"
                  >
                    <Calendar className="w-5 h-5" />
                    Prendre rendez-vous pour une visite
                  </button>
                )}
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 py-6 border-y border-black/10 dark:border-white/10 mb-8">
                <div className="text-center">
                  <Truck className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Livraison rapide</p>
                </div>
                <div className="text-center">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Garantie</p>
                </div>
                <div className="text-center">
                  <RotateCcw className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Retour facile</p>
                </div>
              </div>

              {/* Description & Specs */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="description">
                  <AccordionTrigger className="text-base font-medium">
                    Description
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {product.description}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {product.specs && Object.keys(product.specs).length > 0 && (
                  <AccordionItem value="specs">
                    <AccordionTrigger className="text-base font-medium">
                      Caractéristiques techniques
                    </AccordionTrigger>
                    <AccordionContent>
                      <dl className="space-y-3">
                        {Object.entries(product.specs).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <dt className="text-muted-foreground capitalize">
                              {key.replace(/_/g, " ")}
                            </dt>
                            <dd className="font-medium">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="shipping">
                  <AccordionTrigger className="text-base font-medium">
                    Livraison & Retours
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 text-muted-foreground">
                      <p>
                        <strong className="text-foreground">Livraison Dakar :</strong>{" "}
                        24-48h - 2 500 FCFA
                      </p>
                      <p>
                        <strong className="text-foreground">Livraison Régions :</strong>{" "}
                        3-5 jours - 3 500 FCFA
                      </p>
                      <p>
                        <strong className="text-foreground">Retours :</strong> 7 jours
                        pour retourner votre produit
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* Frequently Bought Together */}
        <div className="container-lumina">
          <FrequentlyBoughtTogether productId={productId} currentProduct={product} />
        </div>

        {/* Similar Products Section */}
        <div className="container-lumina mt-8">
          <SimilarProducts productId={productId} category={product?.category} />
        </div>

        {/* Reviews Section */}
        <div className="container-lumina pb-24 lg:pb-16">
          <ProductReviews productId={productId} />
        </div>
      </section>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-[#1C1C1E] border-t border-black/10 dark:border-white/10 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground line-clamp-1">{product.name}</p>
            <p className="font-bold text-lg">{formatPrice(product.price)}</p>
          </div>
          <button
            onClick={() => toggleWishlist(product.product_id)}
            className={cn(
              "p-3 rounded-xl border transition-colors flex-shrink-0",
              inWishlist
                ? "border-red-500 text-red-500"
                : "border-black/10 dark:border-white/10"
            )}
          >
            <Heart className={cn("w-5 h-5", inWishlist && "fill-current")} />
          </button>
          {product.stock === 0 ? (
            <button
              onClick={() => setShowNotifyModal(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2 bg-orange-500 border-orange-500"
            >
              <Bell className="w-5 h-5" />
              Prévenez-moi
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={cartLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Stock Notification Modal */}
      {showNotifyModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowNotifyModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 mb-4">
                <Bell className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Prévenez-moi</h3>
              <p className="text-muted-foreground text-sm">
                Entrez votre email pour être notifié dès que <strong>{product.name}</strong> sera de nouveau disponible.
              </p>
            </div>

            <form onSubmit={handleNotifyStock} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-orange-500 outline-none transition-colors"
                  data-testid="notify-email-input"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNotifyModal(false)}
                  className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={notifyLoading}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                  data-testid="notify-submit-btn"
                >
                  {notifyLoading ? "Envoi..." : "Me notifier"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Price Alert Modal */}
      {showPriceAlertModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPriceAlertModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
                <TrendingDown className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Alerte baisse de prix</h3>
              <p className="text-muted-foreground text-sm">
                Recevez une notification quand <strong>{product.name}</strong> baisse de prix ou passe en promotion.
              </p>
            </div>

            <form onSubmit={handlePriceAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Votre email</label>
                <input
                  type="email"
                  value={priceAlertEmail}
                  onChange={(e) => setPriceAlertEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-blue-500 outline-none transition-colors"
                  data-testid="price-alert-email-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Prix cible (optionnel)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder={`Actuel: ${product.price} FCFA`}
                    className="w-full h-12 px-4 pr-16 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-blue-500 outline-none transition-colors"
                    data-testid="price-alert-target-input"
                    max={product.price - 1}
                    min={1}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    FCFA
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Laissez vide pour être notifié de toute baisse de prix
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPriceAlertModal(false)}
                  className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={priceAlertLoading}
                  className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                  data-testid="price-alert-submit-btn"
                >
                  {priceAlertLoading ? "Envoi..." : "Créer l'alerte"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        product={product}
      />
    </main>
  );
}
