from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import json
import hashlib
import asyncio
import re
import time
import aiohttp
import base64
import secrets
from collections import defaultdict
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
from mailersend import MailerSendClient, EmailBuilder
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Image compression
from PIL import Image as PILImage

# AI Image Analysis - Using OpenAI SDK directly
from openai import OpenAI

# PDF Generation
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Image
from reportlab.lib.units import cm, mm

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Log PayTech configuration at startup
_paytech_env = os.environ.get('PAYTECH_ENV', 'NOT_SET')
logging.info(f"🔧 PayTech configuration loaded: PAYTECH_ENV={_paytech_env}")

# MailerSend configuration
MAILERSEND_API_KEY = os.environ.get("MAILERSEND_API_KEY")
MAILERSEND_FROM_EMAIL = os.environ.get("MAILERSEND_FROM_EMAIL", "noreply@groupeyamaplus.com")
MAILERSEND_FROM_NAME = os.environ.get("MAILERSEND_FROM_NAME", "GROUPE YAMA+")

# Initialize MailerSend client
mailersend_client = MailerSendClient(api_key=MAILERSEND_API_KEY) if MAILERSEND_API_KEY else None

async def send_email_mailersend(to_email: str, to_name: str, subject: str, html_content: str, text_content: str = None, attachment_content: bytes = None, attachment_filename: str = None):
    """Send email using MailerSend API with optional attachment"""
    if not mailersend_client:
        logger.warning("MailerSend not configured - skipping email")
        return {"success": False, "error": "MailerSend not configured"}
    
    try:
        email_builder = (
            EmailBuilder()
            .from_email(MAILERSEND_FROM_EMAIL, MAILERSEND_FROM_NAME)
            .to(to_email, to_name or to_email)
            .subject(subject)
            .html(html_content)
        )
        if text_content:
            email_builder.text(text_content)
        
        # Add attachment if provided
        if attachment_content and attachment_filename:
            email_builder.attach_content(attachment_content, attachment_filename, "attachment")
        
        # Build the email request
        email_request = email_builder.build()
        
        # Send email using emails.send()
        response = await asyncio.to_thread(mailersend_client.emails.send, email_request)
        logger.info(f"Email sent to {to_email}")
        return {"success": True, "response": str(response)}
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}

# MailerLite Configuration (for newsletter/marketing)
MAILERLITE_API_KEY = os.environ.get("MAILERLITE_API_KEY")
MAILERLITE_API_URL = "https://connect.mailerlite.com/api"
ABANDONED_CART_TIMEOUT_HOURS = 1  # Send email after 1 hour of inactivity

# MongoDB connection with optimized settings
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=15,  # Increased pool size for better concurrency
    minPoolSize=2,
    maxIdleTimeMS=30000,  # Close idle connections after 30s
    serverSelectionTimeoutMS=5000,  # Faster timeout
    socketTimeoutMS=20000,  # Socket timeout
    connectTimeoutMS=10000,  # Connection timeout
    retryWrites=True
)
db = client[os.environ['DB_NAME']]

# Simple in-memory cache for frequently accessed data
_cache = {}
_cache_ttl = {}
CACHE_DURATION = 60  # Cache for 60 seconds

def get_cached(key):
    """Get value from cache if not expired"""
    if key in _cache and key in _cache_ttl:
        if time.time() < _cache_ttl[key]:
            return _cache[key]
        else:
            del _cache[key]
            del _cache_ttl[key]
    return None

def set_cached(key, value, ttl=CACHE_DURATION):
    """Set value in cache with TTL"""
    _cache[key] = value
    _cache_ttl[key] = time.time() + ttl

def clear_cache(prefix=None):
    """Clear cache, optionally by prefix"""
    global _cache, _cache_ttl
    if prefix:
        keys_to_delete = [k for k in _cache.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            _cache.pop(k, None)
            _cache_ttl.pop(k, None)
    else:
        _cache = {}
        _cache_ttl = {}

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'lumina-senegal-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Store Configuration
STORE_NAME = "GROUPE YAMA+"
STORE_ADDRESS = "Fass Paillote, Dakar, Sénégal"
STORE_PHONE = "+221 78 382 75 75"
STORE_WHATSAPP = "221783827575"  # Without + for WhatsApp links
STORE_EMAIL = "contact@groupeyamaplus.com"
ADMIN_NOTIFICATION_EMAIL = "amadoubourydiouf@gmail.com"  # Email to receive order and appointment notifications
SITE_URL = os.environ.get("SITE_URL", "https://groupeyamaplus.com")  # Production site URL

# Delivery Zones Configuration
DELIVERY_ZONES = {
    "zone_1500": {
        "price": 1500,
        "label": "Dakar Centre",
        "areas": [
            "dakar", "dakar centre", "centre-ville", "médina", "medina", "fass", "fass paillote",
            "colobane", "point e", "fann", "cité keur gorgui", "keur gorgui", "hlm"
        ]
    },
    "zone_2000": {
        "price": 2000,
        "label": "Dakar Proche",
        "areas": [
            "castor", "liberté", "liberte", "liberté 6", "sicap", "dieuppeul", "mermoz",
            "grand dakar", "niarry tally", "niaye tally", "foire", "mariste", "ouakam",
            "sacré-cœur", "sacre coeur", "sacré coeur", "grand yoff"
        ]
    },
    "zone_2500": {
        "price": 2500,
        "label": "Dakar Étendu",
        "areas": [
            "parcelles assainies", "parcelles", "fadia", "ngor", "almadies", "les almadies",
            "pikine", "yarakh", "golf", "golf sud"
        ]
    },
    "zone_3000": {
        "price": 3000,
        "label": "Banlieue",
        "areas": [
            "guédiawaye", "guediawaye", "thiaroye", "diamaguène", "diamaguene",
            "fass mbao", "sicap mbao", "keur mbaye fall"
        ]
    },
    "zone_4000": {
        "price": 4000,
        "label": "Région Dakar",
        "areas": [
            "rufisque", "bargny", "diamniadio", "sébikotane", "sebikotane",
            "lac rose", "sangalkam"
        ]
    },
    "zone_5000": {
        "price": 5000,
        "label": "Zone Éloignée",
        "range": "4000-5000",
        "areas": [
            "keur massar", "zac mbao", "yeumbeul", "malika"
        ]
    },
    "autre_region": {
        "price": 3500,
        "label": "Autre Région",
        "areas": []  # Default for areas not in Dakar
    }
}

def calculate_shipping_cost(city: str, address: str = "") -> dict:
    """Calculate shipping cost based on city/area"""
    search_text = f"{city} {address}".lower().strip()
    
    # Check each zone
    for zone_id, zone_data in DELIVERY_ZONES.items():
        if zone_id == "autre_region":
            continue
        for area in zone_data["areas"]:
            if area in search_text:
                result = {
                    "zone": zone_id,
                    "zone_label": zone_data["label"],
                    "shipping_cost": zone_data["price"],
                    "message": f"Livraison {zone_data['label']}: {zone_data['price']:,} FCFA".replace(',', ' ')
                }
                # Special case for zone_5000
                if zone_id == "zone_5000":
                    result["message"] = "Livraison Zone Éloignée: entre 4 000 et 5 000 FCFA"
                    result["is_range"] = True
                return result
    
    # Default to autre région
    return {
        "zone": "autre_region",
        "zone_label": "Autre Région",
        "shipping_cost": 3500,
        "message": "Livraison Autre Région: 3 500 FCFA"
    }

app = FastAPI(title="Lumina Senegal E-Commerce API")
api_router = APIRouter(prefix="/api")

# ============== SECURITY MIDDLEWARE ==============

# Rate limiting storage with memory cleanup
rate_limit_storage = defaultdict(lambda: {"count": 0, "reset_time": 0})
RATE_LIMIT_REQUESTS = 100  # requests per window
RATE_LIMIT_WINDOW = 60  # seconds
MAX_RATE_LIMIT_ENTRIES = 1000  # Prevent memory bloat

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Cache control for API responses
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, max-age=0"
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware to prevent abuse with memory management"""
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for static files
        if not request.url.path.startswith("/api/"):
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        current_time = time.time()
        
        # Clean up old entries to prevent memory bloat
        if len(rate_limit_storage) > MAX_RATE_LIMIT_ENTRIES:
            expired_keys = [
                key for key, data in rate_limit_storage.items()
                if current_time > data["reset_time"]
            ]
            for key in expired_keys[:100]:  # Remove up to 100 expired entries
                del rate_limit_storage[key]
        
        client_data = rate_limit_storage[client_ip]
        
        # Reset counter if window has passed
        if current_time > client_data["reset_time"]:
            client_data["count"] = 0
            client_data["reset_time"] = current_time + RATE_LIMIT_WINDOW
        
        # Check rate limit
        if client_data["count"] >= RATE_LIMIT_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"detail": "Trop de requêtes. Veuillez réessayer dans quelques secondes."}
            )
        
        client_data["count"] += 1
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_REQUESTS)
        response.headers["X-RateLimit-Remaining"] = str(RATE_LIMIT_REQUESTS - client_data["count"])
        
        return response

# Add security middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# ============== INPUT VALIDATION HELPERS ==============

def sanitize_input(value: str, max_length: int = 500) -> str:
    """Sanitize user input to prevent XSS and injection attacks"""
    if not value:
        return ""
    # Limit length
    value = value[:max_length]
    # Remove potential script tags
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    # Remove event handlers
    value = re.sub(r'\s*on\w+\s*=\s*["\'][^"\']*["\']', '', value, flags=re.IGNORECASE)
    return value.strip()

def validate_phone(phone: str) -> bool:
    """Validate Senegalese phone number format"""
    if not phone:
        return True  # Phone is optional
    # Remove spaces and dashes
    clean_phone = re.sub(r'[\s\-\.]', '', phone)
    # Check Senegalese format: +221 or 221 followed by 9 digits, or just 9 digits
    pattern = r'^(\+?221)?[7][0-8][0-9]{7}$'
    return bool(re.match(pattern, clean_phone))

# ============== MODELS ==============

class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = None

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    role: str = "customer"
    picture: Optional[str] = None
    created_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ProductBase(BaseModel):
    name: str
    description: str
    short_description: Optional[str] = ""  # Made optional with default empty string
    price: int  # Price in FCFA
    original_price: Optional[int] = None
    category: str
    subcategory: Optional[str] = None
    images: List[str] = []  # Default empty list
    stock: int = 0
    featured: bool = False
    is_new: bool = False
    is_promo: bool = False
    is_flash_sale: bool = False
    flash_sale_end: Optional[str] = None  # ISO datetime string
    flash_sale_price: Optional[int] = None
    specs: Optional[dict] = None
    # Product variants/options
    brand: Optional[str] = None
    colors: Optional[List[str]] = None  # Available colors
    sizes: Optional[List[str]] = None   # Available sizes
    variants: Optional[List[dict]] = None  # Complex variants [{color, size, stock, price_modifier}]
    # On-order products
    is_on_order: bool = False  # Product available only on order
    order_delivery_days: Optional[int] = None  # Estimated delivery time in days

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    created_at: datetime
    updated_at: datetime

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cart_id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    items: List[CartItem]
    created_at: datetime
    updated_at: datetime

class OrderItem(BaseModel):
    product_id: str
    name: str
    price: int
    quantity: int
    image: str

class ShippingAddress(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: str
    city: str
    region: str
    neighborhood: Optional[str] = None
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    items: List[OrderItem]
    shipping: ShippingAddress
    payment_method: str
    subtotal: int
    shipping_cost: int
    total: int

class OrderStatusHistory(BaseModel):
    status: str
    timestamp: str
    note: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str
    user_id: Optional[str] = None
    items: List[OrderItem]
    shipping: ShippingAddress
    payment_method: str
    payment_status: str = "pending"
    order_status: str = "pending"
    status_history: List[OrderStatusHistory] = []
    subtotal: int
    shipping_cost: int
    total: int
    created_at: datetime

class WishlistItem(BaseModel):
    product_id: str
    added_at: datetime

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

# ============== REVIEWS MODELS ==============

class ReviewCreate(BaseModel):
    product_id: str
    rating: int  # 1-5
    title: str
    comment: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str
    product_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    rating: int
    title: str
    comment: str
    verified_purchase: bool = False
    helpful_count: int = 0
    created_at: datetime

# ============== NEWSLETTER MODEL ==============

class NewsletterSubscribe(BaseModel):
    email: EmailStr
    name: Optional[str] = None

# ============== SPIN WHEEL GAME MODEL ==============

class SpinResult(BaseModel):
    spin_id: str
    user_id: Optional[str] = None
    email: str
    prize_type: str  # discount_5, discount_10, discount_20, free_shipping, jersey
    prize_label: str
    prize_code: Optional[str] = None
    spin_type: str  # newsletter, purchase
    claimed: bool = False
    created_at: datetime

class SpinRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    jersey_name: Optional[str] = None  # For jersey winners

# ============== EMAIL CAMPAIGN MODELS ==============

class EmailCampaign(BaseModel):
    campaign_id: str
    name: str
    subject: str
    content: str  # HTML content
    status: str = "draft"  # draft, scheduled, sent
    target_audience: str = "all"  # all, newsletter, customers
    scheduled_at: Optional[str] = None
    sent_at: Optional[str] = None
    total_recipients: int = 0
    sent_count: int = 0
    open_count: int = 0
    created_at: str

class CampaignCreate(BaseModel):
    name: str
    subject: str
    content: str
    target_audience: str = "all"
    scheduled_at: Optional[str] = None

class SingleEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    html_content: str

# ============== GIFT BOX MODELS ==============

class GiftBoxSize(BaseModel):
    """Gift box size configuration"""
    model_config = ConfigDict(extra="ignore")
    size_id: Optional[str] = None
    name: str
    description: str
    max_items: int
    base_price: int
    image: Optional[str] = None
    icon: str = "🎁"
    is_active: bool = True
    sort_order: int = 0

class GiftBoxWrapping(BaseModel):
    """Gift box wrapping option"""
    model_config = ConfigDict(extra="ignore")
    wrapping_id: Optional[str] = None
    name: str
    color: str  # Hex color code
    price: int = 0
    image: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

class GiftBoxConfig(BaseModel):
    """Overall gift box configuration"""
    model_config = ConfigDict(extra="ignore")
    is_enabled: bool = True
    page_title: str = "Coffrets Cadeaux Personnalisés"
    page_description: str = "Composez le coffret parfait en sélectionnant vos articles préférés"
    banner_image: Optional[str] = None
    allow_personal_message: bool = True
    max_message_length: int = 200

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> Optional[User]:
    # Try cookie first
    token = request.cookies.get("session_token")
    
    # Fall back to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
    
    # Check if it's a JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id:
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user_doc:
                if isinstance(user_doc.get('created_at'), str):
                    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
                return User(**user_doc)
    except jwt.ExpiredSignatureError:
        pass
    except jwt.InvalidTokenError:
        pass
    
    # Check session token (for Google OAuth)
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session_doc:
        expires_at = session_doc.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > datetime.now(timezone.utc):
            user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
            if user_doc:
                if isinstance(user_doc.get('created_at'), str):
                    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
                return User(**user_doc)
    
    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    return user

async def require_admin(request: Request) -> User:
    user = await require_auth(request)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return user

# ============== MAILERLITE SERVICE ==============

class MailerLiteService:
    """Service for interacting with MailerLite API for email marketing automation"""
    
    # Group names for different workflows
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
        self.group_ids = {}  # Cache for group IDs
    
    async def _make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Make an async request to MailerLite API"""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method,
                    url,
                    json=data,
                    headers=self.headers,
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
        
        # List existing groups
        result = await self._make_request("GET", f"groups?filter[name]={encoded_name}")
        
        if result["success"] and result.get("data", {}).get("data"):
            groups = result["data"]["data"]
            if groups:
                self.group_ids[group_key] = groups[0]["id"]
                return self.group_ids[group_key]
        
        # Create new group if not found
        create_result = await self._make_request("POST", "groups", {
            "name": group_name
        })
        
        if create_result["success"]:
            self.group_ids[group_key] = create_result["data"]["data"]["id"]
            return self.group_ids[group_key]
        
        raise Exception(f"Failed to get or create MailerLite group: {group_name}")
    
    async def get_or_create_abandoned_cart_group(self) -> str:
        """Get or create the abandoned cart group in MailerLite"""
        return await self.get_or_create_group("abandoned_cart")
    
    async def add_subscriber(
        self,
        email: str,
        name: str = "",
        group_key: str = "newsletter",
        custom_fields: dict = None
    ) -> dict:
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
    
    async def add_subscriber_to_abandoned_cart(
        self,
        email: str,
        name: str = "",
        cart_items: list = None,
        cart_total: int = 0,
        cart_url: str = ""
    ) -> dict:
        """Add a subscriber to the abandoned cart group with custom fields"""
        
        # Get or create the abandoned cart group
        group_id = await self.get_or_create_abandoned_cart_group()
        
        # Format cart items for email
        items_text = ""
        if cart_items:
            items_text = ", ".join([
                f"{item.get('name', 'Produit')} x{item.get('quantity', 1)}"
                for item in cart_items[:5]  # Limit to first 5 items
            ])
        
        # Create or update subscriber with custom fields
        subscriber_data = {
            "email": email,
            "fields": {
                "name": name or "",
                "company": STORE_NAME,  # Using company field for store name
            },
            "groups": [group_id],
            "status": "active"
        }
        
        result = await self._make_request("POST", "subscribers", subscriber_data)
        
        if result["success"]:
            subscriber_id = result["data"]["data"]["id"]
            
            # Log the abandoned cart event
            await db.abandoned_cart_emails.insert_one({
                "email": email,
                "subscriber_id": subscriber_id,
                "cart_items": cart_items,
                "cart_total": cart_total,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "status": "sent_to_mailerlite"
            })
            
            logger.info(f"Added {email} to MailerLite abandoned cart group")
            return {"success": True, "subscriber_id": subscriber_id}
        
        return result
    
    async def add_to_welcome_flow(self, email: str, name: str = "") -> dict:
        """Add new customer to welcome email flow"""
        return await self.add_subscriber(email, name, "welcome")
    
    async def add_to_post_purchase_flow(self, email: str, name: str = "", order_id: str = "") -> dict:
        """Add customer to post-purchase flow (for review requests, etc.)"""
        return await self.add_subscriber(email, name, "post_purchase", {"company": order_id})
    
    async def add_to_vip_flow(self, email: str, name: str = "", total_spent: int = 0) -> dict:
        """Add high-value customer to VIP flow"""
        return await self.add_subscriber(email, name, "vip")
    
    async def add_to_winback_flow(self, email: str, name: str = "") -> dict:
        """Add inactive customer to winback flow"""
        return await self.add_subscriber(email, name, "winback")
    
    async def add_to_wishlist_flow(self, email: str, name: str = "") -> dict:
        """Add customer with wishlist items to reminder flow"""
        return await self.add_subscriber(email, name, "wishlist")
    
    async def remove_from_abandoned_cart_group(self, email: str) -> dict:
        """Remove subscriber from abandoned cart group (when they complete purchase)"""
        abandoned_cart_group_id = await self.get_or_create_abandoned_cart_group()
        
        # Get subscriber by email
        result = await self._make_request("GET", f"subscribers/{email}")
        
        if result["success"]:
            subscriber_id = result["data"]["data"]["id"]
            # Remove from group
            remove_result = await self._make_request(
                "DELETE",
                f"subscribers/{subscriber_id}/groups/{abandoned_cart_group_id}"
            )
            return remove_result
        
        return {"success": False, "error": "Subscriber not found"}
    
    async def remove_from_group(self, email: str, group_key: str) -> dict:
        """Remove subscriber from a specific group"""
        group_id = await self.get_or_create_group(group_key)
        
        # Get subscriber by email
        result = await self._make_request("GET", f"subscribers/{email}")
        
        if result["success"]:
            subscriber_id = result["data"]["data"]["id"]
            remove_result = await self._make_request(
                "DELETE",
                f"subscribers/{subscriber_id}/groups/{group_id}"
            )
            return remove_result
        
        return {"success": False, "error": "Subscriber not found"}
    
    async def get_all_groups(self) -> list:
        """Get all groups from MailerLite"""
        result = await self._make_request("GET", "groups?limit=100")
        if result["success"]:
            return result["data"].get("data", [])
        return []

# Initialize MailerLite service
mailerlite_service = MailerLiteService()

# ============== ABANDONED CART DETECTION ==============

async def detect_and_process_abandoned_carts():
    """Background task to detect abandoned carts and trigger MailerLite automation"""
    try:
        logger.info("Running abandoned cart detection...")
        
        # Calculate cutoff time (carts not updated in the last X hours)
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=ABANDONED_CART_TIMEOUT_HOURS)
        cutoff_iso = cutoff_time.isoformat()
        
        # Find carts that:
        # 1. Have items
        # 2. Haven't been updated in X hours
        # 3. Belong to logged-in users (have user_id)
        # 4. Haven't already been processed
        abandoned_carts = await db.carts.find({
            "user_id": {"$ne": None},
            "items": {"$exists": True, "$ne": []},
            "updated_at": {"$lt": cutoff_iso},
            "abandoned_email_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        processed_count = 0
        
        for cart in abandoned_carts:
            user_id = cart.get("user_id")
            if not user_id:
                continue
            
            # Get user info
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if not user or not user.get("email"):
                continue
            
            email = user["email"]
            name = user.get("name", "")
            
            # Check if we already sent an email to this user recently
            recent_email = await db.abandoned_cart_emails.find_one({
                "email": email,
                "sent_at": {"$gt": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
            })
            
            if recent_email:
                logger.info(f"Skipping {email} - already sent email in last 24h")
                continue
            
            # Get cart items with product details
            cart_items_with_details = []
            cart_total = 0
            
            for item in cart.get("items", []):
                product = await db.products.find_one(
                    {"product_id": item["product_id"]},
                    {"_id": 0, "name": 1, "price": 1, "images": 1}
                )
                if product:
                    item_data = {
                        "product_id": item["product_id"],
                        "name": product.get("name", "Produit"),
                        "quantity": item.get("quantity", 1),
                        "price": product.get("price", 0),
                        "image": product.get("images", [""])[0] if product.get("images") else ""
                    }
                    cart_items_with_details.append(item_data)
                    cart_total += item_data["price"] * item_data["quantity"]
            
            if not cart_items_with_details:
                continue
            
            # Send abandoned cart email via MailerSend
            recovery_link = f"{SITE_URL}/panier?recover={cart.get('cart_id', '')}"
            html = get_abandoned_cart_template(name or "Client", cart_items_with_details, cart_total, recovery_link)
            
            result = await send_email_async(
                to=email,
                subject="🛒 Votre panier vous attend - YAMA+",
                html=html
            )
            
            if result.get("success"):
                # Mark cart as processed
                await db.carts.update_one(
                    {"cart_id": cart.get("cart_id")},
                    {"$set": {"abandoned_email_sent": True, "abandoned_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                # Log email sent
                await db.abandoned_cart_emails.insert_one({
                    "email": email,
                    "cart_id": cart.get("cart_id"),
                    "cart_total": cart_total,
                    "items_count": len(cart_items_with_details),
                    "sent_at": datetime.now(timezone.utc).isoformat()
                })
                
                processed_count += 1
                logger.info(f"Sent abandoned cart email for {email}")
        
        logger.info(f"Abandoned cart detection complete. Processed {processed_count} carts.")
        
        # Log stats
        await db.abandoned_cart_stats.insert_one({
            "run_at": datetime.now(timezone.utc).isoformat(),
            "carts_checked": len(abandoned_carts),
            "emails_sent": processed_count
        })
        
    except Exception as e:
        logger.error(f"Error in abandoned cart detection: {str(e)}")

# Initialize scheduler
scheduler = AsyncIOScheduler()

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = hash_password(user_data.password) if user_data.password else None
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "password": hashed_password,
        "role": "customer",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Send welcome email asynchronously (create a clean copy without _id)
    user_for_email = {k: v for k, v in user_doc.items() if k != "_id"}
    asyncio.create_task(send_welcome_email(user_for_email))
    
    token = create_token(user_id, user_data.email)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/"
    )
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": "customer",
        "token": token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not user_doc.get("password"):
        raise HTTPException(status_code=401, detail="Utilisez la connexion Google pour ce compte")
    
    if not verify_password(credentials.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(user_doc["user_id"], user_doc["email"])
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/"
    )
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "phone": user_doc.get("phone"),
        "role": user_doc.get("role", "customer"),
        "picture": user_doc.get("picture"),
        "token": token
    }

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Google OAuth session_id and create user session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")
    
    # Fetch user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Session invalide")
        
        user_data = auth_response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "phone": None,
            "password": None,
            "role": "customer",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = user_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/"
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Create JWT token for the user
    jwt_token = create_token(user_id, user_doc["email"])
    
    return {
        "user_id": user_id,
        "email": user_doc["email"],
        "name": user_doc["name"],
        "role": user_doc.get("role", "customer"),
        "picture": user_doc.get("picture"),
        "token": jwt_token
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "picture": user.picture,
        "phone": user.phone
    }

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

@api_router.put("/auth/profile")
async def update_profile(profile_data: ProfileUpdate, user: User = Depends(require_auth)):
    """Update user profile (name, phone)"""
    update_fields = {}
    
    if profile_data.name and profile_data.name.strip():
        update_fields["name"] = profile_data.name.strip()
    
    if profile_data.phone is not None:
        update_fields["phone"] = profile_data.phone.strip() if profile_data.phone else None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": update_fields}
    )
    
    # Return updated user info
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password": 0})
    
    return {
        "message": "Profil mis à jour avec succès",
        "user": {
            "user_id": updated_user["user_id"],
            "email": updated_user["email"],
            "name": updated_user["name"],
            "phone": updated_user.get("phone"),
            "role": updated_user.get("role", "customer"),
            "picture": updated_user.get("picture")
        }
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Déconnexion réussie"}

# ============== IMAGE UPLOAD ==============

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Image compression settings
MAX_IMAGE_SIZE = 1920  # Max width/height in pixels
JPEG_QUALITY = 85  # Quality for JPEG compression

def compress_image(content: bytes, max_size: int = MAX_IMAGE_SIZE, quality: int = JPEG_QUALITY) -> tuple[bytes, str]:
    """Compress and optimize image for web. Returns (compressed_content, extension)"""
    try:
        img = PILImage.open(io.BytesIO(content))
        
        # Convert RGBA to RGB for JPEG (remove transparency)
        if img.mode in ('RGBA', 'P'):
            background = PILImage.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), PILImage.Resampling.LANCZOS)
        
        # Save as optimized JPEG
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        return output.getvalue(), 'jpg'
    except Exception as e:
        logging.error(f"Image compression error: {e}")
        # Return original content if compression fails
        return content, 'jpg'

@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), user: User = Depends(require_admin), request: Request = None):
    """Upload an image with automatic compression and optimization"""
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WebP ou GIF.")
    
    # Save file
    try:
        content = await file.read()
        original_size = len(content)
        
        # Limit file size to 10MB before compression
        if original_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
        
        # Compress image (skip GIFs to preserve animation)
        if file.content_type != "image/gif":
            content, ext = compress_image(content)
        else:
            ext = "gif"
        
        compressed_size = len(content)
        compression_ratio = round((1 - compressed_size / original_size) * 100, 1) if original_size > 0 else 0
        
        # Generate unique filename
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = UPLOADS_DIR / filename
        
        with open(filepath, "wb") as f:
            f.write(content)
        
        # Return relative path - frontend will handle the full URL
        image_url = f"/api/uploads/{filename}"
        
        logging.info(f"Image uploaded: {filename} (compressed {compression_ratio}%: {original_size//1024}KB -> {compressed_size//1024}KB)")
        return {
            "success": True, 
            "url": image_url, 
            "filename": filename,
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression": f"{compression_ratio}%"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'upload")

@api_router.get("/uploads/{filename}")
async def get_uploaded_image(filename: str, response: Response):
    """Serve uploaded images with caching headers"""
    filepath = UPLOADS_DIR / filename
    
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image non trouvée")
    
    # Determine content type
    ext = filename.split(".")[-1].lower()
    content_types = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "gif": "image/gif"
    }
    content_type = content_types.get(ext, "image/jpeg")
    
    with open(filepath, "rb") as f:
        content = f.read()
    
    # Add caching headers for better performance
    return Response(
        content=content, 
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
            "ETag": hashlib.md5(content).hexdigest()
        }
    )

# ============== PRODUCTS ROUTES ==============

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    featured: Optional[bool] = None,
    is_new: Optional[bool] = None,
    is_promo: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    # Enforce maximum limit to prevent memory issues
    limit = min(limit, 100)
    
    # Build cache key for cacheable queries (no search, skip=0)
    cache_key = None
    if not search and skip == 0 and limit <= 50:
        cache_key = f"products:{category}:{featured}:{is_new}:{is_promo}:{limit}"
        cached = get_cached(cache_key)
        if cached:
            return cached
    
    query = {}
    
    if category:
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    if is_new is not None:
        query["is_new"] = is_new
    if is_promo is not None:
        query["is_promo"] = is_promo
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Use projection to limit data transfer and memory usage
    projection = {
        "_id": 0,
        "product_id": 1,
        "name": 1,
        "description": 1,
        "short_description": 1,
        "price": 1,
        "original_price": 1,
        "category": 1,
        "subcategory": 1,
        "images": {"$slice": 2},  # Limit to first 2 images
        "stock": 1,
        "featured": 1,
        "is_new": 1,
        "is_promo": 1,
        "is_flash_sale": 1,
        "flash_sale_price": 1,
        "flash_sale_end": 1,
        "brand": 1,
        "colors": 1,
        "sizes": 1,
        "is_on_order": 1,
        "order_delivery_days": 1,
        "created_at": 1,
        "updated_at": 1
    }
    
    products = await db.products.find(query, projection).skip(skip).limit(limit).to_list(limit)
    
    for product in products:
        for field in ['created_at', 'updated_at']:
            if isinstance(product.get(field), str):
                product[field] = datetime.fromisoformat(product[field])
    
    # Cache the result
    if cache_key:
        set_cached(cache_key, products, ttl=30)  # Cache for 30 seconds
    
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    for field in ['created_at', 'updated_at']:
        if isinstance(product.get(field), str):
            product[field] = datetime.fromisoformat(product[field])
    
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, user: User = Depends(require_admin)):
    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    product_doc = product_data.model_dump()
    product_doc["product_id"] = product_id
    product_doc["created_at"] = now.isoformat()
    product_doc["updated_at"] = now.isoformat()
    
    await db.products.insert_one(product_doc)
    
    # Clear products cache
    clear_cache("products")
    clear_cache("flash_sales")
    
    product_doc["created_at"] = now
    product_doc["updated_at"] = now
    
    return product_doc

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, user: User = Depends(require_admin)):
    existing = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_doc = product_data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one(
        {"product_id": product_id},
        {"$set": update_doc}
    )
    
    # Clear products cache
    clear_cache("products")
    clear_cache("flash_sales")
    
    updated = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    for field in ['created_at', 'updated_at']:
        if isinstance(updated.get(field), str):
            updated[field] = datetime.fromisoformat(updated[field])
    
    return updated

@api_router.delete("/products/{product_id}")
@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(require_admin)):
    """Delete a product (accessible via both /products/ and /admin/products/)"""
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Clear products cache
    clear_cache("products")
    clear_cache("flash_sales")
    
    return {"message": "Produit supprimé"}

# ============== FLASH SALES ROUTES ==============

@api_router.get("/flash-sales")
async def get_flash_sales():
    """Get all active flash sale products with memory optimization and caching"""
    # Check cache first
    cached = get_cached("flash_sales")
    if cached:
        return cached
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Use projection to limit data transfer
    projection = {
        "_id": 0,
        "product_id": 1,
        "name": 1,
        "description": 1,
        "short_description": 1,
        "price": 1,
        "original_price": 1,
        "category": 1,
        "subcategory": 1,
        "images": {"$slice": 2},  # Limit to first 2 images
        "stock": 1,
        "featured": 1,
        "is_new": 1,
        "is_promo": 1,
        "flash_sale_end": 1,
        "flash_sale_price": 1,
        "is_flash_sale": 1,
        "specs": 1,
        "created_at": 1,
        "updated_at": 1
    }
    
    # Find products with active flash sales, limit to 20 to prevent memory issues
    products = await db.products.find(
        {
            "is_flash_sale": True,
            "flash_sale_end": {"$gt": now}
        },
        projection
    ).sort("flash_sale_end", 1).limit(20).to_list(20)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        if isinstance(product.get('updated_at'), str):
            product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    # Cache for 30 seconds
    set_cached("flash_sales", products, ttl=30)
    
    return products

