import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gift, Plus, Minus, ShoppingBag, Sparkles, Heart, 
  Package, Trash2, Check, ArrowRight, X, Search,
  Palette, Tag
} from "lucide-react";
import axios from "axios";
import { useCart } from "../contexts/CartContext";
import { formatPrice, getImageUrl } from "../lib/utils";
import SEO from "../components/SEO";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function GiftBoxPage() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Configuration from API
  const [config, setConfig] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [giftBoxSizes, setGiftBoxSizes] = useState([]);
  const [wrappingOptions, setWrappingOptions] = useState([]);
  const [configLoading, setConfigLoading] = useState(true);
  
  // Gift box state
  const [selectedBoxSize, setSelectedBoxSize] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedWrapping, setSelectedWrapping] = useState(null);
  const [personalMessage, setPersonalMessage] = useState("");
  const [recipientName, setRecipientName] = useState("");
  
  // UI state
  const [showProductSelector, setShowProductSelector] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchProducts();
  }, []);

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      // Fetch both config and active template
      const [configResponse, templateResponse] = await Promise.all([
        axios.get(`${API_URL}/api/gift-box/config`),
        axios.get(`${API_URL}/api/gift-box/active-template`)
      ]);
      
      const { config: cfg, sizes, wrappings } = configResponse.data;
      setConfig(cfg);
      setActiveTemplate(templateResponse.data);
      setGiftBoxSizes(sizes.map(s => ({
        id: s.size_id,
        name: s.name,
        maxItems: s.max_items,
        basePrice: s.base_price,
        description: s.description,
        icon: s.icon,
        image: s.image
      })));
      setWrappingOptions(wrappings.map(w => ({
        id: w.wrapping_id,
        name: w.name,
        price: w.price,
        color: w.color,
        image: w.image
      })));
      
      // Set defaults
      if (sizes.length > 0) {
        const defaultSize = sizes.find(s => s.size_id === 'medium') || sizes[1] || sizes[0];
        setSelectedBoxSize({
          id: defaultSize.size_id,
          name: defaultSize.name,
          maxItems: defaultSize.max_items,
          basePrice: defaultSize.base_price,
          description: defaultSize.description,
          icon: defaultSize.icon
        });
      }
      if (wrappings.length > 0) {
        setSelectedWrapping({
          id: wrappings[0].wrapping_id,
          name: wrappings[0].name,
          price: wrappings[0].price,
          color: wrappings[0].color
        });
      }
    } catch (error) {
      console.error("Error fetching gift box config:", error);
      // Use fallback defaults
      const defaultSizes = [
        { id: "small", name: "Petit Coffret", maxItems: 3, basePrice: 5000, description: "Idéal pour une attention délicate", icon: "🎁" },
        { id: "medium", name: "Coffret Moyen", maxItems: 5, basePrice: 8000, description: "Parfait pour surprendre", icon: "🎀" },
        { id: "large", name: "Grand Coffret", maxItems: 8, basePrice: 12000, description: "Pour les grandes occasions", icon: "✨" },
        { id: "premium", name: "Coffret Premium", maxItems: 12, basePrice: 20000, description: "L'ultime cadeau de luxe", icon: "👑" },
      ];
      const defaultWrappings = [
        { id: "classic", name: "Classique", price: 0, color: "#C41E3A" },
        { id: "gold", name: "Or & Luxe", price: 3000, color: "#FFD700" },
        { id: "silver", name: "Argent Élégant", price: 2500, color: "#C0C0C0" },
        { id: "rose", name: "Rose Romantique", price: 2000, color: "#FF69B4" },
        { id: "nature", name: "Nature & Kraft", price: 1500, color: "#8B4513" },
      ];
      setGiftBoxSizes(defaultSizes);
      setWrappingOptions(defaultWrappings);
      setSelectedBoxSize(defaultSizes[1]);
      setSelectedWrapping(defaultWrappings[0]);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch ONLY gift box products selected by admin
      const response = await axios.get(`${API_URL}/api/gift-box/products`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Error fetching gift box products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ["all", ...new Set(products.map(p => p.category).filter(Boolean))];

  // Calculate total price (handle null states)
  const itemsTotal = selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalPrice = itemsTotal + (selectedBoxSize?.basePrice || 0) + (selectedWrapping?.price || 0);

  // Add item to gift box
  const addItem = (product) => {
    if (!selectedBoxSize) {
      toast.error("Veuillez d'abord choisir une taille de coffret");
      return;
    }
    if (selectedItems.length >= selectedBoxSize.maxItems) {
      toast.error(`Ce coffret ne peut contenir que ${selectedBoxSize.maxItems} articles maximum`);
      return;
    }
    if (selectedItems.find(item => item.product_id === product.product_id)) {
      toast.error("Cet article est déjà dans votre coffret");
      return;
    }
    setSelectedItems([...selectedItems, product]);
    toast.success(`${product.name} ajouté au coffret`);
  };

  // Remove item from gift box
  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter(item => item.product_id !== productId));
  };

  // Add gift box to cart
  const handleAddToCart = () => {
    if (!selectedBoxSize || !selectedWrapping) {
      toast.error("Veuillez configurer votre coffret avant de l'ajouter au panier");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Veuillez sélectionner au moins un article pour votre coffret");
      return;
    }

    const giftBox = {
      product_id: `giftbox_${Date.now()}`,
      name: `Coffret Cadeau Personnalisé - ${selectedBoxSize.name}`,
      price: totalPrice,
      quantity: 1,
      images: ["/assets/images/giftbox-placeholder.jpg"],
      is_gift_box: true,
      gift_box_details: {
        size: selectedBoxSize,
        items: selectedItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          price: item.flash_sale_price || item.price,
          image: item.images?.[0]
        })),
        wrapping: selectedWrapping,
        message: personalMessage,
        recipient: recipientName,
        items_total: itemsTotal,
        box_price: selectedBoxSize.basePrice,
        wrapping_price: selectedWrapping.price
      }
    };

    addToCart(giftBox);
    toast.success("Coffret cadeau ajouté au panier !");
    
    // Reset
    setSelectedItems([]);
    setPersonalMessage("");
    setRecipientName("");
  };

  // Show loading state while configuration is being fetched
  if (configLoading || !selectedBoxSize || !selectedWrapping) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-black dark:via-gray-900 dark:to-black pt-24 pb-16">
        <SEO 
          title="Coffrets Cadeaux Personnalisés - YAMA+"
          description="Créez votre coffret cadeau personnalisé. Choisissez vos articles, personnalisez l'emballage et ajoutez un message personnel."
        />
        <div className="container-lumina flex flex-col items-center justify-center min-h-[50vh]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement des coffrets cadeaux...</p>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main 
      className="min-h-screen pt-24 pb-16"
      style={{
        background: activeTemplate?.theme_color 
          ? `linear-gradient(135deg, ${activeTemplate.theme_color}15 0%, transparent 50%, ${activeTemplate.theme_color}10 100%)`
          : 'linear-gradient(135deg, #ec489915 0%, transparent 50%, #8b5cf610 100%)'
      }}
    >
      <SEO 
        title={activeTemplate?.page_title || "Coffrets Cadeaux Personnalisés - YAMA+"}
        description={activeTemplate?.page_subtitle || "Créez votre coffret cadeau personnalisé. Choisissez vos articles, personnalisez l'emballage et ajoutez un message personnel."}
      />

      <div className="container-lumina">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-full text-sm font-medium mb-4"
            style={{ 
              background: activeTemplate?.theme_color 
                ? `linear-gradient(135deg, ${activeTemplate.theme_color}, ${activeTemplate.theme_color}cc)`
                : 'linear-gradient(135deg, #ec4899, #8b5cf6)'
            }}
          >
            <span className="text-lg">{activeTemplate?.icon || '✨'}</span>
            Créez un cadeau unique
          </div>
          <h1 
            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent mb-4"
            style={{ 
              backgroundImage: activeTemplate?.theme_color 
                ? `linear-gradient(135deg, ${activeTemplate.theme_color}, ${activeTemplate.theme_color}99)`
                : 'linear-gradient(135deg, #ec4899, #8b5cf6)'
            }}
          >
            {activeTemplate?.page_title || "Coffrets Cadeaux Personnalisés"}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {activeTemplate?.page_subtitle || "Composez le coffret parfait en sélectionnant vos articles préférés, choisissez un emballage élégant et ajoutez votre message personnel."}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Gift Box Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Choose Box Size */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                  1
                </div>
                <h2 className="text-xl font-bold">Choisissez la taille du coffret</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {giftBoxSizes.map((box) => (
                  <motion.button
                    key={box.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedBoxSize(box);
                      // Remove excess items if downgrading
                      if (selectedItems.length > box.maxItems) {
                        setSelectedItems(selectedItems.slice(0, box.maxItems));
                        toast.info(`Coffret limité à ${box.maxItems} articles`);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedBoxSize.id === box.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{box.icon}</span>
                    <p className="font-semibold text-sm">{box.name}</p>
                    <p className="text-xs text-muted-foreground">{box.description}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      Jusqu'à {box.maxItems} articles
                    </p>
                    <p className="font-bold text-sm mt-2">{formatPrice(box.basePrice)}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Step 2: Select Items */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Sélectionnez vos articles</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedItems.length}/{selectedBoxSize?.maxItems || 5} articles sélectionnés
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductSelector(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              {/* Selected Items */}
              {selectedItems.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence>
                    {selectedItems.map((item, index) => (
                      <motion.div
                        key={item.product_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                      >
                        <span className="text-sm font-bold text-purple-500 w-6">{index + 1}</span>
                        {(item.image || item.images?.[0]) && (
                          <img
                            src={getImageUrl(item.image || item.images?.[0])}
                            alt={item.name}
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
                            {formatPrice(item.flash_sale_price || item.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Gift className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Aucun article sélectionné</p>
                  <p className="text-sm">Cliquez sur "Ajouter" pour choisir vos articles</p>
                </div>
              )}
            </motion.div>

            {/* Step 3: Choose Wrapping */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                  3
                </div>
                <h2 className="text-xl font-bold">Choisissez l'emballage</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {wrappingOptions.map((wrap) => (
                  <motion.button
                    key={wrap.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedWrapping(wrap)}
                    className={`p-4 rounded-2xl border-2 transition-all text-center ${
                      selectedWrapping.id === wrap.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full mx-auto mb-2 border-2 border-white shadow-md"
                      style={{ backgroundColor: wrap.color }}
                    />
                    <p className="font-medium text-sm">{wrap.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {wrap.price > 0 ? `+${formatPrice(wrap.price)}` : 'Inclus'}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Step 4: Personal Message */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                  4
                </div>
                <h2 className="text-xl font-bold">Message personnel (optionnel)</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nom du destinataire</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ex: Marie"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Votre message</label>
                  <textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder="Écrivez votre message personnel ici..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {personalMessage.length}/200 caractères
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-lg sticky top-28"
            >
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-500" />
                Récapitulatif
              </h3>

              <div className="space-y-4">
                {/* Box */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{selectedBoxSize?.name || 'Coffret'}</span>
                  <span className="font-medium">{formatPrice(selectedBoxSize?.basePrice || 0)}</span>
                </div>

                {/* Items */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{selectedItems.length} article(s)</span>
                  <span className="font-medium">{formatPrice(itemsTotal)}</span>
                </div>

                {/* Wrapping */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Emballage {selectedWrapping?.name || 'Classique'}</span>
                  <span className="font-medium">
                    {(selectedWrapping?.price || 0) > 0 ? formatPrice(selectedWrapping.price) : 'Inclus'}
                  </span>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  disabled={selectedItems.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 ${
                    selectedItems.length > 0
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90'
                      : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Ajouter au panier
                </motion.button>

                {recipientName && (
                  <p className="text-center text-sm text-muted-foreground">
                    <Heart className="w-4 h-4 inline text-pink-500 mr-1" />
                    Pour {recipientName}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Product Selector Modal */}
      <AnimatePresence>
        {showProductSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowProductSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1C1C1E] rounded-3xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Sélectionner des articles</h3>
                  <button
                    onClick={() => setShowProductSelector(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Search & Filter */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un article..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === "all" ? "Toutes catégories" : cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Grid */}
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun produit disponible pour les coffrets</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedItems.find(item => item.product_id === product.product_id);
                      const canAdd = selectedItems.length < (selectedBoxSize?.maxItems || 5);
                      
                      return (
                        <motion.button
                          key={product.product_id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => !isSelected && canAdd && addItem(product)}
                          disabled={isSelected || !canAdd}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                              : canAdd
                                ? 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative">
                            {product.image ? (
                              <img
                                src={getImageUrl(product.image)}
                                alt={product.name}
                                className="w-full aspect-square object-cover rounded-lg mb-2"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-2 flex items-center justify-center">
                                <Gift className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                          <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold mt-1">
                            {formatPrice(product.price)}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedItems.length}/{selectedBoxSize?.maxItems || 5} articles sélectionnés
                </p>
                <button
                  onClick={() => setShowProductSelector(false)}
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium"
                >
                  Terminé
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
