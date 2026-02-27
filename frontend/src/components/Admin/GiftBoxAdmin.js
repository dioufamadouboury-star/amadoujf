import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gift, Plus, Trash2, Edit2, Save, X, Image, 
  Palette, Package, Settings, Eye, EyeOff, 
  Upload, Check, Sparkles, Moon, Baby,
  TreePine, Heart, ShoppingBag, Sun, Layers,
  Search, Import, Tag
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { formatPrice, getImageUrl } from "../../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function GiftBoxAdmin({ token }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");
  const [config, setConfig] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [wrappings, setWrappings] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [giftBoxProducts, setGiftBoxProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  
  // Edit states
  const [editingSize, setEditingSize] = useState(null);
  const [editingWrapping, setEditingWrapping] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAddSize, setShowAddSize] = useState(false);
  const [showAddWrapping, setShowAddWrapping] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImports, setSelectedImports] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form states
  const [newSize, setNewSize] = useState({
    name: "", description: "", max_items: 5, base_price: 10000, icon: "🎁", is_active: true
  });
  const [newWrapping, setNewWrapping] = useState({
    name: "", color: "#FF0000", price: 0, is_active: true
  });
  const [newTemplate, setNewTemplate] = useState({
    name: "", description: "", icon: "🎁", theme_color: "#9333EA", page_title: "", page_subtitle: ""
  });
  const [newProduct, setNewProduct] = useState({
    name: "", description: "", price: 0, image: "", category: "", is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, templatesRes, productsRes, catalogRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/gift-box/config`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/gift-box/templates`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/gift-box/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/products?limit=100`)
      ]);
      setConfig(configRes.data.config);
      setSizes(configRes.data.sizes);
      setWrappings(configRes.data.wrappings);
      setTemplates(templatesRes.data.templates);
      setGiftBoxProducts(productsRes.data.products);
      setCatalogProducts(catalogRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async () => {
    try {
      await axios.put(`${API_URL}/api/admin/gift-box/config`, config, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Configuration mise à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleImageUpload = async (file, callback) => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post(`${API_URL}/api/upload/image`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      callback(response.data.url);
      toast.success("Image uploadée");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingImage(false);
    }
  };

  // ============ PRODUCT FUNCTIONS ============
  
  const createProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error("Nom et prix requis");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/admin/gift-box/products`, newProduct, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGiftBoxProducts([...giftBoxProducts, response.data.product]);
      setShowAddProduct(false);
      setNewProduct({ name: "", description: "", price: 0, image: "", category: "", is_active: true });
      toast.success("Produit ajouté au coffret");
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const updateProduct = async (productId, data) => {
    try {
      await axios.put(`${API_URL}/api/admin/gift-box/products/${productId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGiftBoxProducts(giftBoxProducts.map(p => p.product_id === productId ? { ...p, ...data } : p));
      setEditingProduct(null);
      toast.success("Produit mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("Supprimer ce produit des coffrets ?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/gift-box/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGiftBoxProducts(giftBoxProducts.filter(p => p.product_id !== productId));
      toast.success("Produit supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const importFromCatalog = async () => {
    if (selectedImports.length === 0) {
      toast.error("Sélectionnez au moins un produit");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/admin/gift-box/products/import-from-catalog`, 
        { product_ids: selectedImports },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      setShowImportModal(false);
      setSelectedImports([]);
      fetchData();
    } catch (error) {
      toast.error("Erreur lors de l'import");
    }
  };

  // ============ TEMPLATE FUNCTIONS ============

  const activateTemplate = async (templateId) => {
    try {
      await axios.put(`${API_URL}/api/admin/gift-box/templates/${templateId}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(templates.map(t => ({ ...t, is_active: t.template_id === templateId })));
      toast.success("Template activé !");
    } catch (error) {
      toast.error("Erreur lors de l'activation");
    }
  };

  const createTemplate = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/admin/gift-box/templates`, newTemplate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates([...templates, response.data.template]);
      setShowAddTemplate(false);
      setNewTemplate({ name: "", description: "", icon: "🎁", theme_color: "#9333EA", page_title: "", page_subtitle: "" });
      toast.success("Template créé");
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const updateTemplate = async (templateId, data) => {
    try {
      await axios.put(`${API_URL}/api/admin/gift-box/templates/${templateId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(templates.map(t => t.template_id === templateId ? { ...t, ...data } : t));
      setEditingTemplate(null);
      toast.success("Template mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // ============ SIZE & WRAPPING FUNCTIONS ============

  const createSize = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/admin/gift-box/sizes`, newSize, { headers: { Authorization: `Bearer ${token}` } });
      setSizes([...sizes, response.data]);
      setShowAddSize(false);
      setNewSize({ name: "", description: "", max_items: 5, base_price: 10000, icon: "🎁", is_active: true });
      toast.success("Taille créée");
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const updateSize = async (sizeId, data) => {
    try {
      await axios.put(`${API_URL}/api/admin/gift-box/sizes/${sizeId}`, data, { headers: { Authorization: `Bearer ${token}` } });
      setSizes(sizes.map(s => s.size_id === sizeId ? { ...s, ...data } : s));
      setEditingSize(null);
      toast.success("Taille mise à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteSize = async (sizeId) => {
    if (!window.confirm("Supprimer cette taille ?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/gift-box/sizes/${sizeId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSizes(sizes.filter(s => s.size_id !== sizeId));
      toast.success("Taille supprimée");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const createWrapping = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/admin/gift-box/wrappings`, newWrapping, { headers: { Authorization: `Bearer ${token}` } });
      setWrappings([...wrappings, response.data]);
      setShowAddWrapping(false);
      setNewWrapping({ name: "", color: "#FF0000", price: 0, is_active: true });
      toast.success("Emballage créé");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const updateWrapping = async (wrappingId, data) => {
    try {
      await axios.put(`${API_URL}/api/admin/gift-box/wrappings/${wrappingId}`, data, { headers: { Authorization: `Bearer ${token}` } });
      setWrappings(wrappings.map(w => w.wrapping_id === wrappingId ? { ...w, ...data } : w));
      setEditingWrapping(null);
      toast.success("Emballage mis à jour");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const deleteWrapping = async (wrappingId) => {
    if (!window.confirm("Supprimer cet emballage ?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/gift-box/wrappings/${wrappingId}`, { headers: { Authorization: `Bearer ${token}` } });
      setWrappings(wrappings.filter(w => w.wrapping_id !== wrappingId));
      toast.success("Emballage supprimé");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTemplate = templates.find(t => t.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Gift className="w-8 h-8 text-purple-500" />
            Coffrets Cadeaux
          </h2>
          <p className="text-muted-foreground">Gérez les produits, templates et options</p>
        </div>
        <a 
          href="/coffret-cadeau" 
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Voir la page
        </a>
      </div>

      {/* Active Template Banner */}
      {activeTemplate && (
        <div 
          className="p-4 rounded-xl border-2 flex items-center justify-between"
          style={{ borderColor: activeTemplate.theme_color, background: `${activeTemplate.theme_color}15` }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeTemplate.icon}</span>
            <div>
              <p className="font-semibold" style={{ color: activeTemplate.theme_color }}>
                Template actif : {activeTemplate.name}
              </p>
              <p className="text-sm text-muted-foreground">{activeTemplate.page_title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
            <Check className="w-4 h-4" />
            Actif
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: "products", label: "Produits", icon: Tag, count: giftBoxProducts.length },
          { id: "templates", label: "Templates", icon: Layers },
          { id: "sizes", label: "Tailles", icon: Package },
          { id: "wrappings", label: "Emballages", icon: Palette },
          { id: "settings", label: "Paramètres", icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold">Produits disponibles dans les coffrets</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez les produits que vos clients pourront choisir
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-purple-500 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <Import className="w-4 h-4" />
                Importer du catalogue
              </button>
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouveau produit
              </button>
            </div>
          </div>

          {giftBoxProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-2xl">
              <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun produit dans les coffrets</p>
              <button
                onClick={() => setShowAddProduct(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg"
              >
                Ajouter un produit
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {giftBoxProducts.map(product => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative bg-white dark:bg-[#1C1C1E] rounded-xl border overflow-hidden ${
                    product.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 opacity-60'
                  }`}
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                    {product.image ? (
                      <img 
                        src={getImageUrl(product.image)} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {!product.is_active && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm">Inactif</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h4 className="font-semibold mb-1 truncate">{product.name}</h4>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-600">{formatPrice(product.price)}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.product_id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Add Product Modal */}
          <AnimatePresence>
            {showAddProduct && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowAddProduct(false)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold mb-4">Nouveau Produit Coffret</h3>
                  <div className="space-y-4">
                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Image du produit</label>
                      <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden relative">
                        {newProduct.image ? (
                          <img src={getImageUrl(newProduct.image)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleImageUpload(e.target.files[0], (url) => {
                                  setNewProduct({ ...newProduct, image: url });
                                });
                              }
                            }}
                          />
                          {uploadingImage ? (
                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload className="w-8 h-8 text-white opacity-0 hover:opacity-100" />
                          )}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Nom du produit *</label>
                      <input
                        type="text"
                        value={newProduct.name}
                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent"
                        placeholder="Ex: Coffret Beauté Premium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={newProduct.description}
                        onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent"
                        rows={2}
                        placeholder="Description du produit"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Prix (FCFA) *</label>
                        <input
                          type="number"
                          value={newProduct.price}
                          onChange={e => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Catégorie</label>
                        <input
                          type="text"
                          value={newProduct.category}
                          onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent"
                          placeholder="Ex: Beauté"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newProduct.is_active}
                        onChange={e => setNewProduct({ ...newProduct, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span>Actif (visible pour les clients)</span>
                    </label>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddProduct(false)}
                      className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={createProduct}
                      className="flex-1 py-2 rounded-lg bg-purple-500 text-white font-medium"
                    >
                      Créer
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Product Modal */}
          <AnimatePresence>
            {editingProduct && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setEditingProduct(null)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold mb-4">Modifier : {editingProduct.name}</h3>
                  <div className="space-y-4">
                    {/* Image */}
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden relative">
                      {editingProduct.image ? (
                        <img src={getImageUrl(editingProduct.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleImageUpload(e.target.files[0], (url) => {
                                setEditingProduct({ ...editingProduct, image: url });
                              });
                            }
                          }}
                        />
                        <Upload className="w-8 h-8 text-white opacity-0 hover:opacity-100" />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border bg-transparent"
                      placeholder="Nom"
                    />
                    <textarea
                      value={editingProduct.description || ""}
                      onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border bg-transparent"
                      rows={2}
                      placeholder="Description"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={editingProduct.price}
                        onChange={e => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                        className="px-3 py-2 rounded-lg border bg-transparent"
                        placeholder="Prix"
                      />
                      <input
                        type="text"
                        value={editingProduct.category || ""}
                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                        className="px-3 py-2 rounded-lg border bg-transparent"
                        placeholder="Catégorie"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingProduct.is_active}
                        onChange={e => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span>Actif</span>
                    </label>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setEditingProduct(null)} className="flex-1 py-2 rounded-lg border">Annuler</button>
                    <button onClick={() => updateProduct(editingProduct.product_id, editingProduct)} className="flex-1 py-2 rounded-lg bg-purple-500 text-white">Sauvegarder</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Import Modal */}
          <AnimatePresence>
            {showImportModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowImportModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold mb-4">Importer du catalogue</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez les produits à ajouter aux coffrets cadeaux
                  </p>
                  
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {catalogProducts.map(product => {
                      const alreadyImported = giftBoxProducts.some(p => p.original_product_id === product.product_id);
                      const isSelected = selectedImports.includes(product.product_id);
                      
                      return (
                        <label 
                          key={product.product_id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            alreadyImported 
                              ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900'
                              : isSelected 
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={alreadyImported}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedImports([...selectedImports, product.product_id]);
                              } else {
                                setSelectedImports(selectedImports.filter(id => id !== product.product_id));
                              }
                            }}
                            className="rounded"
                          />
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                            {product.images?.[0] && (
                              <img src={getImageUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
                          </div>
                          {alreadyImported && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Déjà importé</span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                      onClick={() => { setShowImportModal(false); setSelectedImports([]); }}
                      className="flex-1 py-2 rounded-lg border"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={importFromCatalog}
                      disabled={selectedImports.length === 0}
                      className="flex-1 py-2 rounded-lg bg-purple-500 text-white font-medium disabled:opacity-50"
                    >
                      Importer ({selectedImports.length})
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Choisissez le template selon la période</p>
            <button
              onClick={() => setShowAddTemplate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Plus className="w-4 h-4" />
              Nouveau template
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.template_id}
                className={`relative p-5 rounded-2xl border-2 transition-all ${
                  template.is_active ? "ring-2 ring-green-500 ring-offset-2" : ""
                }`}
                style={{ borderColor: template.theme_color, background: template.is_active ? `${template.theme_color}10` : 'var(--card)' }}
              >
                {template.is_active && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{template.icon}</span>
                  <button onClick={() => setEditingTemplate(template)} className="p-1.5 rounded-lg hover:bg-black/5">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <h3 className="font-bold text-lg mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>

                <div className="h-2 rounded-full mb-4" style={{ background: template.theme_color }} />

                {!template.is_active ? (
                  <button
                    onClick={() => activateTemplate(template.template_id)}
                    className="w-full py-2 rounded-lg font-medium text-white"
                    style={{ background: template.theme_color }}
                  >
                    Activer ce template
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-lg font-medium text-center bg-green-100 text-green-700">
                    Template actif
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Template Modals */}
          <AnimatePresence>
            {(showAddTemplate || editingTemplate) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => { setShowAddTemplate(false); setEditingTemplate(null); }}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-md"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold mb-4">
                    {editingTemplate ? `Modifier : ${editingTemplate.name}` : "Nouveau Template"}
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editingTemplate?.name || newTemplate.name}
                      onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, name: e.target.value }) : setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border bg-transparent"
                      placeholder="Nom du template"
                    />
                    <textarea
                      value={editingTemplate?.description || newTemplate.description}
                      onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, description: e.target.value }) : setNewTemplate({ ...newTemplate, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border bg-transparent"
                      rows={2}
                      placeholder="Description"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Icône</label>
                        <input
                          type="text"
                          value={editingTemplate?.icon || newTemplate.icon}
                          onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, icon: e.target.value }) : setNewTemplate({ ...newTemplate, icon: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border bg-transparent text-center text-2xl"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Couleur</label>
                        <input
                          type="color"
                          value={editingTemplate?.theme_color || newTemplate.theme_color}
                          onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, theme_color: e.target.value }) : setNewTemplate({ ...newTemplate, theme_color: e.target.value })}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={editingTemplate?.page_title || newTemplate.page_title}
                      onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, page_title: e.target.value }) : setNewTemplate({ ...newTemplate, page_title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border bg-transparent"
                      placeholder="Titre de page"
                    />
                    <input
                      type="text"
                      value={editingTemplate?.page_subtitle || newTemplate.page_subtitle}
                      onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, page_subtitle: e.target.value }) : setNewTemplate({ ...newTemplate, page_subtitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border bg-transparent"
                      placeholder="Sous-titre"
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowAddTemplate(false); setEditingTemplate(null); }} className="flex-1 py-2 rounded-lg border">Annuler</button>
                    <button 
                      onClick={() => editingTemplate ? updateTemplate(editingTemplate.template_id, editingTemplate) : createTemplate()} 
                      className="flex-1 py-2 rounded-lg bg-purple-500 text-white"
                    >
                      {editingTemplate ? "Sauvegarder" : "Créer"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sizes Tab */}
      {activeTab === "sizes" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddSize(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {sizes.map(size => (
              <div key={size.size_id} className="p-4 bg-white dark:bg-[#1C1C1E] rounded-xl border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{size.icon}</span>
                    <div>
                      <h4 className="font-semibold">{size.name}</h4>
                      <p className="text-sm text-muted-foreground">{size.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingSize(size)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteSize(size.size_id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Max: {size.max_items} articles</span>
                  <span className="font-semibold text-purple-600">{formatPrice(size.base_price)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Size Modal */}
          <AnimatePresence>
            {(showAddSize || editingSize) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddSize(false); setEditingSize(null); }}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold mb-4">{editingSize ? "Modifier" : "Nouvelle"} Taille</h3>
                  <div className="space-y-4">
                    <input type="text" value={editingSize?.name || newSize.name} onChange={e => editingSize ? setEditingSize({ ...editingSize, name: e.target.value }) : setNewSize({ ...newSize, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-transparent" placeholder="Nom" />
                    <input type="text" value={editingSize?.description || newSize.description} onChange={e => editingSize ? setEditingSize({ ...editingSize, description: e.target.value }) : setNewSize({ ...newSize, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-transparent" placeholder="Description" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" value={editingSize?.icon || newSize.icon} onChange={e => editingSize ? setEditingSize({ ...editingSize, icon: e.target.value }) : setNewSize({ ...newSize, icon: e.target.value })} className="px-3 py-2 rounded-lg border bg-transparent text-center text-xl" />
                      <input type="number" value={editingSize?.max_items || newSize.max_items} onChange={e => editingSize ? setEditingSize({ ...editingSize, max_items: parseInt(e.target.value) }) : setNewSize({ ...newSize, max_items: parseInt(e.target.value) })} className="px-3 py-2 rounded-lg border bg-transparent" placeholder="Max" />
                      <input type="number" value={editingSize?.base_price || newSize.base_price} onChange={e => editingSize ? setEditingSize({ ...editingSize, base_price: parseInt(e.target.value) }) : setNewSize({ ...newSize, base_price: parseInt(e.target.value) })} className="px-3 py-2 rounded-lg border bg-transparent" placeholder="Prix" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowAddSize(false); setEditingSize(null); }} className="flex-1 py-2 rounded-lg border">Annuler</button>
                    <button onClick={() => editingSize ? updateSize(editingSize.size_id, editingSize) : createSize()} className="flex-1 py-2 rounded-lg bg-purple-500 text-white">{editingSize ? "Sauvegarder" : "Créer"}</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Wrappings Tab */}
      {activeTab === "wrappings" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddWrapping(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wrappings.map(wrapping => (
              <div key={wrapping.wrapping_id} className="p-4 bg-white dark:bg-[#1C1C1E] rounded-xl border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg" style={{ background: wrapping.color }} />
                  <div>
                    <h4 className="font-semibold">{wrapping.name}</h4>
                    <p className="text-sm text-muted-foreground">{wrapping.price > 0 ? formatPrice(wrapping.price) : 'Gratuit'}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingWrapping(wrapping)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteWrapping(wrapping.wrapping_id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Wrapping Modal */}
          <AnimatePresence>
            {(showAddWrapping || editingWrapping) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowAddWrapping(false); setEditingWrapping(null); }}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold mb-4">{editingWrapping ? "Modifier" : "Nouvel"} Emballage</h3>
                  <div className="space-y-4">
                    <input type="text" value={editingWrapping?.name || newWrapping.name} onChange={e => editingWrapping ? setEditingWrapping({ ...editingWrapping, name: e.target.value }) : setNewWrapping({ ...newWrapping, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-transparent" placeholder="Nom" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="color" value={editingWrapping?.color || newWrapping.color} onChange={e => editingWrapping ? setEditingWrapping({ ...editingWrapping, color: e.target.value }) : setNewWrapping({ ...newWrapping, color: e.target.value })} className="w-full h-10 rounded cursor-pointer" />
                      <input type="number" value={editingWrapping?.price ?? newWrapping.price} onChange={e => editingWrapping ? setEditingWrapping({ ...editingWrapping, price: parseInt(e.target.value) || 0 }) : setNewWrapping({ ...newWrapping, price: parseInt(e.target.value) || 0 })} className="px-3 py-2 rounded-lg border bg-transparent" placeholder="Prix" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowAddWrapping(false); setEditingWrapping(null); }} className="flex-1 py-2 rounded-lg border">Annuler</button>
                    <button onClick={() => editingWrapping ? updateWrapping(editingWrapping.wrapping_id, editingWrapping) : createWrapping()} className="flex-1 py-2 rounded-lg bg-purple-500 text-white">{editingWrapping ? "Sauvegarder" : "Créer"}</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && config && (
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" /> Configuration
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={config.is_enabled} onChange={e => setConfig({ ...config, is_enabled: e.target.checked })} className="w-5 h-5 rounded" />
              <span>Activer la page Coffrets Cadeaux</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={config.allow_personal_message} onChange={e => setConfig({ ...config, allow_personal_message: e.target.checked })} className="w-5 h-5 rounded" />
              <span>Autoriser les messages personnalisés</span>
            </label>
            <button onClick={updateConfig} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg">
              <Save className="w-4 h-4" /> Sauvegarder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
