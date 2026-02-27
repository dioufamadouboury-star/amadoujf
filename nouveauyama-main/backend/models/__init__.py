"""
Models package for YAMA+ e-commerce platform
Common Pydantic models used across the application
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class User(UserBase):
    user_id: str
    role: str = "customer"
    picture: Optional[str] = None
    is_verified: bool = False
    created_at: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class AppointmentRequest(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    category: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    preferred_date: str
    preferred_time: str
    message: Optional[str] = None
    contact_method: str = "email"


class ShippingAddress(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: str
    city: str
    region: str
    neighborhood: Optional[str] = None
    notes: Optional[str] = None


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: int
    quantity: int
    image: Optional[str] = None


class OrderCreate(BaseModel):
    items: List[OrderItem]
    shipping: ShippingAddress
    payment_method: str
    subtotal: int
    shipping_cost: int
    discount: int = 0
    total: int
    promo_code: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    password: str
