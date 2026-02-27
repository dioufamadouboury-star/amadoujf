import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Send } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/contact`, formData);
      toast.success("Message envoyé avec succès !");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-20" data-testid="contact-page">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="text-caption mb-4">Contact</p>
            <h1 className="heading-hero mb-6">Parlons ensemble</h1>
            <p className="text-body-lg">
              Une question, une suggestion ou besoin d'aide ? 
              Notre équipe est là pour vous.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="heading-card mb-8">Nos coordonnées</h2>

              <div className="space-y-6 mb-12">
                <a
                  href="https://wa.me/221783827575"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-6 bg-[#25D366]/10 rounded-2xl hover:bg-[#25D366]/20 transition-colors group"
                >
                  <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 group-hover:text-[#25D366] transition-colors">
                      WhatsApp
                    </h3>
                    <p className="text-muted-foreground">+221 77 000 00 00</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Réponse rapide • 9h - 21h
                    </p>
                  </div>
                </a>

                <div className="flex items-start gap-4 p-6 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl">
                  <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white dark:text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Téléphone</h3>
                    <p className="text-muted-foreground">+221 77 000 00 00</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lundi - Samedi • 9h - 18h
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl">
                  <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white dark:text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-muted-foreground">contact@lumina.sn</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Réponse sous 24h
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-2xl">
                  <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white dark:text-black" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Adresse</h3>
                    <p className="text-muted-foreground">Almadies, Ngor</p>
                    <p className="text-muted-foreground">Dakar, Sénégal</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-3xl p-8">
                <h2 className="heading-card mb-6">Envoyez-nous un message</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black focus:border-black dark:focus:border-white outline-none transition-colors"
                        data-testid="contact-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black focus:border-black dark:focus:border-white outline-none transition-colors"
                        data-testid="contact-email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black focus:border-black dark:focus:border-white outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Sujet *
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black focus:border-black dark:focus:border-white outline-none transition-colors"
                        data-testid="contact-subject"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black focus:border-black dark:focus:border-white outline-none transition-colors resize-none"
                      data-testid="contact-message"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full justify-center py-4"
                    data-testid="contact-submit"
                  >
                    {loading ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        Envoyer le message
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
