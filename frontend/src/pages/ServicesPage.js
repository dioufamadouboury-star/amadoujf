import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Helmet } from "react-helmet-async";
import {
  Search,
  MapPin,
  Star,
  Phone,
  MessageCircle,
  Filter,
  ChevronRight,
  BadgeCheck,
  Crown,
  Briefcase,
  Clock,
  Users,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "../lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Category icons mapping (matching API category_id values)
const categoryIcons = {
  construction: "🏗️",
  electricity_plumbing: "⚡",
  auto: "🚗",
  beauty: "💅",
  tech: "💻",
  cleaning: "🧹",
  transport: "🚚",
  events: "🎉",
  education: "📚",
  other: "🔧",
};

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  })
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export default function ServicesPage() {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [locations, setLocations] = useState({ cities: [], dakar_zones: [] });
  const [loading, setLoading] = useState(true);
  const [totalProviders, setTotalProviders] = useState(0);
  
  // Filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "");
  const [selectedZone, setSelectedZone] = useState(searchParams.get("zone") || "");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [selectedCategory, selectedCity, selectedZone, verifiedOnly, search]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/services/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/services/locations`);
      setLocations(response.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedCity) params.append("city", selectedCity);
      if (selectedZone) params.append("zone", selectedZone);
      if (verifiedOnly) params.append("verified_only", "true");
      if (search) params.append("search", search);
      params.append("limit", "20");

      const response = await axios.get(`${API_URL}/api/services/providers?${params}`);
      setProviders(response.data.providers || []);
      setTotalProviders(response.data.total || 0);
    } catch (error) {
      console.error("Error fetching providers:", error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProviders();
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedCity("");
    setSelectedZone("");
    setVerifiedOnly(false);
  };

  const activeFiltersCount = [selectedCategory, selectedCity, selectedZone, verifiedOnly].filter(Boolean).length;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      <Helmet>
        <title>Services & Prestataires - GROUPE YAMA+</title>
        <meta name="description" content="Trouvez des professionnels qualifiés au Sénégal : plombiers, électriciens, peintres, menuisiers et plus encore." />
      </Helmet>

      {/* Hero Section with enhanced animations */}
      <section className="relative bg-gradient-to-br from-black via-gray-900 to-black text-white py-16 lg:py-24 overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920')] opacity-10 bg-cover bg-center" />
        <motion.div 
          className="absolute inset-0 opacity-20"
          initial={{ backgroundPosition: "0% 0%" }}
          animate={{ backgroundPosition: "100% 100%" }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(212, 175, 55, 0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400/30 rounded-full"
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: "110%",
                opacity: 0 
              }}
              animate={{ 
                y: "-10%",
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                delay: i * 1.5,
                ease: "linear"
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Plus de 1000 professionnels vérifiés
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
            >
              Trouvez le bon professionnel
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-300 mb-8"
            >
              Des milliers de prestataires qualifiés au Sénégal
            </motion.p>

            {/* Animated Search Bar */}
            <motion.form
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto"
            >
              <motion.div 
                className="flex-1 relative group"
                whileFocus={{ scale: 1.02 }}
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors group-focus-within:text-yellow-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un métier, prestataire..."
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-300"
                  data-testid="service-search-input"
                />
              </motion.div>
              <motion.select
                whileHover={{ scale: 1.02 }}
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-4 py-4 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer transition-all duration-300"
              >
                <option value="">Toutes les villes</option>
                {locations.cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </motion.select>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(250, 204, 21, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
                data-testid="service-search-btn"
              >
                Rechercher
              </motion.button>
            </motion.form>

            {/* Quick stats with staggered animation */}
            <motion.div 
              className="flex flex-wrap justify-center gap-8 mt-10"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {[
                { icon: BadgeCheck, label: "Vérifiés", value: "100%" },
                { icon: Users, label: "Clients satisfaits", value: "5000+" },
                { icon: Clock, label: "Réponse rapide", value: "< 2h" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  custom={i}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Animated scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2"
          >
            <motion.div 
              className="w-1.5 h-3 bg-yellow-400 rounded-full"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* Categories with animation */}
      <section className="py-12 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xl font-semibold mb-6"
          >
            Catégories de services
          </motion.h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {categories.map((cat, index) => (
              <motion.button
                key={cat.category_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(selectedCategory === cat.category_id ? "" : cat.category_id)}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl transition-all duration-300",
                  selectedCategory === cat.category_id
                    ? "bg-black text-white dark:bg-yellow-400 dark:text-black shadow-lg"
                    : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md"
                )}
                data-testid={`category-${cat.category_id}`}
              >
                <motion.span 
                  className="text-2xl mb-2"
                  animate={selectedCategory === cat.category_id ? { 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {categoryIcons[cat.category_id] || cat.icon || "🔧"}
                </motion.span>
                <span className="text-xs font-medium text-center leading-tight">{cat.name_fr}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters - Desktop with slide animation */}
            <motion.aside 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="hidden lg:block w-64 flex-shrink-0"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sticky top-24 shadow-sm">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto px-2 py-0.5 text-xs bg-yellow-400 text-black rounded-full"
                    >
                      {activeFiltersCount}
                    </motion.span>
                  )}
                </h3>

                {/* City Filter */}
                <div className="mb-4">
                  <label className="text-sm text-muted-foreground mb-2 block">Ville</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      setSelectedZone("");
                    }}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  >
                    <option value="">Toutes</option>
                    {locations.cities.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Zone Filter (Dakar only) */}
                <AnimatePresence>
                  {selectedCity === "Dakar" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <label className="text-sm text-muted-foreground mb-2 block">Quartier</label>
                      <select
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                      >
                        <option value="">Tous</option>
                        {locations.dakar_zones.map((zone) => (
                          <option key={zone} value={zone}>{zone}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Verified Only */}
                <motion.div 
                  className="mb-4"
                  whileHover={{ x: 3 }}
                >
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="rounded accent-yellow-400"
                    />
                    <span className="text-sm group-hover:text-yellow-600 transition-colors">Vérifiés uniquement</span>
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </label>
                </motion.div>

                {/* Clear Filters */}
                <motion.button
                  onClick={clearFilters}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400"
                >
                  Réinitialiser les filtres
                </motion.button>
              </div>
            </motion.aside>

            {/* Providers List */}
            <div className="flex-1">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-6"
              >
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedCategory
                      ? categories.find((c) => c.category_id === selectedCategory)?.name_fr
                      : "Tous les prestataires"}
                  </h2>
                  <motion.p 
                    key={totalProviders}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground"
                  >
                    {totalProviders} prestataires trouvés
                  </motion.p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-400 text-black rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </motion.button>
              </motion.div>

              {/* Mobile Filters with slide animation */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="lg:hidden bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 overflow-hidden shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-medium">Filtres</span>
                      <button onClick={() => setShowFilters(false)}>
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="p-2 border rounded-lg focus:ring-2 focus:ring-yellow-400"
                      >
                        <option value="">Toutes les villes</option>
                        {locations.cities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={verifiedOnly}
                          onChange={(e) => setVerifiedOnly(e.target.checked)}
                          className="rounded accent-yellow-400"
                        />
                        <span className="text-sm">Vérifiés</span>
                      </label>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button 
                        onClick={clearFilters}
                        className="mt-4 w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Effacer les filtres ({activeFiltersCount})
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Providers Grid with staggered animation */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-6"
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : providers.length > 0 ? (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  <AnimatePresence mode="popLayout">
                    {providers.map((provider, index) => (
                      <ProviderCard key={provider.provider_id} provider={provider} index={index} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl"
                >
                  <motion.div
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Briefcase className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">Aucun prestataire trouvé</h3>
                  <p className="text-muted-foreground mb-6">
                    Essayez de modifier vos critères de recherche
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearFilters}
                    className="px-6 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg"
                  >
                    Réinitialiser les filtres
                  </motion.button>
                </motion.div>
              )}

              {/* CTA - Request Service with enhanced animation */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 relative overflow-hidden bg-gradient-to-r from-yellow-400 via-yellow-300 to-orange-400 rounded-2xl p-8 text-center"
              >
                {/* Animated shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />
                
                <div className="relative z-10">
                  <motion.h3 
                    className="text-2xl font-bold text-black mb-3"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    Vous n'avez pas trouvé ce que vous cherchez ?
                  </motion.h3>
                  <motion.p 
                    className="text-black/80 mb-6"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                  >
                    Publiez votre demande et recevez des propositions de professionnels
                  </motion.p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/services/request"
                      className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-all duration-300 hover:shadow-xl"
                      data-testid="request-service-btn"
                    >
                      Demander un service
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// Provider Card Component with enhanced animations
function ProviderCard({ provider, index }) {
  const whatsappLink = `https://wa.me/${provider.whatsapp?.replace(/[^0-9]/g, "") || provider.phone?.replace(/[^0-9]/g, "")}`;

  return (
    <motion.div
      layout
      variants={fadeInUp}
      custom={index}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ 
        y: -5, 
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        transition: { duration: 0.2 }
      }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 transition-shadow"
    >
      <div className="flex gap-4">
        {/* Photo with hover effect */}
        <div className="relative">
          <motion.div 
            className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden"
            whileHover={{ scale: 1.05 }}
          >
            {provider.photos?.[0] ? (
              <img
                src={provider.photos[0]}
                alt={provider.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {categoryIcons[provider.category] || "👷"}
              </div>
            )}
          </motion.div>
          {provider.is_premium && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg"
            >
              <Crown className="w-3 h-3 text-black" />
            </motion.div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold flex items-center gap-1">
                {provider.name}
                {provider.is_verified && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </motion.div>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">{provider.profession}</p>
            </div>
            {provider.rating > 0 && (
              <motion.div 
                className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                whileHover={{ scale: 1.1 }}
              >
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold">{provider.rating}</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{provider.city}{provider.zone ? `, ${provider.zone}` : ""}</span>
          </div>

          {provider.price_from && (
            <p className="text-sm font-medium mt-1">
              À partir de <span className="text-yellow-600 dark:text-yellow-400">{provider.price_from.toLocaleString()} FCFA</span>
            </p>
          )}
        </div>
      </div>

      {/* Actions with hover animations */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Link
          to={`/provider/${provider.provider_id}`}
          className="flex-1"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="py-2 text-center text-sm font-medium bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Voir le profil
          </motion.div>
        </Link>
        <motion.a
          href={`tel:${provider.phone}`}
          whileHover={{ scale: 1.1, rotate: 10 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Phone className="w-5 h-5" />
        </motion.a>
        <motion.a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1, rotate: -10 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
        </motion.a>
      </div>
    </motion.div>
  );
}
