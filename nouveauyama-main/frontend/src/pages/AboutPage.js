import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Target, Heart, Shield } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Exigence",
    description: "Chaque produit est sélectionné selon des critères stricts de qualité et de fiabilité.",
  },
  {
    icon: Heart,
    title: "Passion",
    description: "Nous sommes passionnés par l'innovation et les produits qui améliorent le quotidien.",
  },
  {
    icon: Shield,
    title: "Confiance",
    description: "Transparence totale sur nos produits, nos prix et notre service client.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-20" data-testid="about-page">
      {/* Hero */}
      <section className="py-24 md:py-32 bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <p className="text-caption mb-4">À propos</p>
            <h1 className="heading-hero mb-6">
              Le shopping, autrement.
            </h1>
            <p className="text-body-lg">
              YAMA+ est né d'une vision simple : offrir aux Sénégalais une 
              expérience d'achat en ligne à la hauteur de leurs attentes. 
              Premium, fiable et sans compromis.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding bg-white dark:bg-[#0B0B0B]">
        <div className="container-lumina">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-caption mb-4">Notre histoire</p>
              <h2 className="heading-section mb-6">
                Une nouvelle ère du e-commerce au Sénégal
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Fondée à Dakar, YAMA+ redéfinit l'expérience d'achat en ligne 
                  au Sénégal. Nous croyons que chaque Sénégalais mérite d'accéder 
                  à des produits de qualité, présentés avec élégance et livrés 
                  avec fiabilité.
                </p>
                <p>
                  Notre sélection est le fruit d'une curation rigoureuse. 
                  Électronique, électroménager, décoration ou beauté : chaque 
                  catégorie est pensée pour répondre aux besoins réels de nos clients.
                </p>
                <p>
                  Chez YAMA+, nous ne vendons pas simplement des produits. 
                  Nous créons une expérience. Une expérience où la qualité, 
                  la confiance et le service sont au cœur de chaque interaction.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-square rounded-3xl overflow-hidden bg-[#F5F5F7] dark:bg-[#1C1C1E]"
            >
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800"
                alt="Notre équipe"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="container-lumina">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-caption mb-4">Nos valeurs</p>
            <h2 className="heading-section">Ce qui nous définit</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-[#0B0B0B] rounded-3xl p-8 text-center"
              >
                <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-white dark:text-black" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="section-padding bg-black text-white">
        <div className="container-lumina">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-[#D4AF37] text-sm font-medium tracking-widest uppercase mb-4">
                Notre engagement
              </p>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-8">
                La qualité, sans compromis
              </h2>
              <ul className="space-y-4">
                {[
                  "Produits authentiques et garantis",
                  "Livraison rapide dans tout le Sénégal",
                  "Service client réactif via WhatsApp",
                  "Paiements sécurisés et flexibles",
                  "Politique de retour transparente",
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[#D4AF37] rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                    <span className="text-white/80">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <Link to="/" className="btn-primary bg-white text-black hover:bg-white/90">
                Découvrir nos produits
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
