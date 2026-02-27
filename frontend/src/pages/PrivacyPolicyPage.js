import SEO from "../components/SEO";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen pt-20">
      <SEO 
        title="Politique de Confidentialité" 
        description="Découvrez comment GROUPE YAMA+ protège vos données personnelles."
        url="/confidentialite"
      />
      <div className="container-lumina py-12">
        <h1 className="text-3xl font-bold mb-8">Politique de Confidentialité</h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Collecte des données</h2>
            <p>
              Nous collectons les informations que vous nous fournissez lors de la création de votre compte, 
              de vos commandes ou de votre inscription à notre newsletter : nom, email, adresse, téléphone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Utilisation des données</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Traiter et livrer vos commandes</li>
              <li>Vous contacter concernant votre commande</li>
              <li>Vous envoyer des offres promotionnelles (avec votre consentement)</li>
              <li>Améliorer notre site et nos services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Protection des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger 
              vos données contre tout accès non autorisé, modification, divulgation ou destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Partage des données</h2>
            <p>
              Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec nos 
              partenaires de livraison et de paiement uniquement dans le cadre du traitement de vos commandes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Cookies</h2>
            <p>
              Notre site utilise des cookies pour améliorer votre expérience de navigation, mémoriser 
              vos préférences et analyser l'utilisation du site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Vos droits</h2>
            <p>Conformément à la loi sur la protection des données, vous avez le droit de :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Accéder à vos données personnelles</li>
              <li>Rectifier vos données</li>
              <li>Supprimer vos données</li>
              <li>Vous opposer au traitement de vos données</li>
              <li>Retirer votre consentement à tout moment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Contact</h2>
            <p>
              Pour toute question concernant vos données personnelles, contactez-nous :<br />
              Email : contact@groupeyamaplus.com
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
