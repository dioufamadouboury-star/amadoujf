#!/bin/bash

# ============================================================
# GROUPE YAMA+ - Script de déploiement VPS
# Usage: ./deploy.sh [commande]
# ============================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  GROUPE YAMA+ - Déploiement"
    echo "========================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Vérifier les prérequis
check_prerequisites() {
    echo -e "${YELLOW}Vérification des prérequis...${NC}"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        echo "Installez avec: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    print_success "Docker installé"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        echo "Installez avec: apt install docker-compose -y"
        exit 1
    fi
    print_success "Docker Compose installé"
}

# Vérifier le fichier .env
check_env() {
    if [ ! -f ".env" ]; then
        print_warning "Fichier .env non trouvé"
        echo "Création à partir de .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "IMPORTANT: Modifiez .env avec vos vraies valeurs!"
            echo "Commande: nano .env"
            exit 1
        else
            print_error "Fichier .env.example non trouvé"
            exit 1
        fi
    fi
    print_success "Fichier .env trouvé"
}

# Build et démarrage
deploy() {
    print_header
    check_prerequisites
    check_env
    
    echo -e "${YELLOW}Arrêt des anciens conteneurs...${NC}"
    docker-compose down 2>/dev/null || true
    
    echo -e "${YELLOW}Construction des images...${NC}"
    docker-compose build --no-cache
    
    echo -e "${YELLOW}Démarrage des services...${NC}"
    docker-compose up -d
    
    echo -e "${YELLOW}Attente du démarrage (30s)...${NC}"
    sleep 30
    
    health_check
}

# Vérification de santé
health_check() {
    echo -e "${YELLOW}Vérification de santé...${NC}"
    
    # MongoDB
    if docker-compose exec -T mongodb mongosh --eval "db.stats()" &> /dev/null; then
        print_success "MongoDB OK"
    else
        print_warning "MongoDB en cours de démarrage..."
    fi
    
    # Backend
    if curl -sf http://localhost:8001/api/health > /dev/null 2>&1; then
        print_success "Backend OK"
    else
        print_error "Backend non accessible"
        echo "Logs: docker-compose logs backend"
    fi
    
    # Frontend
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend OK"
    else
        print_error "Frontend non accessible"
        echo "Logs: docker-compose logs frontend"
    fi
}

# Afficher les logs
logs() {
    docker-compose logs -f "$@"
}

# Redémarrer
restart() {
    echo -e "${YELLOW}Redémarrage des services...${NC}"
    docker-compose restart
    sleep 10
    health_check
}

# Arrêter
stop() {
    echo -e "${YELLOW}Arrêt des services...${NC}"
    docker-compose down
    print_success "Services arrêtés"
}

# Mise à jour
update() {
    echo -e "${YELLOW}Mise à jour du code...${NC}"
    git pull
    deploy
}

# Status
status() {
    docker-compose ps
    echo ""
    health_check
}

# Aide
help() {
    echo "Usage: $0 [commande]"
    echo ""
    echo "Commandes:"
    echo "  deploy    - Déploiement complet (build + start)"
    echo "  start     - Démarrer les services"
    echo "  stop      - Arrêter les services"
    echo "  restart   - Redémarrer les services"
    echo "  update    - Git pull + redéployer"
    echo "  logs      - Voir les logs (ex: ./deploy.sh logs backend)"
    echo "  status    - État des services"
    echo "  health    - Vérification de santé"
    echo "  help      - Afficher cette aide"
}

# Main
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    start)
        docker-compose up -d
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    update)
        update
        ;;
    logs)
        shift
        logs "$@"
        ;;
    status)
        status
        ;;
    health)
        health_check
        ;;
    help|--help|-h)
        help
        ;;
    *)
        echo "Commande inconnue: $1"
        help
        exit 1
        ;;
esac
