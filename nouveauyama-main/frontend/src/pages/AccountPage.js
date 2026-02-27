import { useState, useEffect } from "react";
import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  User,
  Package,
  Heart,
  Settings,
  LogOut,
  ChevronRight,
  FileText,
  Edit3,
  Save,
  X,
  Phone,
} from "lucide-react";
import { formatPrice, formatDate, getOrderStatusDisplay } from "../lib/utils";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const menuItems = [
  { id: "profile", label: "Mon profil", icon: User, href: "/account" },
  { id: "orders", label: "Mes commandes", icon: Package, href: "/account/orders" },
  { id: "wishlist", label: "Mes favoris", icon: Heart, href: "/wishlist" },
];

export default function AccountPage() {
  const { user, logout, isAuthenticated, checkAuth, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: ""
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/orders`, {
          withCredentials: true,
        });
        setOrders(response.data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, authLoading, navigate, location]);

  // Initialize edit form when user changes
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || "",
        phone: user.phone || ""
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleEditProfile = () => {
    setEditForm({
      name: user?.name || "",
      phone: user?.phone || ""
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      name: user?.name || "",
      phone: user?.phone || ""
    });
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/auth/profile`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null
      });
      
      // Refresh user data
      await checkAuth();
      setIsEditing(false);
      toast.success("Profil mis à jour avec succès");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setSaving(false);
    }
  };

  // Show loading while auth is being verified
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isOrdersPage = location.pathname.includes("/orders");

  return (
    <main className="min-h-screen pt-20 bg-[#F5F5F7] dark:bg-[#0B0B0B]" data-testid="account-page">
      {/* Header */}
      <section className="py-12 bg-white dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white dark:text-black" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold">{user?.name}</h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container-lumina">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
                {menuItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 border-b border-black/5 dark:border-white/5 transition-colors",
                      location.pathname === item.href
                        ? "bg-black/5 dark:bg-white/5"
                        : "hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-6 py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Déconnexion</span>
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {isOrdersPage ? (
                /* Orders List */
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
                  <h2 className="text-xl font-semibold mb-6">Mes commandes</h2>
                  
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 rounded-xl skeleton" />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Vous n&apos;avez pas encore de commandes
                      </p>
                      <Link to="/" className="btn-primary">
                        Commencer mes achats
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => {
                        const status = getOrderStatusDisplay(order.order_status);
                        return (
                          <motion.div
                            key={order.order_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-black/10 dark:border-white/10 rounded-xl p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                              <div>
                                <p className="font-medium">{order.order_id}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(order.created_at)}
                                </p>
                              </div>
                              <span className={cn("badge-lumina", status.class)}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                              {order.items.slice(0, 4).map((item, i) => (
                                <img
                                  key={i}
                                  src={item.image || "/placeholder.jpg"}
                                  alt={item.name}
                                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                />
                              ))}
                              {order.items.length > 4 && (
                                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                                  +{order.items.length - 4}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                              <span className="font-semibold">
                                {formatPrice(order.total)}
                              </span>
                              <div className="flex items-center gap-3">
                                <a
                                  href={`${API_URL}/api/orders/${order.order_id}/invoice`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-green-600 font-medium text-sm hover:underline"
                                >
                                  <FileText className="w-4 h-4" />
                                  Facture
                                </a>
                                <Link
                                  to={`/order/${order.order_id}`}
                                  className="text-[#0071E3] font-medium text-sm"
                                >
                                  Voir les détails
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Profile */
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Mon profil</h2>
                    {!isEditing ? (
                      <button
                        onClick={handleEditProfile}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black dark:bg-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
                        data-testid="edit-profile-btn"
                      >
                        <Edit3 className="w-4 h-4" />
                        Modifier
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          data-testid="cancel-edit-btn"
                        >
                          <X className="w-4 h-4" />
                          Annuler
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          data-testid="save-profile-btn"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? "Enregistrement..." : "Enregistrer"}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Nom complet
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                            placeholder="Votre nom"
                            data-testid="edit-name-input"
                          />
                        ) : (
                          <p className="font-medium">{user?.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Email
                        </label>
                        <p className="font-medium text-muted-foreground">{user?.email}</p>
                        {isEditing && (
                          <p className="text-xs text-muted-foreground mt-1">L'email ne peut pas être modifié</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          <span className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Téléphone
                          </span>
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                            placeholder="+221 77 123 45 67"
                            data-testid="edit-phone-input"
                          />
                        ) : (
                          <p className="font-medium">{user?.phone || <span className="text-muted-foreground italic">Non renseigné</span>}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                          Type de compte
                        </label>
                        <p className="font-medium capitalize">{user?.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
