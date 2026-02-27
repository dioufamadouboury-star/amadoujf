"""
PDF Generation Service for Commercial Documents
Professional design with GROUPE YAMA PLUS branding
"""
import io
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import requests
from typing import Optional, List, Dict, Any

# Company colors
YAMA_BLUE = colors.HexColor("#4A7BA7")
YAMA_DARK = colors.HexColor("#2C3E50")
YAMA_LIGHT = colors.HexColor("#ECF0F1")
YAMA_GRAY = colors.HexColor("#7F8C8D")

# Company info
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

def download_image(url: str) -> Optional[io.BytesIO]:
    """Download image from URL and return as BytesIO"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return io.BytesIO(response.content)
    except Exception as e:
        print(f"Error downloading image: {e}")
    return None

def format_price(amount: float) -> str:
    """Format price in FCFA"""
    return f"{amount:,.0f}".replace(",", " ") + " FCFA"

def get_styles():
    """Get custom paragraph styles"""
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='CompanyName',
        fontSize=18,
        textColor=YAMA_BLUE,
        fontName='Helvetica-Bold',
        alignment=TA_LEFT
    ))
    
    styles.add(ParagraphStyle(
        name='CompanyInfo',
        fontSize=9,
        textColor=YAMA_GRAY,
        fontName='Helvetica',
        alignment=TA_LEFT,
        leading=12
    ))
    
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontSize=24,
        textColor=YAMA_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='DocNumber',
        fontSize=12,
        textColor=YAMA_BLUE,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontSize=12,
        textColor=YAMA_DARK,
        fontName='Helvetica-Bold',
        spaceBefore=15,
        spaceAfter=8
    ))
    
    styles.add(ParagraphStyle(
        name='PartnerName',
        fontSize=11,
        textColor=YAMA_DARK,
        fontName='Helvetica-Bold'
    ))
    
    styles.add(ParagraphStyle(
        name='PartnerInfo',
        fontSize=10,
        textColor=YAMA_GRAY,
        fontName='Helvetica',
        leading=14
    ))
    
    styles.add(ParagraphStyle(
        name='YamaBody',
        fontSize=10,
        textColor=YAMA_DARK,
        fontName='Helvetica',
        alignment=TA_JUSTIFY,
        leading=14
    ))
    
    styles.add(ParagraphStyle(
        name='ClauseTitle',
        fontSize=11,
        textColor=YAMA_DARK,
        fontName='Helvetica-Bold',
        spaceBefore=12,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='ClauseContent',
        fontSize=10,
        textColor=YAMA_DARK,
        fontName='Helvetica',
        alignment=TA_JUSTIFY,
        leading=14,
        leftIndent=10
    ))
    
    styles.add(ParagraphStyle(
        name='TotalLabel',
        fontSize=11,
        textColor=YAMA_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT
    ))
    
    styles.add(ParagraphStyle(
        name='TotalAmount',
        fontSize=14,
        textColor=YAMA_BLUE,
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT
    ))
    
    styles.add(ParagraphStyle(
        name='Footer',
        fontSize=8,
        textColor=YAMA_GRAY,
        fontName='Helvetica',
        alignment=TA_CENTER
    ))
    
    styles.add(ParagraphStyle(
        name='Notes',
        fontSize=9,
        textColor=YAMA_GRAY,
        fontName='Helvetica-Oblique',
        alignment=TA_LEFT,
        leading=12
    ))
    
    return styles


def create_header(styles, doc_type: str = ""):
    """Create document header with logo and company info"""
    elements = []
    
    # Try to load logo
    logo_data = download_image(COMPANY_INFO["logo_url"])
    
    header_data = []
    
    # Left side: Logo with tagline or Company name
    if logo_data:
        # Use proportional sizing to avoid stretching - square logo
        img = Image(logo_data, width=35*mm, height=35*mm)
        # Create logo with tagline below
        logo_table = Table([
            [img],
            [Paragraph("<i>Votre partenaire de croissance</i>", ParagraphStyle('Tagline', fontSize=8, textColor=YAMA_GRAY, alignment=TA_CENTER))]
        ], colWidths=[40*mm])
        logo_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 1), (0, 1), 2),
        ]))
        left_content = logo_table
    else:
        left_content = Paragraph(COMPANY_INFO["name"], styles['CompanyName'])
    
    # Right side: Company info
    right_content = Paragraph(
        f"""<b>{COMPANY_INFO['name']}</b><br/>
        {COMPANY_INFO['address']}<br/>
        Email: {COMPANY_INFO['email']}<br/>
        Tél: {COMPANY_INFO['phone']}<br/>
        NINEA: {COMPANY_INFO['ninea']}<br/>
        RCCM: {COMPANY_INFO['rccm']}""",
        styles['CompanyInfo']
    )
    
    header_table = Table(
        [[left_content, right_content]],
        colWidths=[100*mm, 80*mm]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 10*mm))
    
    # Horizontal line
    elements.append(HRFlowable(width="100%", thickness=1, color=YAMA_BLUE))
    elements.append(Spacer(1, 10*mm))
    
    return elements


def create_partner_section(partner: Dict, styles, partner_logo_url: Optional[str] = None):
    """Create partner information section"""
    elements = []
    
    elements.append(Paragraph("DESTINATAIRE", styles['SectionTitle']))
    
    partner_info_parts = [f"<b>{partner.get('company_name', partner.get('name', ''))}</b>"]
    
    if partner.get('name') and partner.get('company_name'):
        partner_info_parts.append(f"À l'attention de: {partner['name']}")
    
    if partner.get('address'):
        partner_info_parts.append(partner['address'])
    
    location = []
    if partner.get('city'):
        location.append(partner['city'])
    if partner.get('country'):
        location.append(partner['country'])
    if location:
        partner_info_parts.append(" – ".join(location))
    
    if partner.get('email'):
        partner_info_parts.append(f"Email: {partner['email']}")
    if partner.get('phone'):
        partner_info_parts.append(f"Tél: {partner['phone']}")
    if partner.get('ninea'):
        partner_info_parts.append(f"NINEA: {partner['ninea']}")
    if partner.get('rccm'):
        partner_info_parts.append(f"RCCM: {partner['rccm']}")
    
    partner_text = "<br/>".join(partner_info_parts)
    
    # Add partner logo if available
    if partner_logo_url:
        logo_data = download_image(partner_logo_url)
        if logo_data:
            partner_table_data = [
                [Image(logo_data, width=30*mm, height=15*mm), Paragraph(partner_text, styles['PartnerInfo'])]
            ]
            partner_table = Table(partner_table_data, colWidths=[35*mm, 120*mm])
            partner_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (0, 0), 0),
                ('RIGHTPADDING', (0, 0), (0, 0), 10),
            ]))
            elements.append(partner_table)
        else:
            elements.append(Paragraph(partner_text, styles['PartnerInfo']))
    else:
        elements.append(Paragraph(partner_text, styles['PartnerInfo']))
    
    elements.append(Spacer(1, 10*mm))
    
    return elements


def create_items_table(items: List[Dict], styles):
    """Create items/products table"""
    elements = []
    
    # Table header
    table_data = [
        [
            Paragraph("<b>Description</b>", styles['YamaBody']),
            Paragraph("<b>Qté</b>", styles['YamaBody']),
            Paragraph("<b>Prix unitaire</b>", styles['YamaBody']),
            Paragraph("<b>Total</b>", styles['YamaBody'])
        ]
    ]
    
    subtotal = 0
    for item in items:
        qty = item.get('quantity', 1)
        unit_price = item.get('unit_price', 0)
        discount = item.get('discount_percent', 0)
        
        line_total = qty * unit_price
        if discount > 0:
            line_total -= line_total * (discount / 100)
        
        subtotal += line_total
        
        desc = item.get('description', '')
        if discount > 0:
            desc += f" <font size='8' color='gray'>(-{discount}%)</font>"
        
        unit = item.get('unit', 'unité')
        
        table_data.append([
            Paragraph(desc, styles['YamaBody']),
            Paragraph(f"{qty} {unit}", styles['YamaBody']),
            Paragraph(format_price(unit_price), styles['YamaBody']),
            Paragraph(format_price(line_total), styles['YamaBody'])
        ])
    
    # Table styling
    table = Table(table_data, colWidths=[90*mm, 25*mm, 35*mm, 35*mm])
    table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), YAMA_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        
        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        
        # Alternating row colors
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        
        # Borders
        ('LINEBELOW', (0, 0), (-1, 0), 1, YAMA_BLUE),
        ('LINEBELOW', (0, -1), (-1, -1), 1, YAMA_GRAY),
        
        # Alignment
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    # Add alternating colors
    for i in range(1, len(table_data)):
        if i % 2 == 0:
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), YAMA_LIGHT),
            ]))
    
    elements.append(table)
    elements.append(Spacer(1, 5*mm))
    
    return elements, subtotal


def create_totals_section(subtotal: float, styles, discount: float = 0):
    """Create totals section"""
    elements = []
    
    total = subtotal - discount
    
    totals_data = []
    
    totals_data.append([
        "",
        Paragraph("Sous-total:", styles['TotalLabel']),
        Paragraph(format_price(subtotal), styles['YamaBody'])
    ])
    
    if discount > 0:
        totals_data.append([
            "",
            Paragraph("Remise:", styles['TotalLabel']),
            Paragraph(f"- {format_price(discount)}", styles['YamaBody'])
        ])
    
    totals_data.append([
        "",
        Paragraph("<b>TOTAL:</b>", styles['TotalLabel']),
        Paragraph(f"<b>{format_price(total)}</b>", styles['TotalAmount'])
    ])
    
    totals_data.append([
        "",
        "",
        Paragraph(f"<i>{COMPANY_INFO['tva_mention']}</i>", styles['Notes'])
    ])
    
    totals_table = Table(totals_data, colWidths=[100*mm, 45*mm, 40*mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (1, -2), (-1, -2), 1, YAMA_DARK),
    ]))
    
    elements.append(totals_table)
    
    return elements


def create_footer(styles, doc_number: str, validity: Optional[str] = None):
    """Create document footer"""
    elements = []
    
    elements.append(Spacer(1, 15*mm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=YAMA_GRAY))
    elements.append(Spacer(1, 3*mm))
    
    footer_text = f"Document N° {doc_number} | {COMPANY_INFO['name']} | {COMPANY_INFO['email']} | {COMPANY_INFO['phone']}"
    if validity:
        footer_text += f" | {validity}"
    
    elements.append(Paragraph(footer_text, styles['Footer']))
    
    return elements


def generate_quote_pdf(
    quote_number: str,
    partner: Dict,
    items: List[Dict],
    title: str,
    description: Optional[str] = None,
    notes: Optional[str] = None,
    validity_days: int = 30,
    payment_terms: Optional[str] = None,
    date: Optional[str] = None
) -> io.BytesIO:
    """Generate a professional quote PDF"""
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=20*mm
    )
    
    styles = get_styles()
    elements = []
    
    # Header
    elements.extend(create_header(styles, "DEVIS"))
    
    # Document title
    elements.append(Paragraph("DEVIS", styles['DocTitle']))
    elements.append(Paragraph(f"N° {quote_number}", styles['DocNumber']))
    
    # Date
    doc_date = date or datetime.now().strftime("%d/%m/%Y")
    elements.append(Paragraph(f"Date: {doc_date}", styles['YamaBody']))
    elements.append(Paragraph(f"Validité: {validity_days} jours", styles['YamaBody']))
    elements.append(Spacer(1, 10*mm))
    
    # Partner section
    elements.extend(create_partner_section(partner, styles, partner.get('logo_url')))
    
    # Object/Title
    if title:
        elements.append(Paragraph("OBJET", styles['SectionTitle']))
        elements.append(Paragraph(title, styles['YamaBody']))
        if description:
            elements.append(Paragraph(description, styles['Notes']))
        elements.append(Spacer(1, 8*mm))
    
    # Items table
    items_elements, subtotal = create_items_table(items, styles)
    elements.extend(items_elements)
    
    # Totals
    elements.extend(create_totals_section(subtotal, styles))
    
    # Payment terms
    if payment_terms:
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph("CONDITIONS DE PAIEMENT", styles['SectionTitle']))
        elements.append(Paragraph(payment_terms, styles['YamaBody']))
    
    # Notes
    if notes:
        elements.append(Spacer(1, 8*mm))
        elements.append(Paragraph("NOTES", styles['SectionTitle']))
        elements.append(Paragraph(notes, styles['Notes']))
    
    # Footer
    elements.extend(create_footer(styles, quote_number, f"Valide {validity_days} jours"))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer


def generate_invoice_pdf(
    invoice_number: str,
    invoice_type: str,  # "proforma" or "final"
    partner: Dict,
    items: List[Dict],
    title: str,
    description: Optional[str] = None,
    notes: Optional[str] = None,
    due_date: Optional[str] = None,
    payment_terms: Optional[str] = None,
    date: Optional[str] = None,
    status: str = "unpaid",
    amount_paid: float = 0
) -> io.BytesIO:
    """Generate a professional invoice PDF"""
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=20*mm
    )
    
    styles = get_styles()
    elements = []
    
    # Header
    elements.extend(create_header(styles, "FACTURE"))
    
    # Document title
    doc_title = "FACTURE PRO FORMA" if invoice_type == "proforma" else "FACTURE"
    elements.append(Paragraph(doc_title, styles['DocTitle']))
    elements.append(Paragraph(f"N° {invoice_number}", styles['DocNumber']))
    
    # Status badge for paid invoices
    if status == "paid":
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(
            "<font color='green'><b>✓ PAYÉE</b></font>", 
            ParagraphStyle('Paid', alignment=TA_CENTER, fontSize=12)
        ))
    elif status == "partial":
        elements.append(Spacer(1, 3*mm))
        elements.append(Paragraph(
            f"<font color='orange'><b>PARTIELLEMENT PAYÉE ({format_price(amount_paid)})</b></font>", 
            ParagraphStyle('Partial', alignment=TA_CENTER, fontSize=12)
        ))
    
    # Date
    doc_date = date or datetime.now().strftime("%d/%m/%Y")
    elements.append(Paragraph(f"Date: {doc_date}", styles['YamaBody']))
    if due_date:
        elements.append(Paragraph(f"Échéance: {due_date}", styles['YamaBody']))
    elements.append(Spacer(1, 10*mm))
    
    # Partner section
    elements.extend(create_partner_section(partner, styles, partner.get('logo_url')))
    
    # Object/Title
    if title:
        elements.append(Paragraph("OBJET", styles['SectionTitle']))
        elements.append(Paragraph(title, styles['YamaBody']))
        if description:
            elements.append(Paragraph(description, styles['Notes']))
        elements.append(Spacer(1, 8*mm))
    
    # Items table
    items_elements, subtotal = create_items_table(items, styles)
    elements.extend(items_elements)
    
    # Totals
    elements.extend(create_totals_section(subtotal, styles))
    
    # Payment terms
    if payment_terms:
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph("CONDITIONS DE PAIEMENT", styles['SectionTitle']))
        elements.append(Paragraph(payment_terms, styles['YamaBody']))
    
    # Notes
    if notes:
        elements.append(Spacer(1, 8*mm))
        elements.append(Paragraph("NOTES", styles['SectionTitle']))
        elements.append(Paragraph(notes, styles['Notes']))
    
    # Footer
    elements.extend(create_footer(styles, invoice_number))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer


def generate_contract_pdf(
    contract_number: str,
    contract_type: str,
    partner: Dict,
    clauses: List[Dict],
    title: str,
    description: Optional[str] = None,
    start_date: str = None,
    end_date: Optional[str] = None,
    value: Optional[float] = None,
    notes: Optional[str] = None,
    date: Optional[str] = None
) -> io.BytesIO:
    """Generate a professional contract PDF"""
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=20*mm
    )
    
    styles = get_styles()
    elements = []
    
    # Header
    elements.extend(create_header(styles, "CONTRAT"))
    
    # Document title
    elements.append(Paragraph("CONTRAT", styles['DocTitle']))
    elements.append(Paragraph(title.upper(), styles['DocNumber']))
    elements.append(Paragraph(f"Réf: {contract_number}", styles['YamaBody']))
    
    # Date
    doc_date = date or datetime.now().strftime("%d/%m/%Y")
    elements.append(Paragraph(f"Établi le: {doc_date}", styles['YamaBody']))
    elements.append(Spacer(1, 10*mm))
    
    # Parties
    elements.append(Paragraph("ENTRE LES PARTIES", styles['SectionTitle']))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=YAMA_GRAY))
    elements.append(Spacer(1, 5*mm))
    
    # Party 1: GROUPE YAMA PLUS
    elements.append(Paragraph("<b>D'une part:</b>", styles['YamaBody']))
    elements.append(Paragraph(
        f"""<b>{COMPANY_INFO['name']}</b><br/>
        {COMPANY_INFO['address']}<br/>
        NINEA: {COMPANY_INFO['ninea']} | RCCM: {COMPANY_INFO['rccm']}<br/>
        Représenté par son Directeur Général<br/>
        Ci-après dénommé « GROUPE YAMA PLUS »""",
        styles['PartnerInfo']
    ))
    elements.append(Spacer(1, 5*mm))
    
    # Party 2: Partner
    elements.append(Paragraph("<b>D'autre part:</b>", styles['YamaBody']))
    partner_info = f"<b>{partner.get('company_name', partner.get('name', ''))}</b><br/>"
    if partner.get('address'):
        partner_info += f"{partner['address']}<br/>"
    if partner.get('city'):
        partner_info += f"{partner['city']}"
        if partner.get('country'):
            partner_info += f" – {partner['country']}"
        partner_info += "<br/>"
    if partner.get('ninea'):
        partner_info += f"NINEA: {partner['ninea']}<br/>"
    if partner.get('rccm'):
        partner_info += f"RCCM: {partner['rccm']}<br/>"
    
    type_names = {
        "partnership": "Partenaire",
        "sponsoring": "Sponsor",
        "vendor": "Vendeur"
    }
    partner_info += f"Ci-après dénommé « {type_names.get(contract_type, 'Le Cocontractant')} »"
    
    elements.append(Paragraph(partner_info, styles['PartnerInfo']))
    elements.append(Spacer(1, 8*mm))
    
    # Contract period
    elements.append(Paragraph("DURÉE DU CONTRAT", styles['SectionTitle']))
    period_text = f"Date de début: {start_date}"
    if end_date:
        period_text += f"<br/>Date de fin: {end_date}"
    else:
        period_text += "<br/>Durée indéterminée"
    if value:
        period_text += f"<br/>Valeur du contrat: {format_price(value)}"
    elements.append(Paragraph(period_text, styles['YamaBody']))
    elements.append(Spacer(1, 8*mm))
    
    # Description
    if description:
        elements.append(Paragraph("PRÉAMBULE", styles['SectionTitle']))
        elements.append(Paragraph(description, styles['YamaBody']))
        elements.append(Spacer(1, 5*mm))
    
    # Clauses
    elements.append(Paragraph("IL A ÉTÉ CONVENU CE QUI SUIT:", styles['SectionTitle']))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=YAMA_GRAY))
    elements.append(Spacer(1, 5*mm))
    
    for clause in clauses:
        elements.append(Paragraph(clause.get('title', ''), styles['ClauseTitle']))
        content = clause.get('content', '').replace('\n', '<br/>')
        elements.append(Paragraph(content, styles['ClauseContent']))
    
    # Signatures
    elements.append(Spacer(1, 15*mm))
    elements.append(Paragraph("SIGNATURES", styles['SectionTitle']))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=YAMA_GRAY))
    elements.append(Spacer(1, 10*mm))
    
    sig_table = Table([
        [
            Paragraph(f"<b>Pour {COMPANY_INFO['name']}</b><br/><br/><br/><br/>Signature:", styles['YamaBody']),
            Paragraph(f"<b>Pour {partner.get('company_name', partner.get('name', ''))}</b><br/><br/><br/><br/>Signature:", styles['YamaBody'])
        ]
    ], colWidths=[85*mm, 85*mm])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(sig_table)
    
    # Notes
    if notes:
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph(notes, styles['Notes']))
    
    # Footer
    elements.extend(create_footer(styles, contract_number))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer



def generate_partnership_contract_pdf(
    contract_number: str,
    partner: Dict,
    commission_percent: Optional[float] = None,
    payment_frequency: str = "chaque mois",
    payment_method: str = "Wave / Orange Money / Virement bancaire",
    delivery_responsibility: str = "GROUPE YAMA PLUS",
    delivery_fees: str = "inclus dans le prix",
    contract_duration: str = "12 mois",
    date: Optional[str] = None
) -> io.BytesIO:
    """
    Generate a professional Partnership Contract PDF matching the exact format
    of the GROUPE YAMA PLUS partnership agreement template.
    """
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=15*mm,
        bottomMargin=20*mm
    )
    
    styles = get_styles()
    elements = []
    
    # Add specific styles for partnership contract
    styles.add(ParagraphStyle(
        name='ContractTitle',
        fontSize=16,
        textColor=YAMA_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=20,
        spaceBefore=10
    ))
    
    styles.add(ParagraphStyle(
        name='ArticleTitle',
        fontSize=11,
        textColor=YAMA_DARK,
        fontName='Helvetica-Bold',
        spaceBefore=12,
        spaceAfter=6
    ))
    
    styles.add(ParagraphStyle(
        name='ArticleContent',
        fontSize=10,
        textColor=colors.black,
        fontName='Helvetica',
        alignment=TA_JUSTIFY,
        leading=14,
        leftIndent=10
    ))
    
    styles.add(ParagraphStyle(
        name='BulletPoint',
        fontSize=10,
        textColor=colors.black,
        fontName='Helvetica',
        leftIndent=20,
        leading=14
    ))
    
    styles.add(ParagraphStyle(
        name='PartyInfo',
        fontSize=10,
        textColor=colors.black,
        fontName='Helvetica',
        leading=14,
        leftIndent=15
    ))
    
    # ========== HEADER WITH LOGO ==========
    try:
        logo_image = download_image(COMPANY_INFO['logo_url'])
        if logo_image:
            # Use proportional sizing to avoid stretching - square logo
            logo = Image(logo_image, width=35*mm, height=35*mm)
            logo.hAlign = 'CENTER'
            elements.append(logo)
            # Add tagline below logo
            elements.append(Paragraph("<i>Votre partenaire de croissance</i>", ParagraphStyle('Tagline', fontSize=9, textColor=YAMA_GRAY, fontName='Helvetica-Oblique', alignment=TA_CENTER)))
            elements.append(Spacer(1, 5*mm))
    except:
        pass
    
    # ========== TITLE ==========
    elements.append(Paragraph("CONTRAT DE PARTENARIAT COMMERCIAL", styles['ContractTitle']))
    elements.append(Spacer(1, 8*mm))
    
    # ========== PARTIES SECTION ==========
    elements.append(Paragraph("<b>Entre les soussignés :</b>", styles['YamaBody']))
    elements.append(Spacer(1, 5*mm))
    
    # Party 1: GROUPE YAMA PLUS
    elements.append(Paragraph("<b>1. GROUPE YAMA PLUS</b>", styles['ArticleTitle']))
    party1_info = f"""
    <b>Type d'entreprise :</b> Entreprise Individuelle immatriculée au Sénégal<br/>
    <b>Nom commercial :</b> {COMPANY_INFO['name']}<br/>
    <b>Représentée par :</b> Monsieur DIOUF AMADOU BOURY, Gérant<br/>
    <b>NINEA :</b> {COMPANY_INFO['ninea']}<br/>
    <b>RCCM :</b> {COMPANY_INFO['rccm']}<br/>
    <b>Siège :</b> Fass Paillotte, {COMPANY_INFO['address']}<br/>
    <b>Email :</b> {COMPANY_INFO['email']}<br/>
    Ci-après désigné <b>« GROUPE YAMA PLUS »</b>
    """
    elements.append(Paragraph(party1_info, styles['PartyInfo']))
    elements.append(Spacer(1, 5*mm))
    
    # ET
    elements.append(Paragraph("<b>ET</b>", styles['YamaBody']))
    elements.append(Spacer(1, 5*mm))
    
    # Party 2: Partner
    elements.append(Paragraph("<b>2. PARTENAIRE</b>", styles['ArticleTitle']))
    partner_name = partner.get('company_name') or partner.get('name', '_________________')
    partner_ninea = partner.get('ninea', '_________________')
    partner_address = partner.get('address', '_________________')
    partner_city = partner.get('city', '')
    partner_country = partner.get('country', 'Sénégal')
    if partner_city:
        partner_address += f", {partner_city}"
    if partner_country:
        partner_address += f" – {partner_country}"
    partner_phone = partner.get('phone', '_________________')
    partner_email = partner.get('email', '_________________')
    partner_rep = partner.get('representative', '_________________')
    
    party2_info = f"""
    <b>Nom / Entreprise :</b> {partner_name}<br/>
    <b>NINEA (si applicable) :</b> {partner_ninea}<br/>
    <b>Adresse :</b> {partner_address}<br/>
    <b>Téléphone :</b> {partner_phone}<br/>
    <b>Email :</b> {partner_email}<br/>
    <b>Représenté par :</b> {partner_rep}<br/>
    Ci-après désigné <b>« Le Partenaire »</b>
    """
    elements.append(Paragraph(party2_info, styles['PartyInfo']))
    elements.append(Spacer(1, 8*mm))
    
    # ========== ARTICLES ==========
    
    # Article 1: OBJET DU CONTRAT
    elements.append(Paragraph("<b>ARTICLE 1 : OBJET DU CONTRAT</b>", styles['ArticleTitle']))
    elements.append(Paragraph(
        "Le présent contrat a pour objet de définir les conditions de partenariat entre GROUPE YAMA PLUS et Le Partenaire pour la commercialisation et/ou la fourniture de produits et services via la plateforme groupeyamaplus.com et les canaux associés.",
        styles['ArticleContent']
    ))
    
    # Article 2: ENGAGEMENTS DU PARTENAIRE
    elements.append(Paragraph("<b>ARTICLE 2 : ENGAGEMENTS DU PARTENAIRE</b>", styles['ArticleTitle']))
    elements.append(Paragraph("Le Partenaire s'engage à :", styles['ArticleContent']))
    engagements_partenaire = [
        "Fournir des produits/services conformes et de bonne qualité",
        "Respecter les délais annoncés",
        "Garantir l'authenticité des produits (si applicable)",
        "Fournir des informations exactes (prix, stock, disponibilité)",
        "Coopérer avec GROUPE YAMA PLUS en cas de réclamation client"
    ]
    for eng in engagements_partenaire:
        elements.append(Paragraph(f"• {eng}", styles['BulletPoint']))
    
    # Article 3: ENGAGEMENTS DE GROUPE YAMA PLUS
    elements.append(Paragraph("<b>ARTICLE 3 : ENGAGEMENTS DE GROUPE YAMA PLUS</b>", styles['ArticleTitle']))
    elements.append(Paragraph("GROUPE YAMA PLUS s'engage à :", styles['ArticleContent']))
    engagements_yama = [
        "Promouvoir les produits/services du Partenaire sur sa plateforme",
        "Assurer la visibilité marketing selon les campagnes en cours",
        "Faciliter les commandes et la communication avec les clients",
        "Assurer le suivi des paiements selon les conditions définies"
    ]
    for eng in engagements_yama:
        elements.append(Paragraph(f"• {eng}", styles['BulletPoint']))
    
    # Article 4: PRIX ET COMMISSION
    elements.append(Paragraph("<b>ARTICLE 4 : PRIX ET COMMISSION</b>", styles['ArticleTitle']))
    commission_text = f"{commission_percent}" if commission_percent else "_____"
    article4_content = f"""Les prix peuvent être fixés soit par le Partenaire, soit en accord avec GROUPE YAMA PLUS.<br/><br/>
    Une commission de <b>{commission_text} %</b> est appliquée sur chaque vente réalisée via la plateforme.<br/><br/>
    La commission couvre : marketing, visibilité, gestion client, service plateforme."""
    elements.append(Paragraph(article4_content, styles['ArticleContent']))
    
    # Article 5: PAIEMENT AU PARTENAIRE
    elements.append(Paragraph("<b>ARTICLE 5 : PAIEMENT AU PARTENAIRE</b>", styles['ArticleTitle']))
    article5_content = f"""Le paiement du Partenaire se fait :<br/>
    • <b>{payment_frequency}</b> (chaque semaine / chaque 15 jours / chaque mois)<br/>
    • après validation de livraison au client<br/><br/>
    Mode de paiement : <b>{payment_method}</b>."""
    elements.append(Paragraph(article5_content, styles['ArticleContent']))
    
    # Article 6: LIVRAISON
    elements.append(Paragraph("<b>ARTICLE 6 : LIVRAISON</b>", styles['ArticleTitle']))
    article6_content = f"""La livraison peut être assurée par GROUPE YAMA PLUS, par le Partenaire ou par un service externe.<br/><br/>
    Responsable de la livraison : <b>{delivery_responsibility}</b><br/>
    Frais de livraison : <b>{delivery_fees}</b> (inclus dans le prix / à la charge du client / à la charge du Partenaire)."""
    elements.append(Paragraph(article6_content, styles['ArticleContent']))
    
    # Article 7: RETOUR ET GARANTIE
    elements.append(Paragraph("<b>ARTICLE 7 : RETOUR ET GARANTIE</b>", styles['ArticleTitle']))
    elements.append(Paragraph(
        "Le Partenaire accepte la politique de retour de GROUPE YAMA PLUS. Tout produit défectueux ou non conforme devra être remplacé ou remboursé selon les conditions convenues.",
        styles['ArticleContent']
    ))
    
    # Article 8: CONFIDENTIALITÉ
    elements.append(Paragraph("<b>ARTICLE 8 : CONFIDENTIALITÉ</b>", styles['ArticleTitle']))
    elements.append(Paragraph(
        "Les deux parties s'engagent à garder confidentielles toutes les informations commerciales et stratégiques échangées dans le cadre de ce partenariat.",
        styles['ArticleContent']
    ))
    
    # Article 9: DURÉE DU CONTRAT
    elements.append(Paragraph("<b>ARTICLE 9 : DURÉE DU CONTRAT</b>", styles['ArticleTitle']))
    article9_content = f"""Le présent contrat est conclu pour une durée de : <b>{contract_duration}</b> (3 mois / 6 mois / 12 mois), renouvelable automatiquement sauf résiliation."""
    elements.append(Paragraph(article9_content, styles['ArticleContent']))
    
    # Article 10: RÉSILIATION
    elements.append(Paragraph("<b>ARTICLE 10 : RÉSILIATION</b>", styles['ArticleTitle']))
    elements.append(Paragraph(
        "Chaque partie peut résilier le contrat avec un préavis de 15 jours, en cas de non-respect des engagements ou pour toute raison valable.",
        styles['ArticleContent']
    ))
    
    # Article 11: LITIGES
    elements.append(Paragraph("<b>ARTICLE 11 : LITIGES</b>", styles['ArticleTitle']))
    elements.append(Paragraph(
        "En cas de litige, les parties s'engagent à trouver une solution à l'amiable. À défaut, le litige sera soumis aux juridictions compétentes de Dakar (Sénégal).",
        styles['ArticleContent']
    ))
    
    elements.append(Spacer(1, 10*mm))
    
    # ========== DATE AND LOCATION ==========
    doc_date = date or datetime.now().strftime("%d/%m/%Y")
    elements.append(Paragraph(f"<b>Fait à Dakar, le {doc_date}</b>", styles['YamaBody']))
    elements.append(Spacer(1, 15*mm))
    
    # ========== SIGNATURES TABLE ==========
    sig_table = Table([
        [
            Paragraph("<b>Pour GROUPE YAMA PLUS</b>", styles['YamaBody']),
            Paragraph("<b>Pour le Partenaire</b>", styles['YamaBody'])
        ],
        [
            Paragraph("Nom : DIOUF AMADOU BOURY", styles['YamaBody']),
            Paragraph(f"Nom : {partner_rep}", styles['YamaBody'])
        ],
        [
            Paragraph("<br/><br/><br/>Signature :", styles['YamaBody']),
            Paragraph("<br/><br/><br/>Signature :", styles['YamaBody'])
        ]
    ], colWidths=[85*mm, 85*mm])
    
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 2), (0, 2), 0.5, YAMA_GRAY),
        ('LINEBELOW', (1, 2), (1, 2), 0.5, YAMA_GRAY),
    ]))
    elements.append(sig_table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer
