import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Check, Minus, Scale, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice, getImageUrl } from "../lib/utils";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { toast } from "sonner";

const MAX_COMPARE_ITEMS = 4;

export function useProductComparison() {
  const [compareItems, setCompareItems] = useLocalStorage("yama_compare", []);

  const addToCompare = (product) => {
    if (compareItems.length >= MAX_COMPARE_ITEMS) {
      toast.error(`Maximum ${MAX_COMPARE_ITEMS} produits à comparer`);
      return false;
    }
    if (compareItems.find(p => p.product_id === product.product_id)) {
      toast.info("Produit déjà dans la comparaison");
      return false;
    }
    setCompareItems([...compareItems, product]);
    toast.success("Ajouté à la comparaison");
    return true;
  };

  const removeFromCompare = (productId) => {
    setCompareItems(compareItems.filter(p => p.product_id !== productId));
  };

  const clearCompare = () => {
    setCompareItems([]);
  };

  const isInCompare = (productId) => {
    return compareItems.some(p => p.product_id === productId);
  };

  return { compareItems, addToCompare, removeFromCompare, clearCompare, isInCompare };
}

export function CompareButton({ product, className = "" }) {
  const { addToCompare, removeFromCompare, isInCompare } = useProductComparison();
  const inCompare = isInCompare(product.product_id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      removeFromCompare(product.product_id);
    } else {
      addToCompare(product);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-full transition-all ${inCompare 
        ? 'bg-primary text-white' 
        : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800'} ${className}`}
      title={inCompare ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
    >
      <Scale className="w-4 h-4" />
    </button>
  );
}

export function CompareFloatingBar() {
  const { compareItems, removeFromCompare, clearCompare } = useProductComparison();
  const [isExpanded, setIsExpanded] = useState(false);

  if (compareItems.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <span className="font-medium">{compareItems.length} produit(s)</span>
            </div>
            
            <div className="flex items-center gap-2">
              {compareItems.map((product) => (
                <div key={product.product_id} className="relative group">
                  <img
                    src={getImageUrl(product.images?.[0], '/placeholder.jpg')}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => removeFromCompare(product.product_id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {[...Array(MAX_COMPARE_ITEMS - compareItems.length)].map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Link
                to="/compare"
                className="btn-primary text-sm px-4 py-2"
              >
                Comparer
              </Link>
              <button
                onClick={clearCompare}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                title="Vider la comparaison"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function ProductComparisonPage() {
  const { compareItems, removeFromCompare, clearCompare } = useProductComparison();

  if (compareItems.length === 0) {
    return (
      <main className="min-h-screen pt-20">
        <div className="container-lumina py-16 text-center">
          <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Aucun produit à comparer</h1>
          <p className="text-muted-foreground mb-6">
            Ajoutez des produits pour les comparer côte à côte
          </p>
          <Link to="/" className="btn-primary">
            Découvrir nos produits
          </Link>
        </div>
      </main>
    );
  }

  // Get all unique spec keys from all products
  const allSpecKeys = [...new Set(compareItems.flatMap(p => Object.keys(p.specs || {})))];

  return (
    <main className="min-h-screen pt-20">
      <div className="container-lumina py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Comparaison</h1>
            <p className="text-muted-foreground">{compareItems.length} produit(s) sélectionné(s)</p>
          </div>
          <button
            onClick={clearCompare}
            className="text-red-500 hover:text-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Tout supprimer
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left bg-gray-50 dark:bg-gray-800 sticky left-0 min-w-[150px]"></th>
                {compareItems.map((product) => (
                  <th key={product.product_id} className="p-4 min-w-[250px]">
                    <div className="relative">
                      <button
                        onClick={() => removeFromCompare(product.product_id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <Link to={`/product/${product.product_id}`}>
                        <img
                          src={getImageUrl(product.images?.[0], '/placeholder.jpg')}
                          alt={product.name}
                          className="w-full h-48 object-cover rounded-xl mb-3"
                        />
                        <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price row */}
              <tr className="border-t dark:border-gray-700">
                <td className="p-4 font-medium bg-gray-50 dark:bg-gray-800 sticky left-0">Prix</td>
                {compareItems.map((product) => (
                  <td key={product.product_id} className="p-4 text-center">
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(product.price)}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="block text-sm text-muted-foreground line-through">
                        {formatPrice(product.original_price)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Category row */}
              <tr className="border-t dark:border-gray-700">
                <td className="p-4 font-medium bg-gray-50 dark:bg-gray-800 sticky left-0">Catégorie</td>
                {compareItems.map((product) => (
                  <td key={product.product_id} className="p-4 text-center capitalize">
                    {product.category?.replace('_', ' ')}
                  </td>
                ))}
              </tr>

              {/* Stock row */}
              <tr className="border-t dark:border-gray-700">
                <td className="p-4 font-medium bg-gray-50 dark:bg-gray-800 sticky left-0">Disponibilité</td>
                {compareItems.map((product) => (
                  <td key={product.product_id} className="p-4 text-center">
                    {product.stock > 0 ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" /> En stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <Minus className="w-4 h-4" /> Rupture
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Dynamic spec rows */}
              {allSpecKeys.map((specKey) => (
                <tr key={specKey} className="border-t dark:border-gray-700">
                  <td className="p-4 font-medium bg-gray-50 dark:bg-gray-800 sticky left-0 capitalize">
                    {specKey.replace(/_/g, ' ')}
                  </td>
                  {compareItems.map((product) => (
                    <td key={product.product_id} className="p-4 text-center">
                      {product.specs?.[specKey] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
