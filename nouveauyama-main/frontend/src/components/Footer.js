import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from "lucide-react";

const footerLinks = {
  shop: [
    { name: "Électronique", href: "/category/electronique" },
    { name: "Électroménager", href: "/category/electromenager" },
    { name: "Décoration", href: "/category/decoration" },
    { name: "Accessoires mode et beauté", href: "/category/beaute" },
    { name: "Nouveautés", href: "/nouveautes" },
    { name: "Promotions", href: "/promotions" },
  ],
  company: [
    { name: "À propos", href: "/a-propos" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
    { name: "Aide / FAQ", href: "/aide" },
    { name: "Suivi de commande", href: "/suivi-commande" },
    { name: "Programme Fidélité", href: "/fidelite" },
    { name: "Parrainage", href: "/parrainage" },
  ],
  legal: [
    { name: "Conditions générales", href: "/cgv" },
    { name: "Politique de confidentialité", href: "/confidentialite" },
    { name: "Politique de retour", href: "/retours" },
    { name: "Livraison", href: "/livraison" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#F5F5F7] dark:bg-[#1C1C1E] pt-16 pb-8">
      <div className="container-lumina">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <img 
                src="/assets/images/logo_yama_full.png" 
                alt="Groupe YAMA+" 
                className="h-16 w-auto"
              />
            </Link>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Le shopping, autrement. Électronique, maison et essentiels du
              quotidien, sélectionnés avec exigence.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.facebook.com/GroupeYamaPlus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/groupeyamaplus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/GroupeYamaPlus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://www.tiktok.com/@groupeyamaplus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a
                href="https://www.snapchat.com/add/groupeyamaplus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                aria-label="Snapchat"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.206 1c.634.002 3.634.096 5.057 3.398.473 1.097.367 2.927.276 4.405l-.007.113c-.04.66-.074 1.229-.014 1.457.051.195.2.398.586.586.183.09.389.17.624.247a5.566 5.566 0 0 1 .886.399c.278.17.48.388.549.69.107.469-.08.949-.55 1.433a3.07 3.07 0 0 1-.617.489c-.204.132-.428.252-.665.363a6.636 6.636 0 0 0-.45.232c-.254.147-.397.288-.419.407-.027.144.051.32.21.53.052.068.11.135.175.2l.023.023c.648.67 1.152 1.29 1.383 1.936.15.42.163.845.012 1.247-.316.842-1.195 1.374-2.545 1.538a3.67 3.67 0 0 1-.33.025 4.41 4.41 0 0 1-.456-.004l-.188-.014-.121-.015c-.106.336-.231.663-.37.962-.535 1.146-1.35 2.002-2.42 2.545-.527.267-1.1.466-1.719.594a7.78 7.78 0 0 1-1.584.164 7.567 7.567 0 0 1-1.582-.164 6.182 6.182 0 0 1-1.718-.594c-1.07-.543-1.886-1.399-2.42-2.545a8.867 8.867 0 0 1-.371-.963l-.12.015-.189.014a4.413 4.413 0 0 1-.456.004 3.67 3.67 0 0 1-.33-.025c-1.35-.164-2.228-.696-2.545-1.538-.15-.402-.138-.828.013-1.247.23-.646.734-1.266 1.383-1.936l.022-.023c.066-.065.124-.132.176-.2.159-.21.237-.386.21-.53-.022-.12-.165-.26-.42-.407a6.636 6.636 0 0 0-.45-.232 7.672 7.672 0 0 1-.664-.363 3.07 3.07 0 0 1-.617-.489c-.47-.484-.657-.964-.55-1.433.069-.302.271-.52.549-.69.233-.142.52-.27.886-.399.235-.077.441-.157.624-.247.386-.188.535-.391.586-.586.06-.228.026-.798-.014-1.457l-.007-.113c-.091-1.478-.197-3.308.276-4.405C5.32 1.096 8.32 1.002 8.954 1h3.252z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="font-semibold mb-6 text-sm tracking-wider uppercase">
              Boutique
            </h3>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-6 text-sm tracking-wider uppercase">
              Entreprise
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="font-semibold mb-4 mt-8 text-sm tracking-wider uppercase">
              Légal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold mb-6 text-sm tracking-wider uppercase">
              Contact
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="tel:+221783827575"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span>+221 78 382 75 75</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+221778498137"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span>+221 77 849 81 37</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:contact@groupeyamaplus.com"
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span>contact@groupeyamaplus.com</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  Fass Paillote, Dakar
                  <br />
                  Sénégal
                </span>
              </li>
            </ul>

            {/* Payment Methods */}
            <h3 className="font-semibold mb-4 mt-8 text-sm tracking-wider uppercase">
              Paiement sécurisé
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <img 
                src="/assets/images/payment_wave.webp" 
                alt="Wave" 
                className="h-8 w-auto object-contain bg-white rounded-lg px-2 py-1"
              />
              <img 
                src="/assets/images/payment_orange_money.png" 
                alt="Orange Money" 
                className="h-8 w-auto object-contain bg-white rounded-lg px-2 py-1"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" 
                alt="Visa" 
                className="h-6 w-auto object-contain bg-white rounded-lg px-2 py-1.5"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png" 
                alt="Mastercard" 
                className="h-6 w-auto object-contain bg-white rounded-lg px-2 py-1.5"
              />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-black/10 dark:border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Groupe YAMA+. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Livraison</span>
              <span className="w-1 h-1 bg-current rounded-full" />
              <span>Dakar & Régions</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
