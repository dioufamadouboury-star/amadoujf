"""
Services package for YAMA+ e-commerce platform
"""
from .email_service import (
    get_email_template,
    send_email_async,
    send_email_mailersend,
    mailerlite_service,
    MailerLiteService,
    SITE_URL,
    STORE_NAME,
    STORE_PHONE,
    STORE_ADDRESS,
    ADMIN_NOTIFICATION_EMAIL
)

__all__ = [
    'get_email_template',
    'send_email_async',
    'send_email_mailersend',
    'mailerlite_service',
    'MailerLiteService',
    'SITE_URL',
    'STORE_NAME',
    'STORE_PHONE',
    'STORE_ADDRESS',
    'ADMIN_NOTIFICATION_EMAIL'
]
