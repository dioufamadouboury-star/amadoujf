import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Smartphone, Home, Sparkles, Sofa, Car } from "lucide-react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import FlashSalesSection from "../components/FlashSalesSection";
import TrustBanner from "../components/TrustBanner";
import TestimonialsSection from "../components/TestimonialsSection";
import SEO from "../components/SEO";
import { formatPrice } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const categories = [
  {
    id: "electronique",
    name: "Électronique",
    description: "Smartphones, ordinateurs et gadgets",
    icon: Smartphone,
    image: "/assets/images/category_electronique.png",
    featured: true,
  },
  {
    id: "electromenager",
    name: "Électroménager",
    description: "Appareils du quotidien",
    icon: Home,
    image: "/assets/images/category_electromenager.png",
    featured: false,
  },
  {
    id: "decoration",
    name: "Décoration & Mobilier",
    description: "Design et confort",
    icon: Sofa,
    image: "/assets/images/category_decoration.jpeg",
    featured: false,
  },
  {
    id: "beaute",
    name: "Accessoires mode et beauté",
    description: "Mode, soins et cosmétiques",
    icon: Sparkles,
    image: "/assets/images/category_beaute.jpeg",
    featured: true,
  },
  {
    id: "automobile",
    name: "Automobile",
    description: "Véhicules et accessoires auto",
    icon: Car,
    image: "/assets/images/category_automobile.png",
    featured: true,
  },
];