@api_router.post("/admin/flash-sales/{product_id}")
async def create_flash_sale(
    product_id: str,
    request: Request,
    user: User = Depends(require_admin)
):
    """Create or update a flash sale for a product"""
    body = await request.json()
    flash_sale_price = body.get("flash_sale_price")
    flash_sale_end = body.get("flash_sale_end")  # ISO datetime string
    
    if not flash_sale_price or not flash_sale_end:
        raise HTTPException(status_code=400, detail="Prix et date de fin requis")
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {
            "$set": {
                "is_flash_sale": True,
                "flash_sale_price": flash_sale_price,
                "flash_sale_end": flash_sale_end,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    return {"message": "Vente flash créée"}

@api_router.delete("/admin/flash-sales/{product_id}")
async def remove_flash_sale(product_id: str, user: User = Depends(require_admin)):
    """Remove flash sale from a product"""
    result = await db.products.update_one(
        {"product_id": product_id},
        {
            "$set": {
                "is_flash_sale": False,
                "flash_sale_price": None,
                "flash_sale_end": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    return {"message": "Vente flash supprimée"}

# ============== SIMILAR PRODUCTS ROUTE ==============

@api_router.get("/products/{product_id}/similar")
async def get_similar_products(product_id: str, limit: int = 6):
    """Get similar products based on category"""
    # Get the current product
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Find products in the same category, excluding current product
    similar = await db.products.find(
        {
            "category": product["category"],
            "product_id": {"$ne": product_id}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    # If not enough, fill with featured products
    if len(similar) < limit:
        more_needed = limit - len(similar)
        existing_ids = [p["product_id"] for p in similar] + [product_id]
        
        featured = await db.products.find(
            {
                "product_id": {"$nin": existing_ids},
                "featured": True
            },
            {"_id": 0}
        ).limit(more_needed).to_list(more_needed)
        
        similar.extend(featured)
    
    for p in similar:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    
    return similar

@api_router.get("/products/{product_id}/frequently-bought")
async def get_frequently_bought(product_id: str):
    """Get products frequently bought together - based on same category and price range"""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        return []
    
    # Find complementary products in same category or related categories
    category = product.get("category", "")
    price = product.get("price", 0)
    
    # Products in similar price range (±50%)
    min_price = int(price * 0.3)
    max_price = int(price * 1.5)
    
    # Find products that complement this one
    bundles = await db.products.find({
        "product_id": {"$ne": product_id},
        "category": category,
        "price": {"$gte": min_price, "$lte": max_price},
        "stock": {"$gt": 0}
    }, {"_id": 0}).limit(3).to_list(3)
    
    # If not enough, get from other categories
    if len(bundles) < 2:
        more = await db.products.find({
            "product_id": {"$ne": product_id, "$nin": [p["product_id"] for p in bundles]},
            "stock": {"$gt": 0}
        }, {"_id": 0}).limit(3 - len(bundles)).to_list(3)
        bundles.extend(more)
    
    return bundles[:3]

# ============== REVIEWS ROUTES ==============

@api_router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str, limit: int = 50):
    """Get reviews for a product with pagination to prevent memory issues"""
    # Enforce maximum limit
    limit = min(limit, 100)
    
    # Use projection to limit data transfer
    projection = {
        "_id": 0,
        "review_id": 1,
        "product_id": 1,
        "user_id": 1,
        "user_name": 1,
        "user_picture": 1,
        "rating": 1,
        "title": 1,
        "comment": 1,
        "verified_purchase": 1,
        "helpful_count": 1,
        "created_at": 1
    }
    
    reviews = await db.reviews.find(
        {"product_id": product_id},
        projection
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Calculate average rating efficiently
    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1},
            "rating_1": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}},
            "rating_2": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
            "rating_3": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
            "rating_4": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
            "rating_5": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}}
        }}
    ]
    
    stats = await db.reviews.aggregate(pipeline).to_list(1)
    
    if stats:
        stat = stats[0]
        avg_rating = round(stat["avg_rating"], 1) if stat["avg_rating"] else 0
        total_reviews = stat["total_reviews"]
        distribution = {
            1: stat["rating_1"],
            2: stat["rating_2"],
            3: stat["rating_3"],
            4: stat["rating_4"],
            5: stat["rating_5"]
        }
    else:
        avg_rating = 0
        total_reviews = 0
        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    
    return {
        "reviews": reviews,
        "total_reviews": total_reviews,
        "average_rating": avg_rating,
        "distribution": distribution
    }

@api_router.post("/products/{product_id}/reviews")
async def create_review(product_id: str, review_data: ReviewCreate, user: User = Depends(require_auth)):
    """Create a review for a product"""
    # Check if product exists
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if user already reviewed this product
    existing_review = await db.reviews.find_one({
        "product_id": product_id,
        "user_id": user.user_id
    })
    if existing_review:
        raise HTTPException(status_code=400, detail="Vous avez déjà donné votre avis sur ce produit")
    
    # Check if user purchased this product (verified purchase)
    user_orders = await db.orders.find({
        "user_id": user.user_id,
        "items.product_id": product_id,
        "payment_status": "paid"
    }).to_list(1)
    verified_purchase = len(user_orders) > 0
    
    # Validate rating
    if review_data.rating < 1 or review_data.rating > 5:
        raise HTTPException(status_code=400, detail="La note doit être entre 1 et 5")
    
    review_id = f"review_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    review_doc = {
        "review_id": review_id,
        "product_id": product_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "user_picture": user.picture,
        "rating": review_data.rating,
        "title": review_data.title,
        "comment": review_data.comment,
        "verified_purchase": verified_purchase,
        "helpful_count": 0,
        "created_at": now.isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    return {"message": "Avis publié avec succès", "review_id": review_id, "verified_purchase": verified_purchase}

@api_router.post("/reviews/{review_id}/helpful")
async def mark_review_helpful(review_id: str, request: Request):
    """Mark a review as helpful"""
    result = await db.reviews.update_one(
        {"review_id": review_id},
        {"$inc": {"helpful_count": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Avis non trouvé")
    return {"message": "Merci pour votre retour"}

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, user: User = Depends(require_auth)):
    """Delete a review (own review or admin)"""
    review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Avis non trouvé")
    
    if review["user_id"] != user.user_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await db.reviews.delete_one({"review_id": review_id})
    return {"message": "Avis supprimé"}

# ============== STOCK NOTIFICATION ==============

class StockNotificationRequest(BaseModel):
    email: EmailStr
    product_id: str

@api_router.post("/products/{product_id}/notify-stock")
async def subscribe_stock_notification(product_id: str, data: StockNotificationRequest):
    """Subscribe to be notified when a product is back in stock"""
    # Check if product exists
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "name": 1, "stock": 1})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if already subscribed
    existing = await db.stock_notifications.find_one({
        "email": data.email,
        "product_id": product_id,
        "notified": False
    })
    if existing:
        return {"message": "Vous êtes déjà inscrit pour ce produit", "already_subscribed": True}
    
    # Create notification subscription
    notification_doc = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "email": data.email,
        "product_id": product_id,
        "product_name": product.get("name"),
        "notified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stock_notifications.insert_one(notification_doc)
    
    return {
        "message": "Vous serez notifié dès que le produit sera disponible",
        "already_subscribed": False
    }

