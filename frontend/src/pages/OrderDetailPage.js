import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import {
  ChevronLeft,
  Package,
  FileText,
  MapPin,
  CreditCard,
  Phone,
} from "lucide-react";
import { formatPrice, formatDate, getOrderStatusDisplay } from "../lib/utils";
import OrderTimeline from "../components/OrderTimeline";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Try to fetch order - works with or without auth for order tracking
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const response = await axios.get(`${API_URL}/api/orders/${orderId}`, config);
        setOrder(response.data);
      } catch (error) {
        console.error("Error fetching order:", error);
        if (error.response?.status === 404) {
          setError("Commande non trouvée");
        } else if (error.response?.status === 401) {
          // If unauthorized and not logged in, redirect to login
          if (!isAuthenticated) {
            navigate("/login", { state: { from: `/order/${orderId}` } });
            return;
          }
          setError("Vous n'avez pas accès à cette commande");
        } else {
          setError("Erreur lors du chargement de la commande");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, isAuthenticated, token, navigate]);

  if (loading) {
    return (
      <main className="min-h-screen pt-20 bg-[#F5F5F7] dark:bg-[#0B0B0B]">
        <div className="container-lumina py-12">
          <div className="h-8 w-32 rounded skeleton mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 rounded-2xl skeleton" />
              <div className="h-48 rounded-2xl skeleton" />
            </div>
            <div className="h-96 rounded-2xl skeleton" />
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-4">{error || "Commande non trouvée"}</h1>
          <Link to="/" className="btn-primary">
            Retour à l'accueil
          </Link>
        </div>
      </main>
    );
  }

  const status = getOrderStatusDisplay(order.order_status);

  return (
    <main className="min-h-screen pt-20 bg-[#F5F5F7] dark:bg-[#0B0B0B]" data-testid="order-detail-page">
      {/* Header */}
      <section className="py-8 bg-white dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <Link
            to="/account/orders"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour aux commandes
          </Link>
          
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Commande {order.order_id}</h1>
              <p className="text-muted-foreground">
                Passée le {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("badge-lumina", status.class)}>
                {status.label}
              </span>
              <a
                href={`${API_URL}/api/orders/${order.order_id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                <FileText className="w-4 h-4" />
                Télécharger la facture
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="container-lumina">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <OrderTimeline 
                  currentStatus={order.order_status}
                  statusHistory={order.status_history || []}
                  createdAt={order.created_at}
                />
              </motion.div>

              {/* Order Items */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6"
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Articles ({order.items.length})
                </h3>
                
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 py-4 border-b border-black/5 dark:border-white/5 last:border-0"
                    >
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.name}
                        className="w-20 h-20 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Quantité: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Shipping Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6"
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse de livraison
                </h3>
                
                <div className="space-y-2 text-sm">
                  <p className="font-medium">{order.shipping?.full_name}</p>
                  <p className="text-muted-foreground">{order.shipping?.address}</p>
                  <p className="text-muted-foreground">
                    {order.shipping?.city}, {order.shipping?.region}
                  </p>
                  <p className="flex items-center gap-2 text-muted-foreground mt-3">
                    <Phone className="w-4 h-4" />
                    {order.shipping?.phone}
                  </p>
                </div>
              </motion.div>

              {/* Payment Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6"
              >
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Paiement
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Méthode</span>
                    <span className="font-medium capitalize">{order.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <span className={cn(
                      "font-medium",
                      order.payment_status === "paid" ? "text-green-600" : "text-orange-500"
                    )}>
                      {order.payment_status === "paid" ? "Payé" : "En attente"}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Order Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6"
              >
                <h3 className="font-semibold mb-4">Récapitulatif</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison</span>
                    <span>{formatPrice(order.shipping_cost)}</span>
                  </div>
                  <div className="border-t border-black/10 dark:border-white/10 pt-3 flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold text-lg">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </motion.div>

              {/* Contact Support */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Besoin d'aide ?</p>
                <a
                  href="https://wa.me/221783827575"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#25D366] font-medium text-sm hover:underline"
                >
                  Contactez-nous sur WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