// Hero carousel images - Une image pour chaque univers YAMA+
const heroImages = [
  {
    url: "/assets/images/category_electronique.png",
    alt: "Électronique - iPhone, AirPods, Apple Watch et accessoires premium",
    category: "Électronique",
    link: "/category/electronique"
  },
  {
    url: "/assets/images/category_electromenager.png",
    alt: "Électroménager - Réfrigérateur, lave-linge et appareils modernes",
    category: "Électroménager",
    link: "/category/electromenager"
  },
  {
    url: "/assets/images/category_decoration.jpeg",
    alt: "Décoration & Mobilier - Salon moderne et confortable",
    category: "Décoration & Mobilier",
    link: "/category/decoration"
  },
  {
    url: "/assets/images/category_beaute.jpeg",
    alt: "Beauté - Parfums et cosmétiques de luxe",
    category: "Beauté",
    link: "/category/beaute"
  },
  {
    url: "/assets/images/category_automobile.png",
    alt: "Automobile - Mercedes-Benz et véhicules premium",
    category: "Automobile",
    link: "/category/automobile"
  }
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [promoProducts, setPromoProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-rotate hero images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Seed database first
        await axios.post(`${API_URL}/api/seed`);
        
        const [featured, newProds, promos] = await Promise.all([
          axios.get(`${API_URL}/api/products?featured=true&limit=4`),
          axios.get(`${API_URL}/api/products?is_new=true&limit=4`),
          axios.get(`${API_URL}/api/products?is_promo=true&limit=4`),
        ]);
        
        setFeaturedProducts(featured.data);
        setNewProducts(newProds.data);
        setPromoProducts(promos.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <main className="min-h-screen" data-testid="home-page">
      <SEO 
        title={null}
        description="GROUPE YAMA+ - Votre boutique premium au Sénégal. Électronique, électroménager, décoration et beauté. Livraison rapide à Dakar. Paiement Wave, Orange Money, Free Money."
        url="/"
      />
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-white dark:bg-black">
        {/* Animated Background Images Carousel */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent dark:from-black/95 dark:via-black/70 dark:to-transparent z-10" />
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={heroImages[currentImageIndex].url}
              alt={heroImages[currentImageIndex].alt}
              className="absolute w-full h-full object-cover object-center"
              initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </AnimatePresence>
        </div>

        {/* Slide Indicators with animation */}
        <div className="absolute bottom-24 right-10 z-20 flex flex-col items-end gap-4">
          {/* Current category name */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/90 dark:bg-black/90 backdrop-blur-sm px-4 py-2 rounded-full"
            >
              <span className="text-sm font-semibold">
                {heroImages[currentImageIndex].category}
              </span>
            </motion.div>
          </AnimatePresence>
          
          {/* Dots */}
          <div className="flex gap-2">
            {heroImages.map((image, index) => (
              <motion.button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === currentImageIndex 
                    ? "bg-black dark:bg-white w-8" 
                    : "bg-black/30 dark:bg-white/30 hover:bg-black/50 dark:hover:bg-white/50 w-2"
                }`}
                aria-label={image.category}
              />
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-2 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="text-xs tracking-wider">SCROLL</span>
          <motion.div 
            className="w-5 h-8 border-2 border-current rounded-full flex justify-center pt-1"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <motion.div className="w-1 h-2 bg-current rounded-full" />
          </motion.div>
        </motion.div>

        {/* Hero Content */}
        <div className="relative container-lumina pt-20 z-20">
          <div className="max-w-2xl">
            <motion.p 
              className="text-caption mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Groupe YAMA+
            </motion.p>
            <motion.h1 
              className="heading-hero mb-6"
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              Le shopping, autrement.
            </motion.h1>
            <motion.p 
              className="text-body-lg mb-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              Électronique, maison et essentiels du quotidien.
              <br />
              Sélectionnés avec exigence.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row items-start gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Link
                to={heroImages[currentImageIndex].link}
                className="btn-primary btn-ripple btn-magnetic group"
                data-testid="hero-cta"
              >
                Découvrir {heroImages[currentImageIndex].category}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/nouveautes"
                className="btn-secondary"
              >
                Voir les nouveautés
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <TrustBanner />

      {/* Flash Sales Section */}
      <FlashSalesSection />

      {/* Categories Section - Bento Grid */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-caption mb-4">Catégories</p>
            <h2 className="heading-section">Explorez nos univers</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={category.featured ? "md:col-span-2 md:row-span-2" : ""}
              >
                <Link
                  to={`/category/${category.id}`}
                  className={`group block relative overflow-hidden rounded-3xl ${
                    category.featured ? "aspect-square" : "aspect-[4/3]"
                  } bg-[#F5F5F7] dark:bg-[#1C1C1E]`}
                  data-testid={`category-${category.id}`}
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <category.icon className="w-8 h-8 text-white mb-3" />
                    <h3 className="text-xl md:text-2xl font-semibold text-white mb-1">
                      {category.name}
                    </h3>
                    <p className="text-white/70 text-sm">{category.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals - Compact Section */}
      <section className="section-padding bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <p className="text-caption mb-4">Nouveautés</p>
              <h2 className="heading-section">Découvrez nos dernières arrivées</h2>
            </div>
            <Link to="/nouveautes" className="btn-ghost hidden md:flex">
              Tout voir
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {featuredProducts.filter(p => p.is_new).slice(0, 4).map((product, index) => (
                <ProductCard key={product.product_id} product={product} index={index} />
              )) || featuredProducts.slice(0, 4).map((product, index) => (
                <ProductCard key={product.product_id} product={product} index={index} />
              ))}
            </div>
          )}

          <Link
            to="/nouveautes"
            className="btn-ghost mt-8 mx-auto md:hidden"
          >
            Tout voir
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Promo Banner */}
      <section className="py-16 md:py-24 bg-black text-white">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-[#D4AF37] text-sm font-medium tracking-widest uppercase mb-4">
              Offre spéciale
            </p>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-6">
              Jusqu'à -30% sur l'électronique
            </h2>
            <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
              Profitez de nos offres exceptionnelles sur une sélection de produits premium.
            </p>
            <Link to="/promotions" className="btn-primary bg-white text-black hover:bg-white/90">
              Découvrir les offres
            </Link>
          </motion.div>
        </div>
      </section>

      {/* New Products */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <p className="text-caption mb-4">Fraîchement arrivés</p>
              <h2 className="heading-section">Nouveautés</h2>
            </div>
            <Link to="/nouveautes" className="btn-ghost hidden md:flex">
              Tout voir
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {newProducts.map((product, index) => (
                <ProductCard key={product.product_id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Trust Section */}
      <section className="py-16 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white dark:text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Qualité garantie</h3>
              <p className="text-muted-foreground">
                Produits authentiques et sélectionnés avec soin
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white dark:text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Livraison rapide</h3>
              <p className="text-muted-foreground">
                Dakar et régions en 24-72h
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-white dark:text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Paiement sécurisé</h3>
              <p className="text-muted-foreground">
                Wave, Orange Money, CB acceptés
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* WhatsApp Float Button */}
      <a
        href="https://wa.me/221783827575"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg whatsapp-pulse"
        aria-label="Contacter via WhatsApp"
        data-testid="whatsapp-btn"
      >
        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </main>
  );
}
