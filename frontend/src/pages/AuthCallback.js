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
        // Extract session_id from URL hash
        const hash = location.hash;
        const params = new URLSearchParams(hash.replace("#", ""));
        const sessionId = params.get("session_id");

        if (!sessionId) {
          toast.error("Session invalide");
          navigate("/login", { replace: true });
          return;
        }

        // Process the session
        const user = await processGoogleCallback(sessionId);
        toast.success(`Bienvenue, ${user.name} !`);
        
        // Redirect to home or previous page
        navigate("/", { replace: true, state: { user } });
      } catch (error) {
        console.error("Auth callback error:", error);
        toast.error("Erreur lors de la connexion");
        navigate("/login", { replace: true });
      }
    };

    processAuth();
  }, [location.hash, navigate, processGoogleCallback]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F7] dark:bg-[#0B0B0B]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">Connexion en cours...</p>
      </div>
    </main>
  );
}
