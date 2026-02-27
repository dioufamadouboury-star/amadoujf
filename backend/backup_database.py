#!/usr/bin/env python3
"""
GROUPE YAMA+ - Database Backup Script
Usage: python backup_database.py
"""

import asyncio
import json
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Collections to backup
COLLECTIONS = [
    'users',
    'products',
    'orders',
    'service_providers',
    'service_requests',
    'appointments',
    'quotes',
    'invoices',
    'contracts',
    'partners',
    'promo_codes',
    'flash_sales',
    'reviews',
    'blog_posts',
    'push_subscriptions',
    'game_rewards',
    'subscribers'
]

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    if doc is None:
        return None
    
    result = {}
    for key, value in doc.items():
        if key == '_id':
            continue  # Skip MongoDB _id
        elif hasattr(value, 'isoformat'):
            result[key] = value.isoformat()
        elif isinstance(value, bytes):
            result[key] = value.decode('utf-8', errors='ignore')
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result

async def backup_database():
    """Backup all collections to JSON files"""
    print(f"Connecting to MongoDB: {MONGO_URL}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = f'backup_{timestamp}'
    os.makedirs(backup_dir, exist_ok=True)
    
    all_data = {}
    
    for collection_name in COLLECTIONS:
        print(f"  Backing up {collection_name}...", end=' ')
        collection = db[collection_name]
        
        docs = []
        async for doc in collection.find():
            docs.append(serialize_doc(doc))
        
        all_data[collection_name] = docs
        print(f"{len(docs)} documents")
        
        # Save individual collection file
        with open(f'{backup_dir}/{collection_name}.json', 'w', encoding='utf-8') as f:
            json.dump(docs, f, ensure_ascii=False, indent=2)
    
    # Save complete backup
    with open(f'{backup_dir}/complete_backup.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    # Also save to root for easy access
    with open('database_backup.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Backup complete!")
    print(f"   - Directory: {backup_dir}/")
    print(f"   - Complete backup: database_backup.json")
    
    client.close()

if __name__ == '__main__':
    asyncio.run(backup_database())
