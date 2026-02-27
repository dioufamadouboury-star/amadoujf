import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Phone } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await login(formData.email, formData.password);
        toast.success("Connexion réussie");
      } else {
        user = await register(formData.name, formData.email, formData.password, formData.phone);
        toast.success("Compte créé avec succès");
      }
      
      // Redirect admin to admin dashboard
      if (user?.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate(from === "/" || from === "/login" ? "/" : from, { replace: true });
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <main className="min-h-screen pt-20 flex items-center justify-center bg-[#F5F5F7] dark:bg-[#0B0B0B]">
      <div className="container-lumina py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-2">
              <img 
                src="/assets/images/logo_yama_full.png" 
                alt="Groupe YAMA+" 
                className="h-28 w-auto mx-auto"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-6">Votre partenaire au quotidien</p>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              {isLogin ? "Bon retour" : "Créer un compte"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Connectez-vous pour accéder à votre compte"
                : "Rejoignez GROUPE YAMA+ pour une expérience shopping unique"}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 shadow-floating">
            {/* Google Auth */}
            <button
              onClick={loginWithGoogle}
              className="w-full btn-secondary justify-center mb-6 py-4"
              data-testid="google-login-btn"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-[#1C1C1E] text-muted-foreground">
                  ou par email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nom complet"
                    required={!isLogin}
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                    data-testid="name-input"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                  className="w-full h-14 pl-12 pr-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                  data-testid="email-input"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mot de passe"
                  required
                  minLength={6}
                  className="w-full h-14 pl-12 pr-12 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {!isLogin && (
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Téléphone (optionnel)"
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-black/10 dark:border-white/10 bg-transparent focus:border-black dark:focus:border-white outline-none transition-colors"
                    data-testid="phone-input"
                  />
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[#0071E3] hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-4 text-base"
                data-testid="submit-btn"
              >
                {loading ? (
                  <span className="animate-pulse">Chargement...</span>
                ) : isLogin ? (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-center mt-6 text-muted-foreground">
              {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#0071E3] font-medium hover:underline"
                data-testid="toggle-auth-btn"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
