import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { Search as SearchIcon } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!query) {
        setProducts([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await axios.get(
          `${API_URL}/api/products?search=${encodeURIComponent(query)}&limit=50`
        );
        setProducts(response.data);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [query]);

  return (
    <main className="min-h-screen pt-20" data-testid="search-page">
      {/* Header */}
      <section className="py-12 md:py-16 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-caption mb-4">Résultats de recherche</p>
            <h1 className="heading-section mb-4">"{query}"</h1>
            <p className="text-body-lg">
              {loading
                ? "Recherche en cours..."
                : `${products.length} produit${products.length > 1 ? "s" : ""} trouvé${products.length > 1 ? "s" : ""}`}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Results */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-3xl skeleton" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <SearchIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Aucun résultat</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Nous n'avons trouvé aucun produit correspondant à "{query}". 
                Essayez avec d'autres termes.
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
