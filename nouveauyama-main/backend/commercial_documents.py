"""
Commercial Documents Module for GROUPE YAMA PLUS
Handles: Quotes, Invoices (Proforma & Final), Contracts, Partners
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============== ENUMS ==============

class QuoteStatus(str, Enum):
    PENDING = "pending"  # En attente
    ACCEPTED = "accepted"  # Accepté
    REFUSED = "refused"  # Refusé

class InvoiceStatus(str, Enum):
    UNPAID = "unpaid"  # Impayée
    PAID = "paid"  # Payée
    PARTIAL = "partial"  # Partiellement payée

class InvoiceType(str, Enum):
    PROFORMA = "proforma"  # Facture pro forma
    FINAL = "final"  # Facture finale

class ContractType(str, Enum):
    PARTNERSHIP = "partnership"  # Partenariat
    SPONSORING = "sponsoring"  # Sponsoring
    VENDOR = "vendor"  # Vendeur

class ContractStatus(str, Enum):
    DRAFT = "draft"  # Brouillon
    ACTIVE = "active"  # En cours
    SIGNED = "signed"  # Signé
    EXPIRED = "expired"  # Expiré

# ============== COMPANY INFO ==============

COMPANY_INFO = {
    "name": "GROUPE YAMA PLUS",
    "address": "Dakar – Sénégal",
    "email": "contact@groupeyamaplus.com",
    "phone": "78 382 75 75",
    "ninea": "012808210",
    "rccm": "SN DKR 2026 A 4814",
    "tva_mention": "TVA non applicable",
    "logo_url": "/assets/images/logo_yama_pdf.png"
}

# ============== PARTNER MODELS ==============

class PartnerBase(BaseModel):
    name: str
    company_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Dakar"
    country: Optional[str] = "Sénégal"
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    ninea: Optional[str] = None
    rccm: Optional[str] = None
    logo_url: Optional[str] = None
    notes: Optional[str] = None

class PartnerCreate(PartnerBase):
    pass

class Partner(PartnerBase):
    partner_id: str
    created_at: str
    updated_at: Optional[str] = None

# ============== DOCUMENT LINE ITEM ==============

class DocumentItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    unit: Optional[str] = "unité"  # unité, heure, jour, mois, forfait
    discount_percent: Optional[float] = 0
    
    @property
    def total(self) -> float:
        subtotal = self.quantity * self.unit_price
        if self.discount_percent:
            subtotal -= subtotal * (self.discount_percent / 100)
        return subtotal

# ============== QUOTE MODELS ==============

class QuoteBase(BaseModel):
    partner_id: str
    title: str
    description: Optional[str] = None
    items: List[DocumentItem]
    validity_days: int = 30
    notes: Optional[str] = None
    payment_terms: Optional[str] = "Paiement à réception"

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    quote_id: str
    quote_number: str  # YMP-DEV-2026-001
    status: QuoteStatus = QuoteStatus.PENDING
    subtotal: float
    total: float
    created_at: str
    updated_at: Optional[str] = None
    accepted_at: Optional[str] = None
    refused_at: Optional[str] = None
    converted_to_invoice_id: Optional[str] = None
    pdf_url: Optional[str] = None

# ============== INVOICE MODELS ==============

class InvoiceBase(BaseModel):
    partner_id: str
    invoice_type: InvoiceType
    title: str
    description: Optional[str] = None
    items: List[DocumentItem]
    due_date: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = "Paiement à réception"
    from_quote_id: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    invoice_id: str
    invoice_number: str  # YMP-FAC-2026-001 or YMP-PRO-2026-001
    status: InvoiceStatus = InvoiceStatus.UNPAID
    subtotal: float
    total: float
    amount_paid: float = 0
    created_at: str
    updated_at: Optional[str] = None
    paid_at: Optional[str] = None
    pdf_url: Optional[str] = None

# ============== CONTRACT MODELS ==============

class ContractClause(BaseModel):
    title: str
    content: str
    is_editable: bool = True

class ContractBase(BaseModel):
    partner_id: str
    contract_type: ContractType
    title: str
    description: Optional[str] = None
    clauses: List[ContractClause]
    start_date: str
    end_date: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None

class ContractCreate(ContractBase):
    pass

class Contract(ContractBase):
    contract_id: str
    contract_number: str  # YMP-CTR-2026-001
    status: ContractStatus = ContractStatus.DRAFT
    created_at: str
    updated_at: Optional[str] = None
    signed_at: Optional[str] = None
    pdf_url: Optional[str] = None

# ============== CONTRACT TEMPLATES ==============

CONTRACT_TEMPLATES = {
    "partnership": {
        "title": "Contrat de Partenariat Commercial",
        "clauses": [
            {
                "title": "Article 1 - Objet du contrat",
                "content": "Le présent contrat a pour objet de définir les modalités de partenariat commercial entre GROUPE YAMA PLUS et le Partenaire désigné ci-dessus.",
                "is_editable": True
            },
            {
                "title": "Article 2 - Durée du contrat",
                "content": "Le présent contrat est conclu pour une durée de [DURÉE] à compter de sa date de signature. Il pourra être renouvelé par tacite reconduction, sauf dénonciation par l'une des parties avec un préavis de 30 jours.",
                "is_editable": True
            },
            {
                "title": "Article 3 - Obligations de GROUPE YAMA PLUS",
                "content": "GROUPE YAMA PLUS s'engage à :\n- Fournir un accès à sa plateforme de vente en ligne\n- Assurer la visibilité des produits/services du Partenaire\n- Garantir un service client de qualité\n- Reverser les commissions selon les modalités convenues",
                "is_editable": True
            },
            {
                "title": "Article 4 - Obligations du Partenaire",
                "content": "Le Partenaire s'engage à :\n- Fournir des produits/services conformes aux normes de qualité\n- Respecter les délais de livraison convenus\n- Maintenir un stock suffisant\n- Informer GROUPE YAMA PLUS de tout changement de prix ou de disponibilité",
                "is_editable": True
            },
            {
                "title": "Article 5 - Conditions financières",
                "content": "Les conditions financières du partenariat sont définies comme suit :\n- Commission GROUPE YAMA PLUS : [POURCENTAGE]% du montant HT des ventes\n- Paiement : [MODALITÉS DE PAIEMENT]\n- Facturation : Mensuelle",
                "is_editable": True
            },
            {
                "title": "Article 6 - Confidentialité",
                "content": "Les parties s'engagent à maintenir confidentielles toutes les informations commerciales, techniques et financières échangées dans le cadre du présent contrat.",
                "is_editable": False
            },
            {
                "title": "Article 7 - Résiliation",
                "content": "Le présent contrat pourra être résilié de plein droit en cas de manquement grave de l'une des parties à ses obligations, après mise en demeure restée sans effet pendant 15 jours.",
                "is_editable": False
            },
            {
                "title": "Article 8 - Juridiction",
                "content": "Tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis aux tribunaux compétents de Dakar, Sénégal.",
                "is_editable": False
            }
        ]
    },
    "sponsoring": {
        "title": "Contrat de Sponsoring",
        "clauses": [
            {
                "title": "Article 1 - Objet du contrat",
                "content": "Le présent contrat définit les conditions du sponsoring accordé par le Sponsor à GROUPE YAMA PLUS pour [DESCRIPTION DE L'ÉVÉNEMENT/ACTIVITÉ].",
                "is_editable": True
            },
            {
                "title": "Article 2 - Durée du sponsoring",
                "content": "Le présent contrat de sponsoring est valable du [DATE DÉBUT] au [DATE FIN].",
                "is_editable": True
            },
            {
                "title": "Article 3 - Contreparties",
                "content": "En contrepartie du sponsoring, GROUPE YAMA PLUS s'engage à :\n- Afficher le logo du Sponsor sur [SUPPORTS]\n- Mentionner le Sponsor dans les communications officielles\n- Accorder [AVANTAGES SPÉCIFIQUES]",
                "is_editable": True
            },
            {
                "title": "Article 4 - Montant et modalités de paiement",
                "content": "Le montant du sponsoring s'élève à [MONTANT] FCFA, payable selon les modalités suivantes : [MODALITÉS].",
                "is_editable": True
            },
            {
                "title": "Article 5 - Utilisation de l'image",
                "content": "Le Sponsor autorise GROUPE YAMA PLUS à utiliser son nom, logo et image dans le cadre exclusif du présent partenariat.",
                "is_editable": False
            },
            {
                "title": "Article 6 - Exclusivité",
                "content": "[CLAUSE D'EXCLUSIVITÉ - À DÉFINIR]",
                "is_editable": True
            },
            {
                "title": "Article 7 - Résiliation",
                "content": "En cas de non-respect des engagements, le contrat pourra être résilié avec un préavis de 15 jours.",
                "is_editable": False
            }
        ]
    },
    "vendor": {
        "title": "Contrat de Vendeur / Fournisseur",
        "clauses": [
            {
                "title": "Article 1 - Objet du contrat",
                "content": "Le présent contrat établit les conditions de vente des produits du Vendeur sur la plateforme GROUPE YAMA PLUS.",
                "is_editable": True
            },
            {
                "title": "Article 2 - Produits concernés",
                "content": "Les produits concernés par le présent contrat sont : [LISTE DES CATÉGORIES/PRODUITS].",
                "is_editable": True
            },
            {
                "title": "Article 3 - Prix et marges",
                "content": "Les prix de vente seront fixés d'un commun accord. La commission de GROUPE YAMA PLUS est de [POURCENTAGE]% du prix de vente HT.",
                "is_editable": True
            },
            {
                "title": "Article 4 - Gestion des stocks",
                "content": "Le Vendeur s'engage à :\n- Maintenir un stock minimum de [QUANTITÉ] unités\n- Informer GROUPE YAMA PLUS sous 24h en cas de rupture\n- Livrer les commandes sous [DÉLAI] jours ouvrés",
                "is_editable": True
            },
            {
                "title": "Article 5 - Qualité et conformité",
                "content": "Le Vendeur garantit que tous les produits sont conformes aux normes en vigueur au Sénégal et disposent des certifications requises.",
                "is_editable": False
            },
            {
                "title": "Article 6 - Retours et SAV",
                "content": "Le Vendeur assure la gestion des retours et du service après-vente selon les conditions définies par GROUPE YAMA PLUS.",
                "is_editable": True
            },
            {
                "title": "Article 7 - Paiement",
                "content": "GROUPE YAMA PLUS versera au Vendeur le montant des ventes (déduction faite de la commission) selon une périodicité [HEBDOMADAIRE/MENSUELLE].",
                "is_editable": True
            },
            {
                "title": "Article 8 - Durée et résiliation",
                "content": "Le présent contrat est conclu pour une durée indéterminée. Chaque partie peut y mettre fin avec un préavis de 30 jours.",
                "is_editable": False
            }
        ]
    }
}

# ============== DOCUMENT NUMBERING ==============

def generate_document_number(doc_type: str, year: int, sequence: int) -> str:
    """
    Generate document number with format: YMP-TYPE-YYYY-NNN
    Types: DEV (Devis), FAC (Facture), PRO (Proforma), CTR (Contrat)
    """
    type_codes = {
        "quote": "DEV",
        "invoice": "FAC",
        "proforma": "PRO",
        "contract": "CTR"
    }
    code = type_codes.get(doc_type, "DOC")
    return f"YMP-{code}-{year}-{sequence:03d}"
