import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Calendar, Clock, User, ChevronLeft, Share2, Facebook, Twitter, Linkedin, Copy, Check } from "lucide-react";
import SEO from "../components/SEO";
import ProductCard from "../components/ProductCard";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/blog/posts/${slug}`);
      // API returns {post: {...}, related: [...]}
      const postData = response.data.post || response.data;
      setPost(postData);
      
      // Fetch related products
      if (postData.relatedCategory) {
        const productsRes = await axios.get(`${API_URL}/api/products?category=${postData.relatedCategory}&limit=4`);
        setRelatedProducts(productsRes.data);
      }
    } catch (error) {
      // Use sample post
      const samplePost = getSamplePost(slug);
      setPost(samplePost);
      
      // Fetch some products for the related section
      try {
        const productsRes = await axios.get(`${API_URL}/api/products?limit=4`);
        setRelatedProducts(productsRes.data);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = post?.title || '';
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-8" />
            <div className="aspect-[16/9] rounded-2xl bg-gray-200 dark:bg-gray-800 mb-8" />
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article non trouvé</h1>
          <Link to="/blog" className="text-primary hover:underline">
            Retour au blog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={`${post.title} - Blog YAMA+`}
        description={post.excerpt}
        image={post.image}
        type="article"
      />

      <article className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour au blog
          </Link>

          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <span className="inline-block px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 text-sm font-medium mb-4">
                {post.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readTime} min de lecture
                </span>
              </div>
            </motion.header>

            {/* Featured Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8"
            >
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="prose prose-lg dark:prose-invert max-w-none mb-12"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Share */}
            <div className="flex items-center gap-4 py-6 border-t border-black/5 dark:border-white/5">
              <span className="text-sm font-medium flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Partager
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-2 rounded-full bg-[#1877F2] text-white hover:opacity-90 transition-opacity"
                  aria-label="Partager sur Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="p-2 rounded-full bg-black text-white hover:opacity-90 transition-opacity"
                  aria-label="Partager sur Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="p-2 rounded-full bg-[#0A66C2] text-white hover:opacity-90 transition-opacity"
                  aria-label="Partager sur LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  aria-label="Copier le lien"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-12 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8">Produits associés</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// Sample post data
function getSamplePost(slug) {
  const posts = {
    "guide-achat-smartphone-2025": {
      id: 1,
      slug: "guide-achat-smartphone-2025",
      title: "Guide d'achat : Comment choisir son smartphone en 2025",
      excerpt: "Découvrez les critères essentiels pour choisir le smartphone parfait selon vos besoins et votre budget.",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200",
      category: "Guides d'achat",
      date: "2025-02-01",
      readTime: 8,
      author: "YAMA+",
      relatedCategory: "electronique",
      content: `
        <p>Choisir un smartphone en 2025 peut sembler complexe face à la multitude d'options disponibles. Ce guide vous aidera à faire le meilleur choix selon vos besoins.</p>
        
        <h2>1. Définir son budget</h2>
        <p>Le marché des smartphones se divise en trois grandes catégories :</p>
        <ul>
          <li><strong>Entrée de gamme (100 000 - 200 000 FCFA)</strong> : Parfait pour les usages basiques</li>
          <li><strong>Milieu de gamme (200 000 - 500 000 FCFA)</strong> : Excellent rapport qualité-prix</li>
          <li><strong>Haut de gamme (500 000+ FCFA)</strong> : Pour les utilisateurs exigeants</li>
        </ul>
        
        <h2>2. L'écran : taille et technologie</h2>
        <p>En 2025, les écrans AMOLED sont devenus la norme, même sur les appareils milieu de gamme. Privilégiez un taux de rafraîchissement de 90Hz minimum pour une navigation fluide.</p>
        
        <h2>3. La puissance : processeur et RAM</h2>
        <p>Pour un usage quotidien fluide, optez pour au moins 6 Go de RAM. Les processeurs Snapdragon 8 Gen 3 ou Apple A17 Pro offrent les meilleures performances.</p>
        
        <h2>4. L'appareil photo</h2>
        <p>Ne vous fiez pas uniquement aux mégapixels ! La taille du capteur et le traitement logiciel sont tout aussi importants. Recherchez des capteurs de 1/1.5" ou plus grands.</p>
        
        <h2>5. L'autonomie</h2>
        <p>Une batterie de 4500 mAh minimum est recommandée. La charge rapide (65W+) est devenue indispensable pour les utilisateurs actifs.</p>
        
        <h2>Conclusion</h2>
        <p>Le meilleur smartphone est celui qui répond à VOS besoins. N'hésitez pas à consulter nos experts en magasin pour un conseil personnalisé.</p>
      `
    },
    "tendances-decoration-2025": {
      id: 2,
      slug: "tendances-decoration-2025",
      title: "Les tendances déco 2025 : Ce qui va transformer votre intérieur",
      excerpt: "Couleurs, matériaux, styles... Découvrez toutes les tendances décoration pour cette année.",
      image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200",
      category: "Tendances",
      date: "2025-01-28",
      readTime: 6,
      author: "YAMA+",
      relatedCategory: "decoration",
      content: `
        <p>L'année 2025 apporte son lot de nouvelles tendances en matière de décoration intérieure. Voici ce qui va transformer nos intérieurs.</p>
        
        <h2>Les couleurs phares</h2>
        <p>Le vert sauge et le terracotta continuent leur règne, mais 2025 voit l'émergence du "Mocha Mousse", un brun chaleureux élu couleur de l'année.</p>
        
        <h2>Le retour du vintage</h2>
        <p>Les années 70 font un retour remarqué avec des formes organiques, du velours côtelé et des tons chauds.</p>
        
        <h2>Le minimalisme chaleureux</h2>
        <p>Fini le minimalisme froid ! On privilégie désormais des espaces épurés mais accueillants, avec des textures douces et des matériaux naturels.</p>
        
        <h2>La durabilité au cœur des choix</h2>
        <p>Les consommateurs privilégient les meubles durables, les matériaux recyclés et les artisans locaux.</p>
      `
    }
  };

  return posts[slug] || {
    id: 0,
    slug: slug,
    title: "Article",
    excerpt: "Description de l'article",
    image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200",
    category: "Blog",
    date: new Date().toISOString(),
    readTime: 5,
    author: "YAMA+",
    content: "<p>Contenu de l'article à venir...</p>"
  };
}
