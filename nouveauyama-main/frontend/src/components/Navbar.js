import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  Smartphone,
  Home,
  Sofa,
  Sparkles,
  Star,
  Percent,
  Info,
  Phone,
  HelpCircle,
  ChevronRight,
  Car,
  Wrench,
  Gift,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { cn } from "../lib/utils";

const categoryItems = [
  { 
    name: "Électronique", 
    href: "/category/electronique", 
    icon: Smartphone,
    image: "/assets/images/category_electronique.png",
    description: "Smartphones, ordinateurs et gadgets"
  },
  { 
    name: "Électroménager", 
    href: "/category/electromenager", 
    icon: Home,
    image: "/assets/images/category_electromenager.png",
    description: "Appareils du quotidien"
  },
  { 
    name: "Décoration", 
    href: "/category/decoration", 
    icon: Sofa,
    image: "/assets/images/category_decoration.jpeg",
    description: "Design et confort"
  },
  { 
    name: "Accessoires mode et beauté", 
    href: "/category/beaute", 
    icon: Sparkles,
    image: "/assets/images/category_beaute.jpeg",
    description: "Mode, soins et cosmétiques"
  },
  { 
    name: "Automobile", 
    href: "/category/automobile", 
    icon: Car,
    image: "/assets/images/category_automobile.png",
    description: "Véhicules et accessoires"
  },
];

const navItems = [
  { name: "Électronique", href: "/category/electronique", icon: Smartphone },
  { name: "Électroménager", href: "/category/electromenager", icon: Home },
  { name: "Décoration", href: "/category/decoration", icon: Sofa },
  { name: "Mode & Beauté", href: "/category/beaute", icon: Sparkles },
  { name: "Automobile", href: "/category/automobile", icon: Car },
  { name: "Services", href: "/services", icon: Wrench, highlight: true },
  { name: "Coffrets Cadeaux", href: "/coffret-cadeau", icon: Gift, highlight: true },
  { name: "Nouveautés", href: "/nouveautes", icon: Star },
  { name: "Promotions", href: "/promotions", icon: Percent },
];

