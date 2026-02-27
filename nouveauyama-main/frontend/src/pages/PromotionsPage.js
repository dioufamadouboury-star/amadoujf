import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import ProductCard from "../components/ProductCard";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PromotionsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/products?is_promo=true&limit=50`);
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <main className="min-h-screen pt-20" data-testid="promotions-page">
      {/* Header */}
      <section className="py-16 md:py-24 bg-black text-white">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-[#D4AF37] text-sm font-medium tracking-widest uppercase mb-4">
              Offres limitées
            </p>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6">
              Promotions
            </h1>
            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto">
              Profitez de nos offres exceptionnelles sur une sélection 
              de produits premium. Quantités limitées.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Products */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-3xl skeleton" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-6">
                Pas de promotions en cours.
              </p>
              <Link to="/" className="btn-primary">
                Voir tous les produits
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <ProductCard key={product.product_id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
