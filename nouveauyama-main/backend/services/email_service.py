"""
Email service module for YAMA+ e-commerce platform
Handles transactional and marketing emails via MailerSend and MailerLite
"""
import os
import asyncio
import logging
import aiohttp
import json
from datetime import datetime, timezone, timedelta
from typing import Optional

try:
    from mailersend import emails as mailersend_emails
except ImportError:
    # Fallback for newer mailersend versions
    mailersend_emails = None

# Logger
logger = logging.getLogger(__name__)

# MailerSend Configuration
MAILERSEND_API_KEY = os.environ.get("MAILERSEND_API_KEY")
MAILERSEND_FROM_EMAIL = os.environ.get("MAILERSEND_FROM_EMAIL", "noreply@trial-0r83ql3xxepl.zxkj")
MAILERSEND_FROM_NAME = os.environ.get("MAILERSEND_FROM_NAME", "GROUPE YAMA+")

# MailerLite Configuration
MAILERLITE_API_KEY = os.environ.get("MAILERLITE_API_KEY")
MAILERLITE_API_URL = os.environ.get("MAILERLITE_API_URL", "https://connect.mailerlite.com/api")

# Site Configuration
SITE_URL = os.environ.get("SITE_URL", "https://groupeyamaplus.com")
STORE_NAME = os.environ.get("STORE_NAME", "GROUPE YAMA+")
STORE_PHONE = "+221 78 382 75 75"
STORE_ADDRESS = "Fass Paillote, Dakar, Sénégal"
ADMIN_NOTIFICATION_EMAIL = os.environ.get("ADMIN_NOTIFICATION_EMAIL", "amadoubourydiouf@gmail.com")


