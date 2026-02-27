"""
Commercial Documents API Routes
Handles Partners, Quotes, Invoices, and Contracts
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import secrets
import os
import base64

# PDF Generation
from services.pdf_service import generate_quote_pdf, generate_invoice_pdf, generate_contract_pdf, generate_partnership_contract_pdf

# Email Service
from services.email_service import send_email_async, get_email_template

# Models and templates
from commercial_documents import (
    COMPANY_INFO, CONTRACT_TEMPLATES,
    QuoteStatus, InvoiceStatus, InvoiceType, ContractType, ContractStatus,
    generate_document_number
)

commercial_router = APIRouter(prefix="/api/commercial")

# ============== REQUEST MODELS ==============

class EmailDocumentRequest(BaseModel):
    """Request model for sending document via email"""
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None

class PartnershipContractRequest(BaseModel):
    """Request model for generating partnership contract"""
    partner_id: str
    commission_percent: Optional[float] = None
    payment_frequency: Optional[str] = "chaque mois"
    payment_method: Optional[str] = "Wave / Orange Money / Virement bancaire"
    delivery_responsibility: Optional[str] = "GROUPE YAMA PLUS"
    delivery_fees: Optional[str] = "inclus dans le prix"
    contract_duration: Optional[str] = "12 mois"


class PartnerCreate(BaseModel):
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

class DocumentItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    unit: Optional[str] = "unité"
    discount_percent: Optional[float] = 0

class QuoteCreate(BaseModel):
    partner_id: str
    title: str
    description: Optional[str] = None
    items: List[DocumentItem]
    validity_days: int = 30
    notes: Optional[str] = None
    payment_terms: Optional[str] = "Paiement à réception"

class InvoiceCreate(BaseModel):
    partner_id: str
    invoice_type: str = "final"  # proforma or final
    title: str
    description: Optional[str] = None
    items: List[DocumentItem]
    due_date: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = "Paiement à réception"
    from_quote_id: Optional[str] = None

class ContractCreate(BaseModel):
    partner_id: str
    contract_type: str  # partnership, sponsoring, vendor
    title: str
    description: Optional[str] = None
    clauses: List[dict]
    start_date: str
    end_date: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None


def get_commercial_routes(db, require_admin):
    """Create commercial routes with database access"""
    
    # ============== PARTNERS ==============
    
    @commercial_router.get("/partners")
    async def get_partners(
        search: Optional[str] = None,
        limit: int = 100,
        user = Depends(require_admin)
    ):
        """Get all partners"""
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"company_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        partners = await db.partners.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        total = await db.partners.count_documents(query)
        
        return {"partners": partners, "total": total}
    
    @commercial_router.get("/partners/{partner_id}")
    async def get_partner(partner_id: str, user = Depends(require_admin)):
        """Get a single partner"""
        partner = await db.partners.find_one({"partner_id": partner_id}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        return partner
    
    @commercial_router.post("/partners")
    async def create_partner(data: PartnerCreate, user = Depends(require_admin)):
        """Create a new partner"""
        partner_id = f"PART-{secrets.token_hex(4).upper()}"
        
        partner = {
            "partner_id": partner_id,
            **data.dict(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None
        }
        
        await db.partners.insert_one(partner)
        
        return {"success": True, "partner_id": partner_id, "message": "Partenaire créé"}
    
    @commercial_router.put("/partners/{partner_id}")
    async def update_partner(partner_id: str, data: dict, user = Depends(require_admin)):
        """Update a partner"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Remove protected fields
        data.pop("partner_id", None)
        data.pop("created_at", None)
        data.pop("_id", None)
        
        result = await db.partners.update_one(
            {"partner_id": partner_id},
            {"$set": data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        return {"success": True, "message": "Partenaire mis à jour"}
    
    @commercial_router.delete("/partners/{partner_id}")
    async def delete_partner(partner_id: str, user = Depends(require_admin)):
        """Delete a partner"""
        # Check if partner has documents
        quote_count = await db.quotes.count_documents({"partner_id": partner_id})
        invoice_count = await db.invoices.count_documents({"partner_id": partner_id})
        contract_count = await db.contracts.count_documents({"partner_id": partner_id})
        
        if quote_count + invoice_count + contract_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Ce partenaire a {quote_count} devis, {invoice_count} factures et {contract_count} contrats. Archivez-le plutôt que de le supprimer."
            )
        
        result = await db.partners.delete_one({"partner_id": partner_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        return {"success": True, "message": "Partenaire supprimé"}
    
    # ============== QUOTES (DEVIS) ==============
    
    async def get_next_quote_number():
        """Get next quote number for current year"""
        year = datetime.now().year
        last = await db.quotes.find_one(
            {"quote_number": {"$regex": f"^YMP-DEV-{year}"}},
            sort=[("quote_number", -1)]
        )
        
        if last:
            seq = int(last["quote_number"].split("-")[-1]) + 1
        else:
            seq = 1
        
        return generate_document_number("quote", year, seq)
    
    @commercial_router.get("/quotes")
    async def get_quotes(
        status: Optional[str] = None,
        partner_id: Optional[str] = None,
        limit: int = 100,
        user = Depends(require_admin)
    ):
        """Get all quotes"""
        query = {}
        if status:
            query["status"] = status
        if partner_id:
            query["partner_id"] = partner_id
        
        quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Enrich with partner info
        for quote in quotes:
            partner = await db.partners.find_one({"partner_id": quote["partner_id"]}, {"_id": 0, "name": 1, "company_name": 1})
            quote["partner_name"] = partner.get("company_name") or partner.get("name", "N/A") if partner else "N/A"
        
        stats = {
            "total": await db.quotes.count_documents({}),
            "pending": await db.quotes.count_documents({"status": "pending"}),
            "accepted": await db.quotes.count_documents({"status": "accepted"}),
            "refused": await db.quotes.count_documents({"status": "refused"})
        }
        
        return {"quotes": quotes, "stats": stats}
    
    @commercial_router.get("/quotes/{quote_id}")
    async def get_quote(quote_id: str, user = Depends(require_admin)):
        """Get a single quote with partner info"""
        quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Devis non trouvé")
        
        partner = await db.partners.find_one({"partner_id": quote["partner_id"]}, {"_id": 0})
        quote["partner"] = partner
        
        return quote
    
    @commercial_router.post("/quotes")
    async def create_quote(data: QuoteCreate, user = Depends(require_admin)):
        """Create a new quote"""
        # Verify partner exists
        partner = await db.partners.find_one({"partner_id": data.partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        quote_id = f"DEV-{secrets.token_hex(4).upper()}"
        quote_number = await get_next_quote_number()
        
        # Calculate totals
        items_data = [item.dict() for item in data.items]
        subtotal = sum(
            item["quantity"] * item["unit_price"] * (1 - item.get("discount_percent", 0) / 100)
            for item in items_data
        )
        
        quote = {
            "quote_id": quote_id,
            "quote_number": quote_number,
            "partner_id": data.partner_id,
            "title": data.title,
            "description": data.description,
            "items": items_data,
            "validity_days": data.validity_days,
            "notes": data.notes,
            "payment_terms": data.payment_terms,
            "subtotal": subtotal,
            "total": subtotal,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "accepted_at": None,
            "refused_at": None,
            "converted_to_invoice_id": None,
            "pdf_url": None
        }
        
        await db.quotes.insert_one(quote)
        
        return {
            "success": True, 
            "quote_id": quote_id, 
            "quote_number": quote_number,
            "message": "Devis créé avec succès"
        }
    
    @commercial_router.put("/quotes/{quote_id}")
    async def update_quote(quote_id: str, data: dict, user = Depends(require_admin)):
        """Update a quote"""
        quote = await db.quotes.find_one({"quote_id": quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Devis non trouvé")
        
        # Handle status changes
        if "status" in data:
            if data["status"] == "accepted" and quote["status"] != "accepted":
                data["accepted_at"] = datetime.now(timezone.utc).isoformat()
            elif data["status"] == "refused" and quote["status"] != "refused":
                data["refused_at"] = datetime.now(timezone.utc).isoformat()
        
        # Recalculate totals if items changed
        if "items" in data:
            subtotal = sum(
                item["quantity"] * item["unit_price"] * (1 - item.get("discount_percent", 0) / 100)
                for item in data["items"]
            )
            data["subtotal"] = subtotal
            data["total"] = subtotal
        
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Remove protected fields
        for field in ["quote_id", "quote_number", "created_at", "_id"]:
            data.pop(field, None)
        
        await db.quotes.update_one({"quote_id": quote_id}, {"$set": data})
        
        return {"success": True, "message": "Devis mis à jour"}
    
    @commercial_router.post("/quotes/{quote_id}/convert-to-invoice")
    async def convert_quote_to_invoice(quote_id: str, user = Depends(require_admin)):
        """Convert an accepted quote to an invoice"""
        quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Devis non trouvé")
        
        if quote.get("converted_to_invoice_id"):
            raise HTTPException(status_code=400, detail="Ce devis a déjà été converti en facture")
        
        # Create invoice from quote
        invoice_data = InvoiceCreate(
            partner_id=quote["partner_id"],
            invoice_type="final",
            title=quote["title"],
            description=quote.get("description"),
            items=[DocumentItem(**item) for item in quote["items"]],
            notes=quote.get("notes"),
            payment_terms=quote.get("payment_terms"),
            from_quote_id=quote_id
        )
        
        # Use the create invoice logic
        invoice_id, invoice_number = await _create_invoice_internal(db, invoice_data)
        
        # Update quote
        await db.quotes.update_one(
            {"quote_id": quote_id},
            {
                "$set": {
                    "converted_to_invoice_id": invoice_id,
                    "status": "accepted",
                    "accepted_at": quote.get("accepted_at") or datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "message": "Facture créée à partir du devis"
        }
    
    @commercial_router.get("/quotes/{quote_id}/pdf")
    async def get_quote_pdf(quote_id: str, user = Depends(require_admin)):
        """Generate and return quote PDF"""
        quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Devis non trouvé")
        
        partner = await db.partners.find_one({"partner_id": quote["partner_id"]}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        pdf_buffer = generate_quote_pdf(
            quote_number=quote["quote_number"],
            partner=partner,
            items=quote["items"],
            title=quote["title"],
            description=quote.get("description"),
            notes=quote.get("notes"),
            validity_days=quote.get("validity_days", 30),
            payment_terms=quote.get("payment_terms")
        )
        
        filename = f"Devis_{quote['quote_number']}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    @commercial_router.post("/quotes/{quote_id}/send-email")
    async def send_quote_email(quote_id: str, data: EmailDocumentRequest, user = Depends(require_admin)):
        """Send quote PDF via email to partner"""
        quote = await db.quotes.find_one({"quote_id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Devis non trouvé")
        
        partner = await db.partners.find_one({"partner_id": quote["partner_id"]}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        # Generate PDF
        pdf_buffer = generate_quote_pdf(
            quote_number=quote["quote_number"],
            partner=partner,
            items=quote["items"],
            title=quote["title"],
            description=quote.get("description"),
            notes=quote.get("notes"),
            validity_days=quote.get("validity_days", 30),
            payment_terms=quote.get("payment_terms")
        )
        
        # Prepare email content
        recipient_email = data.recipient_email or partner.get("email")
        if not recipient_email:
            raise HTTPException(status_code=400, detail="Aucune adresse email disponible pour ce partenaire")
        
        recipient_name = data.recipient_name or partner.get("name", "")
        subject = data.subject or f"Devis {quote['quote_number']} - GROUPE YAMA+"
        
        custom_message = data.message or ""
        email_content = f"""
        <h2 style="color: #333; margin-bottom: 16px;">Votre Devis</h2>
        <p style="color: #666; margin-bottom: 24px;">
            Bonjour {recipient_name},
        </p>
        <p style="color: #666; margin-bottom: 16px;">
            Veuillez trouver ci-joint votre devis <strong>{quote['quote_number']}</strong> 
            d'un montant de <strong>{quote.get('total', 0):,.0f} FCFA</strong>.
        </p>
        {f'<p style="color: #666; margin-bottom: 16px;">{custom_message}</p>' if custom_message else ''}
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #333;"><strong>Référence:</strong> {quote['quote_number']}</p>
            <p style="margin: 8px 0 0 0; color: #333;"><strong>Montant:</strong> {quote.get('total', 0):,.0f} FCFA</p>
            <p style="margin: 8px 0 0 0; color: #333;"><strong>Validité:</strong> {quote.get('validity_days', 30)} jours</p>
        </div>
        <p style="color: #666;">
            N'hésitez pas à nous contacter pour toute question.
        </p>
        """
        
        html_content = get_email_template(email_content, f"Devis {quote['quote_number']}")
        
        # Prepare attachment
        pdf_content = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
        attachments = [{
            "content": pdf_content,
            "filename": f"Devis_{quote['quote_number']}.pdf"
        }]
        
        # Send email
        result = await send_email_async(recipient_email, subject, html_content, attachments)
        
        if result.get("success"):
            # Log the email send
            await db.quotes.update_one(
                {"quote_id": quote_id},
                {"$set": {"last_email_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "message": f"Devis envoyé à {recipient_email}"}
        else:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi: {result.get('error', 'Unknown error')}")
    
    # ============== INVOICES (FACTURES) ==============
    
    async def get_next_invoice_number(invoice_type: str):
        """Get next invoice number for current year"""
        year = datetime.now().year
        prefix = "PRO" if invoice_type == "proforma" else "FAC"
        doc_type = "proforma" if invoice_type == "proforma" else "invoice"
        
        last = await db.invoices.find_one(
            {"invoice_number": {"$regex": f"^YMP-{prefix}-{year}"}},
            sort=[("invoice_number", -1)]
        )
        
        if last:
            seq = int(last["invoice_number"].split("-")[-1]) + 1
        else:
            seq = 1
        
        return generate_document_number(doc_type, year, seq)
    
    async def _create_invoice_internal(db, data: InvoiceCreate):
        """Internal function to create invoice"""
        invoice_id = f"INV-{secrets.token_hex(4).upper()}"
        invoice_number = await get_next_invoice_number(data.invoice_type)
        
        items_data = [item.dict() for item in data.items]
        subtotal = sum(
            item["quantity"] * item["unit_price"] * (1 - item.get("discount_percent", 0) / 100)
            for item in items_data
        )
        
        invoice = {
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "partner_id": data.partner_id,
            "invoice_type": data.invoice_type,
            "title": data.title,
            "description": data.description,
            "items": items_data,
            "due_date": data.due_date,
            "notes": data.notes,
            "payment_terms": data.payment_terms,
            "from_quote_id": data.from_quote_id,
            "subtotal": subtotal,
            "total": subtotal,
            "amount_paid": 0,
            "status": "unpaid",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "paid_at": None,
            "pdf_url": None
        }
        
        await db.invoices.insert_one(invoice)
        
        return invoice_id, invoice_number
    
    @commercial_router.get("/invoices")
    async def get_invoices(
        status: Optional[str] = None,
        invoice_type: Optional[str] = None,
        partner_id: Optional[str] = None,
        limit: int = 100,
        user = Depends(require_admin)
    ):
        """Get all invoices"""
        query = {}
        if status:
            query["status"] = status
        if invoice_type:
            query["invoice_type"] = invoice_type
        if partner_id:
            query["partner_id"] = partner_id
        
        invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Enrich with partner info
        for invoice in invoices:
            partner = await db.partners.find_one({"partner_id": invoice["partner_id"]}, {"_id": 0, "name": 1, "company_name": 1})
            invoice["partner_name"] = partner.get("company_name") or partner.get("name", "N/A") if partner else "N/A"
        
        stats = {
            "total": await db.invoices.count_documents({}),
            "unpaid": await db.invoices.count_documents({"status": "unpaid"}),
            "paid": await db.invoices.count_documents({"status": "paid"}),
            "partial": await db.invoices.count_documents({"status": "partial"}),
            "proforma": await db.invoices.count_documents({"invoice_type": "proforma"}),
            "final": await db.invoices.count_documents({"invoice_type": "final"})
        }
        
        # Calculate totals
        all_invoices = await db.invoices.find({}, {"total": 1, "amount_paid": 1, "status": 1}).to_list(1000)
        stats["total_amount"] = sum(inv.get("total", 0) for inv in all_invoices)
        stats["total_paid"] = sum(inv.get("amount_paid", 0) for inv in all_invoices)
        stats["total_pending"] = stats["total_amount"] - stats["total_paid"]
        
        return {"invoices": invoices, "stats": stats}
    
    @commercial_router.get("/invoices/{invoice_id}")
    async def get_invoice(invoice_id: str, user = Depends(require_admin)):
        """Get a single invoice with partner info"""
        invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        partner = await db.partners.find_one({"partner_id": invoice["partner_id"]}, {"_id": 0})
        invoice["partner"] = partner
        
        return invoice
    
    @commercial_router.post("/invoices")
    async def create_invoice(data: InvoiceCreate, user = Depends(require_admin)):
        """Create a new invoice"""
        # Verify partner exists
        partner = await db.partners.find_one({"partner_id": data.partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        invoice_id, invoice_number = await _create_invoice_internal(db, data)
        
        type_label = "Facture pro forma" if data.invoice_type == "proforma" else "Facture"
        
        return {
            "success": True,
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "message": f"{type_label} créée avec succès"
        }
    
    @commercial_router.put("/invoices/{invoice_id}")
    async def update_invoice(invoice_id: str, data: dict, user = Depends(require_admin)):
        """Update an invoice"""
        invoice = await db.invoices.find_one({"invoice_id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        # Handle payment recording
        if "amount_paid" in data:
            total = invoice.get("total", 0)
            amount_paid = data["amount_paid"]
            
            if amount_paid >= total:
                data["status"] = "paid"
                data["paid_at"] = datetime.now(timezone.utc).isoformat()
            elif amount_paid > 0:
                data["status"] = "partial"
            else:
                data["status"] = "unpaid"
                data["paid_at"] = None
        
        # Recalculate totals if items changed
        if "items" in data:
            subtotal = sum(
                item["quantity"] * item["unit_price"] * (1 - item.get("discount_percent", 0) / 100)
                for item in data["items"]
            )
            data["subtotal"] = subtotal
            data["total"] = subtotal
        
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Remove protected fields
        for field in ["invoice_id", "invoice_number", "created_at", "_id"]:
            data.pop(field, None)
        
        await db.invoices.update_one({"invoice_id": invoice_id}, {"$set": data})
        
        return {"success": True, "message": "Facture mise à jour"}
    
    @commercial_router.get("/invoices/{invoice_id}/pdf")
    async def get_invoice_pdf(invoice_id: str, user = Depends(require_admin)):
        """Generate and return invoice PDF"""
        invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        partner = await db.partners.find_one({"partner_id": invoice["partner_id"]}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        pdf_buffer = generate_invoice_pdf(
            invoice_number=invoice["invoice_number"],
            invoice_type=invoice["invoice_type"],
            partner=partner,
            items=invoice["items"],
            title=invoice["title"],
            description=invoice.get("description"),
            notes=invoice.get("notes"),
            due_date=invoice.get("due_date"),
            payment_terms=invoice.get("payment_terms"),
            status=invoice.get("status", "unpaid"),
            amount_paid=invoice.get("amount_paid", 0)
        )
        
        type_label = "ProForma" if invoice["invoice_type"] == "proforma" else "Facture"
        filename = f"{type_label}_{invoice['invoice_number']}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    @commercial_router.post("/invoices/{invoice_id}/send-email")
    async def send_invoice_email(invoice_id: str, data: EmailDocumentRequest, user = Depends(require_admin)):
        """Send invoice PDF via email to partner"""
        invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
        if not invoice:
            raise HTTPException(status_code=404, detail="Facture non trouvée")
        
        partner = await db.partners.find_one({"partner_id": invoice["partner_id"]}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        # Generate PDF
        pdf_buffer = generate_invoice_pdf(
            invoice_number=invoice["invoice_number"],
            invoice_type=invoice["invoice_type"],
            partner=partner,
            items=invoice["items"],
            title=invoice["title"],
            description=invoice.get("description"),
            notes=invoice.get("notes"),
            due_date=invoice.get("due_date"),
            payment_terms=invoice.get("payment_terms"),
            status=invoice.get("status", "unpaid"),
            amount_paid=invoice.get("amount_paid", 0)
        )
        
        # Prepare email content
        recipient_email = data.recipient_email or partner.get("email")
        if not recipient_email:
            raise HTTPException(status_code=400, detail="Aucune adresse email disponible pour ce partenaire")
        
        recipient_name = data.recipient_name or partner.get("name", "")
        type_label = "Facture pro forma" if invoice["invoice_type"] == "proforma" else "Facture"
        subject = data.subject or f"{type_label} {invoice['invoice_number']} - GROUPE YAMA+"
        
        custom_message = data.message or ""
        due_date_text = f"<p style='margin: 8px 0 0 0; color: #333;'><strong>Échéance:</strong> {invoice.get('due_date', 'À réception')}</p>" if invoice.get('due_date') else ""
        
        email_content = f"""
        <h2 style="color: #333; margin-bottom: 16px;">Votre {type_label}</h2>
        <p style="color: #666; margin-bottom: 24px;">
            Bonjour {recipient_name},
        </p>
        <p style="color: #666; margin-bottom: 16px;">
            Veuillez trouver ci-joint votre {type_label.lower()} <strong>{invoice['invoice_number']}</strong> 
            d'un montant de <strong>{invoice.get('total', 0):,.0f} FCFA</strong>.
        </p>
        {f'<p style="color: #666; margin-bottom: 16px;">{custom_message}</p>' if custom_message else ''}
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #333;"><strong>Référence:</strong> {invoice['invoice_number']}</p>
            <p style="margin: 8px 0 0 0; color: #333;"><strong>Montant:</strong> {invoice.get('total', 0):,.0f} FCFA</p>
            {due_date_text}
        </div>
        <p style="color: #666;">
            Pour toute question concernant cette {type_label.lower()}, n'hésitez pas à nous contacter.
        </p>
        """
        
        html_content = get_email_template(email_content, f"{type_label} {invoice['invoice_number']}")
        
        # Prepare attachment
        pdf_content = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
        file_label = "ProForma" if invoice["invoice_type"] == "proforma" else "Facture"
        attachments = [{
            "content": pdf_content,
            "filename": f"{file_label}_{invoice['invoice_number']}.pdf"
        }]
        
        # Send email
        result = await send_email_async(recipient_email, subject, html_content, attachments)
        
        if result.get("success"):
            await db.invoices.update_one(
                {"invoice_id": invoice_id},
                {"$set": {"last_email_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "message": f"{type_label} envoyée à {recipient_email}"}
        else:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi: {result.get('error', 'Unknown error')}")
    
    # ============== CONTRACTS (CONTRATS) ==============
    
    async def get_next_contract_number():
        """Get next contract number for current year"""
        year = datetime.now().year
        last = await db.contracts.find_one(
            {"contract_number": {"$regex": f"^YMP-CTR-{year}"}},
            sort=[("contract_number", -1)]
        )
        
        if last:
            seq = int(last["contract_number"].split("-")[-1]) + 1
        else:
            seq = 1
        
        return generate_document_number("contract", year, seq)
    
    @commercial_router.get("/contracts")
    async def get_contracts(
        status: Optional[str] = None,
        contract_type: Optional[str] = None,
        partner_id: Optional[str] = None,
        limit: int = 100,
        user = Depends(require_admin)
    ):
        """Get all contracts"""
        query = {}
        if status:
            query["status"] = status
        if contract_type:
            query["contract_type"] = contract_type
        if partner_id:
            query["partner_id"] = partner_id
        
        contracts = await db.contracts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Enrich with partner info
        for contract in contracts:
            partner = await db.partners.find_one({"partner_id": contract["partner_id"]}, {"_id": 0, "name": 1, "company_name": 1})
            contract["partner_name"] = partner.get("company_name") or partner.get("name", "N/A") if partner else "N/A"
        
        stats = {
            "total": await db.contracts.count_documents({}),
            "draft": await db.contracts.count_documents({"status": "draft"}),
            "active": await db.contracts.count_documents({"status": "active"}),
            "signed": await db.contracts.count_documents({"status": "signed"}),
            "expired": await db.contracts.count_documents({"status": "expired"})
        }
        
        return {"contracts": contracts, "stats": stats}
    
    @commercial_router.get("/contracts/templates")
    async def get_contract_templates(user = Depends(require_admin)):
        """Get contract templates"""
        return CONTRACT_TEMPLATES
    
    @commercial_router.get("/contracts/{contract_id}")
    async def get_contract(contract_id: str, user = Depends(require_admin)):
        """Get a single contract with partner info"""
        contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
        if not contract:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        partner = await db.partners.find_one({"partner_id": contract["partner_id"]}, {"_id": 0})
        contract["partner"] = partner
        
        return contract
    
    @commercial_router.post("/contracts")
    async def create_contract(data: ContractCreate, user = Depends(require_admin)):
        """Create a new contract"""
        # Verify partner exists
        partner = await db.partners.find_one({"partner_id": data.partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        contract_id = f"CTR-{secrets.token_hex(4).upper()}"
        contract_number = await get_next_contract_number()
        
        contract = {
            "contract_id": contract_id,
            "contract_number": contract_number,
            "partner_id": data.partner_id,
            "contract_type": data.contract_type,
            "title": data.title,
            "description": data.description,
            "clauses": data.clauses,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "value": data.value,
            "notes": data.notes,
            "status": "draft",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": None,
            "signed_at": None,
            "pdf_url": None
        }
        
        await db.contracts.insert_one(contract)
        
        type_labels = {
            "partnership": "Contrat de partenariat",
            "sponsoring": "Contrat de sponsoring",
            "vendor": "Contrat vendeur"
        }
        
        return {
            "success": True,
            "contract_id": contract_id,
            "contract_number": contract_number,
            "message": f"{type_labels.get(data.contract_type, 'Contrat')} créé avec succès"
        }
    
    @commercial_router.put("/contracts/{contract_id}")
    async def update_contract(contract_id: str, data: dict, user = Depends(require_admin)):
        """Update a contract"""
        contract = await db.contracts.find_one({"contract_id": contract_id})
        if not contract:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        # Handle status changes
        if "status" in data:
            if data["status"] == "signed" and contract["status"] != "signed":
                data["signed_at"] = datetime.now(timezone.utc).isoformat()
        
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Remove protected fields
        for field in ["contract_id", "contract_number", "created_at", "_id"]:
            data.pop(field, None)
        
        await db.contracts.update_one({"contract_id": contract_id}, {"$set": data})
        
        return {"success": True, "message": "Contrat mis à jour"}
    
    @commercial_router.get("/contracts/{contract_id}/pdf")
    async def get_contract_pdf(contract_id: str, user = Depends(require_admin)):
        """Generate and return contract PDF"""
        contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
        if not contract:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        partner = await db.partners.find_one({"partner_id": contract["partner_id"]}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        pdf_buffer = generate_contract_pdf(
            contract_number=contract["contract_number"],
            contract_type=contract["contract_type"],
            partner=partner,
            clauses=contract["clauses"],
            title=contract["title"],
            description=contract.get("description"),
            start_date=contract.get("start_date"),
            end_date=contract.get("end_date"),
            value=contract.get("value"),
            notes=contract.get("notes")
        )
        
        filename = f"Contrat_{contract['contract_number']}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    @commercial_router.post("/contracts/{contract_id}/send-email")
    async def send_contract_email(contract_id: str, data: EmailDocumentRequest, user = Depends(require_admin)):
        """Send contract PDF via email to partner"""
        contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
        if not contract:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        partner = await db.partners.find_one({"partner_id": contract["partner_id"]}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        # Generate PDF
        pdf_buffer = generate_contract_pdf(
            contract_number=contract["contract_number"],
            contract_type=contract["contract_type"],
            partner=partner,
            clauses=contract["clauses"],
            title=contract["title"],
            description=contract.get("description"),
            start_date=contract.get("start_date"),
            end_date=contract.get("end_date"),
            value=contract.get("value"),
            notes=contract.get("notes")
        )
        
        # Prepare email content
        recipient_email = data.recipient_email or partner.get("email")
        if not recipient_email:
            raise HTTPException(status_code=400, detail="Aucune adresse email disponible pour ce partenaire")
        
        recipient_name = data.recipient_name or partner.get("name", "")
        
        type_labels = {
            "partnership": "Contrat de partenariat",
            "sponsoring": "Contrat de sponsoring",
            "vendor": "Contrat vendeur"
        }
        type_label = type_labels.get(contract["contract_type"], "Contrat")
        subject = data.subject or f"{type_label} {contract['contract_number']} - GROUPE YAMA+"
        
        custom_message = data.message or ""
        value_text = f"<p style='margin: 8px 0 0 0; color: #333;'><strong>Valeur:</strong> {contract.get('value', 0):,.0f} FCFA</p>" if contract.get('value') else ""
        end_date_text = f" au {contract.get('end_date')}" if contract.get('end_date') else ""
        
        email_content = f"""
        <h2 style="color: #333; margin-bottom: 16px;">Votre {type_label}</h2>
        <p style="color: #666; margin-bottom: 24px;">
            Bonjour {recipient_name},
        </p>
        <p style="color: #666; margin-bottom: 16px;">
            Veuillez trouver ci-joint votre {type_label.lower()} <strong>{contract['contract_number']}</strong>.
        </p>
        {f'<p style="color: #666; margin-bottom: 16px;">{custom_message}</p>' if custom_message else ''}
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #333;"><strong>Référence:</strong> {contract['contract_number']}</p>
            <p style="margin: 8px 0 0 0; color: #333;"><strong>Période:</strong> Du {contract.get('start_date', 'N/A')}{end_date_text}</p>
            {value_text}
        </div>
        <p style="color: #666;">
            Merci de nous retourner le contrat signé à votre convenance.
        </p>
        """
        
        html_content = get_email_template(email_content, f"{type_label} {contract['contract_number']}")
        
        # Prepare attachment
        pdf_content = base64.b64encode(pdf_buffer.getvalue()).decode('utf-8')
        attachments = [{
            "content": pdf_content,
            "filename": f"Contrat_{contract['contract_number']}.pdf"
        }]
        
        # Send email
        result = await send_email_async(recipient_email, subject, html_content, attachments)
        
        if result.get("success"):
            await db.contracts.update_one(
                {"contract_id": contract_id},
                {"$set": {"last_email_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "message": f"{type_label} envoyé à {recipient_email}"}
        else:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi: {result.get('error', 'Unknown error')}")
    
    # ============== DASHBOARD STATS ==============
    
    # ============== CONTRACT SIGNATURES ==============
    
    class SignatureRequest(BaseModel):
        signature_data: str  # Base64 encoded signature image
        signer_name: str
        signer_role: str = "partner"  # "partner" or "company"
    
    @commercial_router.post("/contracts/{contract_id}/sign")
    async def sign_contract(contract_id: str, data: SignatureRequest, user = Depends(require_admin)):
        """Add a digital signature to a contract"""
        contract = await db.contracts.find_one({"contract_id": contract_id})
        if not contract:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        # Get existing signatures or create new list
        signatures = contract.get("signatures", [])
        
        # Add new signature
        new_signature = {
            "signature_id": f"SIG-{secrets.token_hex(4).upper()}",
            "signature_data": data.signature_data,
            "signer_name": data.signer_name,
            "signer_role": data.signer_role,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": None,  # Could be captured from request if needed
        }
        signatures.append(new_signature)
        
        # Check if both parties have signed
        partner_signed = any(s["signer_role"] == "partner" for s in signatures)
        company_signed = any(s["signer_role"] == "company" for s in signatures)
        
        # Update contract status if both signed
        new_status = contract.get("status")
        if partner_signed and company_signed:
            new_status = "signed"
        elif partner_signed or company_signed:
            new_status = "pending_signature"
        
        await db.contracts.update_one(
            {"contract_id": contract_id},
            {"$set": {
                "signatures": signatures,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": f"Signature de {data.signer_name} ajoutée",
            "signature_id": new_signature["signature_id"],
            "contract_status": new_status,
            "partner_signed": partner_signed,
            "company_signed": company_signed
        }
    
    @commercial_router.get("/contracts/{contract_id}/signatures")
    async def get_contract_signatures(contract_id: str, user = Depends(require_admin)):
        """Get all signatures for a contract"""
        contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0, "signatures": 1, "status": 1})
        if not contract:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        signatures = contract.get("signatures", [])
        partner_signed = any(s["signer_role"] == "partner" for s in signatures)
        company_signed = any(s["signer_role"] == "company" for s in signatures)
        
        return {
            "signatures": signatures,
            "status": contract.get("status"),
            "partner_signed": partner_signed,
            "company_signed": company_signed,
            "fully_signed": partner_signed and company_signed
        }
    
    @commercial_router.delete("/contracts/{contract_id}/signatures/{signature_id}")
    async def delete_signature(contract_id: str, signature_id: str, user = Depends(require_admin)):
        """Remove a signature from a contract"""
        contract = await db.contracts.find_one({"contract_id": contract_id})
        if not contract:
            raise HTTPException(status_code=404, detail="Contrat non trouvé")
        
        signatures = contract.get("signatures", [])
        original_count = len(signatures)
        signatures = [s for s in signatures if s.get("signature_id") != signature_id]
        
        if len(signatures) == original_count:
            raise HTTPException(status_code=404, detail="Signature non trouvée")
        
        # Update status
        partner_signed = any(s["signer_role"] == "partner" for s in signatures)
        company_signed = any(s["signer_role"] == "company" for s in signatures)
        
        if not signatures:
            new_status = "active"
        elif partner_signed and company_signed:
            new_status = "signed"
        else:
            new_status = "pending_signature"
        
        await db.contracts.update_one(
            {"contract_id": contract_id},
            {"$set": {
                "signatures": signatures,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"success": True, "message": "Signature supprimée"}
    
    # ============== DASHBOARD STATS ENDPOINT ==============
    
    @commercial_router.get("/dashboard")
    async def get_commercial_dashboard(user = Depends(require_admin)):
        """Get commercial dashboard statistics"""
        
        # Quotes stats
        quotes_stats = {
            "total": await db.quotes.count_documents({}),
            "pending": await db.quotes.count_documents({"status": "pending"}),
            "accepted": await db.quotes.count_documents({"status": "accepted"}),
            "refused": await db.quotes.count_documents({"status": "refused"})
        }
        
        # Invoices stats
        invoices = await db.invoices.find({}, {"total": 1, "amount_paid": 1, "status": 1, "invoice_type": 1}).to_list(1000)
        invoices_stats = {
            "total": len(invoices),
            "unpaid": sum(1 for i in invoices if i.get("status") == "unpaid"),
            "paid": sum(1 for i in invoices if i.get("status") == "paid"),
            "partial": sum(1 for i in invoices if i.get("status") == "partial"),
            "total_amount": sum(i.get("total", 0) for i in invoices),
            "total_paid": sum(i.get("amount_paid", 0) for i in invoices),
            "total_pending": sum(i.get("total", 0) - i.get("amount_paid", 0) for i in invoices if i.get("status") != "paid")
        }
        
        # Contracts stats
        contracts_stats = {
            "total": await db.contracts.count_documents({}),
            "draft": await db.contracts.count_documents({"status": "draft"}),
            "active": await db.contracts.count_documents({"status": "active"}),
            "signed": await db.contracts.count_documents({"status": "signed"}),
            "expired": await db.contracts.count_documents({"status": "expired"})
        }
        
        # Partners stats
        partners_stats = {
            "total": await db.partners.count_documents({})
        }
        
        # Recent activity
        recent_quotes = await db.quotes.find({}, {"_id": 0, "quote_id": 1, "quote_number": 1, "title": 1, "total": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(5).to_list(5)
        recent_invoices = await db.invoices.find({}, {"_id": 0, "invoice_id": 1, "invoice_number": 1, "title": 1, "total": 1, "status": 1, "created_at": 1}).sort("created_at", -1).limit(5).to_list(5)
        
        return {
            "quotes": quotes_stats,
            "invoices": invoices_stats,
            "contracts": contracts_stats,
            "partners": partners_stats,
            "recent_quotes": recent_quotes,
            "recent_invoices": recent_invoices
        }
    
    # ============== PARTNERSHIP CONTRACT (Special Template) ==============
    
    @commercial_router.post("/partnership-contract/generate")
    async def generate_partnership_contract(data: PartnershipContractRequest, user = Depends(require_admin)):
        """Generate a partnership contract PDF using the official GROUPE YAMA PLUS template"""
        
        # Get partner info
        partner = await db.partners.find_one({"partner_id": data.partner_id}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        # Generate contract number
        contract_number = await get_next_contract_number()
        
        # Generate PDF
        pdf_buffer = generate_partnership_contract_pdf(
            contract_number=contract_number,
            partner=partner,
            commission_percent=data.commission_percent,
            payment_frequency=data.payment_frequency,
            payment_method=data.payment_method,
            delivery_responsibility=data.delivery_responsibility,
            delivery_fees=data.delivery_fees,
            contract_duration=data.contract_duration
        )
        
        filename = f"Contrat_Partenariat_{contract_number}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    @commercial_router.post("/partnership-contract/preview")
    async def preview_partnership_contract(data: PartnershipContractRequest, user = Depends(require_admin)):
        """Preview a partnership contract PDF without saving to database"""
        
        # Get partner info
        partner = await db.partners.find_one({"partner_id": data.partner_id}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        # Use a preview number
        preview_number = f"PREVIEW-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Generate PDF
        pdf_buffer = generate_partnership_contract_pdf(
            contract_number=preview_number,
            partner=partner,
            commission_percent=data.commission_percent,
            payment_frequency=data.payment_frequency,
            payment_method=data.payment_method,
            delivery_responsibility=data.delivery_responsibility,
            delivery_fees=data.delivery_fees,
            contract_duration=data.contract_duration
        )
        
        filename = f"Apercu_Contrat_Partenariat.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={filename}"}
        )
    
    @commercial_router.post("/partnership-contract/create-and-save")
    async def create_partnership_contract(data: PartnershipContractRequest, user = Depends(require_admin)):
        """Create and save a partnership contract to database"""
        
        # Get partner info
        partner = await db.partners.find_one({"partner_id": data.partner_id}, {"_id": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        # Generate contract number
        contract_number = await get_next_contract_number()
        contract_id = f"CTR-{secrets.token_hex(4).upper()}"
        
        # Create contract record
        contract = {
            "contract_id": contract_id,
            "contract_number": contract_number,
            "contract_type": "partnership",
            "partner_id": data.partner_id,
            "partner_name": partner.get("name") or partner.get("company_name"),
            "partner_email": partner.get("email"),
            "title": "Contrat de partenariat commercial",
            "description": f"Partenariat commercial avec commission de {data.commission_percent or '___'}%",
            "clauses": [
                {"title": "Article 1 - Objet", "content": "Partenariat pour commercialisation de produits/services"},
                {"title": "Article 2 - Engagements Partenaire", "content": "Qualité, délais, authenticité, informations exactes"},
                {"title": "Article 3 - Engagements YAMA+", "content": "Promotion, visibilité, facilitation, suivi paiements"},
                {"title": "Article 4 - Commission", "content": f"{data.commission_percent or '___'}%"},
                {"title": "Article 5 - Paiement", "content": f"{data.payment_frequency} via {data.payment_method}"},
                {"title": "Article 6 - Livraison", "content": f"Par {data.delivery_responsibility}, frais {data.delivery_fees}"},
                {"title": "Article 7 - Retour/Garantie", "content": "Politique retour YAMA+"},
                {"title": "Article 8 - Confidentialité", "content": "Informations confidentielles"},
                {"title": "Article 9 - Durée", "content": f"{data.contract_duration}, renouvelable"},
                {"title": "Article 10 - Résiliation", "content": "Préavis 15 jours"},
                {"title": "Article 11 - Litiges", "content": "Juridictions Dakar"}
            ],
            "commission_percent": data.commission_percent,
            "payment_frequency": data.payment_frequency,
            "payment_method": data.payment_method,
            "delivery_responsibility": data.delivery_responsibility,
            "delivery_fees": data.delivery_fees,
            "start_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "end_date": None,
            "value": None,
            "status": "draft",
            "notes": f"Durée: {data.contract_duration}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.email if hasattr(user, 'email') else str(user)
        }
        
        await db.contracts.insert_one(contract)
        
        # Remove _id from response
        contract.pop("_id", None)
        
        return {
            "success": True,
            "contract": contract,
            "message": f"Contrat de partenariat {contract_number} créé avec succès"
        }
    
    return commercial_router
