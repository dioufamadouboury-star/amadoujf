// Analytics & Tracking Utilities for YAMA+
// Supports Google Analytics 4 and Facebook Pixel

// Check if we're in production
const isProduction = () => {
  return typeof window !== 'undefined' && 
         window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1';
};

// Google Analytics 4 Events
export const GA4 = {
  // Page view
  pageView: (pageName, pageTitle) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'page_view', {
      page_title: pageTitle || document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  },

  // View item (product page)
  viewItem: (product) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'view_item', {
      currency: 'XOF',
      value: product.price,
      items: [{
        item_id: product.product_id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand || 'YAMA+',
        price: product.price,
        quantity: 1
      }]
    });
  },

  // Add to cart
  addToCart: (product, quantity = 1) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'add_to_cart', {
      currency: 'XOF',
      value: product.price * quantity,
      items: [{
        item_id: product.product_id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand || 'YAMA+',
        price: product.price,
        quantity: quantity
      }]
    });
  },

  // Remove from cart
  removeFromCart: (product, quantity = 1) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'remove_from_cart', {
      currency: 'XOF',
      value: product.price * quantity,
      items: [{
        item_id: product.product_id,
        item_name: product.name,
        price: product.price,
        quantity: quantity
      }]
    });
  },

  // View cart
  viewCart: (items, total) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'view_cart', {
      currency: 'XOF',
      value: total,
      items: items.map(item => ({
        item_id: item.product_id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    });
  },

  // Begin checkout
  beginCheckout: (items, total) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'begin_checkout', {
      currency: 'XOF',
      value: total,
      items: items.map(item => ({
        item_id: item.product_id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    });
  },

  // Purchase complete
  purchase: (orderId, items, total, shipping = 0) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'purchase', {
      transaction_id: orderId,
      currency: 'XOF',
      value: total,
      shipping: shipping,
      items: items.map(item => ({
        item_id: item.product_id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity
      }))
    });
  },

  // Search
  search: (searchTerm) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'search', {
      search_term: searchTerm
    });
  },

  // Sign up
  signUp: (method = 'email') => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'sign_up', {
      method: method
    });
  },

  // Login
  login: (method = 'email') => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'login', {
      method: method
    });
  },

  // Add to wishlist
  addToWishlist: (product) => {
    if (!isProduction() || !window.gtag) return;
    window.gtag('event', 'add_to_wishlist', {
      currency: 'XOF',
      value: product.price,
      items: [{
        item_id: product.product_id,
        item_name: product.name,
        price: product.price
      }]
    });
  }
};

// Facebook Pixel Events
export const FBPixel = {
  // Page view (automatic, but can be called manually)
  pageView: () => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'PageView');
  },

  // View content (product page)
  viewContent: (product) => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'ViewContent', {
      content_ids: [product.product_id],
      content_name: product.name,
      content_category: product.category,
      content_type: 'product',
      value: product.price,
      currency: 'XOF'
    });
  },

  // Add to cart
  addToCart: (product, quantity = 1) => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'AddToCart', {
      content_ids: [product.product_id],
      content_name: product.name,
      content_type: 'product',
      value: product.price * quantity,
      currency: 'XOF'
    });
  },

  // Add to wishlist
  addToWishlist: (product) => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'AddToWishlist', {
      content_ids: [product.product_id],
      content_name: product.name,
      value: product.price,
      currency: 'XOF'
    });
  },

  // Initiate checkout
  initiateCheckout: (items, total) => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'InitiateCheckout', {
      content_ids: items.map(item => item.product_id),
      content_type: 'product',
      num_items: items.length,
      value: total,
      currency: 'XOF'
    });
  },

  // Purchase
  purchase: (orderId, items, total) => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'Purchase', {
      content_ids: items.map(item => item.product_id),
      content_type: 'product',
      num_items: items.length,
      value: total,
      currency: 'XOF'
    });
  },

  // Search
  search: (searchTerm) => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'Search', {
      search_string: searchTerm
    });
  },

  // Lead (newsletter signup, etc.)
  lead: (source = 'newsletter') => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'Lead', {
      content_name: source
    });
  },

  // Complete registration
  completeRegistration: (method = 'email') => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'CompleteRegistration', {
      content_name: method
    });
  },

  // Contact (WhatsApp click, etc.)
  contact: () => {
    if (!isProduction() || !window.fbq) return;
    window.fbq('track', 'Contact');
  }
};

// Combined tracking - fires both GA4 and FB Pixel events
export const Analytics = {
  viewProduct: (product) => {
    GA4.viewItem(product);
    FBPixel.viewContent(product);
  },

  addToCart: (product, quantity = 1) => {
    GA4.addToCart(product, quantity);
    FBPixel.addToCart(product, quantity);
  },

  removeFromCart: (product, quantity = 1) => {
    GA4.removeFromCart(product, quantity);
  },

  beginCheckout: (items, total) => {
    GA4.beginCheckout(items, total);
    FBPixel.initiateCheckout(items, total);
  },

  purchase: (orderId, items, total, shipping = 0) => {
    GA4.purchase(orderId, items, total, shipping);
    FBPixel.purchase(orderId, items, total);
  },

  search: (searchTerm) => {
    GA4.search(searchTerm);
    FBPixel.search(searchTerm);
  },

  signUp: (method = 'email') => {
    GA4.signUp(method);
    FBPixel.completeRegistration(method);
  },

  login: (method = 'email') => {
    GA4.login(method);
  },

  addToWishlist: (product) => {
    GA4.addToWishlist(product);
    FBPixel.addToWishlist(product);
  },

  newsletterSignup: () => {
    FBPixel.lead('newsletter');
  },

  whatsappClick: () => {
    FBPixel.contact();
  }
};

export default Analytics;
