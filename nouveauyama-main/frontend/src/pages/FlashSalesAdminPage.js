import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import {
  Zap,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Loader2,
  Search,
  Package,
} from "lucide-react";
import { formatPrice, getImageUrl } from "../lib/utils";
import { cn } from "../lib/utils";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FlashSalesAdminPage() {
  const { token } = useAuth();
  const [flashProducts, setFlashProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [flashPrice, setFlashPrice] = useState("");
  const [flashEndDate, setFlashEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch flash sales
      const flashRes = await axios.get(`${API_URL}/api/flash-sales`);
      setFlashProducts(flashRes.data);

      // Fetch all products
      const productsRes = await axios.get(`${API_URL}/api/products?limit=100`);
      setAllProducts(productsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlashSale = async () => {
    if (!selectedProduct || !flashPrice || !flashEndDate) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/admin/flash-sales/${selectedProduct.product_id}`,
        {
          flash_sale_price: parseInt(flashPrice),
          flash_sale_end: new Date(flashEndDate).toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Vente flash créée !");
      setShowAddModal(false);
      setSelectedProduct(null);
      setFlashPrice("");
      setFlashEndDate("");
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFlashSale = async (productId) => {
    if (!window.confirm("Retirer ce produit des ventes flash ?")) return;

    try {
      await axios.delete(`${API_URL}/api/admin/flash-sales/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Vente flash supprimée");
      await fetchData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const availableProducts = allProducts.filter(
    p => !flashProducts.find(fp => fp.product_id === p.product_id)
  );

  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Set default end date to 24 hours from now
  const getDefaultEndDate = () => {
    const date = new Date();
    date.setHours(date.getHours() + 24);
    return date.toISOString().slice(0, 16);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Zap className="w-7 h-7 text-orange-500" />
            Ventes Flash
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos promotions à durée limitée
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setFlashEndDate(getDefaultEndDate());
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter une vente flash
        </button>
      </div>

      {/* Current Flash Sales */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <h2 className="font-semibold">Ventes flash actives ({flashProducts.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : flashProducts.length === 0 ? (
          <div className="p-8 text-center">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune vente flash active</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-sm font-medium text-orange-500 hover:underline"
            >
              Créer votre première vente flash
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {flashProducts.map((product) => (
              <div key={product.product_id} className="p-4 flex items-center gap-4">
                <img
                  src={getImageUrl(product.images?.[0], "/placeholder.jpg")}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{product.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="text-muted-foreground line-through">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-orange-500 font-semibold">
                      {formatPrice(product.flash_sale_price)}
                    </span>
                    <span className="text-green-600 text-xs font-medium">
                      -{Math.round((1 - product.flash_sale_price / product.price) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Fin: {new Date(product.flash_sale_end).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveFlashSale(product.product_id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Flash Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-black/5 dark:border-white/5">
              <h2 className="text-xl font-semibold">Nouvelle vente flash</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Product Search */}
              <div>
                <label className="block text-sm font-medium mb-2">Produit</label>
                {selectedProduct ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                    <img
                      src={selectedProduct.images?.[0] || "/placeholder.jpg"}
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{selectedProduct.name}</p>
                      <p className="text-sm text-muted-foreground">{formatPrice(selectedProduct.price)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="text-red-500 text-sm"
                    >
                      Changer
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un produit..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-black/10 dark:border-white/10 rounded-xl">
                      {filteredProducts.length === 0 ? (
                        <p className="p-4 text-center text-muted-foreground text-sm">
                          Aucun produit disponible
                        </p>
                      ) : (
                        filteredProducts.slice(0, 10).map((product) => (
                          <button
                            key={product.product_id}
                            onClick={() => {
                              setSelectedProduct(product);
                              setFlashPrice(Math.round(product.price * 0.8).toString());
                            }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 text-left"
                          >
                            <img
                              src={getImageUrl(product.images?.[0], "/placeholder.jpg")}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Flash Price */}
              <div>
                <label className="block text-sm font-medium mb-2">Prix flash (FCFA)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={flashPrice}
                    onChange={(e) => setFlashPrice(e.target.value)}
                    placeholder="Ex: 50000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
                  />
                </div>
                {selectedProduct && flashPrice && (
                  <p className="text-sm text-green-600 mt-1">
                    Réduction: -{Math.round((1 - parseInt(flashPrice) / selectedProduct.price) * 100)}%
                  </p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Date de fin</label>
                <input
                  type="datetime-local"
                  value={flashEndDate}
                  onChange={(e) => setFlashEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-black/5 dark:border-white/5 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedProduct(null);
                  setSearchQuery("");
                }}
                className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 font-medium hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                onClick={handleAddFlashSale}
                disabled={saving || !selectedProduct || !flashPrice || !flashEndDate}
                className={cn(
                  "flex-1 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2",
                  saving || !selectedProduct || !flashPrice || !flashEndDate
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600"
                )}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Créer la vente flash
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
