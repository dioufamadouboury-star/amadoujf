import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import SEO from "../components/SEO";
import FlashSalesBanner from "../components/FlashSalesBanner";
import { getCategoryName } from "../lib/utils";
import { 
  SlidersHorizontal, 
  X, 
  ChevronDown, 
  ChevronUp,
  Check,
  RotateCcw,
  Grid3X3,
  LayoutGrid,
  ArrowUpDown
} from "lucide-react";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const priceRanges = [
  { id: "all", label: "Tous les prix", min: 0, max: Infinity },
  { id: "0-50000", label: "Moins de 50 000 FCFA", min: 0, max: 50000 },
  { id: "50000-100000", label: "50 000 - 100 000 FCFA", min: 50000, max: 100000 },
  { id: "100000-500000", label: "100 000 - 500 000 FCFA", min: 100000, max: 500000 },
  { id: "500000-1000000", label: "500 000 - 1 000 000 FCFA", min: 500000, max: 1000000 },
  { id: "1000000+", label: "Plus de 1 000 000 FCFA", min: 1000000, max: Infinity },
];

const defaultColors = [
  { name: "Noir", value: "#000000" },
  { name: "Blanc", value: "#FFFFFF" },
  { name: "Gris", value: "#808080" },
  { name: "Rouge", value: "#FF0000" },
  { name: "Bleu", value: "#0000FF" },
  { name: "Vert", value: "#00FF00" },
  { name: "Jaune", value: "#FFFF00" },
  { name: "Rose", value: "#FFC0CB" },
  { name: "Or", value: "#FFD700" },
  { name: "Argent", value: "#C0C0C0" },
];

const defaultSizes = ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];

