#!/usr/bin/env python3
"""
GROUPE YAMA+ - Database Restore Script
Usage: python restore_database.py [backup_file.json]
"""

import asyncio
import json
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'yama_marketplace')

async def restore_database(backup_file='database_backup.json'):
    """Restore collections from JSON backup"""
    
    if not os.path.exists(backup_file):
        print(f"❌ Backup file not found: {backup_file}")
        return
    
    print(f"Loading backup from: {backup_file}")
    with open(backup_file, 'r', encoding='utf-8') as f:
        all_data = json.load(f)
    
    print(f"Connecting to MongoDB: {MONGO_URL}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    for collection_name, docs in all_data.items():
        print(f"  Restoring {collection_name}...", end=' ')
        
        if len(docs) == 0:
            print("0 documents (skipped)")
            continue
        
        collection = db[collection_name]
        
        # Clear existing data
        await collection.delete_many({})
        
        # Insert backup data
        if docs:
            await collection.insert_many(docs)
        
        print(f"{len(docs)} documents")
    
    print(f"\n✅ Restore complete to database: {DB_NAME}")
    
    client.close()

if __name__ == '__main__':
    backup_file = sys.argv[1] if len(sys.argv) > 1 else 'database_backup.json'
    asyncio.run(restore_database(backup_file))
