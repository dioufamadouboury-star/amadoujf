import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  ShoppingBag,
  Mail,
  Send,
  RefreshCw,
  User,
  Package,
  Clock,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AbandonedCartsAdminPage() {
  const { token } = useAuth();
  const [carts, setCarts] = useState([]);
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [activeTab, setActiveTab] = useState("carts");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cartsRes, emailsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/abandoned-carts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/admin/abandoned-carts/emails`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/admin/abandoned-carts/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setCarts(cartsRes.data);
      setEmails(emailsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching abandoned carts:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const triggerDetection = async () => {
    setTriggering(true);
    try {
      await axios.post(`${API_URL}/api/admin/abandoned-carts/trigger`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Détection lancée !");
      setTimeout(fetchData, 3000); // Refresh after 3 seconds
    } catch (error) {
      toast.error("Erreur lors de la détection");
    } finally {
      setTriggering(false);
    }
  };

  const sendEmailManually = async (cartId) => {
    setSendingEmail(cartId);
    try {
      await axios.post(`${API_URL}/api/admin/abandoned-carts/send/${cartId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Email envoyé !");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSendingEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paniers Abandonnés</h1>
          <p className="text-muted-foreground">Récupérez vos ventes perdues</p>
        </div>
        <button
          onClick={triggerDetection}
          disabled={triggering}
          className="btn-primary flex items-center gap-2"
        >
          {triggering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Détecter maintenant
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.abandoned_carts}</p>
                <p className="text-sm text-muted-foreground">Paniers abandonnés</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_emails_sent}</p>
                <p className="text-sm text-muted-foreground">Emails envoyés</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Send className="w-5 h-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emails_sent_today}</p>
                <p className="text-sm text-muted-foreground">Emails aujourd'hui</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cart_timeout_hours}h</p>
                <p className="text-sm text-muted-foreground">Délai détection</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("carts")}
          className={`pb-3 px-1 font-medium border-b-2 transition-colors ${
            activeTab === "carts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Paniers ({carts.length})
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`pb-3 px-1 font-medium border-b-2 transition-colors ${
            activeTab === "emails"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Emails envoyés ({emails.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "carts" && (
        <div className="space-y-4">
          {carts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun panier abandonné détecté</p>
              <p className="text-sm mt-1">Les paniers inactifs depuis plus d'1h apparaîtront ici</p>
            </div>
          ) : (
            carts.map((cart) => (
              <motion.div
                key={cart.cart_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl border p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{cart.user_name || "Utilisateur"}</p>
                      <p className="text-sm text-muted-foreground">{cart.user_email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dernière activité: {new Date(cart.updated_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(cart.total)}</p>
                    <p className="text-sm text-muted-foreground">{cart.items.length} article(s)</p>
                    {cart.email_sent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-2">
                        <CheckCircle className="w-3 h-3" />
                        Email envoyé
                      </span>
                    ) : (
                      <button
                        onClick={() => sendEmailManually(cart.cart_id)}
                        disabled={sendingEmail === cart.cart_id}
                        className="mt-2 text-xs bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90 flex items-center gap-1"
                      >
                        {sendingEmail === cart.cart_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        Envoyer email
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Preview */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-3">
                    {cart.items.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" />
                        )}
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">{item.name}</p>
                          <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                    {cart.items.length > 4 && (
                      <div className="flex items-center justify-center text-xs text-muted-foreground px-3">
                        +{cart.items.length - 4} autres
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === "emails" && (
        <div className="space-y-4">
          {emails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun email envoyé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Date d'envoi</th>
                    <th className="text-left py-3 px-4 font-medium">Montant panier</th>
                    <th className="text-left py-3 px-4 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">{email.email}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(email.sent_at).toLocaleString("fr-FR")}
                      </td>
                      <td className="py-3 px-4">{formatPrice(email.cart_total || 0)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          {email.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
