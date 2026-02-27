import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Calendar, Clock, User, ChevronRight, Search } from "lucide-react";
import SEO from "../components/SEO";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "Tous" },
    { id: "guides", name: "Guides d'achat" },
    { id: "tendances", name: "Tendances" },
    { id: "conseils", name: "Conseils" },
    { id: "nouveautes", name: "Nouveautés" },
  ];

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const response = await axios.get(`${API_URL}/api/blog/posts${params}`);
      setPosts(response.data);
    } catch (error) {
      // Use sample posts if API not available
      setPosts(samplePosts);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Blog - YAMA+ | Guides, Tendances & Conseils Shopping"
        description="Découvrez nos guides d'achat, les dernières tendances et conseils pour vos achats. Électronique, mode, maison et beauté au Sénégal."
      />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-black to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Blog YAMA+
            </h1>
            <p className="text-lg text-gray-300 mb-8">
              Guides d'achat, tendances et conseils pour faire les meilleurs choix
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un article..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="sticky top-16 z-20 bg-background/80 backdrop-blur-lg border-b border-black/5 dark:border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-4 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/10] rounded-2xl bg-gray-200 dark:bg-gray-800 mb-4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-2 w-1/4" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, index) => (
                <motion.article
                  key={post.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <Link to={`/blog/${post.slug}`}>
                    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 dark:bg-black/90 text-xs font-medium">
                        {post.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(post.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime} min
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-2">
                      {post.excerpt}
                    </p>
                  </Link>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Aucun article trouvé</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Restez informé des dernières tendances
            </h2>
            <p className="text-gray-400 mb-6">
              Inscrivez-vous à notre newsletter pour recevoir nos guides et conseils directement dans votre boîte mail.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Votre email"
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition-colors"
              >
                S'inscrire
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

// Sample posts for fallback
const samplePosts = [
  {
    id: 1,
    slug: "guide-achat-smartphone-2025",
    title: "Guide d'achat : Comment choisir son smartphone en 2025",
    excerpt: "Découvrez les critères essentiels pour choisir le smartphone parfait selon vos besoins et votre budget.",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
    category: "Guides d'achat",
    date: "2025-02-01",
    readTime: 8,
    author: "YAMA+"
  },
  {
    id: 2,
    slug: "tendances-decoration-2025",
    title: "Les tendances déco 2025 : Ce qui va transformer votre intérieur",
    excerpt: "Couleurs, matériaux, styles... Découvrez toutes les tendances décoration pour cette année.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800",
    category: "Tendances",
    date: "2025-01-28",
    readTime: 6,
    author: "YAMA+"
  },
  {
    id: 3,
    slug: "conseils-entretien-electromenager",
    title: "5 conseils pour prolonger la durée de vie de vos appareils",
    excerpt: "Nos astuces simples pour entretenir vos appareils électroménagers et éviter les pannes.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
    category: "Conseils",
    date: "2025-01-25",
    readTime: 5,
    author: "YAMA+"
  },
  {
    id: 4,
    slug: "nouveautes-apple-2025",
    title: "Apple 2025 : Toutes les nouveautés à venir",
    excerpt: "iPhone 17, MacBook M4, Apple Watch X... Tour d'horizon des produits Apple attendus cette année.",
    image: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800",
    category: "Nouveautés",
    date: "2025-01-20",
    readTime: 7,
    author: "YAMA+"
  },
  {
    id: 5,
    slug: "routine-beaute-naturelle",
    title: "Routine beauté : Les indispensables pour une peau éclatante",
    excerpt: "Découvrez notre sélection de produits pour une routine beauté efficace et naturelle.",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800",
    category: "Conseils",
    date: "2025-01-18",
    readTime: 4,
    author: "YAMA+"
  },
  {
    id: 6,
    slug: "guide-televiseur-4k",
    title: "TV 4K ou 8K : Quel téléviseur choisir en 2025 ?",
    excerpt: "OLED, QLED, Mini-LED... On vous explique tout pour faire le bon choix.",
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800",
    category: "Guides d'achat",
    date: "2025-01-15",
    readTime: 9,
    author: "YAMA+"
  }
];
