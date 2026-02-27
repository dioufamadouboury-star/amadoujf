import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin,
  Phone,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { formatPrice, formatDate } from "../lib/utils";
import { cn } from "../lib/utils";
import SEO from "../components/SEO";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const orderStatuses = [
  { 
    id: "pending", 
    label: "Commande reçue", 
    icon: Clock, 
    description: "Votre commande a été reçue et est en attente de traitement" 
  },
  { 
    id: "processing", 
    label: "En préparation", 
    icon: Package, 
    description: "Votre commande est en cours de préparation dans notre entrepôt" 
  },
  { 
    id: "shipped", 
    label: "Expédiée", 
    icon: Truck, 
    description: "Votre commande est en route vers l'adresse de livraison" 
  },
  { 
    id: "delivered", 
    label: "Livrée", 
    icon: CheckCircle, 
    description: "Votre commande a été livrée avec succès" 
  },
];

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    setSearched(true);

    try {
      const response = await axios.get(`${API_URL}/api/orders/track`, {
        params: { order_id: orderId, email }
      });
      setOrder(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Commande non trouvée. Vérifiez votre numéro de commande et votre email.");
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatusIndex = () => {
    if (!order) return -1;
    return orderStatuses.findIndex(s => s.id === order.status);
  };

  const currentStatusIndex = getCurrentStatusIndex();

  return (
    <main className="min-h-screen bg-[#F5F5F7] dark:bg-black pt-24 pb-16">
      <SEO 
        title="Suivi de commande - YAMA+"
        description="Suivez votre commande YAMA+ en temps réel"
      />

      <div className="container-lumina max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black dark:bg-white mb-4">
            <Truck className="w-8 h-8 text-white dark:text-black" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Suivi de commande</h1>
          <p className="text-muted-foreground">
            Entrez votre numéro de commande pour suivre votre livraison
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 md:p-8 mb-8"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Numéro de commande
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                    placeholder="Ex: ORD-ABC12345"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email de commande
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 outline-none"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-8 py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Suivre ma commande
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-8 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm mt-1 opacity-80">
                Besoin d'aide ? <a href="https://wa.me/221783827575" className="underline">Contactez-nous sur WhatsApp</a>
              </p>
            </div>
          </motion.div>
        )}

        {/* Order Result */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Order Summary */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Commande</p>
                  <p className="text-xl font-bold">{order.order_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date de commande</p>
                  <p className="font-medium">{formatDate(order.created_at)}</p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-black/10 dark:bg-white/10" />
                
                <div className="space-y-6">
                  {orderStatuses.map((status, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const Icon = status.icon;

                    return (
                      <motion.div
                        key={status.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "relative flex items-start gap-4 pl-2",
                          !isCompleted && "opacity-40"
                        )}
                      >
                        <div className={cn(
                          "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          isCompleted 
                            ? "bg-green-500 text-white" 
                            : "bg-black/10 dark:bg-white/10 text-muted-foreground"
                        )}>
                          <Icon className="w-5 h-5" />
                          {isCurrent && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className={cn(
                            "font-semibold",
                            isCurrent && "text-green-600 dark:text-green-400"
                          )}>
                            {status.label}
                            {isCurrent && <span className="ml-2 text-sm font-normal">(Statut actuel)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {status.description}
                          </p>
                          {isCompleted && order[`${status.id}_at`] && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(order[`${status.id}_at`])}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Cancelled status */}
              {order.status === "cancelled" && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">Commande annulée</p>
                    <p className="text-sm text-red-600/70 dark:text-red-400/70">
                      Cette commande a été annulée. Si vous avez des questions, contactez notre support.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse de livraison
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{order.shipping?.name || order.customer_name}</p>
                  <p className="text-muted-foreground">{order.shipping?.address}</p>
                  <p className="text-muted-foreground">{order.shipping?.city}, {order.shipping?.region}</p>
                  <p className="text-muted-foreground flex items-center gap-2 mt-2">
                    <Phone className="w-4 h-4" />
                    {order.shipping?.phone}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
                <h3 className="font-semibold mb-4">Récapitulatif</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Articles ({order.items?.length || 0})</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison</span>
                    <span>{order.shipping_cost ? formatPrice(order.shipping_cost) : "Gratuit"}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Réduction</span>
                      <span>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-black/10 dark:border-white/10">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Articles commandés</h3>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {order.items?.map((item, index) => (
                  <div key={index} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qté: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-black rounded-2xl p-6 text-center">
              <h3 className="font-semibold text-lg mb-2">Besoin d'aide ?</h3>
              <p className="text-white/70 dark:text-black/70 mb-4">
                Notre équipe est disponible pour répondre à vos questions
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="https://wa.me/221783827575"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-600 transition-colors"
                >
                  WhatsApp
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  to="/contact"
                  className="px-6 py-2.5 bg-white/20 dark:bg-black/20 rounded-xl font-medium hover:bg-white/30 dark:hover:bg-black/30 transition-colors"
                >
                  Nous contacter
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {searched && !order && !error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">Aucun résultat</p>
          </motion.div>
        )}
      </div>
    </main>
  );
}
