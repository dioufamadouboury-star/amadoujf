import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Check } from "lucide-react";
import axios from "axios";
import { formatPrice, getImageUrl } from "../lib/utils";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FrequentlyBoughtTogether({ productId, currentProduct }) {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/products/${productId}/frequently-bought`);
        setBundles(response.data);
        // Select all by default
        setSelectedProducts(response.data.map(p => p.product_id));
      } catch (error) {
        console.error("Error fetching bundles:", error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchBundles();
    }
  }, [productId]);

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddBundle = async () => {
    // Add current product
    await addToCart(currentProduct.product_id, 1);
    
    // Add selected products
    for (const pid of selectedProducts) {
      await addToCart(pid, 1);
    }
    
    toast.success(`${selectedProducts.length + 1} produits ajoutés au panier`);
  };

  if (loading || bundles.length === 0) return null;

  const totalPrice = currentProduct.price + bundles
    .filter(p => selectedProducts.includes(p.product_id))
    .reduce((sum, p) => sum + p.price, 0);

  const totalOriginalPrice = (currentProduct.original_price || currentProduct.price) + bundles
    .filter(p => selectedProducts.includes(p.product_id))
    .reduce((sum, p) => sum + (p.original_price || p.price), 0);

  const discount = Math.round(((totalOriginalPrice - totalPrice) / totalOriginalPrice) * 100);

  return (
    <div className="bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl p-6 mt-8">
      <h3 className="font-semibold mb-4">Souvent achetés ensemble</h3>
      
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Current Product */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
            <img
              src={currentProduct.images?.[0] || '/placeholder.jpg'}
              alt={currentProduct.name}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs mt-2 text-center line-clamp-1 max-w-[80px]">{currentProduct.name}</p>
        </div>

        {bundles.map((product, index) => (
          <div key={product.product_id} className="flex items-center">
            <Plus className="w-4 h-4 text-muted-foreground mx-2" />
            <button
              onClick={() => toggleProduct(product.product_id)}
              className={`flex flex-col items-center relative transition-opacity ${
                selectedProducts.includes(product.product_id) ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                <img
                  src={getImageUrl(product.images?.[0], '/placeholder.jpg')}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {selectedProducts.includes(product.product_id) && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-xs mt-2 text-center line-clamp-1 max-w-[80px]">{product.name}</p>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Prix total ({selectedProducts.length + 1} articles)</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold">{formatPrice(totalPrice)}</p>
            {discount > 0 && (
              <span className="text-sm text-green-600 font-medium">-{discount}%</span>
            )}
          </div>
        </div>
        <button
          onClick={handleAddBundle}
          className="btn-primary flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Ajouter le lot
        </button>
      </div>
    </div>
  );
}
