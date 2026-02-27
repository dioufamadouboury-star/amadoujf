#!/usr/bin/env python3
"""
Script de restauration de base de données pour GROUPE YAMA+
Usage: python3 restore_database.py
"""

import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Configuration
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "groupeyamaplus")
BACKUP_FILE = "database_backup.json"

async def restore_database():
    """Restaure la base de données depuis le fichier de backup"""
    
    print(f"Connexion à MongoDB: {MONGO_URL}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Vérifier si le fichier de backup existe
    if not os.path.exists(BACKUP_FILE):
        print(f"Erreur: Fichier de backup '{BACKUP_FILE}' non trouvé")
        return
    
    # Charger le backup
    print(f"Chargement du backup depuis {BACKUP_FILE}...")
    with open(BACKUP_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Restaurer chaque collection
    for collection_name, documents in data.items():
        if documents:
            # Supprimer la collection existante
            await db[collection_name].drop()
            
            # Insérer les documents
            await db[collection_name].insert_many(documents)
            print(f"✓ {collection_name}: {len(documents)} documents restaurés")
        else:
            print(f"○ {collection_name}: aucun document")
    
    # Créer les index
    print("\nCréation des index...")
    
    # Index utilisateurs
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    
    # Index produits
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("category")
    await db.products.create_index([("name", "text"), ("description", "text")])
    
    # Index commandes
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("created_at")
    
    # Index sessions
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    
    print("✓ Index créés")
    
    print("\n" + "="*50)
    print("Base de données restaurée avec succès!")
    print("="*50)
    
    # Afficher un résumé
    print("\nRésumé:")
    for collection_name in data.keys():
        count = await db[collection_name].count_documents({})
        print(f"  - {collection_name}: {count} documents")

if __name__ == "__main__":
    asyncio.run(restore_database())
