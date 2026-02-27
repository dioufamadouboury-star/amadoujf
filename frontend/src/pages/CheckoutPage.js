import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  ChevronRight,
  Truck,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  MessageCircle,
  Tag,
  X,
  Loader2,
  FileText,
  Download,
  MapPin,
  Info,
} from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import {
  formatPrice,
  generateWhatsAppLink,
  generateOrderMessage,
} from "../lib/utils";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import PromoCodeInput from "../components/PromoCodeInput";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const WHATSAPP_NUMBER = "+221783827575";
const STORE_ADDRESS = "Fass Paillote, Dakar";

// Dakar neighborhoods for autocomplete
const DAKAR_NEIGHBORHOODS = [
  // Zone 1500
  "Dakar Centre", "Médina", "Fass", "Fass Paillote", "Colobane", "Point E", "Fann", "Keur Gorgui", "HLM",
  // Zone 2000
  "Castor", "Liberté 6", "SICAP", "Dieuppeul", "Mermoz", "Grand Dakar", "Niarry Tally", "Foire", "Mariste", "Ouakam", "Sacré-Cœur", "Grand Yoff",
  // Zone 2500
  "Parcelles Assainies", "Fadia", "Ngor", "Almadies", "Pikine", "Yarakh", "Golf Sud",
  // Zone 3000
  "Guédiawaye", "Thiaroye", "Diamaguène", "Fass Mbao", "SICAP Mbao", "Keur Mbaye Fall",
  // Zone 4000
  "Rufisque", "Bargny", "Diamniadio", "Sébikotane", "Lac Rose", "Sangalkam",
  // Zone 5000
  "Keur Massar", "Zac Mbao", "Yeumbeul", "Malika"
];

const paymentMethods = [
  { 
    id: "mobile_money", 
    name: "Mobile Money", 
    description: "Wave, Orange Money",
    recommended: true,
    logos: [
      "/assets/images/payment_wave.webp",
      "/assets/images/payment_orange_money.png"
    ],
    infoText: "Vous serez redirigé vers la page de paiement sécurisée Paytech pour choisir Wave ou Orange Money."
  },
  { 
    id: "cash", 
    name: "Paiement à la livraison", 
    description: "Payez en espèces à la réception",
    icon: "cash",
    infoText: "Payez en espèces lors de la réception de votre commande."
  },
  { 
    id: "card", 
    name: "Carte Bancaire", 
    description: "Visa, Mastercard",
    logos: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
    ],
    infoText: "Paiement sécurisé par carte bancaire via Paytech."
  },
];

