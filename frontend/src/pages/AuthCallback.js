import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function AuthCallback() {
  const { processGoogleCallback } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract code from URL query params (Google OAuth callback)
        const params = new URLSearchParams(location.search);
        const code = params.get("code");
        const error = params.get("error");

        if (error) {
          toast.error("Connexion annulée");
          navigate("/login", { replace: true });
          return;
        }

        if (!code) {
          // Try legacy hash-based session_id for backward compatibility
          const hash = location.hash;
          const hashParams = new URLSearchParams(hash.replace("#", ""));
          const sessionId = hashParams.get("session_id");
          
          if (!sessionId) {
            toast.error("Session invalide");
            navigate("/login", { replace: true });
            return;
          }
          
          // Legacy flow - shouldn't happen anymore
          toast.error("Méthode d'authentification obsolète");
          navigate("/login", { replace: true });
          return;
        }

        // Process the Google OAuth authorization code
        const user = await processGoogleCallback(code);
        toast.success(`Bienvenue, ${user.name} !`);
        
        // Redirect admin to admin dashboard, others to home
        if (user?.role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/", { replace: true, state: { user } });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error("Erreur lors de la connexion");
        navigate("/login", { replace: true });
      }
    };

    processAuth();
  }, [location.search, location.hash, navigate, processGoogleCallback]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#0B0B0B]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">Connexion en cours...</p>
      </div>
    </main>
  );
}
