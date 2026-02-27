import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  Calendar,
  Percent,
  DollarSign,
  Truck,
  Search,
  X,
  Check,
  Loader2,
  Copy,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DISCOUNT_TYPES = [
  { value: "percent", label: "Pourcentage", icon: Percent },
  { value: "fixed", label: "Montant fixe", icon: DollarSign },
  { value: "free_shipping", label: "Livraison gratuite", icon: Truck },
];

const CATEGORIES = [
  { value: "electronique", label: "Électronique" },
  { value: "electromenager", label: "Électroménager" },
  { value: "decoration", label: "Décoration" },
  { value: "beaute", label: "Beauté" },
];

export default function PromoCodesAdminPage() {
  const { token } = useAuth();
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percent",
    discount_value: 10,
    min_purchase: null,
    max_discount: null,
    categories: [],
    usage_limit: null,
    per_user_limit: 1,
    start_date: "",
    end_date: "",
    is_active: true,
    description: "",
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/promo-codes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPromoCodes(response.data);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        min_purchase: formData.min_purchase || null,
        max_discount: formData.max_discount || null,
        usage_limit: formData.usage_limit || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        categories: formData.categories.length > 0 ? formData.categories : null,
      };

      if (editingPromo) {
        await axios.put(`${API_URL}/api/admin/promo-codes/${editingPromo.promo_id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Code promo mis à jour");
      } else {
        await axios.post(`${API_URL}/api/admin/promo-codes`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Code promo créé");
      }
      
      fetchPromoCodes();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (promoId) => {
    if (!window.confirm("Supprimer ce code promo ?")) return;
    
    try {
      await axios.delete(`${API_URL}/api/admin/promo-codes/${promoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Code promo supprimé");
      fetchPromoCodes();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingPromo(null);
    setFormData({
      code: "",
      discount_type: "percent",
      discount_value: 10,
      min_purchase: null,
      max_discount: null,
      categories: [],
      usage_limit: null,
      per_user_limit: 1,
      start_date: "",
      end_date: "",
      is_active: true,
      description: "",
    });
  };

  const openEdit = (promo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_purchase: promo.min_purchase || "",
      max_discount: promo.max_discount || "",
      categories: promo.categories || [],
      usage_limit: promo.usage_limit || "",
      per_user_limit: promo.per_user_limit || 1,
      start_date: promo.start_date ? promo.start_date.slice(0, 16) : "",
      end_date: promo.end_date ? promo.end_date.slice(0, 16) : "",
      is_active: promo.is_active,
      description: promo.description || "",
    });
    setShowModal(true);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code "${code}" copié !`);
  };

  const filteredCodes = promoCodes.filter(p => 
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getDiscountLabel = (promo) => {
    if (promo.discount_type === "percent") return `-${promo.discount_value}%`;
    if (promo.discount_type === "fixed") return `-${formatPrice(promo.discount_value)}`;
    return "Livraison gratuite";
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
          <h1 className="text-2xl font-bold">Codes Promo</h1>
          <p className="text-muted-foreground">{promoCodes.length} codes promo</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau code
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un code..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {/* Promo Codes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCodes.map((promo) => (
          <motion.div
            key={promo.promo_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${
              !promo.is_active ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  promo.discount_type === "percent" ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" :
                  promo.discount_type === "fixed" ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300" :
                  "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
                }`}>
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{promo.code}</span>
                    <button onClick={() => copyCode(promo.code)} className="text-muted-foreground hover:text-primary">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">{getDiscountLabel(promo)}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(promo)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(promo.promo_id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {promo.description && (
              <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>
            )}

            <div className="space-y-1 text-xs text-muted-foreground">
              {promo.min_purchase && (
                <p>Min. achat: {formatPrice(promo.min_purchase)}</p>
              )}
              {promo.max_discount && (
                <p>Max. réduction: {formatPrice(promo.max_discount)}</p>
              )}
              {promo.categories?.length > 0 && (
                <p>Catégories: {promo.categories.join(", ")}</p>
              )}
              {promo.end_date && (
                <p>Expire: {new Date(promo.end_date).toLocaleDateString("fr-FR")}</p>
              )}
              <p>Utilisations: {promo.usage_count}{promo.usage_limit ? `/${promo.usage_limit}` : ""}</p>
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${
                promo.is_active 
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700"
              }`}>
                {promo.is_active ? "Actif" : "Inactif"}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCodes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun code promo trouvé
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingPromo ? "Modifier le code" : "Nouveau code promo"}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                  placeholder="EX: NOEL2024"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Type de réduction</label>
                <div className="grid grid-cols-3 gap-2">
                  {DISCOUNT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_type: type.value })}
                      className={`p-3 border rounded-lg flex flex-col items-center gap-1 text-xs ${
                        formData.discount_type === type.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value */}
              {formData.discount_type !== "free_shipping" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {formData.discount_type === "percent" ? "Pourcentage" : "Montant (FCFA)"}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max={formData.discount_type === "percent" ? 100 : undefined}
                    required
                  />
                </div>
              )}

              {/* Min Purchase */}
              <div>
                <label className="block text-sm font-medium mb-1">Achat minimum (FCFA)</label>
                <input
                  type="number"
                  value={formData.min_purchase || ""}
                  onChange={(e) => setFormData({ ...formData, min_purchase: parseInt(e.target.value) || null })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Optionnel"
                />
              </div>

              {/* Max Discount (for percent type) */}
              {formData.discount_type === "percent" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Réduction max. (FCFA)</label>
                  <input
                    type="number"
                    value={formData.max_discount || ""}
                    onChange={(e) => setFormData({ ...formData, max_discount: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Optionnel"
                  />
                </div>
              )}

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium mb-1">Catégories (optionnel)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        const cats = formData.categories.includes(cat.value)
                          ? formData.categories.filter(c => c !== cat.value)
                          : [...formData.categories, cat.value];
                        setFormData({ ...formData, categories: cats });
                      }}
                      className={`px-3 py-1.5 text-sm border rounded-full ${
                        formData.categories.includes(cat.value)
                          ? "border-primary bg-primary text-white"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date début</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date fin</label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Limite d'utilisation</label>
                  <input
                    type="number"
                    value={formData.usage_limit || ""}
                    onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Illimité"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Par utilisateur</label>
                  <input
                    type="number"
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Promotion de Noël"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is_active" className="text-sm">Code actif</label>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingPromo ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
