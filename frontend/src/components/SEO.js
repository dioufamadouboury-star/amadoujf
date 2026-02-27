import { Helmet } from 'react-helmet-async';

const SITE_NAME = "GROUPE YAMA+";
const SITE_URL = "https://groupeyamaplus.com";
const DEFAULT_IMAGE = "https://groupeyamaplus.com/assets/images/og-image.jpg";
const DEFAULT_DESCRIPTION = "GROUPE YAMA+ - Votre boutique premium au Sénégal. Électronique, électroménager, décoration et beauté. Livraison rapide à Dakar et régions. Paiement Wave, Orange Money, Free Money.";
const TWITTER_HANDLE = "@groupeyamaplus";

export default function SEO({ 
  title, 
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  product = null,
  article = null,
  noIndex = false,
  keywords = []
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Le shopping, autrement`;
  const fullUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;
  
  // Default keywords + custom
  const allKeywords = [
    "GROUPE YAMA+", "shopping Sénégal", "boutique Dakar", "électronique Dakar",
    "livraison Dakar", "Wave", "Orange Money", "paiement mobile Sénégal",
    ...keywords
  ].join(", ");
  
  // Product structured data
  const productSchema = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.short_description,
    "image": product.images?.map(img => img.startsWith('http') ? img : `${SITE_URL}${img}`) || [DEFAULT_IMAGE],
    "sku": product.product_id,
    "brand": {
      "@type": "Brand",
      "name": product.brand || SITE_NAME
    },
    "offers": {
      "@type": "Offer",
      "url": fullUrl,
      "priceCurrency": "XOF",
      "price": product.flash_sale_price || product.price,
      "priceValidUntil": product.flash_sale_end || undefined,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": SITE_NAME
      }
    },
    "aggregateRating": product.rating ? {
      "@type": "AggregateRating",
      "ratingValue": product.rating,
      "reviewCount": product.review_count || 1
    } : undefined
  } : null;

  // Article/Blog structured data
  const articleSchema = article ? {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.excerpt,
    "image": article.image || DEFAULT_IMAGE,
    "datePublished": article.published_at,
    "dateModified": article.updated_at || article.published_at,
    "author": {
      "@type": "Organization",
      "name": SITE_NAME
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_IMAGE
      }
    }
  } : null;

  // Organization structured data
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": SITE_URL,
    "logo": DEFAULT_IMAGE,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+221-78-382-75-75",
      "contactType": "customer service",
      "email": "contact@groupeyamaplus.com",
      "areaServed": "SN",
      "availableLanguage": "French"
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Fass Paillote",
      "addressLocality": "Dakar",
      "addressCountry": "SN"
    },
    "sameAs": [
      "https://facebook.com/groupeyamaplus",
      "https://instagram.com/groupeyamaplus"
    ]
  };

  // E-commerce website structured data
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  // Breadcrumb schema (if url provided)
  const breadcrumbSchema = url ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": url.split('/').filter(Boolean).map((segment, index, arr) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      "item": `${SITE_URL}/${arr.slice(0, index + 1).join('/')}`
    }))
  } : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large"} />
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={product ? "product" : article ? "article" : type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_SN" />
      
      {/* Product-specific OG tags */}
      {product && (
        <>
          <meta property="product:price:amount" content={product.flash_sale_price || product.price} />
          <meta property="product:price:currency" content="XOF" />
          <meta property="product:availability" content={product.stock > 0 ? "in stock" : "out of stock"} />
          <meta property="product:brand" content={product.brand || SITE_NAME} />
        </>
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      
      {/* Additional SEO Meta */}
      <meta name="author" content={SITE_NAME} />
      <meta name="geo.region" content="SN-DK" />
      <meta name="geo.placename" content="Dakar" />
      <meta name="language" content="French" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      
      {/* Mobile optimization */}
      <meta name="format-detection" content="telephone=yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
      {articleSchema && (
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
      )}
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
    </Helmet>
  );
}

// Category-specific SEO data
export const categoryMeta = {
  electronique: {
    title: "Électronique",
    description: "Découvrez notre sélection premium d'électronique au Sénégal. iPhone, Samsung, MacBook, tablettes et accessoires. Livraison rapide à Dakar.",
    keywords: ["iPhone Dakar", "Samsung Sénégal", "MacBook Dakar", "tablette Sénégal", "accessoires électronique"]
  },
  electromenager: {
    title: "Électroménager",
    description: "Électroménager de qualité au Sénégal. Réfrigérateurs, climatiseurs, machines à laver et petit électroménager. Prix compétitifs, livraison Dakar.",
    keywords: ["réfrigérateur Dakar", "climatiseur Sénégal", "machine à laver Dakar", "électroménager Sénégal"]
  },
  decoration: {
    title: "Décoration & Mobilier",
    description: "Transformez votre intérieur avec notre collection décoration. Mobilier moderne, luminaires, accessoires déco. Livraison à Dakar et régions.",
    keywords: ["décoration Dakar", "mobilier Sénégal", "luminaire Dakar", "meuble moderne Sénégal"]
  },
  beaute: {
    title: "Beauté & Bien-être",
    description: "Produits de beauté premium au Sénégal. Soins visage, maquillage, soins corps et accessoires beauté. Marques authentiques, qualité garantie.",
    keywords: ["cosmétique Dakar", "maquillage Sénégal", "soins beauté Dakar", "parfum Sénégal"]
  },
  automobile: {
    title: "Automobile",
    description: "Accessoires auto premium au Sénégal. GPS, dashcam, pièces détachées et équipements pour votre véhicule. Livraison rapide à Dakar.",
    keywords: ["accessoire auto Dakar", "GPS voiture Sénégal", "dashcam Dakar", "équipement auto"]
  }
};

// Generate Open Graph image URL for social sharing
export const getOGImageUrl = (type, data) => {
  // Default OG image
  const defaultOG = "https://groupeyamaplus.com/assets/images/og-default.jpg";
  
  if (type === 'product' && data?.images?.[0]) {
    return data.images[0].startsWith('http') ? data.images[0] : `https://groupeyamaplus.com${data.images[0]}`;
  }
  
  if (type === 'category') {
    return `https://groupeyamaplus.com/assets/images/og-${data}.jpg`;
  }
  
  return defaultOG;
};

// Generate page-specific meta description
export const generateMetaDescription = (type, data) => {
  switch (type) {
    case 'product':
      return `${data.name} - ${data.short_description || ''} Prix: ${data.price?.toLocaleString('fr-FR')} FCFA. Livraison rapide à Dakar. Paiement Wave, Orange Money.`;
    case 'category':
      return categoryMeta[data]?.description || `Découvrez notre sélection ${data} au Sénégal. Livraison rapide à Dakar.`;
    case 'search':
      return `Résultats de recherche pour "${data}" - GROUPE YAMA+ Sénégal`;
    default:
      return "GROUPE YAMA+ - Votre boutique premium au Sénégal. Livraison rapide, paiement mobile.";
  }
};