const sortOptions = [
  { id: "newest", label: "Plus récents" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix décroissant" },
  { id: "name-asc", label: "Nom A-Z" },
  { id: "name-desc", label: "Nom Z-A" },
  { id: "popular", label: "Populaires" },
];

export default function CategoryPage() {
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [gridSize, setGridSize] = useState("normal"); // "normal" or "compact"
  
  // Filter states
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyPromo, setOnlyPromo] = useState(false);
  
  // Expanded filter sections
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    color: true,
    size: false,
    brand: true,
    availability: true,
  });

  // Extract unique brands from products
  const availableBrands = useMemo(() => {
    const brands = products.map(p => p.brand).filter(Boolean);
    return [...new Set(brands)].sort();
  }, [products]);

  // Extract available colors from products
  const availableColors = useMemo(() => {
    const colors = products.flatMap(p => p.colors || []);
    return [...new Set(colors)];
  }, [products]);

  // Extract available sizes from products
  const availableSizes = useMemo(() => {
    const sizes = products.flatMap(p => p.sizes || []);
    return [...new Set(sizes)];
  }, [products]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/products?category=${categoryId}&limit=100`);
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId]);

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by price range
    if (selectedPriceRange !== "all") {
      const range = priceRanges.find(r => r.id === selectedPriceRange);
      if (range) {
        result = result.filter(p => p.price >= range.min && p.price < range.max);
      }
    }

    // Filter by colors
    if (selectedColors.length > 0) {
      result = result.filter(p => 
        p.colors && p.colors.some(c => selectedColors.includes(c))
      );
    }

    // Filter by sizes
    if (selectedSizes.length > 0) {
      result = result.filter(p => 
        p.sizes && p.sizes.some(s => selectedSizes.includes(s))
      );
    }

    // Filter by brands
    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    // Filter by stock
    if (onlyInStock) {
      result = result.filter(p => p.stock > 0);
    }

    // Filter by promo
    if (onlyPromo) {
      result = result.filter(p => p.is_promo);
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "popular":
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      case "newest":
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return result;
  }, [products, selectedPriceRange, selectedColors, selectedSizes, selectedBrands, sortBy, onlyInStock, onlyPromo]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedPriceRange !== "all") count++;
    count += selectedColors.length;
    count += selectedSizes.length;
    count += selectedBrands.length;
    if (onlyInStock) count++;
    if (onlyPromo) count++;
    return count;
  }, [selectedPriceRange, selectedColors, selectedSizes, selectedBrands, onlyInStock, onlyPromo]);

  // Reset all filters
  const resetFilters = () => {
    setSelectedPriceRange("all");
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedBrands([]);
    setOnlyInStock(false);
    setOnlyPromo(false);
    setSortBy("newest");
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter Section Component
  const FilterSection = ({ title, section, children }) => (
    <div className="border-b border-black/5 dark:border-white/5 pb-4 mb-4">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between py-2 font-medium text-sm"
      >
        {title}
        {expandedSections[section] ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      <AnimatePresence>
        {expandedSections[section] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F5F5F7] dark:bg-black pt-24 pb-16">
      <SEO 
        title={`${getCategoryName(categoryId)} - YAMA+`}
        description={`Découvrez notre sélection de produits ${getCategoryName(categoryId)}`}
      />

      <div className="container-lumina">
        {/* Flash Sales Banner */}
        <FlashSalesBanner />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
            <span>/</span>
            <span>{getCategoryName(categoryId)}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{getCategoryName(categoryId)}</h1>
              <p className="text-muted-foreground mt-1">
                {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
                {activeFiltersCount > 0 && ` (${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""})`}
              </p>
            </div>
            
            {/* Mobile filter button & Sort */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/10 dark:border-white/10 font-medium text-sm"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded-full text-xs">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none px-4 py-2.5 pr-10 bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/10 dark:border-white/10 font-medium text-sm cursor-pointer"
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
              </div>

              {/* Grid toggle */}
              <div className="hidden sm:flex items-center bg-white dark:bg-[#1C1C1E] rounded-xl border border-black/10 dark:border-white/10 p-1">
                <button
                  onClick={() => setGridSize("normal")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    gridSize === "normal" ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridSize("compact")}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    gridSize === "compact" ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28 bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold">Filtres</h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Price Filter */}
              <FilterSection title="Prix" section="price">
                <div className="space-y-2">
                  {priceRanges.map((range) => (
                    <label
                      key={range.id}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                        selectedPriceRange === range.id
                          ? "border-black bg-black dark:border-white dark:bg-white"
                          : "border-black/20 dark:border-white/20 group-hover:border-black/40 dark:group-hover:border-white/40"
                      )}>
                        {selectedPriceRange === range.id && (
                          <Check className="w-3 h-3 text-white dark:text-black" />
                        )}
                      </div>
                      <span className="text-sm">{range.label}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Color Filter */}
              {availableColors.length > 0 && (
                <FilterSection title="Couleurs" section="color">
                  <div className="flex flex-wrap gap-2">
                    {defaultColors.filter(c => availableColors.includes(c.name)).map((color) => (
                      <button
                        key={color.name}
                        onClick={() => {
                          setSelectedColors(prev => 
                            prev.includes(color.name)
                              ? prev.filter(c => c !== color.name)
                              : [...prev, color.name]
                          );
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                          selectedColors.includes(color.name)
                            ? "border-black dark:border-white scale-110"
                            : "border-black/10 dark:border-white/10 hover:scale-105"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {selectedColors.includes(color.name) && (
                          <Check className={cn(
                            "w-4 h-4",
                            color.value === "#FFFFFF" || color.value === "#FFFF00" || color.value === "#FFD700"
                              ? "text-black"
                              : "text-white"
                          )} />
                        )}
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Size Filter */}
              {availableSizes.length > 0 && (
                <FilterSection title="Tailles" section="size">
                  <div className="flex flex-wrap gap-2">
                    {defaultSizes.filter(s => availableSizes.includes(s)).map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setSelectedSizes(prev => 
                            prev.includes(size)
                              ? prev.filter(s => s !== size)
                              : [...prev, size]
                          );
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                          selectedSizes.includes(size)
                            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Brand Filter */}
              {availableBrands.length > 0 && (
                <FilterSection title="Marques" section="brand">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableBrands.map((brand) => (
                      <label
                        key={brand}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                          selectedBrands.includes(brand)
                            ? "border-black bg-black dark:border-white dark:bg-white"
                            : "border-black/20 dark:border-white/20 group-hover:border-black/40 dark:group-hover:border-white/40"
                        )}>
                          {selectedBrands.includes(brand) && (
                            <Check className="w-3 h-3 text-white dark:text-black" />
                          )}
                        </div>
                        <span className="text-sm">{brand}</span>
                      </label>
                    ))}
                  </div>
                </FilterSection>
              )}

              {/* Availability Filter */}
              <FilterSection title="Disponibilité" section="availability">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyInStock}
                      onChange={(e) => setOnlyInStock(e.target.checked)}
                      className="w-5 h-5 rounded border-black/20 dark:border-white/20"
                    />
                    <span className="text-sm">En stock uniquement</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyPromo}
                      onChange={(e) => setOnlyPromo(e.target.checked)}
                      className="w-5 h-5 rounded border-black/20 dark:border-white/20"
                    />
                    <span className="text-sm">En promotion</span>
                  </label>
                </div>
              </FilterSection>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className={cn(
                "grid gap-3 sm:gap-4 lg:gap-6",
                gridSize === "compact" 
                  ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" 
                  : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
              )}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[4/5] rounded-2xl skeleton" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#1C1C1E] rounded-2xl">
                <p className="text-muted-foreground text-lg mb-4">
                  Aucun produit ne correspond à vos critères.
                </p>
                <button
                  onClick={resetFilters}
                  className="btn-primary"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className={cn(
                "grid gap-3 sm:gap-4 lg:gap-6",
                gridSize === "compact" 
                  ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" 
                  : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3"
              )}>
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product.product_id} product={product} index={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="absolute right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-[#1C1C1E] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-[#1C1C1E] p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between z-10">
                <h2 className="font-semibold text-lg">Filtres</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                {/* Same filter content as desktop */}
                {/* Price Filter */}
                <FilterSection title="Prix" section="price">
                  <div className="space-y-2">
                    {priceRanges.map((range) => (
                      <label key={range.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="priceRange"
                          checked={selectedPriceRange === range.id}
                          onChange={() => setSelectedPriceRange(range.id)}
                          className="w-5 h-5"
                        />
                        <span className="text-sm">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </FilterSection>

                {/* Color Filter */}
                {availableColors.length > 0 && (
                  <FilterSection title="Couleurs" section="color">
                    <div className="flex flex-wrap gap-2">
                      {defaultColors.filter(c => availableColors.includes(c.name)).map((color) => (
                        <button
                          key={color.name}
                          onClick={() => {
                            setSelectedColors(prev => 
                              prev.includes(color.name)
                                ? prev.filter(c => c !== color.name)
                                : [...prev, color.name]
                            );
                          }}
                          className={cn(
                            "w-10 h-10 rounded-full border-2 flex items-center justify-center",
                            selectedColors.includes(color.name)
                              ? "border-black dark:border-white"
                              : "border-black/10 dark:border-white/10"
                          )}
                          style={{ backgroundColor: color.value }}
                        >
                          {selectedColors.includes(color.name) && (
                            <Check className={cn("w-5 h-5", color.value === "#FFFFFF" ? "text-black" : "text-white")} />
                          )}
                        </button>
                      ))}
                    </div>
                  </FilterSection>
                )}

                {/* Availability */}
                <FilterSection title="Disponibilité" section="availability">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={onlyInStock}
                        onChange={(e) => setOnlyInStock(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm">En stock uniquement</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={onlyPromo}
                        onChange={(e) => setOnlyPromo(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm">En promotion</span>
                    </label>
                  </div>
                </FilterSection>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-[#1C1C1E] p-4 border-t border-black/5 dark:border-white/5 flex gap-3">
                <button
                  onClick={resetFilters}
                  className="flex-1 py-3 rounded-xl border border-black/10 dark:border-white/10 font-medium"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium"
                >
                  Voir {filteredProducts.length} produits
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