const secondaryNavItems = [
  { name: "À propos", href: "/a-propos", icon: Info },
  { name: "Contact", href: "/contact", icon: Phone },
  { name: "Aide / FAQ", href: "/aide", icon: HelpCircle },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { cartCount, setIsOpen: setCartOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isActive = (href) => location.pathname === href;

  return (
    <>
      <header
        className={cn(
          "relative w-full z-50 transition-all duration-300",
          isScrolled ? "glass-nav shadow-subtle" : "bg-white/80 dark:bg-black/80 backdrop-blur-md"
        )}
      >
        <nav className="container-lumina">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-3"
              data-testid="nav-logo"
            >
              <img 
                src="/assets/images/logo_yama_full.png" 
                alt="Groupe YAMA+" 
                className="h-16 md:h-20 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {/* Categories Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  onMouseEnter={() => setIsCategoryDropdownOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 font-medium hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  Catégories
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isCategoryDropdownOpen && "rotate-180"
                  )} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isCategoryDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onMouseLeave={() => setIsCategoryDropdownOpen(false)}
                      className="absolute top-full left-0 mt-2 w-[600px] bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-50"
                    >
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-3">
                          {categoryItems.map((category) => (
                            <Link
                              key={category.href}
                              to={category.href}
                              onClick={() => setIsCategoryDropdownOpen(false)}
                              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                <img
                                  src={category.image}
                                  alt={category.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <category.icon className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-semibold group-hover:text-primary transition-colors">
                                    {category.name}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {category.description}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </Link>
                          ))}
                        </div>
                        
                        {/* View all categories link */}
                        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
                          <Link
                            to="/produits"
                            onClick={() => setIsCategoryDropdownOpen(false)}
                            className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:underline"
                          >
                            Voir tous les produits
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Other nav items */}
              <Link
                to="/services"
                className={cn(
                  "nav-link flex items-center gap-1.5",
                  isActive("/services") && "nav-link-active"
                )}
                data-testid="nav-services-link"
              >
                <Wrench className="w-4 h-4" />
                Services
              </Link>
              <Link
                to="/nouveautes"
                className={cn("nav-link", isActive("/nouveautes") && "nav-link-active")}
              >
                Nouveautés
              </Link>
              <Link
                to="/promotions"
                className={cn("nav-link", isActive("/promotions") && "nav-link-active")}
              >
                Promotions
              </Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                aria-label="Rechercher"
                data-testid="nav-search-btn"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                aria-label="Mode sombre"
                data-testid="nav-dark-mode-btn"
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all hidden md:flex hover:scale-110"
                aria-label="Favoris"
                data-testid="nav-wishlist-btn"
              >
                <Heart className="w-5 h-5 transition-colors hover:text-red-500" />
              </Link>

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all hover:scale-110"
                aria-label="Panier"
                data-testid="nav-cart-btn"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full flex items-center justify-center"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>

              {/* User Menu */}
              {isAuthenticated ? (
                <Link
                  to={isAdmin ? "/admin" : "/account"}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all hidden md:flex items-center gap-2 hover:scale-105"
                  data-testid="nav-account-btn"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:flex btn-primary text-sm py-2 px-5"
                  data-testid="nav-login-btn"
                >
                  Connexion
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                aria-label="Menu"
                data-testid="nav-mobile-menu-btn"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white dark:bg-black overflow-auto"
          >
            <div className="container-lumina py-6 min-h-full">
              <div className="flex items-center justify-between mb-8">
                <span className="text-lg font-medium">Rechercher</span>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
                  data-testid="close-search-btn"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center gap-4">
                  <Search className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <input
                    ref={(input) => input && input.focus()}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Que recherchez-vous ?"
                    className="w-full text-2xl md:text-4xl lg:text-5xl font-light bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:ring-0 focus:outline-none"
                    autoFocus
                    data-testid="search-input"
                  />
                </div>
                <div className="mt-4 border-b border-black/10 dark:border-white/10" />
                {searchQuery && (
                  <button
                    type="submit"
                    className="mt-6 btn-primary"
                  >
                    Rechercher "{searchQuery}"
                  </button>
                )}
              </form>
              
              {/* Quick Links */}
              <div className="mt-12">
                <p className="text-sm text-muted-foreground mb-4">Recherches populaires</p>
                <div className="flex flex-wrap gap-2">
                  {["iPhone", "Samsung", "Écouteurs", "Montre", "Canapé", "Parfum"].map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchQuery(term);
                        navigate(`/search?q=${encodeURIComponent(term)}`);
                        setIsSearchOpen(false);
                      }}
                      className="px-4 py-2 bg-black/5 dark:bg-white/10 rounded-full text-sm hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-[#F5F5F7] dark:bg-[#0B0B0B] lg:hidden overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-[#1C1C1E] px-6 py-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
              <img 
                src="/assets/images/logo_yama_full.png" 
                alt="Groupe YAMA+" 
                className="h-12 w-auto"
              />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full"
                data-testid="close-mobile-menu-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 flex flex-col h-[calc(100%-72px)]">
              {/* User Card (if authenticated) */}
              {isAuthenticated && (
                <Link
                  to={isAdmin ? "/admin" : "/account"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-[#1C1C1E] rounded-2xl mb-6 shadow-sm"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-14 h-14 rounded-full"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#0071E3] to-[#00C6FB] rounded-full flex items-center justify-center">
                      <User className="w-7 h-7 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin ? "Administrateur" : "Mon compte"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              )}

              {/* Main Categories */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Catégories
                </p>
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                  {navItems.map((item, index) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 transition-colors",
                        index !== navItems.length - 1 && "border-b border-black/5 dark:border-white/5",
                        isActive(item.href)
                          ? "bg-[#0071E3]/5"
                          : "active:bg-black/5 dark:active:bg-white/5"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        isActive(item.href)
                          ? "bg-[#0071E3] text-white"
                          : "bg-black/5 dark:bg-white/10"
                      )}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className={cn(
                        "flex-1 font-medium",
                        isActive(item.href) && "text-[#0071E3]"
                      )}>
                        {item.name}
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Secondary Links */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  Informations
                </p>
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                  {secondaryNavItems.map((item, index) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 transition-colors active:bg-black/5 dark:active:bg-white/5",
                        index !== secondaryNavItems.length - 1 && "border-b border-black/5 dark:border-white/5"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="flex-1 font-medium">{item.name}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Link
                  to="/wishlist"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm"
                >
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="font-medium">Favoris</span>
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setCartOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-sm relative"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="font-medium">Panier</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0071E3] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Auth Buttons (if not authenticated) */}
              {!isAuthenticated && (
                <div className="mt-auto space-y-3">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-semibold"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-4 border-2 border-black/10 dark:border-white/10 rounded-2xl font-semibold"
                  >
                    Créer un compte
                  </Link>
                </div>
              )}

              {/* Dark Mode Toggle at bottom */}
              <div className="mt-auto pt-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mode sombre</span>
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    "w-14 h-8 rounded-full p-1 transition-colors",
                    isDark ? "bg-[#0071E3]" : "bg-black/10 dark:bg-white/10"
                  )}
                >
                  <motion.div
                    layout
                    className={cn(
                      "w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center",
                      isDark && "ml-auto"
                    )}
                  >
                    {isDark ? (
                      <Moon className="w-3.5 h-3.5 text-[#0071E3]" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-gray-600" />
                    )}
                  </motion.div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
