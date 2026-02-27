import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setSuccess(true);
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg text-center"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Email envoyé !</h1>
          <p className="text-muted-foreground mb-6">
            Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Vérifiez également vos spams si vous ne trouvez pas l'email.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="forgot-password-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-white dark:text-black" />
            </div>
            <h1 className="text-2xl font-bold">Mot de passe oublié ?</h1>
            <p className="text-muted-foreground mt-2">
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                placeholder="exemple@email.com"
                required
                data-testid="forgot-email-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              data-testid="forgot-password-submit"
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas de compte ?{" "}
              <Link to="/register" className="text-blue-600 hover:underline">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