def get_email_template(content: str, title: str = "Notification") -> str:
    """Generate a professional email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 32px;">
                <img src="https://customer-assets.emergentagent.com/job_premium-senegal/artifacts/xs5g0hsy_IMG_0613.png" alt="YAMA+" style="height: 60px; width: auto;">
                <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">Votre partenaire au quotidien</p>
            </div>
            
            <!-- Main Content Card -->
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                {content}
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 32px; color: #666; font-size: 13px;">
                <p style="margin: 0 0 8px 0;">Besoin d'aide ?</p>
                <p style="margin: 0 0 4px 0;">📧 contact@groupeyamaplus.com</p>
                <p style="margin: 0 0 4px 0;">📱 {STORE_PHONE}</p>
                <p style="margin: 0 0 16px 0;">📍 {STORE_ADDRESS}</p>
                <div style="padding-top: 16px; border-top: 1px solid #eee;">
                    <p style="margin: 0; font-size: 12px; color: #999;">
                        © {datetime.now().year} GROUPE YAMA+. Tous droits réservés.
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


async def send_email_mailersend(to_email: str, to_name: str, subject: str, html_content: str, attachments: list = None) -> dict:
    """Send email using MailerSend API with optional attachments"""
    if not MAILERSEND_API_KEY:
        logger.warning("MailerSend API key not configured")
        return {"success": False, "error": "API key not configured"}
    
    try:
        # Use HTTP API directly for better control
        url = "https://api.mailersend.com/v1/email"
        headers = {
            "Authorization": f"Bearer {MAILERSEND_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "from": {
                "email": MAILERSEND_FROM_EMAIL,
                "name": MAILERSEND_FROM_NAME
            },
            "to": [{
                "email": to_email,
                "name": to_name or to_email.split("@")[0]
            }],
            "subject": subject,
            "html": html_content
        }
        
        # Add attachments if provided
        if attachments:
            payload["attachments"] = [{
                "content": att.get("content"),
                "filename": att.get("filename"),
                "disposition": "attachment"
            } for att in attachments]
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status in [200, 201, 202]:
                    logger.info(f"Email sent to {to_email}: {subject}")
                    return {"success": True, "response": await response.text()}
                else:
                    error_text = await response.text()
                    logger.error(f"MailerSend error: {response.status} - {error_text}")
                    return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
        
    except Exception as e:
        logger.error(f"MailerSend error: {str(e)}")
        return {"success": False, "error": str(e)}


async def send_email_async(to: str, subject: str, html: str, attachments: list = None) -> dict:
    """Async wrapper for sending emails"""
    return await send_email_mailersend(to, to.split("@")[0], subject, html, attachments)



class MailerLiteService:
    """Service for interacting with MailerLite API for email marketing automation"""
    
    GROUP_NAMES = {
        "abandoned_cart": "Panier Abandonné",
        "welcome": "Bienvenue",
        "post_purchase": "Post-Achat",
        "vip": "Clients VIP",
        "winback": "Reconquête",
        "wishlist": "Favoris",
        "browse_abandon": "Navigation Abandonnée",
        "review_request": "Demande Avis",
        "newsletter": "Newsletter",
        "promotions": "Promotions"
    }
    
    def __init__(self):
        self.api_key = MAILERLITE_API_KEY
        self.base_url = MAILERLITE_API_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        self.group_ids = {}
    
    async def _make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make an async request to MailerLite API"""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method, url, json=data, headers=self.headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_text = await response.text()
                    
                    if response.status in [200, 201, 204]:
                        return {"success": True, "data": json.loads(response_text) if response_text else {}}
                    elif response.status == 429:
                        logger.warning("MailerLite rate limit reached")
                        return {"success": False, "error": "Rate limit exceeded", "status": 429}
                    else:
                        logger.error(f"MailerLite API error: {response.status} - {response_text}")
                        return {"success": False, "error": response_text, "status": response.status}
        except asyncio.TimeoutError:
            logger.error("MailerLite API timeout")
            return {"success": False, "error": "Request timeout"}
        except Exception as e:
            logger.error(f"MailerLite API exception: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_or_create_group(self, group_key: str) -> str:
        """Get or create a group in MailerLite by key"""
        if group_key in self.group_ids:
            return self.group_ids[group_key]
        
        group_name = self.GROUP_NAMES.get(group_key, group_key)
        encoded_name = group_name.replace(" ", "%20")
        
        result = await self._make_request("GET", f"groups?filter[name]={encoded_name}")
        
        if result["success"] and result.get("data", {}).get("data"):
            groups = result["data"]["data"]
            if groups:
                self.group_ids[group_key] = groups[0]["id"]
                return self.group_ids[group_key]
        
        create_result = await self._make_request("POST", "groups", {"name": group_name})
        
        if create_result["success"]:
            self.group_ids[group_key] = create_result["data"]["data"]["id"]
            return self.group_ids[group_key]
        
        raise Exception(f"Failed to get or create MailerLite group: {group_name}")
    
    async def add_subscriber(self, email: str, name: str = "", group_key: str = "newsletter", custom_fields: dict = None) -> dict:
        """Add or update a subscriber and assign to a group"""
        group_id = await self.get_or_create_group(group_key)
        
        fields = {"name": name or ""}
        if custom_fields:
            fields.update(custom_fields)
        
        subscriber_data = {
            "email": email,
            "fields": fields,
            "groups": [group_id],
            "status": "active"
        }
        
        result = await self._make_request("POST", "subscribers", subscriber_data)
        
        if result["success"]:
            subscriber_id = result["data"]["data"]["id"]
            logger.info(f"Added {email} to MailerLite group: {group_key}")
            return {"success": True, "subscriber_id": subscriber_id}
        
        return result
    
    async def add_to_welcome_flow(self, email: str, name: str = "") -> dict:
        return await self.add_subscriber(email, name, "welcome")
    
    async def add_to_post_purchase_flow(self, email: str, name: str = "", order_id: str = "") -> dict:
        return await self.add_subscriber(email, name, "post_purchase", {"company": order_id})
    
    async def get_all_groups(self) -> list:
        result = await self._make_request("GET", "groups?limit=100")
        if result["success"]:
            return result["data"].get("data", [])
        return []


# Initialize MailerLite service singleton
mailerlite_service = MailerLiteService()