const regions = [
  "Dakar",
  "Thiès",
  "Saint-Louis",
  "Diourbel",
  "Fatick",
  "Kaolack",
  "Kolda",
  "Louga",
  "Matam",
  "Tambacounda",
  "Ziguinchor",
  "Kaffrine",
  "Kédougou",
  "Sédhiou",
];

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);
  
  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  
  // Shipping calculation state
  const [shippingInfo, setShippingInfo] = useState({
    cost: 2500,
    zone: "zone_2500",
    label: "Dakar",
    message: "",
    isRange: false
  });
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [showNeighborhoods, setShowNeighborhoods] = useState(false);
  const [filteredNeighborhoods, setFilteredNeighborhoods] = useState([]);
  
  const [formData, setFormData] = useState({
    full_name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    address: "",
    city: "",
    region: "Dakar",
    notes: "",
    payment_method: "mobile_money",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        full_name: user.name || prev.full_name,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Calculate shipping when city or region changes
  useEffect(() => {
    const calculateShipping = async () => {
      if (!formData.city && !formData.address) return;
      
      setCalculatingShipping(true);
      try {
        const response = await axios.post(`${API_URL}/api/delivery/calculate`, {
          city: formData.city,
          address: formData.address,
          region: formData.region
        });
        
        setShippingInfo({
          cost: response.data.shipping_cost,
          zone: response.data.zone,
          label: response.data.zone_label,
          message: response.data.message,
          isRange: response.data.is_range || false
        });
      } catch (error) {
        console.error("Error calculating shipping:", error);
      } finally {
        setCalculatingShipping(false);
      }
    };

    const timeoutId = setTimeout(calculateShipping, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.city, formData.address, formData.region]);

  // Filter neighborhoods for autocomplete
  const handleCityChange = (value) => {
    setFormData({ ...formData, city: value });
    
    if (value.length > 1 && formData.region === "Dakar") {
      const filtered = DAKAR_NEIGHBORHOODS.filter(n => 
        n.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredNeighborhoods(filtered);
      setShowNeighborhoods(filtered.length > 0);
    } else {
      setShowNeighborhoods(false);
    }
  };

  const selectNeighborhood = (neighborhood) => {
    setFormData({ ...formData, city: neighborhood });
    setShowNeighborhoods(false);
  };

  const shippingCost = appliedPromo?.discount_type === "free_shipping" ? 0 : shippingInfo.cost;
  const subtotal = cart.total;
  const discount = appliedPromo?.discount_amount || (appliedPromo?.discount_percent ? Math.round(subtotal * (appliedPromo.discount_percent / 100)) : 0);
  const total = subtotal - discount + shippingCost;

  // Apply promo code (new advanced system)
  const handleApplyPromoAdvanced = (promoData) => {
    setAppliedPromo({
      code: promoData.code,
      discount_type: promoData.discount_type,
      discount_value: promoData.discount_value,
      discount_amount: promoData.discount_amount,
      discount_percent: promoData.discount_type === "percent" ? promoData.discount_value : null,
      message: promoData.message,
      promo_id: promoData.promo_id,
      source: promoData.source
    });
    toast.success(`Code promo appliqué ! ${promoData.message}`);
  };

  // Legacy apply promo (keeping for compatibility)
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    
    setPromoLoading(true);
    setPromoError("");
    
    try {
      const response = await axios.post(`${API_URL}/api/promo-codes/validate`, {
        code: promoCode.trim(),
        cart_total: subtotal,
        cart_items: cart.items.map(item => ({
          product_id: item.product_id,
          price: item.price,
          quantity: item.quantity
        })),
        user_id: user?.user_id
      });
      handleApplyPromoAdvanced(response.data);
    } catch (error) {
      setPromoError(error.response?.data?.detail || "Code promo invalide");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateStep1 = () => {
    if (!formData.full_name || !formData.phone || !formData.address || !formData.city) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep1()) return;
    
    setLoading(true);
    
    try {
      const orderData = {
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        shipping: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          region: formData.region,
          neighborhood: formData.neighborhood || null,
          notes: formData.notes,
        },
        payment_method: formData.payment_method,
        subtotal,
        shipping_cost: shippingCost,
        discount,
        total,
        promo_code: appliedPromo?.code || null,
      };

      const response = await axios.post(`${API_URL}/api/orders`, orderData);

      const newOrderId = response.data.order_id;

      // For Mobile Money (Wave, Orange Money) or Card payments - redirect to PayTech
      if (['mobile_money', 'card'].includes(formData.payment_method)) {
        try {
          const currentUrl = window.location.origin;
          const paytechResponse = await axios.post(`${API_URL}/api/payments/paytech/initiate`, {
            order_id: newOrderId,
            success_url: `${currentUrl}/order/${newOrderId}?payment=success`,
            cancel_url: `${currentUrl}/checkout?order_id=${newOrderId}&payment=cancel`,
          });

          if (paytechResponse.data.success && paytechResponse.data.checkout_url) {
            // Redirect to PayTech payment page
            window.location.href = paytechResponse.data.checkout_url;
            return;
          } else {
            toast.error("Erreur lors de l'initialisation du paiement");
          }
        } catch (paytechError) {
          console.error("PayTech error:", paytechError);
          // If PayTech fails, still show order confirmation but notify about payment
          toast.error(paytechError.response?.data?.detail || "Le paiement en ligne n'est pas disponible. Veuillez payer à la livraison.");
        }
      }

      // For cash on delivery or if PayTech failed
      setOrderId(newOrderId);
      setOrderComplete(true);
      clearCart();
      toast.success("Commande passée avec succès !");
    } catch (error) {
      console.error("Order error:", error);
      toast.error("Erreur lors de la commande. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Handle payment callback from PayTech
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderIdFromUrl = urlParams.get('order_id');

    if (paymentStatus && orderIdFromUrl) {
      if (paymentStatus === 'success') {
        setOrderId(orderIdFromUrl);
        setOrderComplete(true);
        clearCart();
        toast.success("Paiement effectué avec succès !");
        // Clean URL
        window.history.replaceState({}, '', '/checkout');
      } else if (paymentStatus === 'cancel') {
        toast.error("Paiement annulé. Votre commande est en attente de paiement.");
        setOrderId(orderIdFromUrl);
        setOrderComplete(true);
        clearCart();
        window.history.replaceState({}, '', '/checkout');
      }
    }
  }, [clearCart]);

  const handleWhatsAppOrder = () => {
    const message = generateOrderMessage(cart.items, total, {
      full_name: formData.full_name,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      region: formData.region,
      notes: formData.notes,
    });
    window.open(generateWhatsAppLink(WHATSAPP_NUMBER, message), "_blank");
  };

  if (cart.items.length === 0 && !orderComplete) {
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Votre panier est vide</h1>
          <Link to="/" className="btn-primary">
            Continuer mes achats
          </Link>
        </div>
      </main>
    );
  }

  if (orderComplete) {
    const orderWhatsAppMessage = `Bonjour ! Je viens de passer la commande ${orderId} sur YAMA+. Pouvez-vous confirmer la prise en charge ?`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(orderWhatsAppMessage)}`;
    
    return (
      <main className="min-h-screen pt-20 flex items-center justify-center bg-[#F5F5F7] dark:bg-[#0B0B0B]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-semibold mb-4">Commande confirmée !</h1>
          <p className="text-muted-foreground mb-6">
            Merci pour votre commande. Vous recevrez une confirmation par email et WhatsApp.
          </p>
          <p className="font-medium text-lg mb-8">
            N° de commande : <span className="text-[#0071E3]">{orderId}</span>
          </p>
          <div className="flex flex-col gap-3">
            {/* Suivi de commande */}
            <Link
              to={`/order/${orderId}`}
              className="btn-primary justify-center flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              Suivre ma commande
            </Link>
            
            {/* Envoi récap WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-6 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#20BA5A] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Envoyer récap WhatsApp
            </a>
            
            {/* Télécharger facture */}
            <a
              href={`${API_URL}/api/orders/${orderId}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary justify-center flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Télécharger ma facture
            </a>
            
            <Link to="/" className="text-[#0071E3] font-medium text-center mt-2">
              Continuer mes achats
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 bg-[#F5F5F7] dark:bg-[#0B0B0B]" data-testid="checkout-page">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-[#1C1C1E] py-4">
        <div className="container-lumina">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              Accueil
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Commande</span>
          </nav>
        </div>
      </div>

      <div className="container-lumina py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit}>
              {/* Shipping Info */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center font-semibold">
                    1
                  </div>
                  <h2 className="text-xl font-semibold">Informations de livraison</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                      data-testid="checkout-name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="+221 77 XXX XX XX"
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                      data-testid="checkout-phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                      data-testid="checkout-email"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      placeholder="Rue, quartier, point de repère"
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                      data-testid="checkout-address"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium mb-2">Quartier / Ville *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      onFocus={() => formData.city.length > 1 && formData.region === "Dakar" && setShowNeighborhoods(true)}
                      onBlur={() => setTimeout(() => setShowNeighborhoods(false), 200)}
                      required
                      placeholder={formData.region === "Dakar" ? "Ex: Fass, Médina, Parcelles..." : "Votre ville"}
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                      data-testid="checkout-city"
                      autoComplete="off"
                    />
                    
                    {/* Autocomplete dropdown */}
                    {showNeighborhoods && filteredNeighborhoods.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredNeighborhoods.map((neighborhood, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectNeighborhood(neighborhood)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {neighborhood}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Région *</label>
                    <select
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#2C2C2E] text-foreground focus:border-black dark:focus:border-white outline-none transition-colors appearance-none cursor-pointer"
                      data-testid="checkout-region"
                      style={{ colorScheme: 'light dark' }}
                    >
                      {regions.map((region) => (
                        <option key={region} value={region} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Shipping cost display */}
                  {formData.city && (
                    <div className="md:col-span-2">
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-xl",
                        shippingInfo.isRange 
                          ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                          : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      )}>
                        <Truck className="w-5 h-5" />
                        <div className="flex-1">
                          {calculatingShipping ? (
                            <span className="text-sm flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Calcul des frais...
                            </span>
                          ) : (
                            <>
                              <span className="font-medium">{shippingInfo.message}</span>
                              <span className="text-xs block opacity-70">Zone: {shippingInfo.label}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-4 sm:p-6 md:p-8">
                <h2 className="text-xl sm:text-2xl font-semibold italic mb-5 sm:mb-6">Mode de Paiement</h2>

                <div className="space-y-3 sm:space-y-4">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={cn(
                        "block relative p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all",
                        formData.payment_method === method.id
                          ? "border-black dark:border-white bg-gray-50 dark:bg-white/5 shadow-sm"
                          : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                      )}
                    >
                      {/* Recommended badge */}
                      {method.recommended && (
                        <span className="absolute -top-2.5 left-3 sm:left-4 px-3 py-0.5 sm:px-4 sm:py-1 bg-green-500 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-sm">
                          Recommandé
                        </span>
                      )}
                      
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Radio button */}
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          formData.payment_method === method.id
                            ? "border-black dark:border-white"
                            : "border-gray-300 dark:border-gray-600"
                        )}>
                          {formData.payment_method === method.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.id}
                          checked={formData.payment_method === method.id}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        
                        {/* Logos/Icons */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          {method.logos ? (
                            <>
                              {method.logos.map((logo, idx) => (
                                <img 
                                  key={idx}
                                  src={logo} 
                                  alt="" 
                                  className="h-7 sm:h-9 w-auto object-contain"
                                />
                              ))}
                            </>
                          ) : method.icon === "cash" ? (
                            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                          ) : null}
                        </div>
                        
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base">{method.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{method.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Payment info box */}
                {formData.payment_method && (
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm">
                          {formData.payment_method === "cash" 
                            ? "Paiement à la livraison" 
                            : "Paiement sécurisé via Paytech"}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {paymentMethods.find(m => m.id === formData.payment_method)?.infoText}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Order notes */}
                <div className="mt-4 sm:mt-6">
                  <label className="block text-xs sm:text-sm font-medium mb-2">Notes de commande (optionnel)</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Instructions spéciales pour la livraison..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors resize-none text-sm"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 md:p-8 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Récapitulatif</h2>

              {/* Items */}
              <div className="space-y-4 mb-6 pb-6 border-b border-black/10 dark:border-white/10">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F5F5F7] dark:bg-[#2C2C2E] flex-shrink-0">
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qté: {item.quantity}
                      </p>
                      <p className="text-sm font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Code promo</label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {appliedPromo.code}
                      </span>
                      <span className="text-sm text-green-600 dark:text-green-500">
                        (-{appliedPromo.discount_percent}%)
                      </span>
                    </div>
                    <button
                      onClick={removePromo}
                      className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError("");
                      }}
                      placeholder="Entrez votre code"
                      className="flex-1 h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                      data-testid="promo-code-input"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="px-4 h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-black/90 dark:hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="apply-promo-btn"
                    >
                      {promoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Appliquer"}
                    </button>
                  </div>
                )}
                {promoError && (
                  <p className="text-sm text-red-500 mt-2">{promoError}</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Réduction ({appliedPromo.discount_percent}%)</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-3 border-t border-black/10 dark:border-white/10">
                  <span>Total</span>
                  <span className="price-fcfa">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary w-full justify-center py-4 mb-3"
                data-testid="place-order-btn"
              >
                {loading ? "Traitement..." : "Confirmer la commande"}
              </button>

              <button
                onClick={handleWhatsAppOrder}
                className="btn-secondary w-full justify-center py-4 bg-[#25D366] border-[#25D366] text-white hover:bg-[#25D366]/90"
              >
                <MessageCircle className="w-5 h-5" />
                Commander via WhatsApp
              </button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                En confirmant, vous acceptez nos conditions générales de vente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