@api_router.get("/admin/stock-notifications")
async def get_stock_notifications(user: User = Depends(require_admin)):
    """Get all pending stock notifications"""
    notifications = await db.stock_notifications.find(
        {"notified": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

# ============== PRICE ALERT SYSTEM ==============

class PriceAlertRequest(BaseModel):
    email: EmailStr
    product_id: str
    target_price: Optional[int] = None  # If None, notify on any price drop

@api_router.post("/products/{product_id}/price-alert")
async def subscribe_price_alert(product_id: str, data: PriceAlertRequest):
    """Subscribe to be notified when a product reaches target price or goes on sale"""
    # Check if product exists
    product = await db.products.find_one(
        {"product_id": product_id}, 
        {"_id": 0, "name": 1, "price": 1, "original_price": 1}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    current_price = product.get("price", 0)
    
    # Validate target price
    if data.target_price and data.target_price >= current_price:
        raise HTTPException(
            status_code=400, 
            detail=f"Le prix cible doit être inférieur au prix actuel ({current_price} FCFA)"
        )
    
    # Check if already subscribed for same product/email
    existing = await db.price_alerts.find_one({
        "email": data.email,
        "product_id": product_id,
        "notified": False
    })
    if existing:
        # Update target price if different
        if data.target_price != existing.get("target_price"):
            await db.price_alerts.update_one(
                {"_id": existing["_id"]},
                {"$set": {"target_price": data.target_price}}
            )
            return {
                "message": "Alerte prix mise à jour",
                "already_subscribed": True,
                "target_price": data.target_price
            }
        return {"message": "Vous êtes déjà inscrit pour ce produit", "already_subscribed": True}
    
    # Create price alert subscription
    alert_doc = {
        "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
        "email": data.email,
        "product_id": product_id,
        "product_name": product.get("name"),
        "original_price": current_price,
        "target_price": data.target_price,  # None means any discount
        "notified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.price_alerts.insert_one(alert_doc)
    
    message = "Vous serez notifié dès que le produit sera en promotion"
    if data.target_price:
        message = f"Vous serez notifié quand le prix atteindra {data.target_price} FCFA"
    
    return {
        "message": message,
        "already_subscribed": False,
        "target_price": data.target_price
    }

@api_router.get("/products/{product_id}/price-alert/check")
async def check_price_alert(product_id: str, email: str):
    """Check if user has an active price alert for a product"""
    alert = await db.price_alerts.find_one({
        "email": email,
        "product_id": product_id,
        "notified": False
    }, {"_id": 0})
    
    if alert:
        return {
            "has_alert": True,
            "target_price": alert.get("target_price"),
            "created_at": alert.get("created_at")
        }
    return {"has_alert": False}

@api_router.delete("/products/{product_id}/price-alert")
async def cancel_price_alert(product_id: str, email: str):
    """Cancel a price alert subscription"""
    result = await db.price_alerts.delete_one({
        "email": email,
        "product_id": product_id,
        "notified": False
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    return {"message": "Alerte prix annulée"}

@api_router.get("/admin/price-alerts")
async def get_price_alerts(user: User = Depends(require_admin)):
    """Get all pending price alerts"""
    alerts = await db.price_alerts.find(
        {"notified": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return alerts

# ============== NEWSLETTER ROUTES ==============

@api_router.post("/newsletter/subscribe")
async def subscribe_newsletter(data: NewsletterSubscribe):
    """Subscribe to newsletter"""
    # Check if already subscribed
    existing = await db.newsletter.find_one({"email": data.email})
    if existing:
        return {"message": "Vous êtes déjà inscrit à notre newsletter", "already_subscribed": True}
    
    # Generate promo code
    promo_code = f"WELCOME{uuid.uuid4().hex[:6].upper()}"
    
    subscriber_doc = {
        "subscriber_id": f"sub_{uuid.uuid4().hex[:12]}",
        "email": data.email,
        "name": data.name,
        "promo_code": promo_code,
        "discount_percent": 10,
        "promo_used": False,
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    
    await db.newsletter.insert_one(subscriber_doc)
    
    # Send welcome email (async, don't wait)
    asyncio.create_task(send_newsletter_welcome_email(data.email, data.name or ""))
    
    return {
        "message": "Inscription réussie ! Voici votre code promo",
        "promo_code": promo_code,
        "discount_percent": 10,
        "already_subscribed": False
    }

@api_router.get("/newsletter/validate/{promo_code}")
async def validate_promo_code(promo_code: str):
    """Validate a promo code"""
    subscriber = await db.newsletter.find_one({"promo_code": promo_code, "active": True}, {"_id": 0})
    if not subscriber:
        raise HTTPException(status_code=404, detail="Code promo invalide")
    
    if subscriber.get("promo_used"):
        raise HTTPException(status_code=400, detail="Ce code promo a déjà été utilisé")
    
    return {
        "valid": True,
        "discount_percent": subscriber["discount_percent"],
        "message": f"-{subscriber['discount_percent']}% sur votre commande"
    }

# ============== ADVANCED PROMO CODES SYSTEM ==============

class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str  # "percent", "fixed", "free_shipping"
    discount_value: int  # Percentage or fixed amount in FCFA
    min_purchase: Optional[int] = None  # Minimum purchase amount
    max_discount: Optional[int] = None  # Maximum discount for percentage
    categories: Optional[List[str]] = None  # Applicable categories (None = all)
    products: Optional[List[str]] = None  # Specific product IDs
    usage_limit: Optional[int] = None  # Total usage limit
    per_user_limit: int = 1  # Usage per user
    start_date: Optional[str] = None  # ISO datetime
    end_date: Optional[str] = None  # ISO datetime
    is_active: bool = True
    description: Optional[str] = None

@api_router.post("/admin/promo-codes")
async def create_promo_code(promo: PromoCodeCreate, user: User = Depends(require_admin)):
    """Create a new promo code"""
    # Check if code already exists
    existing = await db.promo_codes.find_one({"code": promo.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code promo existe déjà")
    
    promo_doc = {
        "promo_id": f"promo_{uuid.uuid4().hex[:8]}",
        "code": promo.code.upper(),
        "discount_type": promo.discount_type,
        "discount_value": promo.discount_value,
        "min_purchase": promo.min_purchase,
        "max_discount": promo.max_discount,
        "categories": promo.categories,
        "products": promo.products,
        "usage_limit": promo.usage_limit,
        "per_user_limit": promo.per_user_limit,
        "start_date": promo.start_date,
        "end_date": promo.end_date,
        "is_active": promo.is_active,
        "description": promo.description,
        "usage_count": 0,
        "users_used": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.user_id
    }
    
    await db.promo_codes.insert_one(promo_doc)
    promo_doc.pop("_id", None)
    return promo_doc

@api_router.get("/admin/promo-codes")
async def list_promo_codes(user: User = Depends(require_admin)):
    """List all promo codes"""
    codes = await db.promo_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return codes

@api_router.put("/admin/promo-codes/{promo_id}")
async def update_promo_code(promo_id: str, promo: PromoCodeCreate, user: User = Depends(require_admin)):
    """Update a promo code"""
    result = await db.promo_codes.update_one(
        {"promo_id": promo_id},
        {"$set": {
            "code": promo.code.upper(),
            "discount_type": promo.discount_type,
            "discount_value": promo.discount_value,
            "min_purchase": promo.min_purchase,
            "max_discount": promo.max_discount,
            "categories": promo.categories,
            "products": promo.products,
            "usage_limit": promo.usage_limit,
            "per_user_limit": promo.per_user_limit,
            "start_date": promo.start_date,
            "end_date": promo.end_date,
            "is_active": promo.is_active,
            "description": promo.description,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Code promo non trouvé")
    return {"message": "Code promo mis à jour"}

@api_router.delete("/admin/promo-codes/{promo_id}")
async def delete_promo_code(promo_id: str, user: User = Depends(require_admin)):
    """Delete a promo code"""
    result = await db.promo_codes.delete_one({"promo_id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Code promo non trouvé")
    return {"message": "Code promo supprimé"}

@api_router.post("/promo-codes/validate")
async def validate_advanced_promo_code(request: Request):
    """Validate a promo code for checkout"""
    body = await request.json()
    code = body.get("code", "").upper()
    cart_total = body.get("cart_total", 0)
    cart_items = body.get("cart_items", [])
    user_id = body.get("user_id")
    
    # Find promo code
    promo = await db.promo_codes.find_one({"code": code, "is_active": True}, {"_id": 0})
    
    if not promo:
        # Check newsletter promo codes as fallback
        subscriber = await db.newsletter.find_one({"promo_code": code, "active": True}, {"_id": 0})
        if subscriber and not subscriber.get("promo_used"):
            return {
                "valid": True,
                "discount_type": "percent",
                "discount_value": subscriber["discount_percent"],
                "discount_amount": int(cart_total * subscriber["discount_percent"] / 100),
                "message": f"-{subscriber['discount_percent']}% sur votre commande",
                "source": "newsletter"
            }
        raise HTTPException(status_code=404, detail="Code promo invalide ou expiré")
    
    now = datetime.now(timezone.utc)
    
    # Check date validity
    if promo.get("start_date"):
        start = datetime.fromisoformat(promo["start_date"].replace("Z", "+00:00"))
        if now < start:
            raise HTTPException(status_code=400, detail="Ce code promo n'est pas encore actif")
    
    if promo.get("end_date"):
        end = datetime.fromisoformat(promo["end_date"].replace("Z", "+00:00"))
        if now > end:
            raise HTTPException(status_code=400, detail="Ce code promo a expiré")
    
    # Check usage limit
    if promo.get("usage_limit") and promo.get("usage_count", 0) >= promo["usage_limit"]:
        raise HTTPException(status_code=400, detail="Ce code promo a atteint sa limite d'utilisation")
    
    # Check per-user limit
    if user_id and promo.get("per_user_limit"):
        user_usage = promo.get("users_used", []).count(user_id)
        if user_usage >= promo["per_user_limit"]:
            raise HTTPException(status_code=400, detail="Vous avez déjà utilisé ce code promo")
    
    # Check minimum purchase
    if promo.get("min_purchase") and cart_total < promo["min_purchase"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum d'achat requis: {promo['min_purchase']:,} FCFA".replace(",", " ")
        )
    
    # Check category restrictions
    applicable_total = cart_total
    if promo.get("categories"):
        applicable_total = 0
        for item in cart_items:
            product = await db.products.find_one({"product_id": item.get("product_id")}, {"category": 1})
            if product and product.get("category") in promo["categories"]:
                applicable_total += item.get("price", 0) * item.get("quantity", 1)
        
        if applicable_total == 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Ce code est valide uniquement pour: {', '.join(promo['categories'])}"
            )
    
    # Check product restrictions
    if promo.get("products"):
        applicable_total = 0
        for item in cart_items:
            if item.get("product_id") in promo["products"]:
                applicable_total += item.get("price", 0) * item.get("quantity", 1)
        
        if applicable_total == 0:
            raise HTTPException(status_code=400, detail="Ce code n'est pas applicable aux produits de votre panier")
    
    # Calculate discount
    discount_amount = 0
    if promo["discount_type"] == "percent":
        discount_amount = int(applicable_total * promo["discount_value"] / 100)
        if promo.get("max_discount"):
            discount_amount = min(discount_amount, promo["max_discount"])
    elif promo["discount_type"] == "fixed":
        discount_amount = promo["discount_value"]
    elif promo["discount_type"] == "free_shipping":
        discount_amount = 0  # Shipping handled separately
    
    # Build response message
    message = ""
    if promo["discount_type"] == "percent":
        message = f"-{promo['discount_value']}%"
        if promo.get("max_discount"):
            message += f" (max {promo['max_discount']:,} FCFA)".replace(",", " ")
    elif promo["discount_type"] == "fixed":
        message = f"-{promo['discount_value']:,} FCFA".replace(",", " ")
    elif promo["discount_type"] == "free_shipping":
        message = "Livraison gratuite"
    
    return {
        "valid": True,
        "promo_id": promo["promo_id"],
        "code": promo["code"],
        "discount_type": promo["discount_type"],
        "discount_value": promo["discount_value"],
        "discount_amount": discount_amount,
        "message": message,
        "description": promo.get("description"),
        "source": "promo_code"
    }

@api_router.post("/promo-codes/apply")
async def apply_promo_code(request: Request):
    """Apply promo code to an order (called after successful checkout)"""
    body = await request.json()
    code = body.get("code", "").upper()
    user_id = body.get("user_id")
    order_id = body.get("order_id")
    
    # Update promo code usage
    result = await db.promo_codes.update_one(
        {"code": code},
        {
            "$inc": {"usage_count": 1},
            "$push": {"users_used": user_id} if user_id else {}
        }
    )
    
    # Also check newsletter codes
    if result.modified_count == 0:
        await db.newsletter.update_one(
            {"promo_code": code},
            {"$set": {"promo_used": True, "used_on_order": order_id}}
        )
    
    return {"message": "Code promo appliqué"}

# ============== HOMEPAGE REVIEWS/TESTIMONIALS ==============

@api_router.get("/reviews/featured")
async def get_featured_reviews():
    """Get featured reviews for homepage testimonials section"""
    # Get reviews with high ratings (4-5 stars) and verified purchases
    reviews = await db.reviews.find(
        {"rating": {"$gte": 4}, "verified_purchase": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Enrich with product info
    enriched_reviews = []
    for review in reviews:
        product = await db.products.find_one(
            {"product_id": review["product_id"]},
            {"_id": 0, "name": 1, "images": 1}
        )
        if product:
            review["product_name"] = product.get("name")
            review["product_image"] = product.get("images", [""])[0] if product.get("images") else ""
            enriched_reviews.append(review)
    
    return enriched_reviews[:6]  # Return top 6

@api_router.get("/reviews/stats")
async def get_reviews_stats():
    """Get overall review statistics for trust indicators"""
    pipeline = [
        {"$group": {
            "_id": None,
            "total_reviews": {"$sum": 1},
            "average_rating": {"$avg": "$rating"},
            "five_star": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}},
            "four_star": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
            "three_star": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
            "two_star": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
            "one_star": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}}
        }}
    ]
    
    stats = await db.reviews.aggregate(pipeline).to_list(1)
    
    if stats:
        return {
            "total_reviews": stats[0]["total_reviews"],
            "average_rating": round(stats[0]["average_rating"], 1),
            "rating_distribution": {
                "5": stats[0]["five_star"],
                "4": stats[0]["four_star"],
                "3": stats[0]["three_star"],
                "2": stats[0]["two_star"],
                "1": stats[0]["one_star"]
            },
            "satisfaction_rate": round(
                (stats[0]["five_star"] + stats[0]["four_star"]) / stats[0]["total_reviews"] * 100
            ) if stats[0]["total_reviews"] > 0 else 0
        }
    
    return {
        "total_reviews": 0,
        "average_rating": 0,
        "rating_distribution": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
        "satisfaction_rate": 0
    }

# ============== REFERRAL SYSTEM ==============

REFERRAL_CONFIG = {
    "referrer_reward": 5000,  # FCFA credited to referrer
    "referee_discount": 10,   # % discount for new user
    "min_purchase_for_reward": 30000,  # Minimum purchase to trigger reward
    "max_referrals_per_user": 50,  # Maximum referrals per user
}

def generate_referral_code(user_id: str) -> str:
    """Generate a unique referral code for a user"""
    hash_obj = hashlib.md5(f"{user_id}_{STORE_NAME}".encode())
    return f"YAMA{hash_obj.hexdigest()[:6].upper()}"

@api_router.get("/referral/my-code")
async def get_my_referral_code(user: User = Depends(require_auth)):
    """Get or create referral code for current user"""
    # Check if user already has a referral record
    referral = await db.referrals.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not referral:
        # Create new referral record
        code = generate_referral_code(user.user_id)
        referral = {
            "user_id": user.user_id,
            "code": code,
            "referrals_count": 0,
            "successful_referrals": 0,
            "total_earnings": 0,
            "pending_earnings": 0,
            "referred_users": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.referrals.insert_one(referral)
        referral.pop("_id", None)
    
    return {
        "code": referral["code"],
        "referrals_count": referral.get("referrals_count", 0),
        "successful_referrals": referral.get("successful_referrals", 0),
        "total_earnings": referral.get("total_earnings", 0),
        "pending_earnings": referral.get("pending_earnings", 0),
        "share_link": f"https://groupeyamaplus.com?ref={referral['code']}",
        "config": REFERRAL_CONFIG
    }

@api_router.get("/referral/validate/{code}")
async def validate_referral_code(code: str):
    """Validate a referral code and get discount info"""
    referral = await db.referrals.find_one({"code": code.upper()}, {"_id": 0})
    
    if not referral:
        raise HTTPException(status_code=404, detail="Code parrain invalide")
    
    # Get referrer info
    referrer = await db.users.find_one({"user_id": referral["user_id"]}, {"_id": 0, "name": 1})
    
    return {
        "valid": True,
        "referrer_name": referrer.get("name", "Un ami") if referrer else "Un ami",
        "discount_percent": REFERRAL_CONFIG["referee_discount"],
        "message": f"-{REFERRAL_CONFIG['referee_discount']}% sur votre première commande"
    }

@api_router.post("/referral/apply")
async def apply_referral_code(request: Request):
    """Apply referral code to a new user registration"""
    body = await request.json()
    code = body.get("code", "").upper()
    new_user_id = body.get("user_id")
    
    if not code or not new_user_id:
        raise HTTPException(status_code=400, detail="Code et user_id requis")
    
    # Find referral
    referral = await db.referrals.find_one({"code": code})
    if not referral:
        raise HTTPException(status_code=404, detail="Code parrain invalide")
    
    # Check if user was already referred
    if new_user_id in referral.get("referred_users", []):
        raise HTTPException(status_code=400, detail="Cet utilisateur a déjà utilisé un code parrain")
    
    # Check max referrals
    if referral.get("referrals_count", 0) >= REFERRAL_CONFIG["max_referrals_per_user"]:
        raise HTTPException(status_code=400, detail="Ce code a atteint sa limite d'utilisation")
    
    # Update referral stats
    await db.referrals.update_one(
        {"code": code},
        {
            "$inc": {"referrals_count": 1},
            "$push": {"referred_users": new_user_id}
        }
    )
    
    # Store referral relationship for the new user
    await db.user_referrals.insert_one({
        "user_id": new_user_id,
        "referrer_code": code,
        "referrer_user_id": referral["user_id"],
        "discount_applied": False,
        "reward_given": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Code parrain appliqué", "discount_percent": REFERRAL_CONFIG["referee_discount"]}

@api_router.post("/referral/complete-purchase")
async def complete_referral_purchase(request: Request):
    """Called after a referred user makes their first purchase"""
    body = await request.json()
    user_id = body.get("user_id")
    order_total = body.get("order_total", 0)
    order_id = body.get("order_id")
    
    # Find referral relationship
    user_referral = await db.user_referrals.find_one(
        {"user_id": user_id, "reward_given": False}
    )
    
    if not user_referral:
        return {"message": "Pas de parrainage actif"}
    
    # Check minimum purchase
    if order_total < REFERRAL_CONFIG["min_purchase_for_reward"]:
        return {"message": f"Achat minimum de {REFERRAL_CONFIG['min_purchase_for_reward']} FCFA requis pour le parrainage"}
    
    # Credit referrer
    await db.referrals.update_one(
        {"user_id": user_referral["referrer_user_id"]},
        {
            "$inc": {
                "successful_referrals": 1,
                "total_earnings": REFERRAL_CONFIG["referrer_reward"],
                "pending_earnings": REFERRAL_CONFIG["referrer_reward"]
            }
        }
    )
    
    # Mark as completed
    await db.user_referrals.update_one(
        {"user_id": user_id},
        {"$set": {"reward_given": True, "order_id": order_id, "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create reward record for referrer
    referrer = await db.users.find_one({"user_id": user_referral["referrer_user_id"]}, {"email": 1, "name": 1})
    await db.referral_rewards.insert_one({
        "referrer_user_id": user_referral["referrer_user_id"],
        "referred_user_id": user_id,
        "order_id": order_id,
        "reward_amount": REFERRAL_CONFIG["referrer_reward"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send notification email to referrer
    if referrer and referrer.get("email"):
        try:
            await send_email_mailersend(
                to_email=referrer["email"],
                to_name=referrer.get('name', ''),
                subject=f"🎉 Félicitations ! Vous avez gagné {REFERRAL_CONFIG['referrer_reward']} FCFA",
                html_content=f"""
                <h2>Bravo {referrer.get('name', '')} !</h2>
                <p>Un ami que vous avez parrainé vient de faire son premier achat sur YAMA+.</p>
                <p>Vous avez gagné <strong>{REFERRAL_CONFIG['referrer_reward']} FCFA</strong> de crédit !</p>
                <p>Continuez à partager votre code pour gagner encore plus.</p>
                <p>L'équipe GROUPE YAMA+</p>
                """
            )
        except Exception as e:
            logger.error(f"Error sending referral reward email: {e}")
    
    return {"message": "Récompense parrainage créditée", "reward": REFERRAL_CONFIG["referrer_reward"]}

@api_router.get("/referral/leaderboard")
async def get_referral_leaderboard():
    """Get top referrers leaderboard"""
    top_referrers = await db.referrals.find(
        {"successful_referrals": {"$gt": 0}},
        {"_id": 0, "user_id": 1, "successful_referrals": 1, "total_earnings": 1}
    ).sort("successful_referrals", -1).limit(10).to_list(10)
    
    # Enrich with user names (anonymized)
    result = []
    for i, ref in enumerate(top_referrers):
        user = await db.users.find_one({"user_id": ref["user_id"]}, {"name": 1})
        name = user.get("name", "Utilisateur") if user else "Utilisateur"
        # Anonymize: "Amadou D." instead of full name
        parts = name.split()
        display_name = f"{parts[0]} {parts[1][0]}." if len(parts) > 1 else parts[0]
        
        result.append({
            "rank": i + 1,
            "name": display_name,
            "referrals": ref["successful_referrals"],
            "earnings": ref["total_earnings"]
        })
    
    return result

@api_router.get("/admin/referrals")
async def get_admin_referrals(user: User = Depends(require_admin)):
    """Admin: Get all referral stats"""
    # Get total stats
    pipeline = [
        {"$group": {
            "_id": None,
            "total_referrals": {"$sum": "$referrals_count"},
            "successful_referrals": {"$sum": "$successful_referrals"},
            "total_rewards": {"$sum": "$total_earnings"}
        }}
    ]
    stats = await db.referrals.aggregate(pipeline).to_list(1)
    
    # Get recent referrals
    recent = await db.user_referrals.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    # Get top referrers
    top = await db.referrals.find({}, {"_id": 0}).sort("successful_referrals", -1).limit(10).to_list(10)
    
    return {
        "stats": stats[0] if stats else {"total_referrals": 0, "successful_referrals": 0, "total_rewards": 0},
        "recent_referrals": recent,
        "top_referrers": top,
        "config": REFERRAL_CONFIG
    }

# ============== PUSH NOTIFICATIONS ==============

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict
    user_id: Optional[str] = None

@api_router.post("/notifications/subscribe")
async def subscribe_push(subscription: PushSubscription, request: Request):
    """Subscribe to push notifications"""
    # Get user if authenticated
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
        except:
            pass
    
    sub_doc = {
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "user_id": user_id or subscription.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True
    }
    
    # Upsert subscription
    await db.push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": sub_doc},
        upsert=True
    )
    
    return {"message": "Abonnement aux notifications activé"}

@api_router.delete("/notifications/unsubscribe")
async def unsubscribe_push(request: Request):
    """Unsubscribe from push notifications"""
    body = await request.json()
    endpoint = body.get("endpoint")
    
    if endpoint:
        await db.push_subscriptions.update_one(
            {"endpoint": endpoint},
            {"$set": {"active": False}}
        )
    
    return {"message": "Désabonnement effectué"}

@api_router.post("/admin/notifications/send")
async def send_push_notification(request: Request, user: User = Depends(require_admin)):
    """Admin: Send push notification to all subscribers"""
    body = await request.json()
    title = body.get("title", "YAMA+")
    message = body.get("message", "")
    url = body.get("url", "/")
    target_users = body.get("user_ids")  # Optional: specific users
    
    # Get active subscriptions
    query = {"active": True}
    if target_users:
        query["user_id"] = {"$in": target_users}
    
    subscriptions = await db.push_subscriptions.find(query, {"_id": 0}).to_list(1000)
    
    # Store notification
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:8]}",
        "title": title,
        "message": message,
        "url": url,
        "sent_to": len(subscriptions),
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_by": user.user_id
    }
    await db.notifications.insert_one(notification)
    
    # Note: Actual push sending requires web-push library and VAPID keys
    # For now, we store the notification for client-side polling
    
    return {
        "message": f"Notification envoyée à {len(subscriptions)} abonnés",
        "notification_id": notification["notification_id"]
    }

@api_router.get("/notifications/recent")
async def get_recent_notifications(request: Request):
    """Get recent notifications for polling"""
    # Get user if authenticated
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
        except:
            pass
    
    # Get notifications from last 24 hours
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    notifications = await db.notifications.find(
        {"sent_at": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("sent_at", -1).limit(5).to_list(5)
    
    return notifications

# ============== LIVE CHAT SYSTEM ==============

class ChatMessage(BaseModel):
    message: str
    sender_type: str = "customer"  # customer or support

@api_router.post("/chat/start")
async def start_chat_session(request: Request):
    """Start a new chat session"""
    body = await request.json()
    
    # Get user info if authenticated
    user_id = None
    user_name = body.get("name", "Visiteur")
    user_email = body.get("email", "")
    
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
            user = await db.users.find_one({"user_id": user_id}, {"name": 1, "email": 1})
            if user:
                user_name = user.get("name", user_name)
                user_email = user.get("email", user_email)
        except:
            pass
    
    session = {
        "session_id": f"chat_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "status": "active",
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_sessions.insert_one(session)
    session.pop("_id", None)
    
    # Auto-reply
    welcome_message = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "message": f"Bonjour {user_name} ! 👋 Comment puis-je vous aider aujourd'hui ?",
        "sender_type": "support",
        "sender_name": "Support YAMA+",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_sessions.update_one(
        {"session_id": session["session_id"]},
        {"$push": {"messages": welcome_message}}
    )
    
    session["messages"] = [welcome_message]
    
    return session

@api_router.post("/chat/{session_id}/message")
async def send_chat_message(session_id: str, msg: ChatMessage):
    """Send a message in a chat session"""
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    message = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "message": msg.message,
        "sender_type": msg.sender_type,
        "sender_name": session.get("user_name") if msg.sender_type == "customer" else "Support YAMA+",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Auto-responses based on keywords
    auto_reply = None
    msg_lower = msg.message.lower()
    
    if any(word in msg_lower for word in ["livraison", "délai", "expédition"]):
        auto_reply = "📦 Nous livrons en 24-48h à Dakar et 3-5 jours pour les régions. Les frais de livraison sont de 2000 FCFA pour Dakar et 3500 FCFA ailleurs."
    elif any(word in msg_lower for word in ["paiement", "payer", "wave", "orange money"]):
        auto_reply = "💳 Nous acceptons Wave, Orange Money, Free Money, carte bancaire et paiement à la livraison. Tous les paiements sont sécurisés."
    elif any(word in msg_lower for word in ["retour", "remboursement", "échange"]):
        auto_reply = "↩️ Vous disposez de 7 jours pour retourner un article. Contactez-nous sur WhatsApp au +221 78 382 75 75 pour organiser le retour."
    elif any(word in msg_lower for word in ["commande", "suivi", "tracking"]):
        auto_reply = "📋 Pour suivre votre commande, rendez-vous dans 'Mon compte' > 'Mes commandes'. Vous y trouverez le statut en temps réel."
    elif any(word in msg_lower for word in ["bonjour", "salut", "hello", "bonsoir"]):
        auto_reply = "Bonjour ! 😊 Je suis là pour vous aider. Que puis-je faire pour vous ?"
    elif any(word in msg_lower for word in ["merci", "thanks"]):
        auto_reply = "Je vous en prie ! N'hésitez pas si vous avez d'autres questions. Bonne journée ! 🙏"
    
    if auto_reply and msg.sender_type == "customer":
        auto_message = {
            "message_id": f"msg_{uuid.uuid4().hex[:8]}",
            "message": auto_reply,
            "sender_type": "support",
            "sender_name": "Support YAMA+",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "auto_reply": True
        }
        await db.chat_sessions.update_one(
            {"session_id": session_id},
            {"$push": {"messages": auto_message}}
        )
        return {"message": message, "auto_reply": auto_message}
    
    return {"message": message}

@api_router.get("/chat/{session_id}")
async def get_chat_session(session_id: str):
    """Get chat session with messages"""
    session = await db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    return session

@api_router.post("/chat/{session_id}/close")
async def close_chat_session(session_id: str):
    """Close a chat session"""
    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Session fermée"}

@api_router.get("/admin/chat/sessions")
async def get_admin_chat_sessions(user: User = Depends(require_admin)):
    """Admin: Get all chat sessions"""
    sessions = await db.chat_sessions.find({}, {"_id": 0}).sort("updated_at", -1).limit(50).to_list(50)
    
    # Stats
    active = await db.chat_sessions.count_documents({"status": "active"})
    total = await db.chat_sessions.count_documents({})
    
    return {
        "sessions": sessions,
        "stats": {
            "active": active,
            "total": total
        }
    }

# ============== SPIN WHEEL GAME ROUTES ==============

import random

# Prize configuration with probabilities
SPIN_PRIZES = [
    {"type": "discount_5", "label": "-5%", "probability": 0.50, "discount": 5},
    {"type": "discount_10", "label": "-10%", "probability": 0.25, "discount": 10},
    {"type": "free_shipping", "label": "Livraison Gratuite", "probability": 0.15, "discount": 0},
    {"type": "discount_15", "label": "-15%", "probability": 0.08, "discount": 15},
    {"type": "discount_20", "label": "-20%", "probability": 0.02, "discount": 20},
]

# Game configuration
GAME_CONFIG = {
    "name": "Roue de la Fortune",
    "end_date": "2026-12-31T23:59:59Z",  # Extended for long-term use
    "max_jerseys": 0,  # No more jerseys
    "min_purchase_for_spin": 25000,  # FCFA
}

def select_prize():
    """Select a prize based on probabilities"""
    rand = random.random()
    cumulative = 0
    for prize in SPIN_PRIZES:
        cumulative += prize["probability"]
        if rand <= cumulative:
            return prize
    return SPIN_PRIZES[0]  # Default to smallest prize

def generate_prize_code():
    """Generate a unique prize code"""
    import string
    return "YAMA-" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

@api_router.get("/game/config")
async def get_game_config():
    """Get game configuration and stats"""
    # Count jerseys already won
    jerseys_won = await db.spins.count_documents({"prize_type": "jersey"})
    total_spins = await db.spins.count_documents({})
    
    # Check if game is active
    end_date = datetime.fromisoformat(GAME_CONFIG["end_date"].replace("Z", "+00:00"))
    is_active = datetime.now(timezone.utc) < end_date
    
    return {
        "name": GAME_CONFIG["name"],
        "end_date": GAME_CONFIG["end_date"],
        "active": is_active,
        "jerseys_remaining": max(0, GAME_CONFIG["max_jerseys"] - jerseys_won),
        "total_jerseys": GAME_CONFIG["max_jerseys"],
        "total_spins": total_spins,
        "prizes": [{"type": p["type"], "label": p["label"]} for p in SPIN_PRIZES],
        "min_purchase": GAME_CONFIG["min_purchase_for_spin"]
    }

@api_router.get("/game/check-eligibility")
async def check_spin_eligibility(email: str):
    """Check if user can spin (newsletter or after purchase)"""
    # Check if email has a free newsletter spin available
    newsletter_sub = await db.newsletter.find_one({"email": email})
    has_newsletter_spin = newsletter_sub and not newsletter_sub.get("spin_used", False)
    
    # Count total spins for this email
    total_spins = await db.spins.count_documents({"email": email})
    
    # Check for unused purchase spins
    unused_purchase_spins = await db.spins.count_documents({
        "email": email, 
        "spin_type": "purchase_credit",
        "used": False
    })
    
    return {
        "can_spin": has_newsletter_spin or unused_purchase_spins > 0,
        "has_newsletter_spin": has_newsletter_spin,
        "purchase_spins_available": unused_purchase_spins,
        "total_spins_done": total_spins,
        "is_subscribed": newsletter_sub is not None
    }

@api_router.post("/game/spin")
async def spin_wheel(data: SpinRequest):
    """Spin the wheel and get a prize"""
    # Check game is active
    end_date = datetime.fromisoformat(GAME_CONFIG["end_date"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > end_date:
        raise HTTPException(status_code=400, detail="Le jeu est terminé")
    
    # Check eligibility
    eligibility = await check_spin_eligibility(data.email)
    
    if not eligibility["can_spin"]:
        # If not subscribed, subscribe them first for a free spin
        if not eligibility["is_subscribed"]:
            # Auto-subscribe to newsletter
            subscriber_doc = {
                "email": data.email,
                "name": data.name or "",
                "subscribed_at": datetime.now(timezone.utc).isoformat(),
                "active": True,
                "spin_used": False,
                "source": "spin_game"
            }
            await db.newsletter.insert_one(subscriber_doc)
            eligibility["has_newsletter_spin"] = True
            eligibility["can_spin"] = True
        else:
            raise HTTPException(
                status_code=400, 
                detail="Vous avez utilisé tous vos tours. Faites un achat de +25 000 FCFA pour un nouveau tour!"
            )
    
    # Select prize
    prize = select_prize()
    
    # Check if jersey is still available
    if prize["type"] == "jersey":
        jerseys_won = await db.spins.count_documents({"prize_type": "jersey"})
        if jerseys_won >= GAME_CONFIG["max_jerseys"]:
            # No more jerseys, give 20% discount instead
            prize = {"type": "discount_20", "label": "-20%", "probability": 0, "discount": 20}
    
    # Generate prize code
    prize_code = generate_prize_code()
    
    # Determine spin type
    spin_type = "newsletter" if eligibility["has_newsletter_spin"] else "purchase"
    
    # Save spin result
    spin_doc = {
        "spin_id": f"SPIN-{uuid.uuid4().hex[:8].upper()}",
        "email": data.email,
        "name": data.name,
        "prize_type": prize["type"],
        "prize_label": prize["label"],
        "prize_code": prize_code,
        "discount_value": prize.get("discount", 0),
        "spin_type": spin_type,
        "claimed": False,
        "jersey_name": data.jersey_name if prize["type"] == "jersey" else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.spins.insert_one(spin_doc)
    
    # Mark newsletter spin as used
    if spin_type == "newsletter":
        await db.newsletter.update_one(
            {"email": data.email},
            {"$set": {"spin_used": True}}
        )
    else:
        # Mark one purchase spin as used
        await db.spins.update_one(
            {"email": data.email, "spin_type": "purchase_credit", "used": False},
            {"$set": {"used": True}}
        )
    
    return {
        "spin_id": spin_doc["spin_id"],
        "prize_type": prize["type"],
        "prize_label": prize["label"],
        "prize_code": prize_code,
        "discount_value": prize.get("discount", 0),
        "is_jersey": False,
        "message": f"Bravo! Vous avez gagné {prize['label']}!"
    }

@api_router.get("/game/my-prizes")
async def get_my_prizes(email: str):
    """Get all prizes won by an email"""
    prizes = await db.spins.find(
        {"email": email, "spin_type": {"$ne": "purchase_credit"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return prizes

@api_router.post("/game/claim-jersey")
async def claim_jersey(spin_id: str, jersey_name: str, phone: str, address: str):
    """Claim a jersey prize with delivery info"""
    spin = await db.spins.find_one({"spin_id": spin_id, "prize_type": "jersey"})
    
    if not spin:
        raise HTTPException(status_code=404, detail="Prix non trouvé")
    
    if spin.get("claimed"):
        raise HTTPException(status_code=400, detail="Ce prix a déjà été réclamé")
    
    await db.spins.update_one(
        {"spin_id": spin_id},
        {"$set": {
            "claimed": True,
            "jersey_name": jersey_name,
            "delivery_phone": phone,
            "delivery_address": address,
            "claimed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Maillot réclamé! Nous vous contacterons bientôt pour la livraison."}

@api_router.get("/game/winners")
async def get_jersey_winners():
    """Get list of jersey winners (for display)"""
    winners = await db.spins.find(
        {"prize_type": "jersey"},
        {"_id": 0, "email": 0, "delivery_phone": 0, "delivery_address": 0}
    ).sort("created_at", -1).to_list(20)
    
    # Mask names for privacy
    for w in winners:
        if w.get("name"):
            name = w["name"]
            w["name"] = name[0] + "***" + (name[-1] if len(name) > 1 else "")
    
    return winners

# ============== EMAIL CAMPAIGN ROUTES ==============

def get_email_template(content: str, title: str = "GROUPE YAMA+") -> str:
    """Generate a beautiful HTML email template with GROUPE YAMA+ branding"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header with GROUPE YAMA+ Logo -->
                        <tr>
                            <td style="background: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #eee;">
                                <img src="https://customer-assets.emergentagent.com/job_e6239d43-b0aa-4da9-acc9-7394bc51750f/artifacts/ejzc4vzk_0CA7A224-A371-430F-8856-6F8BE8C1FCDE.png" alt="GROUPE YAMA+" style="max-width: 200px; height: auto;">
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                {content}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                                <!-- Signature style cursive -->
                                <p style="font-family: 'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive; font-size: 32px; color: #ffffff; margin: 0 0 20px 0; font-weight: normal; font-style: italic;">
                                    Groupe Yama <span style="color: #ff6b00;">+</span>
                                </p>
                                <p style="color: #888888; font-size: 12px; margin: 0 0 15px 0; letter-spacing: 1px;">
                                    groupeyamaplus.com
                                </p>
                                <p style="color: #666666; font-size: 11px; margin: 0 0 8px 0;">
                                    📍 Dakar, Sénégal | 📞 WhatsApp: +221 78 382 75 75
                                </p>
                                <p style="color: #555555; font-size: 10px; margin: 15px 0 0 0;">
                                    © 2025 GROUPE YAMA+ - Tous droits réservés
                                </p>
                            </td>
                        </tr>
                    </table>
                    <!-- Unsubscribe -->
                    <p style="color: #999; font-size: 11px; margin-top: 20px; text-align: center;">
                        <a href="{SITE_URL}/unsubscribe" style="color: #999; text-decoration: underline;">Se désabonner</a>
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

# ============== EMAIL TEMPLATES ==============

def get_password_reset_template(name: str, reset_link: str) -> str:
    """Password reset email template"""
    content = f"""
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Réinitialisation de mot de passe</h2>
    <p style="color: #333; font-size: 16px; line-height: 1.6;">Bonjour {name},</p>
    <p style="color: #666; font-size: 15px; line-height: 1.6;">
        Vous avez demandé à réinitialiser votre mot de passe sur YAMA+.
    </p>
    <p style="color: #666; font-size: 15px; line-height: 1.6;">
        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_link}" style="background-color: #000; color: #fff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Réinitialiser mon mot de passe
        </a>
    </div>
    <p style="color: #999; font-size: 13px; line-height: 1.6;">
        Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>
    """
    return get_email_template(content, "Réinitialisation de mot de passe")

def get_order_confirmation_template(order: dict) -> str:
    """Order confirmation email template"""
    items_html = ""
    for item in order.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #eee;">
                <div style="display: flex; align-items: center;">
                    <img src="{item.get('image', '')}" alt="{item.get('name', '')}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                    <div>
                        <p style="margin: 0; font-weight: 600; color: #333;">{item.get('name', '')}</p>
                        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Qté: {item.get('quantity', 1)}</p>
                    </div>
                </div>
            </td>
            <td style="padding: 15px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #333;">
                {item.get('price', 0):,} FCFA
            </td>
        </tr>
        """
    
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="width: 60px; height: 60px; background-color: #4CAF50; border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 30px;">✓</span>
        </div>
        <h2 style="color: #1a1a1a; margin: 0;">Commande confirmée !</h2>
        <p style="color: #666; margin: 10px 0 0 0;">Merci pour votre achat</p>
    </div>
    
    <div style="background-color: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Numéro de commande</p>
        <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 700; color: #000;">{order.get('order_id', '')}</p>
    </div>
    
    <h3 style="color: #333; margin: 25px 0 15px 0; font-size: 16px;">Récapitulatif</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
        {items_html}
        <tr>
            <td style="padding: 15px 0; font-weight: 600; color: #333;">Sous-total</td>
            <td style="padding: 15px 0; text-align: right; color: #333;">{order.get('subtotal', 0):,} FCFA</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; color: #666;">Livraison</td>
            <td style="padding: 10px 0; text-align: right; color: #666;">{order.get('shipping_cost', 0):,} FCFA</td>
        </tr>
        <tr>
            <td style="padding: 15px 0; font-size: 18px; font-weight: 700; color: #000; border-top: 2px solid #000;">Total</td>
            <td style="padding: 15px 0; text-align: right; font-size: 18px; font-weight: 700; color: #000; border-top: 2px solid #000;">{order.get('total', 0):,} FCFA</td>
        </tr>
    </table>
    
    <div style="background-color: #f0f7ff; border-radius: 12px; padding: 20px; margin-top: 25px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">📦 Adresse de livraison</h4>
        <p style="margin: 0; color: #666; line-height: 1.6;">
            {order.get('shipping', {}).get('full_name', '')}<br>
            {order.get('shipping', {}).get('address', '')}<br>
            {order.get('shipping', {}).get('city', '')} - {order.get('shipping', {}).get('region', '')}<br>
            📞 {order.get('shipping', {}).get('phone', '')}
        </p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{SITE_URL}/order/{order.get('order_id', '')}" style="background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Suivre ma commande
        </a>
    </div>
    """
    return get_email_template(content, "Confirmation de commande")

def get_shipping_update_template(order: dict, status: str, message: str) -> str:
    """Shipping status update email template"""
    status_icons = {
        "processing": "📋",
        "shipped": "🚚",
        "out_for_delivery": "📍",
        "delivered": "✅",
        "cancelled": "❌"
    }
    status_labels = {
        "processing": "En préparation",
        "shipped": "Expédiée",
        "out_for_delivery": "En cours de livraison",
        "delivered": "Livrée",
        "cancelled": "Annulée"
    }
    
    icon = status_icons.get(status, "📦")
    label = status_labels.get(status, status)
    
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 50px; margin-bottom: 15px;">{icon}</div>
        <h2 style="color: #1a1a1a; margin: 0;">Mise à jour de votre commande</h2>
        <p style="color: #666; margin: 10px 0 0 0;">Commande #{order.get('order_id', '')}</p>
    </div>
    
    <div style="background-color: #f8f8f8; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 25px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Statut actuel</p>
        <p style="margin: 10px 0 0 0; font-size: 22px; font-weight: 700; color: #000;">{label}</p>
    </div>
    
    <p style="color: #666; font-size: 15px; line-height: 1.6; text-align: center;">
        {message}
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{SITE_URL}/suivi-commande" style="background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Suivre ma commande
        </a>
    </div>
    """
    return get_email_template(content, "Mise à jour de commande")

def get_abandoned_cart_template(name: str, items: list, cart_total: int, recovery_link: str) -> str:
    """Abandoned cart reminder email template"""
    items_html = ""
    for item in items[:3]:  # Show max 3 items
        items_html += f"""
        <div style="display: inline-block; width: 150px; margin: 10px; text-align: center; vertical-align: top;">
            <img src="{item.get('image', '')}" alt="{item.get('name', '')}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 12px;">
            <p style="margin: 10px 0 5px 0; font-weight: 600; color: #333; font-size: 13px;">{item.get('name', '')[:25]}...</p>
            <p style="margin: 0; color: #000; font-weight: 700;">{item.get('price', 0):,} FCFA</p>
        </div>
        """
    
    content = f"""
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; text-align: center;">Vous avez oublié quelque chose ? 🛒</h2>
    
    <p style="color: #666; font-size: 15px; line-height: 1.6; text-align: center;">
        Bonjour {name},<br>
        Votre panier vous attend ! Finalisez votre commande avant que vos articles préférés ne soient épuisés.
    </p>
    
    <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 12px;">
        {items_html}
    </div>
    
    <div style="background-color: #fff3cd; border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; color: #856404; font-size: 14px;">💰 Total de votre panier</p>
        <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: 700; color: #000;">{cart_total:,} FCFA</p>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{recovery_link}" style="background-color: #ff6b00; color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
            🛒 Finaliser ma commande
        </a>
    </div>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 25px;">
        Besoin d'aide ? Contactez-nous sur WhatsApp : +221 78 382 75 75
    </p>
    """
    return get_email_template(content, "Votre panier vous attend !")

def get_welcome_template(name: str, promo_code: str = None) -> str:
    """Welcome email for new users"""
    promo_section = ""
    if promo_code:
        promo_section = f"""
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
            <p style="color: #fff; margin: 0 0 10px 0; font-size: 14px;">🎁 Cadeau de bienvenue</p>
            <p style="color: #fff; margin: 0; font-size: 28px; font-weight: 700;">-10% sur votre 1ère commande</p>
            <div style="background: #fff; border-radius: 8px; padding: 12px 20px; display: inline-block; margin-top: 15px;">
                <span style="font-family: monospace; font-size: 20px; font-weight: 700; color: #333;">{promo_code}</span>
            </div>
        </div>
        """
    
    content = f"""
    <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1a1a1a; margin: 0;">Bienvenue chez YAMA+ ! 🎉</h2>
    </div>
    
    <p style="color: #666; font-size: 15px; line-height: 1.6;">
        Bonjour {name},
    </p>
    <p style="color: #666; font-size: 15px; line-height: 1.6;">
        Nous sommes ravis de vous compter parmi nous ! Chez YAMA+, vous trouverez les meilleurs produits soigneusement sélectionnés pour vous.
    </p>
    
    {promo_section}
    
    <h3 style="color: #333; margin: 30px 0 15px 0;">Pourquoi choisir YAMA+ ?</h3>
    <ul style="color: #666; font-size: 14px; line-height: 2;">
        <li>✅ Produits 100% authentiques</li>
        <li>✅ Livraison rapide partout au Sénégal</li>
        <li>✅ Paiement sécurisé (Wave, Orange Money, Carte)</li>
        <li>✅ Service client disponible 7j/7</li>
    </ul>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{SITE_URL}" style="background-color: #000; color: #fff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Découvrir la boutique
        </a>
    </div>
    """
    return get_email_template(content, "Bienvenue chez YAMA+")

def get_flash_sale_template(products: list, end_time: str) -> str:
    """Flash sale announcement email template"""
    products_html = ""
    for product in products[:4]:
        discount = 0
        if product.get('original_price') and product.get('flash_sale_price'):
            discount = int((1 - product['flash_sale_price'] / product['original_price']) * 100)
        
        products_html += f"""
        <div style="display: inline-block; width: 140px; margin: 10px; text-align: center; vertical-align: top;">
            <div style="position: relative;">
                <img src="{product.get('images', [''])[0]}" alt="{product.get('name', '')}" style="width: 130px; height: 130px; object-fit: cover; border-radius: 12px;">
                <span style="position: absolute; top: 5px; right: 5px; background: #ff0000; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">-{discount}%</span>
            </div>
            <p style="margin: 10px 0 5px 0; font-size: 12px; color: #333; height: 30px; overflow: hidden;">{product.get('name', '')[:30]}</p>
            <p style="margin: 0; color: #999; text-decoration: line-through; font-size: 12px;">{product.get('original_price', 0):,} F</p>
            <p style="margin: 5px 0 0 0; color: #ff0000; font-weight: 700; font-size: 16px;">{product.get('flash_sale_price', 0):,} F</p>
        </div>
        """
    
    content = f"""
    <div style="text-align: center; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); border-radius: 12px; padding: 25px;">
            <p style="color: #fff; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">⚡ Vente Flash</p>
            <h2 style="color: #fff; margin: 10px 0; font-size: 32px;">Jusqu'à -50%</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 14px;">Se termine dans {end_time}</p>
        </div>
    </div>
    
    <div style="text-align: center; margin: 25px 0; padding: 15px; background-color: #f8f8f8; border-radius: 12px;">
        {products_html}
    </div>
    
    <div style="text-align: center; margin-top: 25px;">
        <a href="{SITE_URL}" style="background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 16px;">
            ⚡ Voir toutes les offres
        </a>
    </div>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
        Offre limitée - Dans la limite des stocks disponibles
    </p>
    """
    return get_email_template(content, "⚡ VENTE FLASH - Jusqu'à -50%")

def get_new_arrivals_template(products: list) -> str:
    """New arrivals announcement email template"""
    products_html = ""
    for product in products[:6]:
        products_html += f"""
        <div style="display: inline-block; width: 140px; margin: 10px; text-align: center; vertical-align: top;">
            <img src="{product.get('images', [''])[0]}" alt="{product.get('name', '')}" style="width: 130px; height: 130px; object-fit: cover; border-radius: 12px;">
            <p style="margin: 10px 0 5px 0; font-size: 12px; color: #333; height: 30px; overflow: hidden;">{product.get('name', '')[:30]}</p>
            <p style="margin: 0; color: #000; font-weight: 700;">{product.get('price', 0):,} FCFA</p>
        </div>
        """
    
    content = f"""
    <div style="text-align: center; margin-bottom: 25px;">
        <h2 style="color: #1a1a1a; margin: 0;">✨ Nouveautés</h2>
        <p style="color: #666; margin: 10px 0 0 0;">Découvrez nos dernières arrivées</p>
    </div>
    
    <div style="text-align: center; margin: 25px 0; padding: 15px; background-color: #f8f8f8; border-radius: 12px;">
        {products_html}
    </div>
    
    <div style="text-align: center; margin-top: 25px;">
        <a href="{SITE_URL}/nouveautes" style="background-color: #000; color: #fff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Voir toutes les nouveautés
        </a>
    </div>
    """
    return get_email_template(content, "✨ Nouveautés YAMA+")

def get_weekly_promo_template(promo_code: str, discount: int, products: list) -> str:
    """Weekly promotion email template"""
    products_html = ""
    for product in products[:4]:
        products_html += f"""
        <div style="display: inline-block; width: 140px; margin: 10px; text-align: center; vertical-align: top;">
            <img src="{product.get('images', [''])[0]}" alt="{product.get('name', '')}" style="width: 130px; height: 130px; object-fit: cover; border-radius: 12px;">
            <p style="margin: 10px 0 5px 0; font-size: 12px; color: #333;">{product.get('name', '')[:25]}</p>
            <p style="margin: 0; color: #000; font-weight: 700;">{product.get('price', 0):,} F</p>
        </div>
        """
    
    content = f"""
    <div style="text-align: center; margin-bottom: 25px;">
        <h2 style="color: #1a1a1a; margin: 0;">🔥 Offre de la semaine</h2>
        <p style="color: #666; margin: 10px 0 0 0;">Profitez de réductions exclusives</p>
    </div>
    
    <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center;">
        <p style="color: #fff; margin: 0; font-size: 14px;">Code promo exclusif</p>
        <p style="color: #fff; margin: 10px 0; font-size: 36px; font-weight: 700;">-{discount}%</p>
        <div style="background: #fff; border-radius: 8px; padding: 12px 25px; display: inline-block;">
            <span style="font-family: monospace; font-size: 22px; font-weight: 700; color: #333;">{promo_code}</span>
        </div>
        <p style="color: rgba(255,255,255,0.9); margin: 15px 0 0 0; font-size: 13px;">Valable 7 jours sur tout le site</p>
    </div>
    
    <h3 style="color: #333; margin: 25px 0 15px 0; text-align: center;">Nos suggestions</h3>
    <div style="text-align: center; padding: 15px; background-color: #f8f8f8; border-radius: 12px;">
        {products_html}
    </div>
    
    <div style="text-align: center; margin-top: 25px;">
        <a href="{SITE_URL}" style="background-color: #000; color: #fff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Profiter de l'offre
        </a>
    </div>
    """
    return get_email_template(content, "🔥 Offre de la semaine - Code promo inside")

# ============== PASSWORD RESET ==============

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Si cette adresse existe, vous recevrez un email de réinitialisation"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "email": data.email,
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send reset email
    reset_link = f"{SITE_URL}/reset-password?token={reset_token}"
    html = get_password_reset_template(user.get("name", "Client"), reset_link)
    
    await send_email_async(
        to=data.email,
        subject="🔐 Réinitialisation de votre mot de passe - YAMA+",
        html=html
    )
    
    logger.info(f"Password reset email sent to {data.email}")
    return {"message": "Si cette adresse existe, vous recevrez un email de réinitialisation"}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    """Reset password with token"""
    # Find valid reset token
    reset_record = await db.password_resets.find_one({
        "token": data.token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Ce lien a expiré. Veuillez en demander un nouveau.")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Hash new password
    hashed_password = bcrypt.hashpw(data.new_password.encode('utf-8'), bcrypt.gensalt())
    
    # Update user password
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {"password": hashed_password.decode('utf-8')}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Password reset successful for user {reset_record['user_id']}")
    return {"message": "Mot de passe réinitialisé avec succès"}

# ============== AUTOMATED EMAIL TRIGGERS ==============

async def send_order_confirmation_email(order: dict):
    """Send order confirmation email with invoice PDF attached"""
    # Get email from shipping object
    email = order.get("shipping", {}).get("email")
    if not email:
        logger.warning(f"No email found for order {order.get('order_id')}")
        return
    
    try:
        # Generate invoice PDF
        pdf_buffer = generate_invoice_pdf(order)
        pdf_content = pdf_buffer.getvalue()
        pdf_filename = f"facture_{order.get('order_id', 'commande')}.pdf"
        
        # Build email content
        html = get_order_confirmation_template(order)
        
        # Send email with PDF attachment
        result = await send_email_mailersend(
            to_email=email,
            to_name=order.get("shipping", {}).get("full_name", ""),
            subject=f"✅ Commande {order['order_id']} confirmée - Facture jointe - YAMA+",
            html_content=html,
            attachment_content=pdf_content,
            attachment_filename=pdf_filename
        )
        
        if result.get("success"):
            logger.info(f"Order confirmation email with invoice sent for {order['order_id']}")
            
            # Add to MailerLite post-purchase flow for review requests
            if MAILERLITE_API_KEY:
                try:
                    await mailerlite_service.add_to_post_purchase_flow(
                        email=email,
                        name=order.get("shipping", {}).get("full_name", ""),
                        order_id=order.get("order_id", "")
                    )
                    # Remove from abandoned cart group since they completed purchase
                    await mailerlite_service.remove_from_abandoned_cart_group(email)
                    logger.info(f"Added {email} to MailerLite post-purchase flow")
                except Exception as ml_error:
                    logger.error(f"MailerLite post-purchase error: {str(ml_error)}")
        else:
            logger.error(f"Failed to send order confirmation email: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Error sending order confirmation email for {order.get('order_id')}: {str(e)}")
        # Try sending without attachment as fallback
        try:
            html = get_order_confirmation_template(order)
            await send_email_async(
                to=email,
                subject=f"✅ Commande {order['order_id']} confirmée - YAMA+",
                html=html
            )
            logger.info(f"Order confirmation email sent (without invoice) for {order['order_id']}")
        except Exception as e2:
            logger.error(f"Fallback email also failed: {str(e2)}")

async def send_shipping_update_email(order: dict, new_status: str):
    """Send shipping status update email"""
    email = order.get("shipping", {}).get("email")
    if not email:
        return
    
    status_messages = {
        "processing": "Votre commande est en cours de préparation. Nous la préparons avec soin !",
        "shipped": "Bonne nouvelle ! Votre commande a été expédiée et est en route.",
        "out_for_delivery": "Votre commande est en cours de livraison. Elle arrivera très bientôt !",
        "delivered": "Votre commande a été livrée. Merci pour votre confiance !",
        "cancelled": "Votre commande a été annulée. Si vous avez des questions, contactez-nous."
    }
    
    message = status_messages.get(new_status, "Le statut de votre commande a été mis à jour.")
    html = get_shipping_update_template(order, new_status, message)
    
    await send_email_async(
        to=email,
        subject=f"📦 Mise à jour commande {order['order_id']} - YAMA+",
        html=html
    )
    logger.info(f"Shipping update email sent for {order['order_id']} - Status: {new_status}")

async def send_welcome_email(user: dict):
    """Send welcome email to new user and add to MailerLite"""
    promo_code = f"BIENVENUE{secrets.token_hex(3).upper()}"
    
    # Save promo code
    await db.promo_codes.insert_one({
        "code": promo_code,
        "discount_percent": 10,
        "max_uses": 1,
        "current_uses": 0,
        "min_order": 20000,
        "user_id": user["user_id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send transactional welcome email via MailerSend
    html = get_welcome_template(user.get("name", "Client"), promo_code)
    await send_email_async(
        to=user["email"],
        subject="🎉 Bienvenue chez YAMA+ - Cadeau de bienvenue inside !",
        html=html
    )
    logger.info(f"Welcome email sent to {user['email']}")
    
    # Add to MailerLite welcome flow for marketing automation
    if MAILERLITE_API_KEY:
        try:
            await mailerlite_service.add_to_welcome_flow(
                email=user["email"],
                name=user.get("name", "")
            )
            logger.info(f"Added {user['email']} to MailerLite welcome flow")
        except Exception as e:
            logger.error(f"Failed to add user to MailerLite: {str(e)}")

async def process_abandoned_carts():
    """Process and send abandoned cart emails"""
    # Find carts abandoned for more than 1 hour
    threshold = datetime.now(timezone.utc) - timedelta(hours=ABANDONED_CART_TIMEOUT_HOURS)
    
    abandoned_carts = await db.carts.find({
        "updated_at": {"$lt": threshold.isoformat()},
        "items": {"$ne": []},
        "abandoned_email_sent": {"$ne": True}
    }).to_list(50)
    
    for cart in abandoned_carts:
        # Get user email
        email = None
        name = "Client"
        
        if cart.get("user_id"):
            user = await db.users.find_one({"user_id": cart["user_id"]}, {"email": 1, "name": 1})
            if user:
                email = user.get("email")
                name = user.get("name", "Client")
        
        if not email:
            continue
        
        # Get cart items details
        items = []
        total = 0
        for item in cart.get("items", []):
            product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
            if product:
                items.append({
                    "name": product["name"],
                    "price": product["price"],
                    "image": product["images"][0] if product.get("images") else "",
                    "quantity": item["quantity"]
                })
                total += product["price"] * item["quantity"]
        
        if not items:
            continue
        
        # Send abandoned cart email
        recovery_link = f"{SITE_URL}/panier?recover={cart.get('cart_id', '')}"
        html = get_abandoned_cart_template(name, items, total, recovery_link)
        
        result = await send_email_async(
            to=email,
            subject="🛒 Votre panier vous attend - YAMA+",
            html=html
        )
        
        if result.get("success"):
            # Mark as sent
            await db.carts.update_one(
                {"cart_id": cart["cart_id"]},
                {"$set": {"abandoned_email_sent": True, "abandoned_email_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            logger.info(f"Abandoned cart email sent to {email}")

# ============== MARKETING EMAIL ENDPOINTS ==============

@api_router.post("/admin/email/flash-sale")
async def send_flash_sale_email(user: User = Depends(require_admin)):
    """Send flash sale announcement to all subscribers"""
    # Get flash sale products
    now = datetime.now(timezone.utc).isoformat()
    products = await db.products.find(
        {"is_flash_sale": True, "flash_sale_end": {"$gt": now}},
        {"_id": 0}
    ).limit(4).to_list(4)
    
    if not products:
        raise HTTPException(status_code=400, detail="Aucun produit en vente flash")
    
    # Calculate time remaining
    if products[0].get("flash_sale_end"):
        end = datetime.fromisoformat(products[0]["flash_sale_end"].replace("Z", "+00:00"))
        delta = end - datetime.now(timezone.utc)
        hours = int(delta.total_seconds() // 3600)
        end_time = f"{hours}h" if hours > 0 else "quelques minutes"
    else:
        end_time = "bientôt"
    
    html = get_flash_sale_template(products, end_time)
    
    # Get newsletter subscribers
    subscribers = await db.newsletter.find({"subscribed": True}, {"email": 1}).to_list(500)
    
    sent_count = 0
    for sub in subscribers:
        result = await send_email_async(sub["email"], "⚡ VENTE FLASH - Jusqu'à -50% - YAMA+", html)
        if result.get("success"):
            sent_count += 1
    
    return {"message": f"Email envoyé à {sent_count} abonnés", "products_featured": len(products)}

@api_router.post("/admin/email/new-arrivals")
async def send_new_arrivals_email(user: User = Depends(require_admin)):
    """Send new arrivals announcement"""
    # Get new products
    products = await db.products.find(
        {"is_new": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(6).to_list(6)
    
    if not products:
        raise HTTPException(status_code=400, detail="Aucun nouveau produit")
    
    html = get_new_arrivals_template(products)
    
    subscribers = await db.newsletter.find({"subscribed": True}, {"email": 1}).to_list(500)
    
    sent_count = 0
    for sub in subscribers:
        result = await send_email_async(sub["email"], "✨ Nouveautés YAMA+ - Découvrez nos dernières arrivées", html)
        if result.get("success"):
            sent_count += 1
    
    return {"message": f"Email envoyé à {sent_count} abonnés", "products_featured": len(products)}

@api_router.post("/admin/email/weekly-promo")
async def send_weekly_promo_email(discount: int = 15, user: User = Depends(require_admin)):
    """Send weekly promotion email with promo code"""
    # Generate promo code
    promo_code = f"SEMAINE{datetime.now().strftime('%V')}"
    
    # Create or update promo code
    await db.promo_codes.update_one(
        {"code": promo_code},
        {"$set": {
            "discount_percent": discount,
            "max_uses": 1000,
            "current_uses": 0,
            "min_order": 15000,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Get featured products
    products = await db.products.find(
        {"featured": True},
        {"_id": 0}
    ).limit(4).to_list(4)
    
    html = get_weekly_promo_template(promo_code, discount, products)
    
    subscribers = await db.newsletter.find({"subscribed": True}, {"email": 1}).to_list(500)
    
    sent_count = 0
    for sub in subscribers:
        result = await send_email_async(sub["email"], f"🔥 -{discount}% cette semaine - Code promo exclusif", html)
        if result.get("success"):
            sent_count += 1
    
    return {"message": f"Email envoyé à {sent_count} abonnés", "promo_code": promo_code}

async def send_email_async(to: str, subject: str, html: str) -> dict:
    """Send email using MailerSend API asynchronously"""
    result = await send_email_mailersend(
        to_email=to,
        to_name="",
        subject=subject,
        html_content=html
    )
    if result.get("success"):
        return {"success": True, "email_id": result.get("response")}
    else:
        return {"success": False, "error": result.get("error")}

# ============== ADVANCED EMAIL MARKETING WORKFLOWS ==============

async def process_post_purchase_reviews():
    """Send review request emails 3 days after delivery"""
    try:
        # Find delivered orders from 3 days ago that haven't had review email sent
        three_days_ago = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
        four_days_ago = (datetime.now(timezone.utc) - timedelta(days=4)).isoformat()
        
        delivered_orders = await db.orders.find({
            "order_status": "delivered",
            "delivered_at": {"$gte": four_days_ago, "$lt": three_days_ago},
            "review_email_sent": {"$ne": True}
        }, {"_id": 0}).to_list(50)
        
        sent_count = 0
        for order in delivered_orders:
            email = order.get("shipping", {}).get("email") or order.get("email")
            name = order.get("shipping", {}).get("full_name", "Client")
            
            if not email:
                continue
            
            # Get first product for the email
            first_item = order.get("items", [{}])[0]
            product_name = first_item.get("name", "votre achat")
            product_image = first_item.get("image", "")
            
            html = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Votre avis compte ! ⭐</h1>
                </div>
                <div style="padding: 40px 30px; background: white;">
                    <p style="font-size: 16px; color: #333;">Bonjour {name},</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Nous espérons que vous êtes satisfait(e) de <strong>{product_name}</strong> !
                    </p>
                    {f'<img src="{product_image}" alt="{product_name}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 12px; margin: 20px auto; display: block;" />' if product_image else ''}
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Votre avis aide les autres clients à faire leur choix et nous permet d'améliorer nos services.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{SITE_URL}/order/{order.get('order_id')}#review" 
                           style="display: inline-block; padding: 15px 40px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Donner mon avis →
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        En remerciement, recevez <strong>50 points fidélité</strong> pour chaque avis !
                    </p>
                </div>
                <div style="padding: 20px; background: #f8f8f8; text-align: center;">
                    <p style="font-size: 12px; color: #999; margin: 0;">GROUPE YAMA+ - Votre partenaire au quotidien</p>
                </div>
            </div>
            """
            
            result = await send_email_async(email, "⭐ Votre avis sur votre achat - YAMA+", html)
            
            if result.get("success"):
                await db.orders.update_one(
                    {"order_id": order["order_id"]},
                    {"$set": {"review_email_sent": True, "review_email_sent_at": datetime.now(timezone.utc).isoformat()}}
                )
                sent_count += 1
        
        logger.info(f"Post-purchase review emails: sent {sent_count}")
    except Exception as e:
        logger.error(f"Error in post-purchase review workflow: {e}")

async def process_vip_customer_rewards():
    """Send VIP rewards to top customers monthly"""
    try:
        # Find customers who spent more than 500,000 FCFA in the last 30 days
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        
        pipeline = [
            {"$match": {"created_at": {"$gte": thirty_days_ago}, "order_status": {"$nin": ["cancelled", "refunded"]}}},
            {"$group": {"_id": "$user_id", "total_spent": {"$sum": "$total"}, "order_count": {"$sum": 1}}},
            {"$match": {"total_spent": {"$gte": 500000}}},
            {"$sort": {"total_spent": -1}},
            {"$limit": 50}
        ]
        
        vip_customers = await db.orders.aggregate(pipeline).to_list(50)
        
        sent_count = 0
        for vip in vip_customers:
            user_id = vip["_id"]
            if not user_id:
                continue
            
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if not user or not user.get("email"):
                continue
            
            # Check if we sent VIP email this month
            this_month = datetime.now(timezone.utc).strftime("%Y-%m")
            existing = await db.vip_emails.find_one({"user_id": user_id, "month": this_month})
            if existing:
                continue
            
            # Generate exclusive VIP code
            vip_code = f"VIP{secrets.token_hex(4).upper()}"
            await db.promo_codes.insert_one({
                "code": vip_code,
                "discount_percent": 20,
                "max_uses": 1,
                "current_uses": 0,
                "min_order": 50000,
                "user_id": user_id,
                "is_vip": True,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            html = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 50px 20px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);">
                    <h1 style="color: #1a1a1a; margin: 0; font-size: 32px;">👑 Vous êtes VIP !</h1>
                </div>
                <div style="padding: 40px 30px; background: white;">
                    <p style="font-size: 18px; color: #333;">Cher(e) {user.get('name', 'Client')},</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Merci pour votre fidélité ! Avec <strong>{vip['total_spent']:,} FCFA</strong> d'achats ce mois-ci,
                        vous faites partie de nos clients les plus précieux.
                    </p>
                    <div style="background: #FFF8E1; padding: 30px; border-radius: 16px; margin: 30px 0; text-align: center;">
                        <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Votre code exclusif VIP</p>
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #1a1a1a; letter-spacing: 3px;">{vip_code}</p>
                        <p style="margin: 15px 0 0 0; font-size: 18px; color: #FF6B00;">-20% sur votre prochaine commande</p>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        Valable 14 jours • Minimum d'achat: 50 000 FCFA
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{SITE_URL}" 
                           style="display: inline-block; padding: 15px 40px; background: #FFD700; color: #1a1a1a; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Profiter de mon avantage VIP →
                        </a>
                    </div>
                </div>
            </div>
            """
            
            result = await send_email_async(user["email"], "👑 Récompense VIP exclusive - YAMA+", html)
            
            if result.get("success"):
                await db.vip_emails.insert_one({
                    "user_id": user_id,
                    "month": this_month,
                    "code": vip_code,
                    "total_spent": vip["total_spent"],
                    "sent_at": datetime.now(timezone.utc).isoformat()
                })
                sent_count += 1
        
        logger.info(f"VIP customer emails: sent {sent_count}")
    except Exception as e:
        logger.error(f"Error in VIP customer workflow: {e}")

async def process_winback_campaign():
    """Re-engage customers who haven't ordered in 60+ days"""
    try:
        sixty_days_ago = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
        ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
        
        # Find users who ordered 60-90 days ago but not since
        pipeline = [
            {"$match": {"created_at": {"$gte": ninety_days_ago, "$lt": sixty_days_ago}}},
            {"$group": {"_id": "$user_id", "last_order": {"$max": "$created_at"}, "total_orders": {"$sum": 1}}},
            {"$limit": 50}
        ]
        
        inactive_users = await db.orders.aggregate(pipeline).to_list(50)
        
        sent_count = 0
        for inactive in inactive_users:
            user_id = inactive["_id"]
            if not user_id:
                continue
            
            # Check if they have ordered recently
            recent_order = await db.orders.find_one({
                "user_id": user_id,
                "created_at": {"$gte": sixty_days_ago}
            })
            if recent_order:
                continue
            
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if not user or not user.get("email"):
                continue
            
            # Check if we sent winback email recently
            recent_winback = await db.winback_emails.find_one({
                "user_id": user_id,
                "sent_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}
            })
            if recent_winback:
                continue
            
            # Generate winback code
            winback_code = f"RETOUR{secrets.token_hex(3).upper()}"
            await db.promo_codes.insert_one({
                "code": winback_code,
                "discount_percent": 15,
                "max_uses": 1,
                "current_uses": 0,
                "min_order": 30000,
                "user_id": user_id,
                "is_winback": True,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            html = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 50px 20px; background: linear-gradient(135deg, #E0E0E0 0%, #9E9E9E 100%);">
                    <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">Vous nous manquez ! 💔</h1>
                </div>
                <div style="padding: 40px 30px; background: white;">
                    <p style="font-size: 18px; color: #333;">Bonjour {user.get('name', 'Client')},</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Cela fait un moment que nous ne vous avons pas vu... Tout va bien ?
                    </p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Pour fêter vos retrouvailles avec YAMA+, voici un cadeau spécial :
                    </p>
                    <div style="background: #FAFAFA; padding: 30px; border-radius: 16px; margin: 30px 0; text-align: center; border: 2px dashed #00A651;">
                        <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">Code de bienvenue</p>
                        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #00A651; letter-spacing: 3px;">{winback_code}</p>
                        <p style="margin: 15px 0 0 0; font-size: 18px; color: #1a1a1a;">-15% sur votre commande</p>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        ⏰ Offre valable 7 jours seulement !
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{SITE_URL}" 
                           style="display: inline-block; padding: 15px 40px; background: #00A651; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Revenir sur YAMA+ →
                        </a>
                    </div>
                </div>
            </div>
            """
            
            result = await send_email_async(user["email"], "💔 Vous nous manquez - Cadeau inside !", html)
            
            if result.get("success"):
                await db.winback_emails.insert_one({
                    "user_id": user_id,
                    "code": winback_code,
                    "sent_at": datetime.now(timezone.utc).isoformat()
                })
                sent_count += 1
        
        logger.info(f"Winback campaign emails: sent {sent_count}")
    except Exception as e:
        logger.error(f"Error in winback campaign: {e}")

async def process_wishlist_reminders():
    """Remind users about products in their wishlist"""
    try:
        # Find wishlists not reminded in last 7 days with items
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        
        wishlists = await db.wishlists.find({
            "items": {"$exists": True, "$ne": []},
            "$or": [
                {"reminder_sent_at": {"$exists": False}},
                {"reminder_sent_at": {"$lt": seven_days_ago}}
            ]
        }, {"_id": 0}).to_list(50)
        
        sent_count = 0
        for wishlist in wishlists:
            user_id = wishlist.get("user_id")
            if not user_id:
                continue
            
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if not user or not user.get("email"):
                continue
            
            # Get wishlist items details
            items_html = ""
            for item_id in wishlist.get("items", [])[:3]:  # Max 3 items
                product = await db.products.find_one({"product_id": item_id}, {"_id": 0})
                if product:
                    items_html += f"""
                    <div style="display: inline-block; width: 150px; margin: 10px; text-align: center; vertical-align: top;">
                        <img src="{product.get('images', [''])[0]}" alt="{product.get('name')}" 
                             style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;" />
                        <p style="margin: 10px 0 5px 0; font-size: 14px; font-weight: 600; color: #333;">{product.get('name', '')[:30]}</p>
                        <p style="margin: 0; font-size: 16px; color: #00A651; font-weight: bold;">{product.get('price', 0):,} FCFA</p>
                    </div>
                    """
            
            if not items_html:
                continue
            
            html = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%);">
                    <h1 style="color: white; margin: 0; font-size: 28px;">❤️ Vos favoris vous attendent !</h1>
                </div>
                <div style="padding: 40px 30px; background: white;">
                    <p style="font-size: 16px; color: #333;">Bonjour {user.get('name', 'Client')},</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Les produits que vous avez ajoutés à vos favoris sont toujours disponibles !
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        {items_html}
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{SITE_URL}/wishlist" 
                           style="display: inline-block; padding: 15px 40px; background: #FF6B6B; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Voir mes favoris →
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        Ne tardez pas, les stocks sont limités !
                    </p>
                </div>
            </div>
            """
            
            result = await send_email_async(user["email"], "❤️ Vos favoris vous attendent - YAMA+", html)
            
            if result.get("success"):
                await db.wishlists.update_one(
                    {"user_id": user_id},
                    {"$set": {"reminder_sent_at": datetime.now(timezone.utc).isoformat()}}
                )
                sent_count += 1
        
        logger.info(f"Wishlist reminder emails: sent {sent_count}")
    except Exception as e:
        logger.error(f"Error in wishlist reminder workflow: {e}")

async def process_order_tracking_updates():
    """Send proactive tracking updates for shipped orders"""
    try:
        # Find orders shipped in the last 24 hours that haven't had tracking email
        one_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        
        shipped_orders = await db.orders.find({
            "order_status": "shipped",
            "shipped_at": {"$gte": one_day_ago},
            "tracking_email_sent": {"$ne": True}
        }, {"_id": 0}).to_list(50)
        
        sent_count = 0
        for order in shipped_orders:
            email = order.get("shipping", {}).get("email") or order.get("email")
            name = order.get("shipping", {}).get("full_name", "Client")
            
            if not email:
                continue
            
            html = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);">
                    <h1 style="color: white; margin: 0; font-size: 28px;">🚚 Votre colis est en route !</h1>
                </div>
                <div style="padding: 40px 30px; background: white;">
                    <p style="font-size: 16px; color: #333;">Bonjour {name},</p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Bonne nouvelle ! Votre commande <strong>#{order.get('order_id')}</strong> a été expédiée 
                        et est en cours de livraison.
                    </p>
                    <div style="background: #E8F5E9; padding: 25px; border-radius: 12px; margin: 25px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Adresse de livraison :</p>
                        <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">
                            {order.get('shipping', {}).get('address', '')}<br/>
                            {order.get('shipping', {}).get('city', '')}, {order.get('shipping', {}).get('region', '')}
                        </p>
                    </div>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        📅 Livraison prévue : <strong>Sous 24-48h</strong>
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{SITE_URL}/order/{order.get('order_id')}" 
                           style="display: inline-block; padding: 15px 40px; background: #4CAF50; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Suivre ma commande →
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center;">
                        Questions ? Contactez-nous sur WhatsApp : +221 78 382 75 75
                    </p>
                </div>
            </div>
            """
            
            result = await send_email_async(email, f"🚚 Commande #{order.get('order_id')} en route !", html)
            
            if result.get("success"):
                await db.orders.update_one(
                    {"order_id": order["order_id"]},
                    {"$set": {"tracking_email_sent": True, "tracking_email_sent_at": datetime.now(timezone.utc).isoformat()}}
                )
                sent_count += 1
        
        logger.info(f"Order tracking emails: sent {sent_count}")
    except Exception as e:
        logger.error(f"Error in order tracking workflow: {e}")

# ============== EMAIL MARKETING ADMIN ENDPOINTS ==============

@api_router.get("/admin/email/workflows")
async def get_email_workflows(user: User = Depends(require_admin)):
    """Get status of all email marketing workflows"""
    workflows = [
        {
            "id": "abandoned_cart",
            "name": "Panier Abandonné",
            "description": "Email automatique 1h après abandon du panier",
            "frequency": "Toutes les heures",
            "active": True
        },
        {
            "id": "post_purchase_review",
            "name": "Demande d'Avis Post-Achat",
            "description": "Email 3 jours après livraison pour demander un avis",
            "frequency": "Quotidien",
            "active": True
        },
        {
            "id": "vip_rewards",
            "name": "Récompenses VIP",
            "description": "Code -20% pour clients ayant dépensé +500k FCFA/mois",
            "frequency": "Hebdomadaire",
            "active": True
        },
        {
            "id": "winback",
            "name": "Reconquête Client",
            "description": "Code -15% pour clients inactifs depuis 60+ jours",
            "frequency": "Quotidien",
            "active": True
        },
        {
            "id": "wishlist_reminder",
            "name": "Rappel Favoris",
            "description": "Rappel des produits en liste de souhaits",
            "frequency": "Tous les 3 jours",
            "active": True
        },
        {
            "id": "order_tracking",
            "name": "Suivi de Commande",
            "description": "Notification automatique d'expédition",
            "frequency": "Toutes les 2 heures",
            "active": True
        }
    ]
    
    # Get stats for each workflow
    stats = {
        "abandoned_cart": await db.abandoned_cart_emails.count_documents({}),
        "vip_rewards": await db.vip_emails.count_documents({}),
        "winback": await db.winback_emails.count_documents({})
    }
    
    for w in workflows:
        w["emails_sent"] = stats.get(w["id"], 0)
    
    return workflows

@api_router.post("/admin/email/workflows/{workflow_id}/run")
async def trigger_email_workflow(workflow_id: str, user: User = Depends(require_admin)):
    """Manually trigger an email marketing workflow"""
    workflow_map = {
        "abandoned_cart": detect_and_process_abandoned_carts,
        "post_purchase_review": process_post_purchase_reviews,
        "vip_rewards": process_vip_customer_rewards,
        "winback": process_winback_campaign,
        "wishlist_reminder": process_wishlist_reminders,
        "order_tracking": process_order_tracking_updates
    }
    
    if workflow_id not in workflow_map:
        raise HTTPException(status_code=404, detail="Workflow non trouvé")
    
    # Run the workflow
    asyncio.create_task(workflow_map[workflow_id]())
    
    return {"message": f"Workflow '{workflow_id}' lancé en arrière-plan"}

@api_router.get("/admin/email/stats")
async def get_email_marketing_stats(user: User = Depends(require_admin)):
    """Get comprehensive email marketing statistics"""
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    
    stats = {
        "total_subscribers": await db.newsletter.count_documents({"subscribed": True}),
        "new_subscribers_7d": await db.newsletter.count_documents({
            "subscribed": True,
            "subscribed_at": {"$gte": seven_days_ago}
        }),
        "abandoned_cart_emails_30d": await db.abandoned_cart_emails.count_documents({
            "sent_at": {"$gte": thirty_days_ago}
        }),
        "vip_emails_30d": await db.vip_emails.count_documents({
            "sent_at": {"$gte": thirty_days_ago}
        }),
        "winback_emails_30d": await db.winback_emails.count_documents({
            "sent_at": {"$gte": thirty_days_ago}
        }),
        "review_emails_pending": await db.orders.count_documents({
            "order_status": "delivered",
            "review_email_sent": {"$ne": True}
        }),
        "active_promo_codes": await db.promo_codes.count_documents({
            "expires_at": {"$gte": now.isoformat()},
            "current_uses": {"$lt": 1}  # Assuming max_uses is 1 for personalized codes
        })
    }
    
    return stats

@api_router.get("/admin/mailerlite/groups")
async def get_mailerlite_groups(user: User = Depends(require_admin)):
    """Get all MailerLite groups and their subscriber counts"""
    if not MAILERLITE_API_KEY:
        return {"error": "MailerLite not configured", "groups": []}
    
    try:
        groups = await mailerlite_service.get_all_groups()
        return {"groups": groups}
    except Exception as e:
        logger.error(f"Error fetching MailerLite groups: {str(e)}")
        return {"error": str(e), "groups": []}

@api_router.post("/admin/email/send")
async def send_single_email(data: SingleEmailRequest, user: User = Depends(require_admin)):
    """Send a single email"""
    html = get_email_template(data.html_content)
    result = await send_email_async(data.to, data.subject, html)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"message": "Email envoyé", "email_id": result["email_id"]}

@api_router.get("/admin/campaigns")
async def get_campaigns(user: User = Depends(require_admin)):
    """Get all email campaigns"""
    campaigns = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@api_router.post("/admin/campaigns")
async def create_campaign(data: CampaignCreate, user: User = Depends(require_admin)):
    """Create a new email campaign"""
    campaign_doc = {
        "campaign_id": f"CAMP-{uuid.uuid4().hex[:8].upper()}",
        "name": data.name,
        "subject": data.subject,
        "content": data.content,
        "status": "draft",
        "target_audience": data.target_audience,
        "scheduled_at": data.scheduled_at,
        "sent_at": None,
        "total_recipients": 0,
        "sent_count": 0,
        "open_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.campaigns.insert_one(campaign_doc)
    del campaign_doc["_id"]
    
    return campaign_doc

@api_router.get("/admin/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user: User = Depends(require_admin)):
    """Get a specific campaign"""
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne non trouvée")
    return campaign

@api_router.put("/admin/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: CampaignCreate, user: User = Depends(require_admin)):
    """Update a campaign"""
    result = await db.campaigns.update_one(
        {"campaign_id": campaign_id, "status": "draft"},
        {"$set": {
            "name": data.name,
            "subject": data.subject,
            "content": data.content,
            "target_audience": data.target_audience,
            "scheduled_at": data.scheduled_at
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campagne non trouvée ou déjà envoyée")
    
    return {"message": "Campagne mise à jour"}

@api_router.delete("/admin/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, user: User = Depends(require_admin)):
    """Delete a campaign"""
    result = await db.campaigns.delete_one({"campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campagne non trouvée")
    return {"message": "Campagne supprimée"}

@api_router.post("/admin/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, user: User = Depends(require_admin)):
    """Send a campaign to all subscribers in batches to prevent memory issues"""
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne non trouvée")
    
    if campaign["status"] == "sent":
        raise HTTPException(status_code=400, detail="Cette campagne a déjà été envoyée")
    
    # Count recipients first to avoid loading all into memory
    if campaign["target_audience"] == "newsletter":
        total_recipients = await db.newsletter.count_documents({"active": True})
    elif campaign["target_audience"] == "customers":
        total_recipients = await db.users.count_documents({})
    else:  # all
        newsletter_count = await db.newsletter.count_documents({"active": True})
        users_count = await db.users.count_documents({})
        # Estimate total (may have some overlap)
        total_recipients = newsletter_count + users_count
    
    if total_recipients == 0:
        raise HTTPException(status_code=400, detail="Aucun destinataire trouvé")
    
    # Update campaign status
    await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {
            "status": "sending",
            "total_recipients": total_recipients,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send emails in batches to prevent memory issues
    html_template = get_email_template(campaign["content"])
    sent_count = 0
    errors = []
    batch_size = 50  # Process 50 emails at a time
    
    # Process newsletter subscribers
    if campaign["target_audience"] in ["newsletter", "all"]:
        skip = 0
        while True:
            batch = await db.newsletter.find(
                {"active": True}, 
                {"_id": 0, "email": 1, "name": 1}
            ).skip(skip).limit(batch_size).to_list(batch_size)
            
            if not batch:
                break
                
            for recipient in batch:
                try:
                    result = await send_email_async(recipient["email"], campaign["subject"], html_template)
                    if result["success"]:
                        sent_count += 1
                    else:
                        errors.append({"email": recipient["email"], "error": result["error"]})
                except Exception as e:
                    errors.append({"email": recipient["email"], "error": str(e)})
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)
            
            skip += batch_size
            # Clear batch from memory
            del batch
            
            # Break if we have too many errors
            if len(errors) > 100:
                break
    
    # Process registered users (if target is "customers" or "all")
    if campaign["target_audience"] in ["customers", "all"]:
        skip = 0
        processed_emails = set()  # Track emails to avoid duplicates
        
        while True:
            batch = await db.users.find(
                {}, 
                {"_id": 0, "email": 1, "name": 1}
            ).skip(skip).limit(batch_size).to_list(batch_size)
            
            if not batch:
                break
                
            for recipient in batch:
                # Skip if already processed (for "all" target)
                if recipient["email"] in processed_emails:
                    continue
                processed_emails.add(recipient["email"])
                
                try:
                    result = await send_email_async(recipient["email"], campaign["subject"], html_template)
                    if result["success"]:
                        sent_count += 1
                    else:
                        errors.append({"email": recipient["email"], "error": result["error"]})
                except Exception as e:
                    errors.append({"email": recipient["email"], "error": str(e)})
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)
            
            skip += batch_size
            # Clear batch from memory
            del batch
            
            # Break if we have too many errors
            if len(errors) > 100:
                break
    
    # Update final status
    await db.campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {
            "status": "sent",
            "sent_count": sent_count
        }}
    )
    
    return {
        "message": f"Campagne envoyée à {sent_count} destinataires",
        "sent_count": sent_count,
        "total_recipients": total_recipients,
        "errors": errors[:10] if errors else []  # Return first 10 errors
    }

@api_router.post("/admin/campaigns/{campaign_id}/test")
async def send_test_email(campaign_id: str, request: Request, user: User = Depends(require_admin)):
    """Send a test email to admin"""
    body = await request.json()
    test_email = body.get("email", user.email)
    
    campaign = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne non trouvée")
    
    html = get_email_template(campaign["content"])
    result = await send_email_async(test_email, f"[TEST] {campaign['subject']}", html)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    return {"message": f"Email test envoyé à {test_email}"}

@api_router.get("/admin/email/stats")
async def get_email_stats(user: User = Depends(require_admin)):
    """Get email statistics"""
    total_campaigns = await db.campaigns.count_documents({})
    sent_campaigns = await db.campaigns.count_documents({"status": "sent"})
    
    pipeline = [
        {"$match": {"status": "sent"}},
        {"$group": {
            "_id": None,
            "total_sent": {"$sum": "$sent_count"},
            "total_recipients": {"$sum": "$total_recipients"}
        }}
    ]
    
    stats = await db.campaigns.aggregate(pipeline).to_list(1)
    
    newsletter_count = await db.newsletter.count_documents({"active": True})
    user_count = await db.users.count_documents({})
    
    return {
        "total_campaigns": total_campaigns,
        "sent_campaigns": sent_campaigns,
        "total_emails_sent": stats[0]["total_sent"] if stats else 0,
        "newsletter_subscribers": newsletter_count,
        "registered_users": user_count
    }

# Email templates for automatic emails
async def send_newsletter_welcome_email(email: str, name: str = ""):
    """Send welcome email to new newsletter subscriber"""
    content = f"""
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Bienvenue chez YAMA+ ! 🎉</h2>
    <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        Bonjour{' ' + name if name else ''}, 
    </p>
    <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        Merci de rejoindre la famille YAMA+ ! Vous recevrez désormais nos meilleures offres et nouveautés en avant-première.
    </p>
    <p style="color: #333; line-height: 1.6; margin: 0 0 25px 0;">
        En cadeau de bienvenue, profitez de <strong style="color: #00A651;">10% de réduction</strong> sur votre première commande !
    </p>
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
            <td style="background-color: #1a1a1a; padding: 15px 30px; border-radius: 8px;">
                <a href="{SITE_URL}" style="color: #ffffff; text-decoration: none; font-weight: 600;">
                    Découvrir nos produits →
                </a>
            </td>
        </tr>
    </table>
    """
    html = get_email_template(content)
    await send_email_async(email, "Bienvenue chez GROUPE YAMA+ ! 🎉", html)

async def send_shipping_email(email: str, order_id: str, tracking_info: str = ""):
    """Send shipping notification email"""
    content = f"""
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Votre colis est en route ! 🚚</h2>
    <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        Bonne nouvelle ! Votre commande <strong>#{order_id}</strong> a été expédiée.
    </p>
    <p style="color: #666; margin: 0 0 25px 0;">
        {tracking_info if tracking_info else "Vous recevrez votre colis dans les prochains jours."}
    </p>
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
            <td style="background-color: #00A651; padding: 15px 30px; border-radius: 8px;">
                <a href="{SITE_URL}/order/{order_id}" style="color: #ffffff; text-decoration: none; font-weight: 600;">
                    Suivre mon colis →
                </a>
            </td>
        </tr>
    </table>
    """
    html = get_email_template(content)
    await send_email_async(email, f"Votre commande #{order_id} est en route ! 🚚", html)

async def send_admin_order_notification(order: dict):
    """Send notification email to admin when a new order is placed"""
    shipping = order.get("shipping", {})
    
    items_html = ""
    for item in order.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{item.get('name', 'Produit')}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">{item.get('quantity', 1)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">{item.get('price', 0):,} FCFA</td>
        </tr>
        """
    
    payment_labels = {
        "wave": "Wave",
        "orange_money": "Orange Money",
        "card": "Carte Bancaire",
        "cash": "À la livraison"
    }
    payment_method = payment_labels.get(order.get("payment_method", ""), order.get("payment_method", "N/A"))
    
    # Format date
    created_at = order.get('created_at', '')
    if hasattr(created_at, 'isoformat'):
        created_at = created_at.isoformat()
    formatted_date = str(created_at)[:19].replace('T', ' ') if created_at else 'N/A'
    
    content = f"""
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">🛒 Nouvelle Commande !</h2>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin: 0 0 15px 0;">Commande #{order.get('order_id', '')}</h3>
        <p style="margin: 5px 0;"><strong>Date:</strong> {formatted_date}</p>
        <p style="margin: 5px 0;"><strong>Paiement:</strong> {payment_method}</p>
        <p style="margin: 5px 0; font-size: 20px;"><strong>Total:</strong> <span style="color: #00A651;">{order.get('total', 0):,} FCFA</span></p>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h4 style="color: #856404; margin: 0 0 10px 0;">📦 Informations Client</h4>
        <p style="margin: 5px 0;"><strong>Nom:</strong> {shipping.get('full_name', 'N/A')}</p>
        <p style="margin: 5px 0;"><strong>Téléphone:</strong> {shipping.get('phone', 'N/A')}</p>
        <p style="margin: 5px 0;"><strong>Adresse:</strong> {shipping.get('address', 'N/A')}</p>
        <p style="margin: 5px 0;"><strong>Ville:</strong> {shipping.get('city', 'N/A')}, {shipping.get('region', 'N/A')}</p>
        {f"<p style='margin: 5px 0;'><strong>Notes:</strong> {shipping.get('notes')}</p>" if shipping.get('notes') else ""}
    </div>
    
    <h4 style="color: #333; margin: 20px 0 10px 0;">Articles commandés:</h4>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
        <thead>
            <tr style="background: #f5f5f7;">
                <th style="text-align: left; padding: 10px;">Produit</th>
                <th style="text-align: center; padding: 10px;">Qté</th>
                <th style="text-align: right; padding: 10px;">Prix</th>
            </tr>
        </thead>
        <tbody>
            {items_html}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Sous-total:</td>
                <td style="padding: 10px; text-align: right;">{order.get('subtotal', 0):,} FCFA</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Livraison:</td>
                <td style="padding: 10px; text-align: right;">{order.get('shipping_cost', 0):,} FCFA</td>
            </tr>
            <tr style="background: #e8f5e9;">
                <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold; font-size: 16px;">TOTAL:</td>
                <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #00A651;">{order.get('total', 0):,} FCFA</td>
            </tr>
        </tfoot>
    </table>
    
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
            <td style="background-color: #1a1a1a; padding: 15px 30px; border-radius: 8px;">
                <a href="https://groupeyamaplus.com/admin/orders" style="color: #ffffff; text-decoration: none; font-weight: 600;">
                    Gérer les commandes →
                </a>
            </td>
        </tr>
    </table>
    """
    html = get_email_template(content, "🛒 Nouvelle Commande YAMA+")
    await send_email_async(ADMIN_NOTIFICATION_EMAIL, f"🛒 Nouvelle Commande #{order.get('order_id', '')} - {order.get('total', 0):,} FCFA", html)

async def send_order_status_update_email(email: str, order_id: str, new_status: str, note: str = ""):
    """Send order status update email to customer"""
    status_messages = {
        "processing": {
            "title": "Commande en préparation 📦",
            "message": "Votre commande est en cours de préparation. Nous y apportons le plus grand soin !",
            "color": "#2196F3"
        },
        "shipped": {
            "title": "Commande expédiée ! 🚚",
            "message": "Excellente nouvelle ! Votre commande a été expédiée et est en route vers vous.",
            "color": "#9C27B0"
        },
        "delivered": {
            "title": "Commande livrée ✅",
            "message": "Votre commande a été livrée avec succès. Merci pour votre confiance !",
            "color": "#4CAF50"
        },
        "cancelled": {
            "title": "Commande annulée ❌",
            "message": "Votre commande a été annulée. Contactez-nous si vous avez des questions.",
            "color": "#F44336"
        }
    }
    
    status_info = status_messages.get(new_status, {
        "title": "Mise à jour de votre commande",
        "message": f"Le statut de votre commande a été mis à jour: {new_status}",
        "color": "#666666"
    })
    
    content = f"""
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">{status_info['title']}</h2>
    <p style="color: #333; line-height: 1.6; margin: 0 0 15px 0;">
        Commande <strong>#{order_id}</strong>
    </p>
    <p style="color: #666; margin: 0 0 20px 0;">
        {status_info['message']}
    </p>
    {f'<p style="color: #666; background: #f5f5f7; padding: 15px; border-radius: 8px; margin: 0 0 25px 0;"><strong>Note:</strong> {note}</p>' if note else ''}
    
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
            <td style="background-color: {status_info['color']}; padding: 15px 30px; border-radius: 8px;">
                <a href="{SITE_URL}/order/{order_id}" style="color: #ffffff; text-decoration: none; font-weight: 600;">
                    Voir ma commande →
                </a>
            </td>
        </tr>
    </table>
    """
    html = get_email_template(content)
    await send_email_async(email, f"{status_info['title']} - Commande #{order_id}", html)

# ============== AI IMAGE ANALYSIS FOR PRODUCT CREATION ==============

@api_router.post("/admin/analyze-product-image")
async def analyze_product_image(file: UploadFile = File(...), user: User = Depends(require_admin)):
    """Analyze an uploaded image using AI to extract product information"""
    try:
        # Read and validate image
        contents = await file.read()
        
        # Check file size (max 10MB)
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image trop grande (max 10MB)")
        
        # Validate file type
        content_type = file.content_type or ""
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Le fichier doit être une image")
        
        # Convert to base64
        image_base64 = base64.b64encode(contents).decode("utf-8")
        
        # Get AI API key
        ai_key = os.environ.get("OPENAI_API_KEY")
        if not ai_key:
            raise HTTPException(status_code=500, detail="Clé API OpenAI non configurée")
        
        system_message = """Tu es un expert copywriter e-commerce spécialisé dans la rédaction de fiches produits vendeuses.
Analyse l'image fournie et crée une fiche produit complète et VENDEUSE.
Réponds UNIQUEMENT en JSON valide, sans texte supplémentaire, sans backticks.

Le JSON doit avoir cette structure exacte:
{
  "name": "Nom commercial du produit (accrocheur et professionnel)",
  "description": "Description DÉTAILLÉE et VENDEUSE du produit. Inclus: les caractéristiques principales, les avantages pour l'utilisateur, la qualité des matériaux, l'usage recommandé. Minimum 4-5 phrases captivantes qui donnent envie d'acheter. Utilise un ton professionnel mais engageant.",
  "short_description": "Phrase d'accroche percutante (max 80 caractères)",
  "category": "electronique|electromenager|decoration|beaute|automobile",
  "brand": "Marque du produit si visible, sinon null",
  "estimated_price": "Prix estimé en FCFA (nombre entier basé sur le marché sénégalais)",
  "colors": ["Couleur1", "Couleur2"],
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "is_new": true,
  "confidence": "high|medium|low",
  "features": ["Caractéristique 1", "Caractéristique 2", "Caractéristique 3"]
}

Pour la catégorie, choisis parmi:
- electronique: téléphones, ordinateurs, écouteurs, montres connectées, TV, consoles
- electromenager: aspirateurs, machines à café, réfrigérateurs, climatiseurs, mixeurs
- decoration: meubles, luminaires, tapis, cadres, vases, objets déco
- beaute: parfums, cosmétiques, soins, maquillage, accessoires beauté
- automobile: accessoires auto, pièces, équipements, GPS, dashcam

Pour le prix, estime en FCFA pour le marché sénégalais (1€ ≈ 656 FCFA).
Sois créatif et commercial dans tes descriptions !"""
        
        # Use OpenAI SDK directly with vision model
        client = OpenAI(api_key=ai_key)
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyse cette image de produit et extrais les informations. Réponds uniquement en JSON valide."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        ai_response = response.choices[0].message.content
        
        # Parse AI response
        try:
            # Clean response if needed (remove markdown code blocks)
            cleaned_response = ai_response.strip()
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response.split("```")[1]
                if cleaned_response.startswith("json"):
                    cleaned_response = cleaned_response[4:]
            cleaned_response = cleaned_response.strip()
            
            product_data = json.loads(cleaned_response)
            
            # Validate and clean data
            result = {
                "success": True,
                "product": {
                    "name": product_data.get("name", "Nouveau produit"),
                    "description": product_data.get("description", ""),
                    "short_description": product_data.get("short_description", ""),
                    "category": product_data.get("category", "electronique"),
                    "brand": product_data.get("brand"),
                    "estimated_price": int(product_data.get("estimated_price", 0)),
                    "colors": product_data.get("colors", []),
                    "suggested_tags": product_data.get("suggested_tags", []),
                    "is_new": product_data.get("is_new", True),
                    "confidence": product_data.get("confidence", "medium")
                }
            }
            
            return result
            
        except json.JSONDecodeError:
            logging.error(f"AI response not valid JSON: {ai_response}")
            return {
                "success": False,
                "error": "L'IA n'a pas pu analyser l'image correctement",
                "raw_response": ai_response[:500] if ai_response else ""
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse: {str(e)}")

# ============== DELIVERY ZONES ROUTES ==============

@api_router.get("/delivery/zones")
async def get_delivery_zones():
    """Get all delivery zones with prices"""
    zones = []
    for zone_id, zone_data in DELIVERY_ZONES.items():
        zones.append({
            "id": zone_id,
            "label": zone_data["label"],
            "price": zone_data["price"],
            "areas": zone_data["areas"][:10] if zone_data["areas"] else [],  # Sample areas
            "is_range": zone_data.get("range") is not None
        })
    return {
        "store_address": STORE_ADDRESS,
        "zones": zones
    }

@api_router.post("/delivery/calculate")
async def calculate_delivery(request: Request):
    """Calculate shipping cost based on address"""
    body = await request.json()
    city = body.get("city", "")
    address = body.get("address", "")
    region = body.get("region", "")
    
    # If region is not Dakar, it's autre région
    if region and region.lower() not in ["dakar", "région de dakar", "region de dakar"]:
        return {
            "zone": "autre_region",
            "zone_label": "Autre Région",
            "shipping_cost": 3500,
            "message": "Livraison Autre Région: 3 500 FCFA"
        }
    
    result = calculate_shipping_cost(city, address)
    return result

@api_router.get("/delivery/calculate")
async def calculate_delivery_get(city: str = "", address: str = "", region: str = ""):
    """Calculate shipping cost based on address (GET version)"""
    # If region is not Dakar, it's autre région
    if region and region.lower() not in ["dakar", "région de dakar", "region de dakar"]:
        return {
            "zone": "autre_region",
            "zone_label": "Autre Région",
            "shipping_cost": 3500,
            "message": "Livraison Autre Région: 3 500 FCFA"
        }
    
    result = calculate_shipping_cost(city, address)
    return result

# ============== CART ROUTES ==============

@api_router.get("/cart")
async def get_cart(request: Request):
    user = await get_current_user(request)
    session_id = request.cookies.get("cart_session") or request.headers.get("X-Cart-Session")
    
    query = {}
    if user:
        query["user_id"] = user.user_id
    elif session_id:
        query["session_id"] = session_id
    else:
        return {"items": [], "total": 0}
    
    cart = await db.carts.find_one(query, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}
    
    # Fetch product details for each item
    enriched_items = []
    total = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            enriched_items.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "name": product["name"],
                "price": product["price"],
                "image": product["images"][0] if product["images"] else "",
                "stock": product["stock"]
            })
            total += product["price"] * item["quantity"]
    
    return {"items": enriched_items, "total": total}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, request: Request, response: Response):
    user = await get_current_user(request)
    session_id = request.cookies.get("cart_session") or request.headers.get("X-Cart-Session")
    
    if not session_id:
        session_id = f"cart_{uuid.uuid4().hex[:12]}"
        response.set_cookie(
            key="cart_session",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=30 * 24 * 3600,
            path="/"
        )
    
    # Check product exists and has stock
    product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="Stock insuffisant")
    
    query = {"user_id": user.user_id} if user else {"session_id": session_id}
    cart = await db.carts.find_one(query, {"_id": 0})
    
    now = datetime.now(timezone.utc).isoformat()
    
    if cart:
        # Update existing cart
        items = cart.get("items", [])
        found = False
        for i, existing_item in enumerate(items):
            if existing_item["product_id"] == item.product_id:
                items[i]["quantity"] += item.quantity
                found = True
                break
        
        if not found:
            items.append({"product_id": item.product_id, "quantity": item.quantity})
        
        await db.carts.update_one(query, {"$set": {"items": items, "updated_at": now}})
    else:
        # Create new cart
        cart_doc = {
            "cart_id": f"cart_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id if user else None,
            "session_id": session_id if not user else None,
            "items": [{"product_id": item.product_id, "quantity": item.quantity}],
            "created_at": now,
            "updated_at": now
        }
        await db.carts.insert_one(cart_doc)
    
    return {"message": "Produit ajouté au panier"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, request: Request):
    user = await get_current_user(request)
    session_id = request.cookies.get("cart_session") or request.headers.get("X-Cart-Session")
    
    query = {}
    if user:
        query["user_id"] = user.user_id
    elif session_id:
        query["session_id"] = session_id
    else:
        raise HTTPException(status_code=400, detail="Panier non trouvé")
    
    cart = await db.carts.find_one(query, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Panier non trouvé")
    
    items = cart.get("items", [])
    
    if item.quantity <= 0:
        items = [i for i in items if i["product_id"] != item.product_id]
    else:
        for i, existing_item in enumerate(items):
            if existing_item["product_id"] == item.product_id:
                items[i]["quantity"] = item.quantity
                break
    
    await db.carts.update_one(
        query,
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Panier mis à jour"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, request: Request):
    user = await get_current_user(request)
    session_id = request.cookies.get("cart_session") or request.headers.get("X-Cart-Session")
    
    query = {}
    if user:
        query["user_id"] = user.user_id
    elif session_id:
        query["session_id"] = session_id
    else:
        raise HTTPException(status_code=400, detail="Panier non trouvé")
    
    await db.carts.update_one(
        query,
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    return {"message": "Produit retiré du panier"}

@api_router.delete("/cart/clear")
async def clear_cart(request: Request):
    user = await get_current_user(request)
    session_id = request.cookies.get("cart_session") or request.headers.get("X-Cart-Session")
    
    query = {}
    if user:
        query["user_id"] = user.user_id
    elif session_id:
        query["session_id"] = session_id
    
    if query:
        await db.carts.delete_one(query)
    
    return {"message": "Panier vidé"}

# ============== WISHLIST ROUTES ==============

@api_router.get("/wishlist")
async def get_wishlist(user: User = Depends(require_auth)):
    wishlist = await db.wishlists.find_one({"user_id": user.user_id}, {"_id": 0})
    if not wishlist:
        return {"items": []}
    
    # Fetch product details
    enriched_items = []
    for item in wishlist.get("items", []):
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            enriched_items.append({
                "product_id": item["product_id"],
                "added_at": item["added_at"],
                "name": product["name"],
                "price": product["price"],
                "image": product["images"][0] if product["images"] else "",
                "stock": product["stock"]
            })
    
    return {"items": enriched_items}

@api_router.post("/wishlist/add/{product_id}")
async def add_to_wishlist(product_id: str, user: User = Depends(require_auth)):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.wishlists.update_one(
        {"user_id": user.user_id},
        {
            "$addToSet": {"items": {"product_id": product_id, "added_at": now}},
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )
    
    return {"message": "Produit ajouté à la liste de souhaits"}

@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(product_id: str, user: User = Depends(require_auth)):
    await db.wishlists.update_one(
        {"user_id": user.user_id},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Produit retiré de la liste de souhaits"}

@api_router.post("/wishlist/share")
async def create_shared_wishlist(user: User = Depends(require_auth)):
    """Create a shareable link for the user's wishlist"""
    share_id = uuid.uuid4().hex[:12]
    now = datetime.now(timezone.utc).isoformat()
    
    # Update wishlist with share info
    await db.wishlists.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "share_id": share_id,
                "share_created_at": now,
                "owner_name": user.name
            }
        }
    )
    
    return {"share_id": share_id, "share_url": f"/wishlist/shared/{share_id}"}

@api_router.get("/wishlist/shared/{share_id}")
async def get_shared_wishlist(share_id: str):
    """Get a shared wishlist by its share ID (public endpoint)"""
    wishlist = await db.wishlists.find_one({"share_id": share_id}, {"_id": 0})
    
    if not wishlist:
        raise HTTPException(status_code=404, detail="Liste introuvable")
    
    # Fetch product details
    enriched_items = []
    for item in wishlist.get("items", []):
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            enriched_items.append({
                "product_id": product["product_id"],
                "name": product["name"],
                "price": product["price"],
                "original_price": product.get("original_price"),
                "images": product.get("images", []),
                "stock": product["stock"]
            })
    
    return {
        "owner_name": wishlist.get("owner_name", ""),
        "items": enriched_items,
        "created_at": wishlist.get("share_created_at")
    }

# ============== LOYALTY PROGRAM ROUTES ==============

POINTS_PER_1000_FCFA = 10  # 10 points per 1000 FCFA spent

LOYALTY_REWARDS = [
    {"id": 1, "name": "5% de réduction", "points": 500, "type": "discount", "value": 5},
    {"id": 2, "name": "10% de réduction", "points": 1000, "type": "discount", "value": 10},
    {"id": 3, "name": "Livraison gratuite", "points": 750, "type": "free_shipping", "value": 0},
    {"id": 4, "name": "15% de réduction", "points": 1500, "type": "discount", "value": 15},
    {"id": 5, "name": "2000 FCFA de crédit", "points": 2000, "type": "credit", "value": 2000},
    {"id": 6, "name": "5000 FCFA de crédit", "points": 4500, "type": "credit", "value": 5000},
]

@api_router.get("/loyalty/me")
async def get_user_loyalty(user: User = Depends(require_auth)):
    """Get user's loyalty points and history"""
    loyalty = await db.loyalty.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not loyalty:
        # Initialize loyalty account
        loyalty = {
            "user_id": user.user_id,
            "points": 0,
            "total_earned": 0,
            "total_redeemed": 0,
            "tier": "Bronze",
            "history": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.loyalty.insert_one(loyalty)
        loyalty.pop("_id", None)
    
    return loyalty

@api_router.post("/loyalty/add-points")
async def add_loyalty_points(
    order_total: int,
    order_id: str,
    user: User = Depends(require_auth)
):
    """Add loyalty points after a purchase (internal use)"""
    points_earned = (order_total // 1000) * POINTS_PER_1000_FCFA
    now = datetime.now(timezone.utc).isoformat()
    
    history_entry = {
        "type": "earn",
        "points": points_earned,
        "description": f"Achat #{order_id}",
        "date": now
    }
    
    result = await db.loyalty.update_one(
        {"user_id": user.user_id},
        {
            "$inc": {"points": points_earned, "total_earned": points_earned},
            "$push": {"history": {"$each": [history_entry], "$position": 0, "$slice": 50}},
            "$setOnInsert": {"created_at": now, "tier": "Bronze", "total_redeemed": 0}
        },
        upsert=True
    )
    
    # Update tier based on total points
    loyalty = await db.loyalty.find_one({"user_id": user.user_id})
    new_tier = "Bronze"
    if loyalty["points"] >= 15000:
        new_tier = "Platine"
    elif loyalty["points"] >= 5000:
        new_tier = "Or"
    elif loyalty["points"] >= 1000:
        new_tier = "Argent"
    
    await db.loyalty.update_one(
        {"user_id": user.user_id},
        {"$set": {"tier": new_tier}}
    )
    
    return {"points_earned": points_earned, "new_tier": new_tier}

@api_router.post("/loyalty/redeem")
async def redeem_loyalty_reward(
    reward_id: int = None,
    user: User = Depends(require_auth)
):
    """Redeem loyalty points for a reward"""
    reward = next((r for r in LOYALTY_REWARDS if r["id"] == reward_id), None)
    if not reward:
        raise HTTPException(status_code=404, detail="Récompense non trouvée")
    
    loyalty = await db.loyalty.find_one({"user_id": user.user_id})
    if not loyalty or loyalty["points"] < reward["points"]:
        raise HTTPException(status_code=400, detail="Points insuffisants")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate promo code
    promo_code = f"YAMA{uuid.uuid4().hex[:6].upper()}"
    
    # Save the reward/coupon
    coupon_doc = {
        "coupon_id": f"coup_{uuid.uuid4().hex[:10]}",
        "code": promo_code,
        "user_id": user.user_id,
        "reward_type": reward["type"],
        "value": reward["value"],
        "points_spent": reward["points"],
        "created_at": now,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "used": False
    }
    await db.coupons.insert_one(coupon_doc)
    
    # Deduct points
    history_entry = {
        "type": "redeem",
        "points": -reward["points"],
        "description": f"Échange: {reward['name']}",
        "date": now
    }
    
    await db.loyalty.update_one(
        {"user_id": user.user_id},
        {
            "$inc": {"points": -reward["points"], "total_redeemed": reward["points"]},
            "$push": {"history": {"$each": [history_entry], "$position": 0, "$slice": 50}}
        }
    )
    
    return {
        "success": True,
        "promo_code": promo_code,
        "reward": reward["name"],
        "expires_at": coupon_doc["expires_at"]
    }

# ============== REVIEWS WITH MEDIA ROUTES ==============

@api_router.post("/products/{product_id}/reviews/with-media")
async def create_review_with_media(
    product_id: str,
    rating: int = 5,
    title: str = "",
    comment: str = "",
    media: List[UploadFile] = File(default=[]),
    user: User = Depends(require_auth)
):
    """Create a review with optional media (photos/videos)"""
    # Validate product exists
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if user already reviewed this product
    existing = await db.reviews.find_one({
        "product_id": product_id,
        "user_id": user.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà évalué ce produit")
    
    # Process media files
    media_urls = []
    uploads_dir = Path("uploads/reviews")
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    for file in media[:5]:  # Max 5 files
        if file.size > 10 * 1024 * 1024:  # 10MB limit
            continue
        
        # Generate unique filename
        ext = Path(file.filename).suffix.lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm']:
            continue
        
        filename = f"review_{uuid.uuid4().hex[:12]}{ext}"
        filepath = uploads_dir / filename
        
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        media_type = "video" if ext in ['.mp4', '.mov', '.webm'] else "image"
        media_urls.append({
            "type": media_type,
            "url": f"/api/uploads/reviews/{filename}"
        })
    
    now = datetime.now(timezone.utc).isoformat()
    
    review_doc = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "product_id": product_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "rating": max(1, min(5, rating)),
        "title": sanitize_input(title, 100),
        "comment": sanitize_input(comment, 1000),
        "media": media_urls,
        "helpful_count": 0,
        "verified_purchase": False,  # TODO: Check if user purchased this product
        "created_at": now
    }
    
    await db.reviews.insert_one(review_doc)
    
    return {"message": "Avis publié avec succès", "review_id": review_doc["review_id"]}

@api_router.get("/uploads/reviews/{filename}")
async def get_review_media(filename: str):
    """Serve review media files"""
    filepath = Path("uploads/reviews") / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Determine content type
    ext = filepath.suffix.lower()
    content_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return StreamingResponse(
        open(filepath, "rb"),
        media_type=content_type
    )

# ============== ORDERS ROUTES ==============

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, request: Request):
    user = await get_current_user(request)
    
    order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    
    order_doc = order_data.model_dump()
    order_doc["order_id"] = order_id
    order_doc["user_id"] = user.user_id if user else None
    order_doc["payment_status"] = "pending"
    order_doc["order_status"] = "pending"
    order_doc["created_at"] = now.isoformat()
    
    # Update stock for each product
    for item in order_data.items:
        await db.products.update_one(
            {"product_id": item.product_id},
            {"$inc": {"stock": -item.quantity}}
        )
    
    await db.orders.insert_one(order_doc)
    
    # Clear user's cart
    if user:
        await db.carts.delete_one({"user_id": user.user_id})
    
    # Send order confirmation email (async, don't wait)
    asyncio.create_task(send_order_confirmation_email(order_doc))
    
    # Send notification to admin
    asyncio.create_task(send_admin_order_notification(order_doc))
    
    # Send push notification to user if subscribed
    if user:
        asyncio.create_task(send_push_to_user(
            user.user_id,
            "🎉 Commande confirmée !",
            f"Votre commande #{order_id} a été reçue. Nous la préparons !",
            f"{SITE_URL}/order/{order_id}"
        ))
    
    order_doc["created_at"] = now
    return order_doc

@api_router.get("/orders")
async def get_user_orders(user: User = Depends(require_auth)):
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    """Get order details - public for basic tracking, full details for owner/admin"""
    user = await get_current_user(request)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Convert datetime if needed
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    # Check if user is owner or admin
    is_owner = user and (user.role == "admin" or order.get("user_id") == user.user_id)
    
    # For public access (no user or not owner), return limited info
    if not is_owner:
        # Return public-safe order info for tracking
        return {
            "order_id": order.get("order_id"),
            "order_status": order.get("order_status"),
            "payment_status": order.get("payment_status"),
            "payment_method": order.get("payment_method"),
            "total": order.get("total"),
            "shipping_cost": order.get("shipping_cost"),
            "created_at": order.get("created_at"),
            "status_history": order.get("status_history", []),
            "items": [{"name": item.get("name"), "quantity": item.get("quantity"), "image": item.get("image")} for item in order.get("items", [])],
            "shipping": {
                "city": order.get("shipping", {}).get("city"),
                "region": order.get("shipping", {}).get("region"),
            }
        }
    
    return order

# ============== ORDER TRACKING (PUBLIC) ==============

@api_router.get("/orders/track")
async def track_order(order_id: str, email: str):
    """Public endpoint to track an order by order_id and email"""
    # Find order by order_id
    order = await db.orders.find_one({"order_id": order_id.upper()}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Verify email matches
    order_email = order.get("shipping", {}).get("email") or order.get("customer_email")
    
    # If order has user_id, get user's email
    if order.get("user_id"):
        user = await db.users.find_one({"user_id": order["user_id"]}, {"_id": 0, "email": 1})
        if user:
            order_email = user.get("email")
    
    # Also check if email is in shipping info
    shipping_email = order.get("shipping", {}).get("email")
    
    # Verify email (case insensitive)
    email_lower = email.lower().strip()
    valid_email = False
    
    if order_email and order_email.lower() == email_lower:
        valid_email = True
    if shipping_email and shipping_email.lower() == email_lower:
        valid_email = True
    # Also allow if phone matches (for guest orders)
    shipping_phone = order.get("shipping", {}).get("phone", "")
    if shipping_phone and email_lower in shipping_phone.replace(" ", ""):
        valid_email = True
    
    if not valid_email:
        raise HTTPException(status_code=404, detail="Commande non trouvée pour cet email")
    
    # Map order_status to tracking status
    status_mapping = {
        "pending": "pending",
        "confirmed": "processing",
        "processing": "processing",
        "shipped": "shipped",
        "delivered": "delivered",
        "cancelled": "cancelled"
    }
    
    tracking_status = status_mapping.get(order.get("order_status", "pending"), "pending")
    
    # Build response with tracking info
    result = {
        "order_id": order["order_id"],
        "status": tracking_status,
        "order_status": order.get("order_status", "pending"),
        "payment_status": order.get("payment_status", "pending"),
        "created_at": order.get("created_at"),
        "items": order.get("items", []),
        "shipping": {
            "name": order.get("shipping", {}).get("full_name"),
            "address": order.get("shipping", {}).get("address"),
            "city": order.get("shipping", {}).get("city"),
            "region": order.get("shipping", {}).get("region"),
            "phone": order.get("shipping", {}).get("phone")
        },
        "subtotal": order.get("subtotal", 0),
        "shipping_cost": order.get("shipping_cost", 0),
        "discount": order.get("discount", 0),
        "total": order.get("total", 0),
        "customer_name": order.get("shipping", {}).get("full_name"),
        # Status timestamps
        "pending_at": order.get("created_at"),
        "processing_at": order.get("processing_at"),
        "shipped_at": order.get("shipped_at"),
        "delivered_at": order.get("delivered_at"),
        "cancelled_at": order.get("cancelled_at")
    }
    
    return result

# ============== PAYTECH PAYMENT INTEGRATION ==============

PAYTECH_API_URL = "https://paytech.sn/api/payment/request-payment"
PAYTECH_CHECKOUT_URL = "https://paytech.sn/payment/checkout/"

class PaymentRequest(BaseModel):
    order_id: str
    success_url: str
    cancel_url: str

class PaytechIPN(BaseModel):
    type_event: str
    custom_field: str
    payment_method: Optional[str] = None
    api_key_sha256: Optional[str] = None
    api_secret_sha256: Optional[str] = None

@api_router.post("/payments/paytech/initiate")
async def initiate_paytech_payment(payment: PaymentRequest):
    """Initiate a PayTech payment (Wave, Orange Money, Free Money, Card)"""
    
    # Get PayTech credentials
    api_key = os.environ.get('PAYTECH_API_KEY', '')
    api_secret = os.environ.get('PAYTECH_API_SECRET', '')
    env = os.environ.get('PAYTECH_ENV', 'test')
    
    if not api_key or api_key == 'votre_cle_api':
        raise HTTPException(status_code=500, detail="PayTech API non configurée. Veuillez ajouter vos clés API PayTech.")
    
    # Get order details
    order = await db.orders.find_one({"order_id": payment.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Get total amount - ensure it's the correct value
    total_amount = order.get('total', 0)
    logging.info(f"PayTech payment for order {payment.order_id}: total={total_amount} FCFA")
    
    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Montant de commande invalide")
    
    # Prepare item names
    items = order.get('items', order.get('products', []))
    item_names = ", ".join([item.get('name', 'Produit')[:30] for item in items[:3]])
    if len(items) > 3:
        item_names += f" +{len(items) - 3} autres"
    
    # Build IPN URL (webhook for payment confirmation)
    frontend_url = os.environ.get('FRONTEND_URL', payment.success_url.rsplit('/', 1)[0])
    ipn_url = f"{frontend_url}/api/payments/paytech/ipn"
    
    # Prepare PayTech request data
    paytech_data = {
        "item_name": item_names or "Commande YAMA+",
        "item_price": str(int(total_amount)),
        "currency": "XOF",
        "ref_command": f"{payment.order_id}_{int(datetime.now().timestamp())}",
        "command_name": f"Commande YAMA+ - {total_amount:,.0f} FCFA".replace(',', ' '),
        "env": env,
        "success_url": payment.success_url,
        "cancel_url": payment.cancel_url,
        "ipn_url": ipn_url,
        "custom_field": json.dumps({
            "order_id": payment.order_id,
            "amount": total_amount
        })
    }
    
    logging.info(f"PayTech request data: item_price={paytech_data['item_price']}, env={env}")
    
    # Make request to PayTech
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                PAYTECH_API_URL,
                data=paytech_data,
                headers={
                    "API_KEY": api_key,
                    "API_SECRET": api_secret,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if 'token' in result:
                checkout_url = f"{PAYTECH_CHECKOUT_URL}{result['token']}"
                
                # Store payment reference
                await db.orders.update_one(
                    {"order_id": payment.order_id},
                    {"$set": {
                        "paytech_token": result['token'],
                        "paytech_ref": paytech_data['ref_command'],
                        "payment_initiated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                return {
                    "success": True,
                    "checkout_url": checkout_url,
                    "token": result['token']
                }
            else:
                error_msg = result.get('error', [result.get('message', 'Erreur inconnue')])
                if isinstance(error_msg, list):
                    error_msg = error_msg[0] if error_msg else 'Erreur PayTech'
                raise HTTPException(status_code=400, detail=f"Erreur PayTech: {error_msg}")
                
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Erreur de connexion à PayTech: {str(e)}")


@api_router.post("/payments/paytech/ipn")
async def paytech_ipn_webhook(request: Request):
    """Handle PayTech IPN (Instant Payment Notification) webhook"""
    
    try:
        form_data = await request.form()
        data = dict(form_data)
        
        type_event = data.get('type_event')
        
        if type_event == 'sale_complete':
            # Verify API keys hash
            api_key = os.environ.get('PAYTECH_API_KEY', '')
            api_secret = os.environ.get('PAYTECH_API_SECRET', '')
            
            import hashlib
            expected_api_hash = hashlib.sha256(api_key.encode()).hexdigest()
            expected_secret_hash = hashlib.sha256(api_secret.encode()).hexdigest()
            
            received_api_hash = data.get('api_key_sha256', '')
            received_secret_hash = data.get('api_secret_sha256', '')
            
            if expected_api_hash != received_api_hash or expected_secret_hash != received_secret_hash:
                return JSONResponse(content={"status": "error", "message": "Invalid signature"}, status_code=401)
            
            # Parse custom field
            custom_field = json.loads(data.get('custom_field', '{}'))
            order_id = custom_field.get('order_id')
            payment_method = data.get('payment_method', 'PayTech')
            
            if order_id:
                # Update order status
                await db.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "order_status": "processing",
                        "payment_method_used": payment_method,
                        "paid_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                
                return JSONResponse(content={"status": "OK"})
        
        return JSONResponse(content={"status": "ignored"})
        
    except Exception as e:
        logging.error(f"PayTech IPN error: {str(e)}")
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)


@api_router.get("/payments/paytech/verify/{order_id}")
async def verify_paytech_payment(order_id: str):
    """Check payment status for an order"""
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    return {
        "order_id": order_id,
        "payment_status": order.get('payment_status', 'pending'),
        "order_status": order.get('order_status', 'pending'),
        "payment_method": order.get('payment_method_used'),
        "paid_at": order.get('paid_at')
    }

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/analytics")
async def get_analytics(
    period: str = "month",  # day, week, month, year
    user: User = Depends(require_admin)
):
    """Get comprehensive analytics data"""
    now = datetime.now(timezone.utc)
    
    # Define period start
    if period == "day":
        period_start = now - timedelta(days=1)
    elif period == "week":
        period_start = now - timedelta(weeks=1)
    elif period == "month":
        period_start = now - timedelta(days=30)
    else:  # year
        period_start = now - timedelta(days=365)
    
    period_start_str = period_start.isoformat()
    
    # Get orders in period
    orders_in_period = await db.orders.find({
        "created_at": {"$gte": period_start_str}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_orders = len(orders_in_period)
    total_revenue = sum(o.get("total", 0) for o in orders_in_period)
    paid_orders = [o for o in orders_in_period if o.get("payment_status") == "paid"]
    paid_revenue = sum(o.get("total", 0) for o in paid_orders)
    
    # Orders by status
    status_counts = {}
    for order in orders_in_period:
        status = order.get("order_status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Orders by day (for chart)
    daily_data = {}
    for order in orders_in_period:
        date_str = order.get("created_at", "")[:10]  # YYYY-MM-DD
        if date_str:
            if date_str not in daily_data:
                daily_data[date_str] = {"orders": 0, "revenue": 0}
            daily_data[date_str]["orders"] += 1
            daily_data[date_str]["revenue"] += order.get("total", 0)
    
    # Sort daily data
    daily_chart = [
        {"date": date, "orders": data["orders"], "revenue": data["revenue"]}
        for date, data in sorted(daily_data.items())
    ]
    
    # Top products
    product_sales = {}
    for order in orders_in_period:
        for item in order.get("items", []):
            pid = item.get("product_id", item.get("name", "unknown"))
            if pid not in product_sales:
                product_sales[pid] = {
                    "product_id": pid,
                    "name": item.get("name", "Produit"),
                    "quantity": 0,
                    "revenue": 0
                }
            product_sales[pid]["quantity"] += item.get("quantity", 1)
            product_sales[pid]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
    
    top_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    
    # Payment methods breakdown
    payment_methods = {}
    for order in orders_in_period:
        method = order.get("payment_method", "unknown")
        payment_methods[method] = payment_methods.get(method, 0) + 1
    
    # Get comparison with previous period
    prev_period_start = period_start - (now - period_start)
    prev_orders = await db.orders.find({
        "created_at": {"$gte": prev_period_start.isoformat(), "$lt": period_start_str}
    }, {"_id": 0, "total": 1}).to_list(10000)
    prev_revenue = sum(o.get("total", 0) for o in prev_orders)
    prev_order_count = len(prev_orders)
    
    # Calculate growth
    revenue_growth = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    orders_growth = ((total_orders - prev_order_count) / prev_order_count * 100) if prev_order_count > 0 else 0
    
    # Customer stats
    total_customers = await db.users.count_documents({})
    newsletter_subs = await db.newsletter.count_documents({"active": True})
    
    # Low stock products
    low_stock = await db.products.find(
        {"stock": {"$lte": 5, "$gt": 0}},
        {"_id": 0, "product_id": 1, "name": 1, "stock": 1}
    ).to_list(20)
    
    out_of_stock = await db.products.count_documents({"stock": {"$lte": 0}})
    
    return {
        "period": period,
        "summary": {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "paid_revenue": paid_revenue,
            "average_order_value": total_revenue // total_orders if total_orders > 0 else 0,
            "revenue_growth": round(revenue_growth, 1),
            "orders_growth": round(orders_growth, 1)
        },
        "orders_by_status": status_counts,
        "payment_methods": payment_methods,
        "daily_chart": daily_chart[-30:],  # Last 30 days
        "top_products": top_products,
        "customers": {
            "total": total_customers,
            "newsletter_subscribers": newsletter_subs
        },
        "inventory": {
            "low_stock_products": low_stock,
            "out_of_stock_count": out_of_stock
        }
    }

@api_router.get("/admin/orders")
async def get_all_orders(
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: User = Depends(require_admin)
):
    query = {}
    if status:
        query["order_status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    request: Request,
    user: User = Depends(require_admin)
):
    body = await request.json()
    order_status = body.get("order_status")
    payment_status = body.get("payment_status")
    note = body.get("note", "")
    
    update_doc = {}
    if order_status:
        update_doc["order_status"] = order_status
    if payment_status:
        update_doc["payment_status"] = payment_status
    
    if not update_doc:
        raise HTTPException(status_code=400, detail="Aucune mise à jour fournie")
    
    # Add to status history
    history_entry = {
        "status": order_status or payment_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": note
    }
    
    result = await db.orders.update_one(
        {"order_id": order_id}, 
        {
            "$set": update_doc,
            "$push": {"status_history": history_entry}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Send shipping notification email if status changed to shipped
    if order_status == "shipped":
        order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
        if order:
            shipping_email = order.get("shipping", {}).get("email")
            if shipping_email:
                asyncio.create_task(send_shipping_email(shipping_email, order_id, note))
    
    # Send status update email to customer for other status changes
    elif order_status in ["processing", "delivered", "cancelled"]:
        order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
        if order:
            shipping_email = order.get("shipping", {}).get("email")
            if shipping_email:
                asyncio.create_task(send_order_status_update_email(shipping_email, order_id, order_status, note))
    
    # Send push notification to customer about status update
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if order and order.get("user_id"):
        status_messages = {
            "processing": ("📦 Commande en préparation", f"Votre commande #{order_id} est en cours de préparation."),
            "shipped": ("🚚 Commande expédiée", f"Votre commande #{order_id} est en route !"),
            "delivered": ("✅ Commande livrée", f"Votre commande #{order_id} a été livrée. Merci !"),
            "cancelled": ("❌ Commande annulée", f"Votre commande #{order_id} a été annulée.")
        }
        if order_status in status_messages:
            title, body = status_messages[order_status]
            asyncio.create_task(send_push_to_user(
                order.get("user_id"),
                title,
                body,
                f"{SITE_URL}/order/{order_id}"
            ))
    
    return {"message": "Statut mis à jour"}

# ============== INVOICE GENERATION ==============

def generate_invoice_pdf(order: dict) -> io.BytesIO:
    """Generate a professional PDF invoice for an order with logo and product images"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=5,
        textColor=colors.HexColor('#0B0B0B'),
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#666666')
    )
    
    # Add logo header
    logo_path = ROOT_DIR / "logo_yama.png"
    logging.info(f"Invoice logo path: {logo_path}, exists: {logo_path.exists()}")
    
    # Company legal info
    company_info = """<b>GROUPE YAMA PLUS</b><br/>
<font size='8' color='#666666'>Dakar – Sénégal<br/>
Email : contact@groupeyamaplus.com<br/>
Tel : 78 382 75 75 / 77 849 81 37<br/>
NINEA : 012808210<br/>
RCCM : SN DKR 2026 A 4814</font>"""
    
    if logo_path.exists():
        try:
            # Create header with YAMA+ logo
            logo_img = Image(str(logo_path), width=3.5*cm, height=3.5*cm)
            header_data = [[logo_img, Paragraph(company_info, styles['Normal'])]]
            header_table = Table(header_data, colWidths=[4.5*cm, 12*cm])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ]))
            elements.append(header_table)
            logging.info("Logo added to invoice successfully")
        except Exception as e:
            logging.error(f"Error adding logo to invoice: {e}")
            elements.append(Paragraph("GROUPE YAMA PLUS", title_style))
            elements.append(Paragraph(company_info, header_style))
    else:
        logging.warning(f"Logo file not found at {logo_path}")
        elements.append(Paragraph("GROUPE YAMA PLUS", title_style))
        elements.append(Paragraph(company_info, header_style))
    elements.append(Spacer(1, 15))
    
    # Divider line
    divider = Table([['']], colWidths=[17*cm])
    divider.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#0B0B0B')),
    ]))
    elements.append(divider)
    elements.append(Spacer(1, 15))
    
    # Invoice Title
    elements.append(Paragraph(f"<b>FACTURE N° {order['order_id'].upper()}</b>", ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=15
    )))
    
    # Order Date
    order_date = order.get('created_at', datetime.now(timezone.utc))
    if isinstance(order_date, str):
        order_date = datetime.fromisoformat(order_date.replace('Z', '+00:00'))
    
    elements.append(Paragraph(f"<b>Date:</b> {order_date.strftime('%d/%m/%Y à %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 15))
    
    # Customer Info
    shipping = order.get('shipping', {})
    elements.append(Paragraph("<b>FACTURER À:</b>", styles['Heading3']))
    elements.append(Paragraph(f"{shipping.get('full_name', 'Client')}", styles['Normal']))
    elements.append(Paragraph(f"{shipping.get('address', '')}", styles['Normal']))
    elements.append(Paragraph(f"{shipping.get('city', '')}, {shipping.get('region', 'Dakar')}", styles['Normal']))
    elements.append(Paragraph(f"Tél: {shipping.get('phone', '')}", styles['Normal']))
    if shipping.get('email'):
        elements.append(Paragraph(f"Email: {shipping.get('email')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Products with Images
    elements.append(Paragraph("<b>ARTICLES COMMANDÉS:</b>", styles['Heading3']))
    elements.append(Spacer(1, 10))
    
    # Products Table with Image column and description
    table_data = [['', 'Produit', 'Qté', 'Prix Unit.', 'Total']]
    
    # Use 'items' key (the correct key used when storing orders)
    items = order.get('items', []) or order.get('products', [])
    
    for item in items:
        name = item.get('name', 'Produit')[:40]
        # Get description from product database if not in order
        description = item.get('description', '') or item.get('short_description', '')
        if description:
            description = description[:60]
        qty = item.get('quantity', 1)
        price = item.get('price', 0)
        total_price = price * qty
        
        # Product name with description
        product_text = f"<b>{name}</b>"
        if description:
            product_text += f"<br/><font size='7' color='#666666'>{description}...</font>"
        
        # Try to get product image
        img_cell = ''
        try:
            img_url = item.get('image', '')
            if img_url and img_url.startswith('http'):
                import urllib.request
                import tempfile
                img_path = f"/tmp/prod_{item.get('product_id', 'temp')}.jpg"
                urllib.request.urlretrieve(img_url, img_path)
                img_cell = Image(img_path, width=1.2*cm, height=1.2*cm)
        except:
            img_cell = ''
        
        table_data.append([
            img_cell,
            Paragraph(product_text, ParagraphStyle('ProductCell', parent=styles['Normal'], fontSize=8, leading=10)),
            str(qty),
            f"{price:,.0f} FCFA".replace(',', ' '),
            f"{total_price:,.0f} FCFA".replace(',', ' ')
        ])
    
    # Create table with image column
    table = Table(table_data, colWidths=[1.5*cm, 7*cm, 1.5*cm, 3.5*cm, 3.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B0B0B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F5F5F7')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Totals
    items = order.get('items', []) or order.get('products', [])
    subtotal = order.get('subtotal', sum(p.get('price', 0) * p.get('quantity', 1) for p in items))
    shipping_cost = order.get('shipping_cost', 2500)
    discount = order.get('discount', 0)
    total = order.get('total', subtotal + shipping_cost - discount)
    
    totals_data = [
        ['Sous-total:', f"{subtotal:,.0f} FCFA".replace(',', ' ')],
        ['Livraison:', f"{shipping_cost:,.0f} FCFA".replace(',', ' ')],
    ]
    
    if discount > 0:
        totals_data.append(['Réduction:', f"-{discount:,.0f} FCFA".replace(',', ' ')])
    
    totals_data.append(['TOTAL:', f"{total:,.0f} FCFA".replace(',', ' ')])
    
    totals_table = Table(totals_data, colWidths=[13.5*cm, 3.5*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.HexColor('#0B0B0B')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 30))
    
    # Payment Info
    payment_method = order.get('payment_method', 'Non spécifié')
    payment_labels = {
        'wave': 'Wave',
        'orange_money': 'Orange Money',
        'card': 'Carte Bancaire',
        'cash': 'Paiement à la livraison'
    }
    elements.append(Paragraph(f"<b>Mode de paiement:</b> {payment_labels.get(payment_method, payment_method)}", styles['Normal']))
    
    payment_status = order.get('payment_status', 'pending')
    status_labels = {
        'pending': '⏳ En attente',
        'paid': '✅ Payé',
        'failed': '❌ Échoué'
    }
    elements.append(Paragraph(f"<b>Statut du paiement:</b> {status_labels.get(payment_status, payment_status)}", styles['Normal']))
    elements.append(Spacer(1, 40))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#999999'),
        alignment=1  # Center
    )
    elements.append(Paragraph("Merci pour votre achat chez GROUPE YAMA PLUS !", footer_style))
    elements.append(Paragraph("Pour toute question, contactez-nous au 78 382 75 75 / 77 849 81 37", footer_style))
    elements.append(Paragraph("NINEA : 012808210 | RCCM : SN DKR 2026 A 4814", footer_style))
    elements.append(Paragraph("www.groupeyamaplus.com", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer


@api_router.get("/orders/{order_id}/invoice")
async def get_order_invoice(order_id: str, request: Request):
    """Generate and download invoice PDF for an order"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Generate PDF
    pdf_buffer = generate_invoice_pdf(order)
    
    # Return as downloadable file
    filename = f"facture_{order_id}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@api_router.get("/admin/orders/{order_id}/invoice")
async def get_admin_order_invoice(order_id: str, user: User = Depends(require_admin)):
    """Generate and download invoice PDF for an order (admin)"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Generate PDF
    pdf_buffer = generate_invoice_pdf(order)
    
    # Return as downloadable file
    filename = f"facture_{order_id}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@api_router.get("/admin/stats")
async def get_admin_stats(user: User = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"order_status": "pending"})
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    
    # Calculate revenue
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_products": total_products,
        "total_users": total_users,
        "total_revenue": total_revenue
    }

@api_router.get("/admin/users")
async def get_all_users(
    limit: int = 50,
    skip: int = 0,
    user: User = Depends(require_admin)
):
    users = await db.users.find({}, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    return {"users": users, "total": total}

@api_router.get("/admin/export/orders")
async def export_orders_csv(user: User = Depends(require_admin)):
    """Export all orders as CSV"""
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    if not orders:
        return Response(content="Aucune commande", media_type="text/plain")
    
    # Create CSV content
    import io
    output = io.StringIO()
    output.write("order_id,date,client,email,telephone,adresse,ville,total,statut,methode_paiement\n")
    
    for order in orders:
        shipping = order.get("shipping", {})
        date = order.get("created_at", "")[:10] if order.get("created_at") else ""
        row = [
            order.get("order_id", ""),
            date,
            shipping.get("full_name", "").replace(",", " "),
            shipping.get("email", ""),
            shipping.get("phone", ""),
            shipping.get("address", "").replace(",", " "),
            shipping.get("city", ""),
            str(order.get("total", 0)),
            order.get("order_status", ""),
            order.get("payment_method", "")
        ]
        output.write(",".join(row) + "\n")
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=commandes_yama.csv"}
    )

@api_router.get("/admin/export/clients")
async def export_clients_csv(user: User = Depends(require_admin)):
    """Export all clients as CSV"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(1000)
    
    if not users:
        return Response(content="Aucun client", media_type="text/plain")
    
    import io
    output = io.StringIO()
    output.write("user_id,nom,email,telephone,date_inscription,role,commandes\n")
    
    for u in users:
        # Count orders for this user
        order_count = await db.orders.count_documents({"user_id": u.get("user_id")})
        date = u.get("created_at", "")[:10] if u.get("created_at") else ""
        row = [
            u.get("user_id", ""),
            u.get("name", "").replace(",", " "),
            u.get("email", ""),
            u.get("phone", ""),
            date,
            u.get("role", "customer"),
            str(order_count)
        ]
        output.write(",".join(row) + "\n")
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clients_yama.csv"}
    )

# ============== CONTACT ROUTES ==============

@api_router.post("/contact")
async def send_contact_message(message: ContactMessage):
    message_doc = message.model_dump()
    message_doc["message_id"] = f"msg_{uuid.uuid4().hex[:12]}"
    message_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    message_doc["read"] = False
    
    await db.contact_messages.insert_one(message_doc)
    
    return {"message": "Message envoyé avec succès"}

@api_router.get("/admin/messages")
async def get_contact_messages(user: User = Depends(require_admin)):
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return messages

# ============== ABANDONED CART ADMIN ROUTES ==============

@api_router.get("/admin/abandoned-carts")
async def get_abandoned_carts(user: User = Depends(require_admin)):
    """Get list of abandoned carts with user details"""
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=ABANDONED_CART_TIMEOUT_HOURS)
    cutoff_iso = cutoff_time.isoformat()
    
    # Find abandoned carts
    carts = await db.carts.find({
        "user_id": {"$ne": None},
        "items": {"$exists": True, "$ne": []},
        "updated_at": {"$lt": cutoff_iso}
    }, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    # Enrich with user data and product details
    result = []
    for cart in carts:
        user_doc = await db.users.find_one({"user_id": cart["user_id"]}, {"_id": 0, "email": 1, "name": 1})
        if not user_doc:
            continue
        
        # Get product details
        items_with_details = []
        total = 0
        for item in cart.get("items", []):
            product = await db.products.find_one(
                {"product_id": item["product_id"]},
                {"_id": 0, "name": 1, "price": 1, "images": 1}
            )
            if product:
                item_total = product.get("price", 0) * item.get("quantity", 1)
                items_with_details.append({
                    "product_id": item["product_id"],
                    "name": product.get("name"),
                    "price": product.get("price"),
                    "quantity": item.get("quantity"),
                    "image": product.get("images", [""])[0] if product.get("images") else "",
                    "total": item_total
                })
                total += item_total
        
        result.append({
            "cart_id": cart.get("cart_id"),
            "user_email": user_doc.get("email"),
            "user_name": user_doc.get("name"),
            "items": items_with_details,
            "total": total,
            "updated_at": cart.get("updated_at"),
            "created_at": cart.get("created_at"),
            "email_sent": cart.get("abandoned_email_sent", False),
            "abandoned_at": cart.get("abandoned_at")
        })
    
    return result

@api_router.get("/admin/abandoned-carts/stats")
async def get_abandoned_cart_stats(user: User = Depends(require_admin)):
    """Get abandoned cart statistics"""
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=ABANDONED_CART_TIMEOUT_HOURS)
    cutoff_iso = cutoff_time.isoformat()
    
    # Count abandoned carts
    abandoned_count = await db.carts.count_documents({
        "user_id": {"$ne": None},
        "items": {"$exists": True, "$ne": []},
        "updated_at": {"$lt": cutoff_iso}
    })
    
    # Count emails sent
    emails_sent = await db.abandoned_cart_emails.count_documents({})
    
    # Count emails sent today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    emails_today = await db.abandoned_cart_emails.count_documents({
        "sent_at": {"$gte": today_start.isoformat()}
    })
    
    # Get last run stats
    last_run = await db.abandoned_cart_stats.find_one({}, {"_id": 0}, sort=[("run_at", -1)])
    
    return {
        "abandoned_carts": abandoned_count,
        "total_emails_sent": emails_sent,
        "emails_sent_today": emails_today,
        "last_run": last_run,
        "automation_interval_hours": 1,
        "cart_timeout_hours": ABANDONED_CART_TIMEOUT_HOURS
    }

@api_router.post("/admin/abandoned-carts/trigger")
async def trigger_abandoned_cart_detection(user: User = Depends(require_admin)):
    """Manually trigger abandoned cart detection"""
    asyncio.create_task(detect_and_process_abandoned_carts())
    return {"message": "Détection des paniers abandonnés lancée"}

@api_router.get("/admin/abandoned-carts/emails")
async def get_abandoned_cart_emails(user: User = Depends(require_admin)):
    """Get list of sent abandoned cart emails"""
    emails = await db.abandoned_cart_emails.find({}, {"_id": 0}).sort("sent_at", -1).to_list(100)
    return emails

@api_router.post("/admin/abandoned-carts/send/{cart_id}")
async def send_abandoned_cart_email_manually(cart_id: str, user: User = Depends(require_admin)):
    """Manually send abandoned cart email for a specific cart"""
    cart = await db.carts.find_one({"cart_id": cart_id}, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Panier non trouvé")
    
    if not cart.get("user_id"):
        raise HTTPException(status_code=400, detail="Panier sans utilisateur associé")
    
    user_doc = await db.users.find_one({"user_id": cart["user_id"]}, {"_id": 0})
    if not user_doc or not user_doc.get("email"):
        raise HTTPException(status_code=400, detail="Email utilisateur non trouvé")
    
    # Get cart items with details
    cart_items = []
    cart_total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one(
            {"product_id": item["product_id"]},
            {"_id": 0, "name": 1, "price": 1, "images": 1}
        )
        if product:
            item_data = {
                "product_id": item["product_id"],
                "name": product.get("name", "Produit"),
                "quantity": item.get("quantity", 1),
                "price": product.get("price", 0),
                "image": product.get("images", [""])[0] if product.get("images") else ""
            }
            cart_items.append(item_data)
            cart_total += item_data["price"] * item_data["quantity"]
    
    result = await mailerlite_service.add_subscriber_to_abandoned_cart(
        email=user_doc["email"],
        name=user_doc.get("name", ""),
        cart_items=cart_items,
        cart_total=cart_total
    )
    
    if result.get("success"):
        await db.carts.update_one(
            {"cart_id": cart_id},
            {"$set": {"abandoned_email_sent": True, "abandoned_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": f"Email envoyé à {user_doc['email']}"}
    
    raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")

# ============== CATEGORIES ==============

@api_router.get("/categories")
async def get_categories():
    return [
        {"id": "electronique", "name": "Électronique", "icon": "Smartphone"},
        {"id": "electromenager", "name": "Électroménager", "icon": "Refrigerator"},
        {"id": "decoration", "name": "Décoration & Mobilier", "icon": "Sofa"},
        {"id": "beaute", "name": "Beauté & Bien-être", "icon": "Sparkles"},
        {"id": "automobile", "name": "Automobile", "icon": "Car"}
    ]

# ============== SEO - SITEMAP ==============

@api_router.get("/sitemap.xml")
async def get_sitemap():
    """Generate dynamic sitemap.xml"""
    base_url = "{SITE_URL}"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/category/electronique", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/category/electromenager", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/category/decoration", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/category/beaute", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/category/automobile", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/nouveautes", "priority": "0.8", "changefreq": "daily"},
        {"loc": "/promotions", "priority": "0.8", "changefreq": "daily"},
        {"loc": "/a-propos", "priority": "0.5", "changefreq": "monthly"},
        {"loc": "/contact", "priority": "0.5", "changefreq": "monthly"},
        {"loc": "/aide", "priority": "0.5", "changefreq": "monthly"},
    ]
    
    # Get all products
    products = await db.products.find({}, {"product_id": 1, "updated_at": 1}).to_list(1000)
    
    # Build XML
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Add static pages
    for page in static_pages:
        xml_content += f'''  <url>
    <loc>{base_url}{page["loc"]}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{page["changefreq"]}</changefreq>
    <priority>{page["priority"]}</priority>
  </url>\n'''
    
    # Add product pages
    for product in products:
        product_date = product.get("updated_at", now)
        if isinstance(product_date, str):
            product_date = product_date[:10]
        else:
            product_date = product_date.strftime("%Y-%m-%d") if hasattr(product_date, 'strftime') else now
        
        xml_content += f'''  <url>
    <loc>{base_url}/product/{product["product_id"]}</loc>
    <lastmod>{product_date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n'''
    
    xml_content += '</urlset>'
    
    return Response(content=xml_content, media_type="application/xml")

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_database():
    """Seed the database with sample products and admin user"""
    
    # Check if already seeded
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "Base de données déjà initialisée", "count": existing}
    
    # Limit memory usage by processing in smaller batches
    import gc
    gc.collect()  # Force garbage collection before seeding
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create default admin user
    admin_exists = await db.users.find_one({"email": "admin@yama.sn"})
    if not admin_exists:
        admin_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "admin@yama.sn",
            "name": "Admin YAMA+",
            "phone": "+221783827575",
            "password": hash_password("admin123"),
            "role": "admin",
            "picture": None,
            "created_at": now
        }
        await db.users.insert_one(admin_doc)
    
    products = [
        # Électronique
        {
            "product_id": "prod_iphone15pro",
            "name": "iPhone 15 Pro Max",
            "description": "Le smartphone le plus avancé. Puce A17 Pro, système de caméra révolutionnaire, design en titane. Une puissance inégalée pour créer, jouer et travailler.",
            "short_description": "Puce A17 Pro. Titane. Caméra 48MP.",
            "price": 1299000,
            "original_price": None,
            "category": "electronique",
            "subcategory": "smartphones",
            "images": [
                "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800",
                "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800"
            ],
            "stock": 15,
            "featured": True,
            "is_new": True,
            "is_promo": False,
            "specs": {"storage": "256GB", "color": "Titane Naturel", "display": "6.7\""},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_macbook_air",
            "name": "MacBook Air M3",
            "description": "Fin. Léger. Puissant. Le MacBook Air avec puce M3 offre une autonomie exceptionnelle et des performances révolutionnaires dans un design silencieux sans ventilateur.",
            "short_description": "Puce M3. 18h d'autonomie. Silencieux.",
            "price": 1149000,
            "original_price": None,
            "category": "electronique",
            "subcategory": "ordinateurs",
            "images": [
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
                "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800"
            ],
            "stock": 10,
            "featured": True,
            "is_new": True,
            "is_promo": False,
            "specs": {"ram": "8GB", "storage": "256GB SSD", "display": "13.6\" Liquid Retina"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_airpods_pro",
            "name": "AirPods Pro 2",
            "description": "Son immersif. Réduction de bruit active. Transparence adaptative. Audio spatial personnalisé. L'expérience audio ultime.",
            "short_description": "ANC. Audio Spatial. USB-C.",
            "price": 189000,
            "original_price": 219000,
            "category": "electronique",
            "subcategory": "audio",
            "images": [
                "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800"
            ],
            "stock": 30,
            "featured": True,
            "is_new": False,
            "is_promo": True,
            "specs": {"battery": "6h (30h avec boîtier)", "noise_cancellation": "Active"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_samsung_tv",
            "name": "Samsung Neo QLED 65\"",
            "description": "Vivez une expérience visuelle extraordinaire. Technologie Quantum Matrix, processeur Neural Quantum 4K, design ultra-fin. Le summum du divertissement.",
            "short_description": "4K. 120Hz. HDR10+. Smart TV.",
            "price": 1599000,
            "original_price": 1899000,
            "category": "electronique",
            "subcategory": "tv",
            "images": [
                "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800"
            ],
            "stock": 5,
            "featured": True,
            "is_new": False,
            "is_promo": True,
            "specs": {"resolution": "4K", "refresh": "120Hz", "hdr": "HDR10+"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_galaxy_watch",
            "name": "Galaxy Watch 6 Classic",
            "description": "La montre connectée premium. Lunette rotative iconique, suivi santé avancé, design intemporel. Votre compagnon intelligent au quotidien.",
            "short_description": "Lunette rotative. Suivi santé complet.",
            "price": 279000,
            "original_price": None,
            "category": "electronique",
            "subcategory": "montres",
            "images": [
                "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800"
            ],
            "stock": 20,
            "featured": False,
            "is_new": True,
            "is_promo": False,
            "specs": {"size": "47mm", "battery": "40h", "water_resistance": "5ATM"},
            "created_at": now,
            "updated_at": now
        },
        # Électroménager
        {
            "product_id": "prod_dyson_v15",
            "name": "Dyson V15 Detect",
            "description": "L'aspirateur le plus intelligent. Laser révélateur de poussière, capteur piézo, écran LCD. Une propreté scientifiquement prouvée.",
            "short_description": "Laser. 60min d'autonomie. Sans fil.",
            "price": 549000,
            "original_price": None,
            "category": "electromenager",
            "subcategory": "aspirateurs",
            "images": [
                "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800"
            ],
            "stock": 12,
            "featured": True,
            "is_new": False,
            "is_promo": False,
            "specs": {"battery": "60min", "power": "240AW", "weight": "3kg"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_nespresso",
            "name": "Nespresso Vertuo Next",
            "description": "Le café parfait en un geste. Technologie Centrifusion, reconnaissance des capsules, design compact. L'art du café à la maison.",
            "short_description": "Centrifusion. 5 tailles de tasse.",
            "price": 119000,
            "original_price": 149000,
            "category": "electromenager",
            "subcategory": "cafe",
            "images": [
                "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800"
            ],
            "stock": 25,
            "featured": False,
            "is_new": False,
            "is_promo": True,
            "specs": {"pressure": "19 bars", "water_tank": "1.1L", "heat_time": "15s"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_samsung_fridge",
            "name": "Samsung Family Hub",
            "description": "Le réfrigérateur connecté. Écran tactile 21\", caméras internes, gestion des courses intelligente. La cuisine du futur, aujourd'hui.",
            "short_description": "Écran 21\". Caméras internes. WiFi.",
            "price": 2499000,
            "original_price": None,
            "category": "electromenager",
            "subcategory": "refrigerateurs",
            "images": [
                "https://images.pexels.com/photos/2724748/pexels-photo-2724748.jpeg?w=800"
            ],
            "stock": 3,
            "featured": True,
            "is_new": True,
            "is_promo": False,
            "specs": {"capacity": "614L", "class": "A++", "features": "Family Hub"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_airfryer",
            "name": "Philips Airfryer XXL",
            "description": "Cuisinez sain sans compromis. Technologie Twin TurboStar, grande capacité, résultats croustillants. Le plaisir de la friture sans huile.",
            "short_description": "XXL. 90% moins de graisse.",
            "price": 159000,
            "original_price": None,
            "category": "electromenager",
            "subcategory": "cuisine",
            "images": [
                "https://images.unsplash.com/photo-1648145765181-2e5ccaee0ad2?w=800"
            ],
            "stock": 18,
            "featured": False,
            "is_new": False,
            "is_promo": False,
            "specs": {"capacity": "1.4kg", "power": "2225W", "programs": "5"},
            "created_at": now,
            "updated_at": now
        },
        # Décoration & Mobilier
        {
            "product_id": "prod_sofa_scandinave",
            "name": "Canapé Oslo 3 Places",
            "description": "L'élégance scandinave. Lignes épurées, confort optimal, pieds en bois massif. Un classique intemporel pour votre salon.",
            "short_description": "Design scandinave. Tissu premium.",
            "price": 459000,
            "original_price": 549000,
            "category": "decoration",
            "subcategory": "canapes",
            "images": [
                "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"
            ],
            "stock": 6,
            "featured": True,
            "is_new": False,
            "is_promo": True,
            "specs": {"seats": "3", "material": "Tissu", "color": "Gris"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_lampe_arc",
            "name": "Lampe Arc Design",
            "description": "Lumière sculpturale. Arc élégant en acier brossé, base marbre, éclairage d'ambiance. Une pièce maîtresse pour votre intérieur.",
            "short_description": "Arc 180cm. Base marbre.",
            "price": 189000,
            "original_price": None,
            "category": "decoration",
            "subcategory": "luminaires",
            "images": [
                "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800"
            ],
            "stock": 10,
            "featured": False,
            "is_new": True,
            "is_promo": False,
            "specs": {"height": "180cm", "material": "Acier/Marbre", "bulb": "E27"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_table_basse",
            "name": "Table Basse Minimaliste",
            "description": "Simplicité raffinée. Plateau en verre trempé, structure en chêne massif, design épuré. L'essentiel, magnifié.",
            "short_description": "Verre & chêne. 120x60cm.",
            "price": 279000,
            "original_price": None,
            "category": "decoration",
            "subcategory": "tables",
            "images": [
                "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=800"
            ],
            "stock": 8,
            "featured": False,
            "is_new": False,
            "is_promo": False,
            "specs": {"dimensions": "120x60x40cm", "material": "Verre/Chêne"},
            "created_at": now,
            "updated_at": now
        },
        # Beauté & Bien-être
        {
            "product_id": "prod_dyson_airwrap",
            "name": "Dyson Airwrap Complete",
            "description": "Coiffure réinventée. Effet Coanda pour des boucles et du volume sans chaleur extrême. Tous les styles, zéro dommage.",
            "short_description": "Effet Coanda. 6 accessoires.",
            "price": 449000,
            "original_price": None,
            "category": "beaute",
            "subcategory": "cheveux",
            "images": [
                "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800"
            ],
            "stock": 14,
            "featured": True,
            "is_new": False,
            "is_promo": False,
            "specs": {"attachments": "6", "heat": "150°C max", "voltage": "220V"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_serum_visage",
            "name": "Sérum Éclat Vitamine C",
            "description": "Révélez votre éclat. Vitamine C stabilisée 15%, acide hyaluronique, antioxydants. Une peau lumineuse et protégée.",
            "short_description": "Vitamine C 15%. Anti-âge.",
            "price": 45000,
            "original_price": 55000,
            "category": "beaute",
            "subcategory": "soins",
            "images": [
                "https://images.pexels.com/photos/3762882/pexels-photo-3762882.jpeg?w=800"
            ],
            "stock": 40,
            "featured": False,
            "is_new": True,
            "is_promo": True,
            "specs": {"volume": "30ml", "key_ingredient": "Vitamine C 15%"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_massage_gun",
            "name": "Pistolet Massage Theragun",
            "description": "Récupération professionnelle. Thérapie percussive puissante, 6 têtes interchangeables, application connectée. Soulagez vos muscles en profondeur.",
            "short_description": "2400 percussions/min. 6 têtes.",
            "price": 299000,
            "original_price": None,
            "category": "beaute",
            "subcategory": "massage",
            "images": [
                "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"
            ],
            "stock": 16,
            "featured": False,
            "is_new": False,
            "is_promo": False,
            "specs": {"speed": "2400rpm", "battery": "150min", "noise": "Silencieux"},
            "created_at": now,
            "updated_at": now
        },
        {
            "product_id": "prod_parfum_luxe",
            "name": "Eau de Parfum Prestige",
            "description": "Signature olfactive. Notes de bergamote, jasmin et bois de santal. Une fragrance raffinée qui laisse une empreinte mémorable.",
            "short_description": "100ml. Unisexe. Premium.",
            "price": 129000,
            "original_price": None,
            "category": "beaute",
            "subcategory": "parfums",
            "images": [
                "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800"
            ],
            "stock": 22,
            "featured": True,
            "is_new": True,
            "is_promo": False,
            "specs": {"volume": "100ml", "type": "Eau de Parfum", "gender": "Unisexe"},
            "created_at": now,
            "updated_at": now
        }
    ]
    
    # Insert products in smaller batches to reduce memory pressure
    batch_size = 5
    total_products = len(products)
    
    for i in range(0, total_products, batch_size):
        batch = products[i:i + batch_size]
        await db.products.insert_many(batch)
        # Clear batch from memory
        del batch
        # Small delay to prevent overwhelming the database
        await asyncio.sleep(0.1)
    
    # Clear products list from memory
    del products
    gc.collect()
    
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@lumina.sn"})
    if not admin_exists:
        admin_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "admin@lumina.sn",
            "name": "Admin Lumina",
            "phone": "+221 78 382 75 75",
            "password": hash_password("admin123"),
            "role": "admin",
            "picture": None,
            "created_at": now
        }
        await db.users.insert_one(admin_doc)
    
    # Set up flash sales for 4 products to reduce memory usage
    flash_sale_end = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    flash_sale_updates = [
        {"product_id": "prod_iphone15pro", "flash_sale_price": 650000},
        {"product_id": "prod_macbook_air", "flash_sale_price": 999000},
        {"product_id": "prod_airpods_pro", "flash_sale_price": 149000},
        {"product_id": "prod_samsung_tv", "flash_sale_price": 1299000}
    ]
    
    for update in flash_sale_updates:
        await db.products.update_one(
            {"product_id": update["product_id"]},
            {
                "$set": {
                    "is_flash_sale": True,
                    "flash_sale_price": update["flash_sale_price"],
                    "flash_sale_end": flash_sale_end,
                    "updated_at": now
                }
            }
        )
    
    return {"message": "Base de données initialisée", "products": total_products, "flash_sales": len(flash_sale_updates)}

# ============== APPOINTMENT BOOKING SYSTEM ==============

class AppointmentRequest(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    category: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    preferred_date: str  # ISO date string
    preferred_time: str  # HH:MM format
    message: Optional[str] = None
    contact_method: str = "whatsapp"  # whatsapp or email

@api_router.post("/appointments")
async def create_appointment(data: AppointmentRequest):
    """Create a visit appointment request"""
    appointment_id = f"rdv_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    
    appointment_doc = {
        "appointment_id": appointment_id,
        "product_id": data.product_id,
        "product_name": data.product_name,
        "category": data.category,
        "customer": {
            "name": data.name,
            "email": data.email,
            "phone": data.phone
        },
        "preferred_date": data.preferred_date,
        "preferred_time": data.preferred_time,
        "message": data.message,
        "contact_method": data.contact_method,
        "status": "pending",  # pending, confirmed, completed, cancelled
        "confirmed_date": None,
        "confirmed_time": None,
        "location": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.appointments.insert_one(appointment_doc)
    
    # Send notification email to admin
    admin_html = f"""
    <h2>🗓️ Nouvelle demande de rendez-vous</h2>
    <p><strong>Client:</strong> {data.name}</p>
    <p><strong>Téléphone:</strong> {data.phone}</p>
    <p><strong>Email:</strong> {data.email}</p>
    <p><strong>Date souhaitée:</strong> {data.preferred_date} à {data.preferred_time}</p>
    <p><strong>Produit:</strong> {data.product_name or 'Non spécifié'}</p>
    <p><strong>Catégorie:</strong> {data.category or 'Non spécifiée'}</p>
    <p><strong>Contact préféré:</strong> {data.contact_method}</p>
    <p><strong>Message:</strong> {data.message or 'Aucun'}</p>
    <hr/>
    <p>Connectez-vous à l'admin pour confirmer ce rendez-vous.</p>
    """
    
    # Send to admin
    asyncio.create_task(send_email_async(
        to=ADMIN_NOTIFICATION_EMAIL,
        subject=f"🗓️ Nouveau RDV - {data.name} - {data.preferred_date}",
        html=get_email_template(admin_html, "Nouvelle demande de rendez-vous")
    ))
    
    # Send confirmation to customer
    customer_html = f"""
    <h2>Demande de rendez-vous reçue !</h2>
    <p>Bonjour {data.name},</p>
    <p>Nous avons bien reçu votre demande de visite pour le <strong>{data.preferred_date}</strong> à <strong>{data.preferred_time}</strong>.</p>
    <p>Notre équipe vous contactera très bientôt par {'WhatsApp' if data.contact_method == 'whatsapp' else 'email'} pour confirmer le rendez-vous et vous communiquer l'adresse.</p>
    <div style="background: #f8f8f8; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Numéro de demande:</strong> {appointment_id}</p>
    </div>
    <p>À très bientôt !</p>
    """
    
    asyncio.create_task(send_email_async(
        to=data.email,
        subject="📅 Demande de rendez-vous reçue - GROUPE YAMA+",
        html=get_email_template(customer_html, "Confirmation de demande")
    ))
    
    return {"message": "Demande de rendez-vous envoyée", "appointment_id": appointment_id}

@api_router.get("/admin/appointments")
async def get_appointments(
    status: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(require_admin)
):
    """Get all appointments for admin"""
    query = {}
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return appointments

@api_router.get("/admin/appointments/stats")
async def get_appointments_stats(user: User = Depends(require_admin)):
    """Get appointment statistics for dashboard"""
    total = await db.appointments.count_documents({})
    pending = await db.appointments.count_documents({"status": "pending"})
    confirmed = await db.appointments.count_documents({"status": "confirmed"})
    completed = await db.appointments.count_documents({"status": "completed"})
    cancelled = await db.appointments.count_documents({"status": "cancelled"})
    
    # Get recent pending appointments
    recent_pending = await db.appointments.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total": total,
        "pending": pending,
        "confirmed": confirmed,
        "completed": completed,
        "cancelled": cancelled,
        "recent_pending": recent_pending
    }

@api_router.put("/admin/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    request: Request,
    user: User = Depends(require_admin)
):
    """Update appointment status with optional WhatsApp confirmation"""
    body = await request.json()
    status = body.get("status")
    confirmed_date = body.get("confirmed_date")
    confirmed_time = body.get("confirmed_time")
    location = body.get("location")
    send_whatsapp = body.get("send_whatsapp", False)
    
    appointment = await db.appointments.find_one({"appointment_id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Rendez-vous non trouvé")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if confirmed_date:
        update_data["confirmed_date"] = confirmed_date
    if confirmed_time:
        update_data["confirmed_time"] = confirmed_time
    if location:
        update_data["location"] = location
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": update_data}
    )
    
    customer = appointment.get("customer", {})
    customer_phone = customer.get('phone', '')
    customer_email = customer.get('email', '')
    customer_name = customer.get('name', '')
    product_name = appointment.get('product_name', 'votre produit')
    
    # Build WhatsApp message link if requested
    whatsapp_link = None
    if send_whatsapp and customer_phone and status == "confirmed":
        # Format phone for WhatsApp (remove spaces and special chars, add country code if needed)
        phone_clean = customer_phone.replace(" ", "").replace("-", "").replace("+", "")
        if not phone_clean.startswith("221"):
            phone_clean = "221" + phone_clean.lstrip("0")
        
        message = f"""Bonjour {customer_name} ! 🎉

Votre rendez-vous chez GROUPE YAMA+ est confirmé !

📅 Date: {confirmed_date or 'À confirmer'}
🕐 Heure: {confirmed_time or 'À confirmer'}
📍 Adresse: {location or STORE_ADDRESS}

Produit: {product_name}

À très bientôt !
L'équipe YAMA+"""
        
        whatsapp_link = f"https://wa.me/{phone_clean}?text={message.replace(chr(10), '%0A').replace(' ', '%20')}"
    
    # If confirmed, send email to customer
    if status == "confirmed" and confirmed_date:
        html = f"""
        <h2>✅ Rendez-vous confirmé !</h2>
        <p>Bonjour {customer_name},</p>
        <p>Votre rendez-vous a été confirmé !</p>
        <div style="background: #d4edda; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> {confirmed_date}</p>
            <p style="margin: 0 0 10px 0;"><strong>🕐 Heure:</strong> {confirmed_time}</p>
            <p style="margin: 0;"><strong>📍 Adresse:</strong> {location or STORE_ADDRESS}</p>
        </div>
        <p>Produit concerné: <strong>{product_name}</strong></p>
        <p>Nous avons hâte de vous accueillir !</p>
        """
        
        asyncio.create_task(send_email_async(
            to=customer_email,
            subject="✅ Rendez-vous confirmé - GROUPE YAMA+",
            html=get_email_template(html, "Rendez-vous confirmé")
        ))
    
    # If cancelled, notify customer
    elif status == "cancelled":
        html = f"""
        <h2>Rendez-vous annulé</h2>
        <p>Bonjour {customer_name},</p>
        <p>Nous sommes désolés, votre rendez-vous a été annulé.</p>
        <p>N'hésitez pas à en programmer un nouveau sur notre site.</p>
        """
        
        asyncio.create_task(send_email_async(
            to=customer_email,
            subject="Rendez-vous annulé - GROUPE YAMA+",
            html=get_email_template(html, "Rendez-vous annulé")
        ))
    
    return {
        "message": "Rendez-vous mis à jour",
        "whatsapp_link": whatsapp_link
    }

# ============== PUSH NOTIFICATIONS ==============

from pywebpush import webpush, WebPushException

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "contact@groupeyamaplus.com")

class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

@api_router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    """Get VAPID public key for push notification subscription"""
    return {"publicKey": VAPID_PUBLIC_KEY}

@api_router.post("/push/subscribe")
async def push_subscribe_v2(subscription: PushSubscription, request: Request):
    """Subscribe to push notifications"""
    user = await get_current_user(request)
    
    subscription_doc = {
        "subscription_id": f"push_{secrets.token_hex(8)}",
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "user_id": user.user_id if user else None,
        "user_email": user.email if user else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    # Upsert - update if endpoint exists, insert if not
    await db.push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": subscription_doc},
        upsert=True
    )
    
    logger.info(f"Push subscription saved: {subscription.endpoint[:50]}...")
    return {"message": "Inscription aux notifications réussie"}

@api_router.post("/push/unsubscribe")
async def push_unsubscribe_v2(subscription: PushSubscription):
    """Unsubscribe from push notifications"""
    await db.push_subscriptions.update_one(
        {"endpoint": subscription.endpoint},
        {"$set": {"is_active": False}}
    )
    return {"message": "Désinscription réussie"}

async def push_send_notification_v2(subscription: dict, title: str, body: str, url: str = None, icon: str = None):
    """Send a push notification to a single subscriber"""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured")
        return False
    
    try:
        payload = {
            "title": title,
            "body": body,
            "icon": icon or "https://customer-assets.emergentagent.com/job_premium-senegal/artifacts/xs5g0hsy_IMG_0613.png",
            "badge": "https://customer-assets.emergentagent.com/job_premium-senegal/artifacts/xs5g0hsy_IMG_0613.png",
            "url": url or SITE_URL,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        webpush(
            subscription_info={
                "endpoint": subscription["endpoint"],
                "keys": subscription["keys"]
            },
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_CLAIMS_EMAIL}"}
        )
        
        logger.info(f"Push notification sent: {title}")
        return True
        
    except WebPushException as e:
        logger.error(f"Push notification failed: {str(e)}")
        # If subscription is expired/invalid, mark it inactive
        if e.response and e.response.status_code in [404, 410]:
            await db.push_subscriptions.update_one(
                {"endpoint": subscription["endpoint"]},
                {"$set": {"is_active": False}}
            )
        return False
    except Exception as e:
        logger.error(f"Push notification error: {str(e)}")
        return False

async def send_push_to_all(title: str, body: str, url: str = None):
    """Send push notification to all active subscribers"""
    subscriptions = await db.push_subscriptions.find({"is_active": True}).to_list(1000)
    
    success_count = 0
    for sub in subscriptions:
        if await push_send_notification_v2(sub, title, body, url):
            success_count += 1
    
    logger.info(f"Push notifications sent: {success_count}/{len(subscriptions)}")
    return success_count

async def send_push_to_user(user_id: str, title: str, body: str, url: str = None):
    """Send push notification to a specific user"""
    subscriptions = await db.push_subscriptions.find({
        "user_id": user_id,
        "is_active": True
    }).to_list(10)
    
    for sub in subscriptions:
        await push_send_notification_v2(sub, title, body, url)

@api_router.post("/admin/push/send")
async def admin_send_push(
    title: str,
    body: str,
    url: Optional[str] = None,
    user: User = Depends(require_admin)
):
    """Admin: Send push notification to all subscribers"""
    count = await send_push_to_all(title, body, url)
    return {"message": f"Notification envoyée à {count} abonnés"}

@api_router.get("/admin/push/stats")
async def admin_push_stats(user: User = Depends(require_admin)):
    """Admin: Get push notification stats"""
    total = await db.push_subscriptions.count_documents({})
    active = await db.push_subscriptions.count_documents({"is_active": True})
    
    return {
        "total_subscriptions": total,
        "active_subscriptions": active
    }

# ============== BLOG ROUTES ==============

class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: str
    content: str
    image: str
    category: str
    tags: Optional[List[str]] = []
    author: str = "YAMA+"
    read_time: int = 5
    related_category: Optional[str] = None
    is_published: bool = True

class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    post_id: str
    title: str
    slug: str
    excerpt: str
    content: str
    image: str
    category: str
    tags: List[str] = []
    author: str
    read_time: int
    related_category: Optional[str] = None
    is_published: bool = True
    views: int = 0
    created_at: datetime
    updated_at: datetime

@api_router.get("/blog/posts")
async def get_blog_posts(
    category: Optional[str] = None,
    limit: int = 20,
    skip: int = 0
):
    """Get all published blog posts"""
    query = {"is_published": True}
    if category and category != "all":
        query["category"] = category
    
    posts = await db.blog_posts.find(
        query,
        {"_id": 0, "content": 0}  # Exclude content for list view
    ).sort("created_at", -1).skip(skip).limit(min(limit, 50)).to_list(50)
    
    # If no posts in DB, return sample posts
    if not posts:
        return get_sample_blog_posts(category)
    
    return posts

@api_router.get("/blog/posts/{slug}")
async def get_blog_post(slug: str):
    """Get a single blog post by slug"""
    post = await db.blog_posts.find_one(
        {"slug": slug, "is_published": True},
        {"_id": 0}
    )
    
    if not post:
        # Return sample post if not found in DB
        sample = get_sample_blog_post(slug)
        if sample:
            # Return in same format as DB posts for consistency
            return {"post": sample, "related": []}
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    # Increment view count
    await db.blog_posts.update_one(
        {"slug": slug},
        {"$inc": {"views": 1}}
    )
    
    # Get related posts from same category
    related = await db.blog_posts.find(
        {
            "category": post.get("category"),
            "slug": {"$ne": slug},
            "is_published": True
        },
        {"_id": 0, "content": 0}
    ).limit(3).to_list(3)
    
    return {"post": post, "related": related}

@api_router.post("/admin/blog/posts")
async def create_blog_post(post_data: BlogPostCreate, user: User = Depends(require_admin)):
    """Create a new blog post"""
    # Check if slug exists
    existing = await db.blog_posts.find_one({"slug": post_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Un article avec ce slug existe déjà")
    
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    post_doc = {
        "post_id": post_id,
        "title": post_data.title,
        "slug": post_data.slug,
        "excerpt": post_data.excerpt,
        "content": post_data.content,
        "image": post_data.image,
        "category": post_data.category,
        "tags": post_data.tags or [],
        "author": post_data.author,
        "read_time": post_data.read_time,
        "related_category": post_data.related_category,
        "is_published": post_data.is_published,
        "views": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.blog_posts.insert_one(post_doc)
    post_doc.pop("_id", None)
    
    return post_doc

@api_router.put("/admin/blog/posts/{post_id}")
async def update_blog_post(post_id: str, post_data: BlogPostCreate, user: User = Depends(require_admin)):
    """Update a blog post"""
    existing = await db.blog_posts.find_one({"post_id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    # Check if new slug conflicts with another post
    if post_data.slug != existing.get("slug"):
        slug_exists = await db.blog_posts.find_one({
            "slug": post_data.slug,
            "post_id": {"$ne": post_id}
        })
        if slug_exists:
            raise HTTPException(status_code=400, detail="Ce slug est déjà utilisé")
    
    update_doc = {
        "title": post_data.title,
        "slug": post_data.slug,
        "excerpt": post_data.excerpt,
        "content": post_data.content,
        "image": post_data.image,
        "category": post_data.category,
        "tags": post_data.tags or [],
        "author": post_data.author,
        "read_time": post_data.read_time,
        "related_category": post_data.related_category,
        "is_published": post_data.is_published,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blog_posts.update_one(
        {"post_id": post_id},
        {"$set": update_doc}
    )
    
    return {"message": "Article mis à jour"}

@api_router.delete("/admin/blog/posts/{post_id}")
async def delete_blog_post(post_id: str, user: User = Depends(require_admin)):
    """Delete a blog post"""
    result = await db.blog_posts.delete_one({"post_id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return {"message": "Article supprimé"}

@api_router.get("/admin/blog/posts")
async def get_admin_blog_posts(user: User = Depends(require_admin)):
    """Get all blog posts for admin (including unpublished)"""
    posts = await db.blog_posts.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return posts

def get_sample_blog_posts(category: Optional[str] = None):
    """Return sample blog posts for demo/fallback, optionally filtered by category"""
    all_posts = [
        {
            "post_id": "sample_1",
            "slug": "guide-achat-smartphone-2025",
            "title": "Guide d'achat : Comment choisir son smartphone en 2025",
            "excerpt": "Découvrez les critères essentiels pour choisir le smartphone parfait selon vos besoins et votre budget.",
            "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
            "category": "Guides d'achat",
            "date": "2025-02-01",
            "readTime": 8,
            "author": "YAMA+"
        },
        {
            "post_id": "sample_2",
            "slug": "tendances-decoration-2025",
            "title": "Les tendances déco 2025 : Ce qui va transformer votre intérieur",
            "excerpt": "Couleurs, matériaux, styles... Découvrez toutes les tendances décoration pour cette année.",
            "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800",
            "category": "Tendances",
            "date": "2025-01-28",
            "readTime": 6,
            "author": "YAMA+"
        },
        {
            "post_id": "sample_3",
            "slug": "conseils-entretien-electromenager",
            "title": "5 conseils pour prolonger la durée de vie de vos appareils",
            "excerpt": "Nos astuces simples pour entretenir vos appareils électroménagers et éviter les pannes.",
            "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
            "category": "Conseils",
            "date": "2025-01-25",
            "readTime": 5,
            "author": "YAMA+"
        },
        {
            "post_id": "sample_4",
            "slug": "nouveautes-apple-2025",
            "title": "Apple 2025 : Toutes les nouveautés à venir",
            "excerpt": "iPhone 17, MacBook M4, Apple Watch X... Tour d'horizon des produits Apple attendus cette année.",
            "image": "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800",
            "category": "Nouveautés",
            "date": "2025-01-20",
            "readTime": 7,
            "author": "YAMA+"
        },
        {
            "post_id": "sample_5",
            "slug": "routine-beaute-naturelle",
            "title": "Routine beauté : Les indispensables pour une peau éclatante",
            "excerpt": "Découvrez notre sélection de produits pour une routine beauté efficace et naturelle.",
            "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800",
            "category": "Conseils",
            "date": "2025-01-18",
            "readTime": 4,
            "author": "YAMA+"
        },
        {
            "post_id": "sample_6",
            "slug": "guide-televiseur-4k",
            "title": "TV 4K ou 8K : Quel téléviseur choisir en 2025 ?",
            "excerpt": "OLED, QLED, Mini-LED... On vous explique tout pour faire le bon choix.",
            "image": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800",
            "category": "Guides d'achat",
            "date": "2025-01-15",
            "readTime": 9,
            "author": "YAMA+"
        }
    ]
    
    # Filter by category if specified
    if category and category != "all":
        # Map frontend category names to sample post categories
        category_map = {
            "guides": "Guides d'achat",
            "tendances": "Tendances", 
            "conseils": "Conseils",
            "nouveautes": "Nouveautés"
        }
        target_category = category_map.get(category, category)
        return [p for p in all_posts if p["category"] == target_category]
    
    return all_posts

def get_sample_blog_post(slug: str):
    """Return a sample blog post by slug"""
    posts = {
        "guide-achat-smartphone-2025": {
            "post_id": "sample_1",
            "slug": "guide-achat-smartphone-2025",
            "title": "Guide d'achat : Comment choisir son smartphone en 2025",
            "excerpt": "Découvrez les critères essentiels pour choisir le smartphone parfait selon vos besoins et votre budget.",
            "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200",
            "category": "Guides d'achat",
            "tags": ["smartphone", "guide", "tech", "2025"],
            "date": "2025-02-01",
            "readTime": 8,
            "author": "YAMA+",
            "relatedCategory": "electronique",
            "content": """
                <p>Choisir un smartphone en 2025 peut sembler complexe face à la multitude d'options disponibles. Ce guide vous aidera à faire le meilleur choix selon vos besoins.</p>
                
                <h2>1. Définir son budget</h2>
                <p>Le marché des smartphones se divise en trois grandes catégories :</p>
                <ul>
                    <li><strong>Entrée de gamme (100 000 - 200 000 FCFA)</strong> : Parfait pour les usages basiques</li>
                    <li><strong>Milieu de gamme (200 000 - 500 000 FCFA)</strong> : Excellent rapport qualité-prix</li>
                    <li><strong>Haut de gamme (500 000+ FCFA)</strong> : Pour les utilisateurs exigeants</li>
                </ul>
                
                <h2>2. L'écran : taille et technologie</h2>
                <p>En 2025, les écrans AMOLED sont devenus la norme, même sur les appareils milieu de gamme. Privilégiez un taux de rafraîchissement de 90Hz minimum pour une navigation fluide.</p>
                
                <h2>3. La puissance : processeur et RAM</h2>
                <p>Pour un usage quotidien fluide, optez pour au moins 6 Go de RAM. Les processeurs Snapdragon 8 Gen 3 ou Apple A17 Pro offrent les meilleures performances.</p>
                
                <h2>4. L'appareil photo</h2>
                <p>Ne vous fiez pas uniquement aux mégapixels ! La taille du capteur et le traitement logiciel sont tout aussi importants. Recherchez des capteurs de 1/1.5" ou plus grands.</p>
                
                <h2>5. L'autonomie</h2>
                <p>Une batterie de 4500 mAh minimum est recommandée. La charge rapide (65W+) est devenue indispensable pour les utilisateurs actifs.</p>
                
                <h2>Conclusion</h2>
                <p>Le meilleur smartphone est celui qui répond à VOS besoins. N'hésitez pas à consulter notre boutique pour découvrir notre sélection soigneusement choisie.</p>
            """
        },
        "tendances-decoration-2025": {
            "post_id": "sample_2",
            "slug": "tendances-decoration-2025",
            "title": "Les tendances déco 2025 : Ce qui va transformer votre intérieur",
            "excerpt": "Couleurs, matériaux, styles... Découvrez toutes les tendances décoration pour cette année.",
            "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200",
            "category": "Tendances",
            "tags": ["décoration", "tendances", "maison", "intérieur"],
            "date": "2025-01-28",
            "readTime": 6,
            "author": "YAMA+",
            "relatedCategory": "decoration",
            "content": """
                <p>L'année 2025 apporte son lot de nouvelles tendances en matière de décoration intérieure. Voici ce qui va transformer nos intérieurs.</p>
                
                <h2>Les couleurs phares</h2>
                <p>Le vert sauge et le terracotta continuent leur règne, mais 2025 voit l'émergence du "Mocha Mousse", un brun chaleureux élu couleur de l'année.</p>
                
                <h2>Le retour du vintage</h2>
                <p>Les années 70 font un retour remarqué avec des formes organiques, du velours côtelé et des tons chauds.</p>
                
                <h2>Le minimalisme chaleureux</h2>
                <p>Fini le minimalisme froid ! On privilégie désormais des espaces épurés mais accueillants, avec des textures douces et des matériaux naturels.</p>
                
                <h2>La durabilité au cœur des choix</h2>
                <p>Les consommateurs privilégient les meubles durables, les matériaux recyclés et les artisans locaux.</p>
            """
        },
        "conseils-entretien-electromenager": {
            "post_id": "sample_3",
            "slug": "conseils-entretien-electromenager",
            "title": "5 conseils pour prolonger la durée de vie de vos appareils",
            "excerpt": "Nos astuces simples pour entretenir vos appareils électroménagers et éviter les pannes.",
            "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200",
            "category": "Conseils",
            "tags": ["entretien", "électroménager", "conseils"],
            "date": "2025-01-25",
            "readTime": 5,
            "author": "YAMA+",
            "content": """
                <h2>1. Nettoyez régulièrement</h2>
                <p>Un nettoyage régulier prévient l'accumulation de saletés qui peuvent endommager vos appareils.</p>
                
                <h2>2. Respectez les charges recommandées</h2>
                <p>Ne surchargez pas vos appareils ! Un lave-linge ou réfrigérateur surchargé s'use plus vite.</p>
                
                <h2>3. Utilisez les bons produits</h2>
                <p>Chaque appareil a ses produits adaptés. Évitez les produits abrasifs.</p>
                
                <h2>4. Vérifiez les branchements</h2>
                <p>Des branchements défectueux peuvent causer des surtensions.</p>
                
                <h2>5. Faites appel à des professionnels</h2>
                <p>Un entretien préventif coûte moins cher qu'une réparation majeure.</p>
            """
        },
        "nouveautes-apple-2025": {
            "post_id": "sample_4",
            "slug": "nouveautes-apple-2025",
            "title": "Apple 2025 : Toutes les nouveautés à venir",
            "excerpt": "iPhone 17, MacBook M4, Apple Watch X... Tour d'horizon des produits Apple attendus cette année.",
            "image": "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1200",
            "category": "Nouveautés",
            "tags": ["apple", "iPhone", "MacBook", "tech", "2025"],
            "date": "2025-01-20",
            "readTime": 7,
            "author": "YAMA+",
            "relatedCategory": "electronique",
            "content": """
                <p>Apple prépare une année 2025 riche en nouveautés. Voici ce qui nous attend.</p>
                
                <h2>iPhone 17 : Une révolution design</h2>
                <p>La nouvelle génération d'iPhone devrait abandonner l'encoche pour un design plus épuré. Les premières fuites évoquent un écran entièrement borderless.</p>
                
                <h2>MacBook Air M4</h2>
                <p>Le MacBook Air recevra la puce M4, promettant des performances encore meilleures et une autonomie record de 24 heures.</p>
                
                <h2>Apple Watch X</h2>
                <p>Pour les 10 ans de l'Apple Watch, Apple prépare un modèle anniversaire avec un nouveau design et des fonctionnalités santé avancées.</p>
                
                <h2>Vision Pro 2</h2>
                <p>La deuxième génération du casque de réalité mixte devrait être plus légère et plus abordable.</p>
                
                <h2>Conclusion</h2>
                <p>2025 s'annonce comme une année charnière pour Apple. Restez connectés pour les dernières actualités !</p>
            """
        },
        "routine-beaute-naturelle": {
            "post_id": "sample_5",
            "slug": "routine-beaute-naturelle",
            "title": "Routine beauté : Les indispensables pour une peau éclatante",
            "excerpt": "Découvrez notre sélection de produits pour une routine beauté efficace et naturelle.",
            "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200",
            "category": "Conseils",
            "tags": ["beauté", "skincare", "routine", "naturel"],
            "date": "2025-01-18",
            "readTime": 4,
            "author": "YAMA+",
            "relatedCategory": "beaute",
            "content": """
                <p>Une belle peau passe par une routine adaptée. Voici les essentiels pour un teint éclatant.</p>
                
                <h2>Le double nettoyage</h2>
                <p>Commencez par une huile démaquillante pour éliminer le maquillage et le sébum, puis enchaînez avec un nettoyant doux à l'eau.</p>
                
                <h2>L'hydratation quotidienne</h2>
                <p>Une crème hydratante adaptée à votre type de peau est indispensable. N'oubliez pas le contour des yeux !</p>
                
                <h2>La protection solaire</h2>
                <p>Le SPF est votre meilleur allié anti-âge. Appliquez-le chaque matin, même par temps nuageux.</p>
                
                <h2>Les soins hebdomadaires</h2>
                <p>Un gommage doux une fois par semaine et un masque hydratant complètent votre routine.</p>
            """
        },
        "guide-televiseur-4k": {
            "post_id": "sample_6",
            "slug": "guide-televiseur-4k",
            "title": "TV 4K ou 8K : Quel téléviseur choisir en 2025 ?",
            "excerpt": "OLED, QLED, Mini-LED... On vous explique tout pour faire le bon choix.",
            "image": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200",
            "category": "Guides d'achat",
            "tags": ["TV", "4K", "8K", "OLED", "QLED"],
            "date": "2025-01-15",
            "readTime": 9,
            "author": "YAMA+",
            "relatedCategory": "electronique",
            "content": """
                <p>Le choix d'un téléviseur en 2025 peut sembler complexe. Voici notre guide complet.</p>
                
                <h2>4K vs 8K : que choisir ?</h2>
                <p>La 4K reste le choix optimal en 2025. Le contenu 8K est encore rare et les téléviseurs 4K offrent un excellent rapport qualité-prix.</p>
                
                <h2>OLED : le roi des noirs</h2>
                <p>Les dalles OLED offrent des noirs parfaits et un contraste infini. Idéal pour les cinéphiles et les salons sombres.</p>
                
                <h2>QLED : la luminosité avant tout</h2>
                <p>Les TV QLED excellent en luminosité et sont parfaits pour les pièces lumineuses. Les couleurs sont vibrantes et durables.</p>
                
                <h2>Mini-LED : le meilleur des deux mondes</h2>
                <p>Cette technologie combine haute luminosité et excellent contraste, à un prix intermédiaire.</p>
                
                <h2>Quelle taille choisir ?</h2>
                <p>La règle : divisez la distance de visionnage par 1,5. À 3 mètres, optez pour un 55-65 pouces minimum.</p>
                
                <h2>Notre conseil</h2>
                <p>Pour un salon standard, un TV OLED ou Mini-LED de 55-65 pouces en 4K reste le meilleur investissement en 2025.</p>
            """
        }
    }
    
    return posts.get(slug)

# ============== SERVICES MARKETPLACE ==============

from services_marketplace import (
    SERVICE_CATEGORIES, SENEGAL_CITIES, DAKAR_ZONES,
    ProviderCreate, ServiceRequestCreate
)

@api_router.get("/services/categories")
async def get_service_categories():
    """Get all service categories"""
    return SERVICE_CATEGORIES

@api_router.get("/services/locations")
async def get_service_locations():
    """Get cities and zones for services"""
    return {
        "cities": SENEGAL_CITIES,
        "dakar_zones": DAKAR_ZONES
    }

@api_router.get("/services/providers")
async def get_service_providers(
    category: Optional[str] = None,
    profession: Optional[str] = None,
    city: Optional[str] = None,
    zone: Optional[str] = None,
    verified_only: bool = False,
    min_rating: Optional[float] = None,
    availability: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "rating",  # rating, price, reviews
    limit: int = 20,
    skip: int = 0
):
    """Get service providers with filters"""
    query = {"is_active": True}
    
    if category:
        query["category"] = category
    if profession:
        query["profession"] = {"$regex": profession, "$options": "i"}
    if city:
        query["city"] = city
    if zone:
        query["zone"] = zone
    if verified_only:
        query["is_verified"] = True
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    if availability:
        query["availability"] = availability
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"profession": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Sort options
    sort_options = {
        "rating": [("is_premium", -1), ("rating", -1)],
        "price": [("is_premium", -1), ("price_from", 1)],
        "reviews": [("is_premium", -1), ("review_count", -1)],
        "newest": [("created_at", -1)]
    }
    sort = sort_options.get(sort_by, sort_options["rating"])
    
    providers = await db.service_providers.find(query, {"_id": 0, "password": 0}).sort(sort).skip(skip).limit(limit).to_list(limit)
    total = await db.service_providers.count_documents(query)
    
    return {
        "providers": providers,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/services/providers/{provider_id}")
async def get_service_provider(provider_id: str):
    """Get a single provider profile"""
    provider = await db.service_providers.find_one(
        {"provider_id": provider_id, "is_active": True},
        {"_id": 0, "password": 0}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Get reviews
    reviews = await db.provider_reviews.find(
        {"provider_id": provider_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    provider["reviews"] = reviews
    
    return provider

@api_router.get("/services/providers/{provider_id}/reviews")
async def get_provider_reviews(
    provider_id: str,
    limit: int = 20,
    skip: int = 0
):
    """Get reviews for a provider"""
    reviews = await db.provider_reviews.find(
        {"provider_id": provider_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.provider_reviews.count_documents({"provider_id": provider_id})
    
    return {
        "reviews": reviews,
        "total": total
    }

@api_router.post("/services/providers/{provider_id}/reviews")
async def add_provider_review(
    provider_id: str,
    rating: int,
    comment: str,
    client_name: str,
    client_phone: Optional[str] = None
):
    """Add a review for a provider"""
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="La note doit être entre 1 et 5")
    
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    review = {
        "review_id": f"rev_{secrets.token_hex(8)}",
        "provider_id": provider_id,
        "client_name": client_name,
        "client_phone": client_phone,
        "rating": rating,
        "comment": comment,
        "photos": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_verified": False
    }
    
    await db.provider_reviews.insert_one(review)
    
    # Update provider rating
    all_reviews = await db.provider_reviews.find({"provider_id": provider_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    
    await db.service_providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(all_reviews)}}
    )
    
    return {"message": "Avis ajouté avec succès", "review_id": review["review_id"]}

# Provider Gallery Management
class GalleryPhotoUpload(BaseModel):
    """Model for uploading gallery photos"""
    image_url: str
    caption: Optional[str] = None
    order: Optional[int] = 0

@api_router.get("/services/providers/{provider_id}/gallery")
async def get_provider_gallery(provider_id: str):
    """Get a provider's photo gallery"""
    provider = await db.service_providers.find_one(
        {"provider_id": provider_id},
        {"_id": 0, "gallery": 1, "photos": 1}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Return gallery if exists, otherwise return photos array
    gallery = provider.get("gallery", [])
    if not gallery and provider.get("photos"):
        # Convert old photos array to gallery format
        gallery = [{"image_url": url, "caption": "", "order": i} for i, url in enumerate(provider.get("photos", []))]
    
    return {"gallery": gallery, "total": len(gallery)}

@api_router.post("/services/providers/{provider_id}/gallery")
async def add_gallery_photo(
    provider_id: str, 
    photo_data: GalleryPhotoUpload,
    current_user: User = Depends(get_current_user)
):
    """Add a photo to provider's gallery (provider only)"""
    # Verify provider exists and user is the provider
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Check if user is the provider or admin
    is_admin = current_user.role == "admin"
    is_owner = provider.get("user_id") == current_user.user_id or provider.get("phone") == current_user.phone
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Non autorisé à modifier cette galerie")
    
    # Get current gallery
    gallery = provider.get("gallery", [])
    
    # Add new photo
    new_photo = {
        "photo_id": f"PHT-{secrets.token_hex(4).upper()}",
        "image_url": photo_data.image_url,
        "caption": photo_data.caption or "",
        "order": photo_data.order or len(gallery),
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    gallery.append(new_photo)
    
    # Also update photos array for backward compatibility
    photos = [p["image_url"] for p in gallery]
    
    await db.service_providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"gallery": gallery, "photos": photos, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "photo": new_photo, "message": "Photo ajoutée à la galerie"}

@api_router.delete("/services/providers/{provider_id}/gallery/{photo_id}")
async def delete_gallery_photo(
    provider_id: str,
    photo_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a photo from provider's gallery"""
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Check authorization
    is_admin = current_user.role == "admin"
    is_owner = provider.get("user_id") == current_user.user_id or provider.get("phone") == current_user.phone
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Non autorisé à modifier cette galerie")
    
    gallery = provider.get("gallery", [])
    original_count = len(gallery)
    gallery = [p for p in gallery if p.get("photo_id") != photo_id]
    
    if len(gallery) == original_count:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    # Update photos array for backward compatibility
    photos = [p["image_url"] for p in gallery]
    
    await db.service_providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"gallery": gallery, "photos": photos, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Photo supprimée de la galerie"}

@api_router.put("/services/providers/{provider_id}/gallery/reorder")
async def reorder_gallery(
    provider_id: str,
    photo_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Reorder gallery photos"""
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Check authorization
    is_admin = current_user.role == "admin"
    is_owner = provider.get("user_id") == current_user.user_id or provider.get("phone") == current_user.phone
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Non autorisé à modifier cette galerie")
    
    gallery = provider.get("gallery", [])
    
    # Reorder based on provided photo_ids
    photo_map = {p["photo_id"]: p for p in gallery}
    reordered = []
    for i, pid in enumerate(photo_ids):
        if pid in photo_map:
            photo = photo_map[pid]
            photo["order"] = i
            reordered.append(photo)
    
    # Add any photos not in the list at the end
    for p in gallery:
        if p["photo_id"] not in photo_ids:
            p["order"] = len(reordered)
            reordered.append(p)
    
    # Update photos array for backward compatibility
    photos = [p["image_url"] for p in reordered]
    
    await db.service_providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"gallery": reordered, "photos": photos, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "gallery": reordered, "message": "Galerie réorganisée"}

# Verification Documents (CNI, Photo)
class VerificationDocumentUpload(BaseModel):
    document_type: str  # "cni_front", "cni_back", "photo", "other"
    document_url: str
    description: Optional[str] = None

@api_router.post("/services/providers/{provider_id}/verification-documents")
async def upload_verification_document(
    provider_id: str,
    doc_data: VerificationDocumentUpload,
    current_user: User = Depends(require_auth)
):
    """Upload a verification document (CNI, photo) for provider validation"""
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Check authorization - access User attributes directly (not as dict)
    is_admin = current_user.role == "admin"
    is_owner = provider.get("user_id") == current_user.user_id or provider.get("phone") == current_user.phone
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Get current verification documents
    verification_docs = provider.get("verification_documents", [])
    
    # Add new document
    new_doc = {
        "doc_id": f"DOC-{secrets.token_hex(4).upper()}",
        "document_type": doc_data.document_type,
        "document_url": doc_data.document_url,
        "description": doc_data.description or "",
        "status": "pending",  # pending, approved, rejected
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Replace if same type already exists
    verification_docs = [d for d in verification_docs if d.get("document_type") != doc_data.document_type]
    verification_docs.append(new_doc)
    
    await db.service_providers.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "verification_documents": verification_docs,
            "verification_status": "pending",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify admin
    asyncio.create_task(send_email_async(
        to=ADMIN_NOTIFICATION_EMAIL,
        subject=f"📄 Nouveau document de vérification - {provider.get('name')}",
        html=get_email_template(f"""
            <h2>Document de vérification soumis</h2>
            <p><strong>Prestataire:</strong> {provider.get('name')}</p>
            <p><strong>Type de document:</strong> {doc_data.document_type}</p>
            <p><strong>Description:</strong> {doc_data.description or 'Aucune'}</p>
            <p><a href="{doc_data.document_url}" target="_blank">Voir le document</a></p>
            <a href="{SITE_URL}/admin/providers" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">Vérifier le prestataire</a>
        """, "Document de vérification")
    ))
    
    return {"success": True, "document": new_doc, "message": "Document soumis pour vérification"}

@api_router.get("/services/providers/{provider_id}/verification-documents")
async def get_verification_documents(
    provider_id: str,
    current_user: User = Depends(require_auth)
):
    """Get verification documents for a provider"""
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    # Check authorization - access User attributes directly (not as dict)
    is_admin = current_user.role == "admin"
    is_owner = provider.get("user_id") == current_user.user_id or provider.get("phone") == current_user.phone
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    return {
        "documents": provider.get("verification_documents", []),
        "verification_status": provider.get("verification_status", "not_started")
    }

@api_router.put("/services/providers/{provider_id}/verification-documents/{doc_id}/status")
async def update_verification_document_status(
    provider_id: str,
    doc_id: str,
    status: str,  # approved, rejected
    admin_note: Optional[str] = None,
    current_user: User = Depends(require_admin)
):
    """Admin: Update verification document status"""
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    verification_docs = provider.get("verification_documents", [])
    updated = False
    
    for doc in verification_docs:
        if doc.get("doc_id") == doc_id:
            doc["status"] = status
            doc["admin_note"] = admin_note
            doc["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Check if all required documents are approved
    required_types = ["cni_front", "photo"]
    all_approved = all(
        any(d.get("document_type") == t and d.get("status") == "approved" for d in verification_docs)
        for t in required_types
    )
    
    verification_status = "approved" if all_approved else ("rejected" if status == "rejected" else "pending")
    
    await db.service_providers.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "verification_documents": verification_docs,
            "verification_status": verification_status,
            "is_verified": all_approved,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "verification_status": verification_status}

# Share Provider Profile via WhatsApp/Email (Admin only)
class ShareProviderProfile(BaseModel):
    method: str  # "whatsapp", "email"
    recipient_phone: Optional[str] = None
    recipient_email: Optional[str] = None
    message: Optional[str] = None

@api_router.post("/services/providers/{provider_id}/share")
async def share_provider_profile(
    provider_id: str,
    share_data: ShareProviderProfile,
    current_user: User = Depends(require_admin)
):
    """Admin: Share provider profile link via WhatsApp or Email"""
    provider = await db.service_providers.find_one({"provider_id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Prestataire non trouvé")
    
    profile_url = f"{SITE_URL}/provider/{provider_id}"
    provider_name = provider.get("name", "Prestataire")
    profession = provider.get("profession", "")
    
    default_message = f"Découvrez le profil de {provider_name}, {profession} certifié sur YAMA+ : {profile_url}"
    message = share_data.message or default_message
    
    if share_data.method == "whatsapp":
        if not share_data.recipient_phone:
            raise HTTPException(status_code=400, detail="Numéro de téléphone requis")
        
        # Return WhatsApp link for frontend to open
        phone = share_data.recipient_phone.replace("+", "").replace(" ", "")
        whatsapp_url = f"https://wa.me/{phone}?text={message}"
        
        return {
            "success": True,
            "method": "whatsapp",
            "share_url": whatsapp_url,
            "message": "Lien WhatsApp généré"
        }
    
    elif share_data.method == "email":
        if not share_data.recipient_email:
            raise HTTPException(status_code=400, detail="Email requis")
        
        await send_email_async(
            to=share_data.recipient_email,
            subject=f"Découvrez {provider_name} sur YAMA+",
            html=get_email_template(f"""
                <h2>Nous vous recommandons ce prestataire</h2>
                <p><strong>{provider_name}</strong> - {profession}</p>
                <p>Un prestataire de qualité, vérifié par YAMA+.</p>
                <p>{message}</p>
                <a href="{profile_url}" style="display: inline-block; padding: 12px 24px; background: #FCD34D; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir le profil</a>
            """, f"Découvrez {provider_name}")
        )
        
        return {
            "success": True,
            "method": "email",
            "message": f"Email envoyé à {share_data.recipient_email}"
        }
    
    raise HTTPException(status_code=400, detail="Méthode de partage invalide")

# Service Requests (Client requests)
@api_router.post("/services/requests")
async def create_service_request(request_data: ServiceRequestCreate):
    """Create a service request from a client"""
    request_id = f"SR-{secrets.token_hex(4).upper()}"
    
    service_request = {
        "request_id": request_id,
        **request_data.dict(),
        "status": "new",
        "assigned_provider_id": None,
        "assigned_provider_name": None,
        "admin_notes": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None
    }
    
    await db.service_requests.insert_one(service_request)
    
    # Send notification to admin
    asyncio.create_task(send_email_async(
        to=ADMIN_NOTIFICATION_EMAIL,
        subject=f"🔔 Nouvelle demande de service #{request_id}",
        html=get_email_template(f"""
            <h2>Nouvelle demande de service</h2>
            <p><strong>ID:</strong> {request_id}</p>
            <p><strong>Catégorie:</strong> {request_data.category}</p>
            <p><strong>Métier:</strong> {request_data.profession}</p>
            <p><strong>Ville:</strong> {request_data.city} {request_data.zone or ''}</p>
            <p><strong>Client:</strong> {request_data.client_name}</p>
            <p><strong>Téléphone:</strong> {request_data.client_phone}</p>
            <p><strong>Description:</strong> {request_data.description}</p>
            <p><strong>Date souhaitée:</strong> {request_data.preferred_date or 'Non précisée'}</p>
            <a href="{SITE_URL}/admin/service-requests" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">Voir la demande</a>
        """, "Nouvelle demande de service")
    ))
    
    logger.info(f"Service request created: {request_id}")
    
    return {
        "success": True,
        "message": "Votre demande a été envoyée avec succès. Nous vous contacterons très bientôt.",
        "request_id": request_id
    }

@api_router.get("/services/requests/{request_id}")
async def get_service_request(request_id: str):
    """Get a service request by ID (for client tracking)"""
    request = await db.service_requests.find_one(
        {"request_id": request_id},
        {"_id": 0}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    return request

# Provider Registration (Private - requires invitation code)
PROVIDER_INVITATION_CODES = ["YAMAPLUS2025", "PRESTATAIRE", "SERVICEPRO"]  # Admin can add more

@api_router.post("/provider/register")
async def register_provider(provider_data: ProviderCreate):
    """Register as a service provider (requires invitation code)"""
    # Verify invitation code
    if provider_data.invitation_code not in PROVIDER_INVITATION_CODES:
        raise HTTPException(status_code=403, detail="Code d'invitation invalide")
    
    # Check if phone already exists
    existing = await db.service_providers.find_one({"phone": provider_data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà enregistré")
    
    provider_id = f"PRV-{secrets.token_hex(4).upper()}"
    
    # Hash password
    hashed_password = hash_password(provider_data.password)
    
    provider = {
        "provider_id": provider_id,
        "name": provider_data.name,
        "profession": provider_data.profession,
        "category": provider_data.category,
        "subcategory": provider_data.subcategory,
        "description": provider_data.description,
        "city": provider_data.city,
        "zone": provider_data.zone,
        "phone": provider_data.phone,
        "whatsapp": provider_data.whatsapp or provider_data.phone,
        "email": provider_data.email,
        "password": hashed_password,
        "price_from": provider_data.price_from,
        "price_description": provider_data.price_description,
        "availability": "available",
        "experience_years": provider_data.experience_years,
        "photos": [],
        "is_verified": False,
        "is_premium": False,
        "is_active": False,  # Requires admin approval
        "rating": 0.0,
        "review_count": 0,
        "completed_jobs": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None
    }
    
    await db.service_providers.insert_one(provider)
    
    # Notify admin
    asyncio.create_task(send_email_async(
        to=ADMIN_NOTIFICATION_EMAIL,
        subject=f"🆕 Nouveau prestataire inscrit: {provider_data.name}",
        html=get_email_template(f"""
            <h2>Nouveau prestataire en attente d'approbation</h2>
            <p><strong>Nom:</strong> {provider_data.name}</p>
            <p><strong>Métier:</strong> {provider_data.profession}</p>
            <p><strong>Ville:</strong> {provider_data.city}</p>
            <p><strong>Téléphone:</strong> {provider_data.phone}</p>
            <a href="{SITE_URL}/admin/providers" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">Approuver le prestataire</a>
        """, "Nouveau prestataire")
    ))
    
    logger.info(f"Provider registered: {provider_id}")
    
    return {
        "success": True,
        "message": "Inscription réussie ! Votre profil est en attente de validation par notre équipe.",
        "provider_id": provider_id
    }

@api_router.post("/provider/login")
async def login_provider(phone: str, password: str):
    """Login as a provider"""
    provider = await db.service_providers.find_one({"phone": phone})
    
    if not provider or not verify_password(password, provider.get("password", "")):
        raise HTTPException(status_code=401, detail="Numéro ou mot de passe incorrect")
    
    if not provider.get("is_active"):
        raise HTTPException(status_code=403, detail="Votre compte est en attente d'approbation")
    
    # Create JWT token
    token_data = {
        "sub": provider["provider_id"],
        "type": "provider",
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "success": True,
        "token": token,
        "provider": {
            "provider_id": provider["provider_id"],
            "name": provider["name"],
            "profession": provider["profession"],
            "is_verified": provider.get("is_verified", False),
            "is_premium": provider.get("is_premium", False)
        }
    }

# Provider Dashboard endpoints
async def get_current_provider(request: Request):
    """Dependency to get current provider from JWT token"""
    token = None
    
    # Check cookie first
    token = request.cookies.get("token")
    
    # Fall back to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        provider_id = payload.get("sub")
        user_id = payload.get("user_id")  # Also check user_id claim
        token_type = payload.get("type")
        
        # Check if it's a provider token
        if token_type == "provider" and provider_id:
            provider = await db.service_providers.find_one(
                {"provider_id": provider_id},
                {"_id": 0, "password": 0}
            )
            if provider:
                return provider
        
        # Also check if user has a provider profile linked by user_id
        lookup_user_id = user_id or provider_id  # Use user_id claim or fall back to sub
        if lookup_user_id:
            provider = await db.service_providers.find_one(
                {"user_id": lookup_user_id},
                {"_id": 0, "password": 0}
            )
            if provider:
                return provider
        
        raise HTTPException(status_code=404, detail="Profil prestataire non trouvé")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

@api_router.get("/services/provider/me")
async def get_my_provider_profile(request: Request):
    """Get current provider's profile"""
    provider = await get_current_provider(request)
    return provider

@api_router.put("/services/provider/me")
async def update_my_provider_profile(update_data: dict, request: Request):
    """Update current provider's profile"""
    provider = await get_current_provider(request)
    
    allowed_fields = [
        "description", "availability", "price_from", "price_description",
        "phone", "whatsapp", "email", "photos", "services",
        "social_links", "website", "address"
    ]
    
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.service_providers.update_one(
        {"provider_id": provider["provider_id"]},
        {"$set": update_dict}
    )
    
    return {"success": True, "message": "Profil mis à jour avec succès"}

# Admin endpoints for providers
@api_router.get("/admin/service-providers")
async def admin_get_providers(
    status: Optional[str] = None,  # pending, active, inactive
    limit: int = 50,
    user: User = Depends(require_admin)
):
    """Admin: Get all providers"""
    query = {}
    if status == "pending":
        query["is_active"] = False
    elif status == "active":
        query["is_active"] = True
    
    providers = await db.service_providers.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    stats = {
        "total": await db.service_providers.count_documents({}),
        "pending": await db.service_providers.count_documents({"is_active": False}),
        "active": await db.service_providers.count_documents({"is_active": True}),
        "verified": await db.service_providers.count_documents({"is_verified": True})
    }
    
    return {"providers": providers, "stats": stats}

@api_router.put("/admin/service-providers/{provider_id}")
async def admin_update_provider(
    provider_id: str,
    request: Request,
    user: User = Depends(require_admin)
):
    """Admin: Update provider (approve, verify, etc.)"""
    body = await request.json()
    
    update_fields = {}
    if "is_active" in body:
        update_fields["is_active"] = body["is_active"]
    if "is_verified" in body:
        update_fields["is_verified"] = body["is_verified"]
    if "is_premium" in body:
        update_fields["is_premium"] = body["is_premium"]
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.service_providers.update_one(
            {"provider_id": provider_id},
            {"$set": update_fields}
        )
    
    # If activated, send notification to provider
    if body.get("is_active"):
        provider = await db.service_providers.find_one({"provider_id": provider_id})
        if provider and provider.get("email"):
            asyncio.create_task(send_email_async(
                to=provider["email"],
                subject="✅ Votre profil YAMA+ Services est approuvé !",
                html=get_email_template(f"""
                    <h2>Félicitations {provider['name']} !</h2>
                    <p>Votre profil prestataire a été approuvé. Vous êtes maintenant visible sur YAMA+ Services.</p>
                    <p>Les clients peuvent désormais vous contacter pour vos services de <strong>{provider['profession']}</strong>.</p>
                    <a href="{SITE_URL}/provider/{provider_id}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">Voir mon profil</a>
                """, "Profil approuvé")
            ))
    
    return {"message": "Prestataire mis à jour"}

@api_router.delete("/admin/service-providers/{provider_id}")
async def admin_delete_provider(provider_id: str, user: User = Depends(require_admin)):
    """Admin: Delete a provider"""
    await db.service_providers.delete_one({"provider_id": provider_id})
    await db.provider_reviews.delete_many({"provider_id": provider_id})
    return {"message": "Prestataire supprimé"}

# Admin service requests management
@api_router.get("/admin/service-requests")
async def admin_get_service_requests(
    status: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(require_admin)
):
    """Admin: Get all service requests"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.service_requests.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    stats = {
        "total": await db.service_requests.count_documents({}),
        "new": await db.service_requests.count_documents({"status": "new"}),
        "in_progress": await db.service_requests.count_documents({"status": "in_progress"}),
        "completed": await db.service_requests.count_documents({"status": "completed"})
    }
    
    return {"requests": requests, "stats": stats}

@api_router.put("/admin/service-requests/{request_id}")
async def admin_update_service_request(
    request_id: str,
    request: Request,
    user: User = Depends(require_admin)
):
    """Admin: Update service request (assign, change status, etc.)"""
    body = await request.json()
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if "status" in body:
        update_fields["status"] = body["status"]
    if "assigned_provider_id" in body:
        update_fields["assigned_provider_id"] = body["assigned_provider_id"]
        # Get provider name
        if body["assigned_provider_id"]:
            provider = await db.service_providers.find_one({"provider_id": body["assigned_provider_id"]})
            if provider:
                update_fields["assigned_provider_name"] = provider["name"]
    if "admin_notes" in body:
        update_fields["admin_notes"] = body["admin_notes"]
    
    await db.service_requests.update_one(
        {"request_id": request_id},
        {"$set": update_fields}
    )
    
    return {"message": "Demande mise à jour"}

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "Bienvenue sur l'API Lumina Senegal", "version": "1.0.0"}

# ============== GIFT BOX MANAGEMENT ==============

@api_router.post("/admin/reset-test-data")
async def reset_test_data(user: User = Depends(require_admin)):
    """Reset all test data - DELETE ALL ORDERS AND STATS"""
    # Delete all orders
    orders_result = await db.orders.delete_many({})
    
    # Delete all notifications
    await db.notifications.delete_many({})
    
    # Delete all reviews
    await db.reviews.delete_many({})
    
    # Delete cart items
    await db.cart_items.delete_many({})
    
    # Delete wishlist items
    await db.wishlist_items.delete_many({})
    
    # Clear all caches
    clear_cache("products")
    clear_cache("flash_sales")
    clear_cache("orders")
    
    return {
        "message": "Données de test réinitialisées",
        "orders_deleted": orders_result.deleted_count
    }

@api_router.get("/gift-box/config")
async def get_gift_box_config():
    """Get public gift box configuration"""
    config = await db.gift_box_config.find_one({"config_id": "main"}, {"_id": 0})
    if not config:
        # Return default config
        config = {
            "is_enabled": True,
            "page_title": "Coffrets Cadeaux Personnalisés",
            "page_description": "Composez le coffret parfait en sélectionnant vos articles préférés",
            "banner_image": None,
            "allow_personal_message": True,
            "max_message_length": 200
        }
    
    # Get active sizes
    sizes = await db.gift_box_sizes.find(
        {"is_active": True}, 
        {"_id": 0}
    ).sort("sort_order", 1).to_list(20)
    
    # Get active wrapping options
    wrappings = await db.gift_box_wrappings.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(20)
    
    # Use defaults if none exist
    if not sizes:
        sizes = [
            {"size_id": "small", "name": "Petit Coffret", "description": "Idéal pour une attention délicate", "max_items": 3, "base_price": 5000, "icon": "🎁", "is_active": True, "sort_order": 0},
            {"size_id": "medium", "name": "Coffret Moyen", "description": "Parfait pour surprendre", "max_items": 5, "base_price": 8000, "icon": "🎀", "is_active": True, "sort_order": 1},
            {"size_id": "large", "name": "Grand Coffret", "description": "Pour les grandes occasions", "max_items": 8, "base_price": 12000, "icon": "✨", "is_active": True, "sort_order": 2},
            {"size_id": "premium", "name": "Coffret Premium", "description": "L'ultime cadeau de luxe", "max_items": 12, "base_price": 20000, "icon": "👑", "is_active": True, "sort_order": 3},
        ]
    
    if not wrappings:
        wrappings = [
            {"wrapping_id": "classic", "name": "Classique", "color": "#C41E3A", "price": 0, "is_active": True, "sort_order": 0},
            {"wrapping_id": "gold", "name": "Or & Luxe", "color": "#FFD700", "price": 3000, "is_active": True, "sort_order": 1},
            {"wrapping_id": "silver", "name": "Argent Élégant", "color": "#C0C0C0", "price": 2500, "is_active": True, "sort_order": 2},
            {"wrapping_id": "rose", "name": "Rose Romantique", "color": "#FF69B4", "price": 2000, "is_active": True, "sort_order": 3},
            {"wrapping_id": "nature", "name": "Nature & Kraft", "color": "#8B4513", "price": 1500, "is_active": True, "sort_order": 4},
        ]
    
    return {
        "config": config,
        "sizes": sizes,
        "wrappings": wrappings
    }

@api_router.get("/admin/gift-box/config")
async def get_admin_gift_box_config(user: User = Depends(require_admin)):
    """Get full gift box configuration for admin"""
    config = await db.gift_box_config.find_one({"config_id": "main"}, {"_id": 0})
    if not config:
        config = {
            "config_id": "main",
            "is_enabled": True,
            "page_title": "Coffrets Cadeaux Personnalisés",
            "page_description": "Composez le coffret parfait en sélectionnant vos articles préférés",
            "banner_image": None,
            "allow_personal_message": True,
            "max_message_length": 200
        }
    
    # Get ALL sizes (including inactive)
    sizes = await db.gift_box_sizes.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    
    # Get ALL wrapping options (including inactive)
    wrappings = await db.gift_box_wrappings.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    
    return {
        "config": config,
        "sizes": sizes,
        "wrappings": wrappings
    }

@api_router.put("/admin/gift-box/config")
async def update_gift_box_config(config_data: GiftBoxConfig, user: User = Depends(require_admin)):
    """Update gift box general configuration"""
    await db.gift_box_config.update_one(
        {"config_id": "main"},
        {"$set": {
            "config_id": "main",
            "is_enabled": config_data.is_enabled,
            "page_title": config_data.page_title,
            "page_description": config_data.page_description,
            "banner_image": config_data.banner_image,
            "allow_personal_message": config_data.allow_personal_message,
            "max_message_length": config_data.max_message_length,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Configuration mise à jour"}

@api_router.post("/admin/gift-box/sizes")
async def create_gift_box_size(size_data: GiftBoxSize, user: User = Depends(require_admin)):
    """Create a new gift box size"""
    size_id = f"size_{uuid.uuid4().hex[:8]}"
    
    doc = {
        "size_id": size_id,
        "name": size_data.name,
        "description": size_data.description,
        "max_items": size_data.max_items,
        "base_price": size_data.base_price,
        "image": size_data.image,
        "icon": size_data.icon,
        "is_active": size_data.is_active,
        "sort_order": size_data.sort_order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gift_box_sizes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/gift-box/sizes/{size_id}")
async def update_gift_box_size(size_id: str, size_data: GiftBoxSize, user: User = Depends(require_admin)):
    """Update a gift box size"""
    result = await db.gift_box_sizes.update_one(
        {"size_id": size_id},
        {"$set": {
            "name": size_data.name,
            "description": size_data.description,
            "max_items": size_data.max_items,
            "base_price": size_data.base_price,
            "image": size_data.image,
            "icon": size_data.icon,
            "is_active": size_data.is_active,
            "sort_order": size_data.sort_order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Taille non trouvée")
    return {"message": "Taille mise à jour"}

@api_router.delete("/admin/gift-box/sizes/{size_id}")
async def delete_gift_box_size(size_id: str, user: User = Depends(require_admin)):
    """Delete a gift box size"""
    result = await db.gift_box_sizes.delete_one({"size_id": size_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Taille non trouvée")
    return {"message": "Taille supprimée"}

@api_router.post("/admin/gift-box/wrappings")
async def create_gift_box_wrapping(wrapping_data: GiftBoxWrapping, user: User = Depends(require_admin)):
    """Create a new wrapping option"""
    wrapping_id = f"wrap_{uuid.uuid4().hex[:8]}"
    
    doc = {
        "wrapping_id": wrapping_id,
        "name": wrapping_data.name,
        "color": wrapping_data.color,
        "price": wrapping_data.price,
        "image": wrapping_data.image,
        "is_active": wrapping_data.is_active,
        "sort_order": wrapping_data.sort_order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gift_box_wrappings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/gift-box/wrappings/{wrapping_id}")
async def update_gift_box_wrapping(wrapping_id: str, wrapping_data: GiftBoxWrapping, user: User = Depends(require_admin)):
    """Update a wrapping option"""
    result = await db.gift_box_wrappings.update_one(
        {"wrapping_id": wrapping_id},
        {"$set": {
            "name": wrapping_data.name,
            "color": wrapping_data.color,
            "price": wrapping_data.price,
            "image": wrapping_data.image,
            "is_active": wrapping_data.is_active,
            "sort_order": wrapping_data.sort_order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Emballage non trouvé")
    return {"message": "Emballage mis à jour"}

@api_router.delete("/admin/gift-box/wrappings/{wrapping_id}")
async def delete_gift_box_wrapping(wrapping_id: str, user: User = Depends(require_admin)):
    """Delete a wrapping option"""
    result = await db.gift_box_wrappings.delete_one({"wrapping_id": wrapping_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Emballage non trouvé")
    return {"message": "Emballage supprimé"}

# ============ GIFT BOX TEMPLATES ============

# Default templates
DEFAULT_GIFTBOX_TEMPLATES = [
    {
        "template_id": "ramadan",
        "name": "Coffret Ramadan",
        "description": "Coffrets spéciaux pour le mois sacré du Ramadan",
        "icon": "🌙",
        "theme_color": "#2E7D32",
        "banner_image": None,
        "page_title": "Coffrets Ramadan - Partagez la Baraka",
        "page_subtitle": "Des coffrets pensés pour le partage et la générosité",
        "is_active": False,
        "sort_order": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "template_id": "enfant",
        "name": "Coffret Enfant",
        "description": "Des cadeaux qui font briller les yeux des petits",
        "icon": "🧸",
        "theme_color": "#FF9800",
        "banner_image": None,
        "page_title": "Coffrets pour Enfants",
        "page_subtitle": "Faites plaisir aux plus jeunes avec des coffrets magiques",
        "is_active": False,
        "sort_order": 1,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "template_id": "noel",
        "name": "Coffret Noël",
        "description": "La magie de Noël dans un coffret",
        "icon": "🎄",
        "theme_color": "#C62828",
        "banner_image": None,
        "page_title": "Coffrets de Noël",
        "page_subtitle": "Célébrez les fêtes avec des coffrets enchanteurs",
        "is_active": False,
        "sort_order": 2,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "template_id": "pack_accessoires",
        "name": "Pack Accessoires",
        "description": "Accessoires tendances regroupés pour vous",
        "icon": "👜",
        "theme_color": "#7B1FA2",
        "banner_image": None,
        "page_title": "Packs Accessoires",
        "page_subtitle": "Des ensembles d'accessoires coordonnés et stylés",
        "is_active": False,
        "sort_order": 3,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "template_id": "saint_valentin",
        "name": "Coffret Saint-Valentin",
        "description": "Pour célébrer l'amour",
        "icon": "💝",
        "theme_color": "#E91E63",
        "banner_image": None,
        "page_title": "Coffrets Saint-Valentin",
        "page_subtitle": "Exprimez votre amour avec un coffret romantique",
        "is_active": False,
        "sort_order": 4,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "template_id": "tabaski",
        "name": "Coffret Tabaski",
        "description": "Célébrez la fête du mouton",
        "icon": "🐑",
        "theme_color": "#1565C0",
        "banner_image": None,
        "page_title": "Coffrets Tabaski - Aïd el-Kébir",
        "page_subtitle": "Des coffrets pour partager la joie de la Tabaski",
        "is_active": False,
        "sort_order": 5,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "template_id": "fete_meres",
        "name": "Coffret Fête des Mères",
        "description": "Pour remercier nos mamans adorées",
        "icon": "💐",
        "theme_color": "#EC407A",
        "banner_image": None,
        "page_title": "Coffrets Fête des Mères",
        "page_subtitle": "Offrez de la tendresse à votre maman",
        "is_active": False,
        "sort_order": 6,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "template_id": "classique",
        "name": "Coffret Classique",
        "description": "Template par défaut toute l'année",
        "icon": "🎁",
        "theme_color": "#9333EA",
        "banner_image": None,
        "page_title": "Coffrets Cadeaux Personnalisés",
        "page_subtitle": "Composez le coffret parfait en sélectionnant vos articles préférés",
        "is_active": True,
        "sort_order": 99,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
]

@api_router.get("/admin/gift-box/templates")
async def get_giftbox_templates(user: User = Depends(require_admin)):
    """Get all gift box templates"""
    templates = await db.gift_box_templates.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    
    # If no templates exist, create defaults
    if not templates:
        for template in DEFAULT_GIFTBOX_TEMPLATES:
            await db.gift_box_templates.insert_one(template)
        templates = DEFAULT_GIFTBOX_TEMPLATES
    
    return {"templates": templates}

@api_router.get("/gift-box/active-template")
async def get_active_giftbox_template():
    """Get the currently active gift box template for public display"""
    template = await db.gift_box_templates.find_one({"is_active": True}, {"_id": 0})
    
    if not template:
        # Return default template
        template = DEFAULT_GIFTBOX_TEMPLATES[-1]  # Classique
    
    return template

@api_router.put("/admin/gift-box/templates/{template_id}/activate")
async def activate_giftbox_template(template_id: str, user: User = Depends(require_admin)):
    """Activate a specific template and deactivate all others"""
    # First, deactivate all templates
    await db.gift_box_templates.update_many({}, {"$set": {"is_active": False}})
    
    # Then activate the selected one
    result = await db.gift_box_templates.update_one(
        {"template_id": template_id},
        {"$set": {"is_active": True, "activated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template non trouvé")
    
    logger.info(f"Gift box template '{template_id}' activated by {user.email}")
    return {"message": f"Template '{template_id}' activé", "template_id": template_id}

@api_router.post("/admin/gift-box/templates")
async def create_giftbox_template(template: dict, user: User = Depends(require_admin)):
    """Create a new gift box template"""
    template_id = template.get("template_id") or str(uuid.uuid4())[:8]
    
    # Check if template_id already exists
    existing = await db.gift_box_templates.find_one({"template_id": template_id})
    if existing:
        raise HTTPException(status_code=400, detail="Un template avec cet ID existe déjà")
    
    new_template = {
        "template_id": template_id,
        "name": template.get("name", "Nouveau Template"),
        "description": template.get("description", ""),
        "icon": template.get("icon", "🎁"),
        "theme_color": template.get("theme_color", "#9333EA"),
        "banner_image": template.get("banner_image"),
        "page_title": template.get("page_title", "Coffrets Personnalisés"),
        "page_subtitle": template.get("page_subtitle", ""),
        "is_active": False,
        "sort_order": template.get("sort_order", 50),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gift_box_templates.insert_one(new_template)
    if "_id" in new_template:
        del new_template["_id"]
    
    return {"message": "Template créé", "template": new_template}

@api_router.put("/admin/gift-box/templates/{template_id}")
async def update_giftbox_template(template_id: str, template: dict, user: User = Depends(require_admin)):
    """Update a gift box template"""
    update_data = {
        "name": template.get("name"),
        "description": template.get("description"),
        "icon": template.get("icon"),
        "theme_color": template.get("theme_color"),
        "banner_image": template.get("banner_image"),
        "page_title": template.get("page_title"),
        "page_subtitle": template.get("page_subtitle"),
        "sort_order": template.get("sort_order"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.gift_box_templates.update_one(
        {"template_id": template_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template non trouvé")
    
    return {"message": "Template mis à jour"}

@api_router.delete("/admin/gift-box/templates/{template_id}")
async def delete_giftbox_template(template_id: str, user: User = Depends(require_admin)):
    """Delete a gift box template"""
    # Prevent deletion of default templates
    if template_id in ["classique", "ramadan", "noel", "enfant", "pack_accessoires"]:
        raise HTTPException(status_code=400, detail="Impossible de supprimer un template par défaut")
    
    result = await db.gift_box_templates.delete_one({"template_id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template non trouvé")
    
    return {"message": "Template supprimé"}

# ============ GIFT BOX PRODUCTS (Admin-controlled) ============

class GiftBoxProductCreate(BaseModel):
    name: str
    description: str = ""
    price: int
    image: str = ""
    category: str = ""
    is_active: bool = True
    sort_order: int = 0

@api_router.get("/gift-box/products")
async def get_giftbox_products():
    """Get all gift box products (public - for customers)"""
    products = await db.gift_box_products.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    return {"products": products}

@api_router.get("/admin/gift-box/products")
async def get_admin_giftbox_products(user: User = Depends(require_admin)):
    """Get all gift box products (admin - includes inactive)"""
    products = await db.gift_box_products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return {"products": products}

@api_router.post("/admin/gift-box/products")
async def create_giftbox_product(product: GiftBoxProductCreate, user: User = Depends(require_admin)):
    """Create a new gift box product"""
    product_id = f"gbp_{uuid.uuid4().hex[:12]}"
    
    new_product = {
        "product_id": product_id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "image": product.image,
        "category": product.category,
        "is_active": product.is_active,
        "sort_order": product.sort_order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gift_box_products.insert_one(new_product)
    if "_id" in new_product:
        del new_product["_id"]
    
    logger.info(f"Gift box product created: {product.name}")
    return {"message": "Produit coffret créé", "product": new_product}

@api_router.put("/admin/gift-box/products/{product_id}")
async def update_giftbox_product(product_id: str, product: dict, user: User = Depends(require_admin)):
    """Update a gift box product"""
    update_data = {
        "name": product.get("name"),
        "description": product.get("description"),
        "price": product.get("price"),
        "image": product.get("image"),
        "category": product.get("category"),
        "is_active": product.get("is_active"),
        "sort_order": product.get("sort_order"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.gift_box_products.update_one(
        {"product_id": product_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    return {"message": "Produit mis à jour"}

@api_router.delete("/admin/gift-box/products/{product_id}")
async def delete_giftbox_product(product_id: str, user: User = Depends(require_admin)):
    """Delete a gift box product"""
    result = await db.gift_box_products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}

@api_router.post("/admin/gift-box/products/import-from-catalog")
async def import_products_to_giftbox(data: dict, user: User = Depends(require_admin)):
    """Import products from main catalog to gift box products"""
    product_ids = data.get("product_ids", [])
    
    if not product_ids:
        raise HTTPException(status_code=400, detail="Aucun produit sélectionné")
    
    imported = 0
    for pid in product_ids:
        # Get product from main catalog
        product = await db.products.find_one({"product_id": pid}, {"_id": 0})
        if not product:
            continue
        
        # Check if already imported
        existing = await db.gift_box_products.find_one({"original_product_id": pid})
        if existing:
            continue
        
        # Create gift box product
        new_product = {
            "product_id": f"gbp_{uuid.uuid4().hex[:12]}",
            "original_product_id": pid,
            "name": product["name"],
            "description": product.get("short_description", ""),
            "price": product["price"],
            "image": product["images"][0] if product.get("images") else "",
            "category": product.get("category", ""),
            "is_active": True,
            "sort_order": 99,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.gift_box_products.insert_one(new_product)
        imported += 1
    
    return {"message": f"{imported} produit(s) importé(s)", "imported": imported}

@api_router.get("/health")
async def health_check():
    """Health check with memory monitoring"""
    import psutil
    import gc
    
    # Force garbage collection
    gc.collect()
    
    # Get memory usage
    process = psutil.Process()
    memory_info = process.memory_info()
    memory_mb = memory_info.rss / 1024 / 1024
    
    # Check database connection
    try:
        await db.command("ping")
        db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "memory_mb": round(memory_mb, 2),
        "database": db_status,
        "rate_limit_entries": len(rate_limit_storage)
    }

# ============ FIX IMAGE URLS - SOLUTION DÉFINITIVE ============

@api_router.post("/admin/fix-image-urls")
async def fix_all_image_urls(user: User = Depends(require_admin)):
    """
    SOLUTION DÉFINITIVE pour corriger TOUTES les images cassées.
    À exécuter après chaque déploiement sur production.
    
    Corrige:
    - URLs de production (groupeyamaplus.com) -> URLs relatives
    - URLs de preview (*.emergentagent.com) -> URLs relatives  
    - URLs vides ou invalides -> supprimées
    """
    import re
    
    fixed_count = 0
    products_checked = 0
    details = []
    errors = []
    
    # Get all products
    products = await db.products.find({}).to_list(1000)
    
    for product in products:
        products_checked += 1
        images = product.get('images', [])
        product_name = product.get('name', 'Sans nom')
        product_id = product.get('product_id', '')
        
        if not images:
            continue
            
        new_images = []
        product_fixed = False
        
        for img_url in images:
            # Skip empty URLs
            if not img_url or img_url.strip() == '':
                product_fixed = True
                details.append({
                    'product': product_name,
                    'action': 'URL vide supprimée'
                })
                continue
            
            original_url = img_url
            new_url = img_url
            
            # Pattern 1: Fix production URLs (groupeyamaplus.com)
            prod_match = re.search(r'https?://(?:www\.)?groupeyamaplus\.com(/api/uploads/[^\s"\'<>]+)', img_url)
            if prod_match:
                new_url = prod_match.group(1)
                product_fixed = True
                details.append({
                    'product': product_name,
                    'action': 'URL production -> relative',
                    'old': original_url[:60],
                    'new': new_url
                })
            
            # Pattern 2: Fix preview URLs (*.emergentagent.com)
            preview_match = re.search(r'https?://[^/]+\.emergentagent\.com(/api/uploads/[^\s"\'<>]+)', img_url)
            if preview_match and not prod_match:
                new_url = preview_match.group(1)
                product_fixed = True
                details.append({
                    'product': product_name,
                    'action': 'URL preview -> relative',
                    'old': original_url[:60],
                    'new': new_url
                })
            
            # Pattern 3: Fix any other domain with /api/uploads/
            other_match = re.search(r'https?://[^/]+(/api/uploads/[^\s"\'<>]+)', img_url)
            if other_match and not prod_match and not preview_match:
                new_url = other_match.group(1)
                product_fixed = True
                details.append({
                    'product': product_name,
                    'action': 'URL externe -> relative',
                    'old': original_url[:60],
                    'new': new_url
                })
            
            # Only add valid URLs
            if new_url and new_url.strip():
                new_images.append(new_url)
        
        # Update product if changes were made
        if product_fixed:
            try:
                await db.products.update_one(
                    {'product_id': product_id},
                    {'$set': {
                        'images': new_images,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }}
                )
                fixed_count += 1
            except Exception as e:
                errors.append({
                    'product': product_name,
                    'error': str(e)
                })
    
    logger.info(f"Image URL fix completed: {fixed_count}/{products_checked} products fixed")
    
    return {
        "success": True,
        "message": f"Correction terminée: {fixed_count} produit(s) corrigé(s) sur {products_checked}",
        "products_checked": products_checked,
        "products_fixed": fixed_count,
        "details": details[:50],  # Limit to 50 details
        "errors": errors
    }

@api_router.get("/admin/check-images")
async def check_all_images(user: User = Depends(require_admin)):
    """Vérifier toutes les images et lister les problèmes"""
    
    issues = []
    ok_count = 0
    products = await db.products.find({}).to_list(1000)
    
    for product in products:
        images = product.get('images', [])
        product_id = product.get('product_id', '')
        name = product.get('name', 'Sans nom')
        
        if not images or len(images) == 0:
            issues.append({
                'product_id': product_id,
                'name': name,
                'issue': 'Aucune image',
                'severity': 'high'
            })
            continue
        
        has_issue = False
        for img_url in images:
            if not img_url or img_url.strip() == '':
                issues.append({
                    'product_id': product_id,
                    'name': name,
                    'issue': 'URL vide',
                    'severity': 'high'
                })
                has_issue = True
            elif 'groupeyamaplus.com' in img_url:
                issues.append({
                    'product_id': product_id,
                    'name': name,
                    'issue': 'URL production absolue',
                    'url': img_url[:60],
                    'severity': 'high'
                })
                has_issue = True
            elif '.emergentagent.com' in img_url:
                issues.append({
                    'product_id': product_id,
                    'name': name,
                    'issue': 'URL preview absolue',
                    'url': img_url[:60],
                    'severity': 'high'
                })
                has_issue = True
        
        if not has_issue:
            ok_count += 1
    
    return {
        "total_products": len(products),
        "products_ok": ok_count,
        "issues_count": len(issues),
        "issues": issues
    }

# Include router
app.include_router(api_router)

# Commercial routes
from routes.commercial_routes import get_commercial_routes
commercial_router = get_commercial_routes(db, require_admin)
app.include_router(commercial_router)

# CORS - Allow multiple origins including production and preview
ALLOWED_ORIGINS = [
    "https://groupeyamaplus.com",
    "https://www.groupeyamaplus.com",
    "https://stable-prod.preview.emergentagent.com",
    "http://localhost:3000",
    "http://localhost:8001",
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize database indexes and start scheduler on application startup"""
    logger.info("Initializing database indexes for optimal performance...")
    
    # Create indexes for better query performance
    try:
        # Products indexes
        await db.products.create_index("product_id", unique=True)
        await db.products.create_index("category")
        await db.products.create_index("featured")
        await db.products.create_index("is_new")
        await db.products.create_index("is_promo")
        await db.products.create_index("is_flash_sale")
        await db.products.create_index([("name", "text"), ("description", "text")])
        
        # Orders indexes
        await db.orders.create_index("order_id", unique=True)
        await db.orders.create_index("user_id")
        await db.orders.create_index("created_at")
        await db.orders.create_index("order_status")
        
        # Users indexes
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
        
        # Reviews indexes
        await db.reviews.create_index("product_id")
        await db.reviews.create_index("user_id")
        
        # Blog posts indexes
        await db.blog_posts.create_index("slug", unique=True)
        await db.blog_posts.create_index("category")
        await db.blog_posts.create_index("is_published")
        
        # Cart indexes
        await db.carts.create_index("cart_id", unique=True)
        await db.carts.create_index("user_id")
        await db.carts.create_index("session_id")
        
        # Sessions indexes
        await db.user_sessions.create_index("session_token")
        await db.user_sessions.create_index("user_id")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Index creation warning (may already exist): {e}")
    
    # Start abandoned cart scheduler
    logger.info("Starting abandoned cart scheduler...")
    scheduler.add_job(
        detect_and_process_abandoned_carts,
        IntervalTrigger(hours=1),  # Run every hour
        id="abandoned_cart_detection",
        name="Abandoned Cart Detection",
        replace_existing=True
    )
    
    # Start post-purchase review scheduler (daily at 10 AM)
    scheduler.add_job(
        process_post_purchase_reviews,
        IntervalTrigger(hours=24),
        id="post_purchase_reviews",
        name="Post-Purchase Review Emails",
        replace_existing=True
    )
    
    # Start VIP rewards scheduler (weekly)
    scheduler.add_job(
        process_vip_customer_rewards,
        IntervalTrigger(days=7),
        id="vip_customer_rewards",
        name="VIP Customer Rewards",
        replace_existing=True
    )
    
    # Start winback campaign scheduler (daily)
    scheduler.add_job(
        process_winback_campaign,
        IntervalTrigger(hours=24),
        id="winback_campaign",
        name="Winback Campaign",
        replace_existing=True
    )
    
    # Start wishlist reminder scheduler (every 3 days)
    scheduler.add_job(
        process_wishlist_reminders,
        IntervalTrigger(days=3),
        id="wishlist_reminders",
        name="Wishlist Reminders",
        replace_existing=True
    )
    
    # Start order tracking scheduler (every 2 hours)
    scheduler.add_job(
        process_order_tracking_updates,
        IntervalTrigger(hours=2),
        id="order_tracking_updates",
        name="Order Tracking Updates",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("All email marketing schedulers started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()
