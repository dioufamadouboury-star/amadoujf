import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import ProductCard from "./ProductCard";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SimilarProducts({ productId, category }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!productId) return;
      
      try {
        const response = await axios.get(`${API_URL}/api/products/${productId}/similar?limit=4`);
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching similar products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [productId]);

  if (loading) {
    return (
      <div className="py-12 border-t border-black/10 dark:border-white/10">
        <h2 className="text-2xl font-semibold mb-8">Vous aimerez aussi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-3xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="py-12 border-t border-black/10 dark:border-white/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-2xl font-semibold mb-8">Vous aimerez aussi</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <ProductCard key={product.product_id} product={product} index={index} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
