#!/bin/bash
# TrueTicket Production Deployment Script
# Run on the VPS as root

set -e

echo "=== TrueTicket Production Deployment ==="

# Configuration
APP_DIR="/opt/trueticket"
REPO_URL="https://github.com/amstone1/TrueTicket.git"

# Update system
echo "Updating system..."
apt-get update
apt-get upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    apt-get install -y docker.io docker-compose
    systemctl enable docker
    systemctl start docker
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    apt-get install -y git
fi

# Create app directory
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or pull latest code
if [ -d ".git" ]; then
    echo "Pulling latest code..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone $REPO_URL .
fi

# Create .env.production file if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo "Creating .env.production template..."
    cat > .env.production << 'EOF'
# Production Environment Variables
NODE_ENV=production
DATABASE_URL=file:/app/data/prod.db

# Generate a secure JWT secret: openssl rand -base64 32
JWT_SECRET=CHANGE_ME_GENERATE_NEW_SECRET

# Blockchain Configuration
BLOCKCHAIN_NETWORK=polygon
POLYGON_RPC_URL=https://polygon-rpc.com

# Platform Wallet (GENERATE NEW KEYS FOR PRODUCTION!)
PLATFORM_WALLET_PRIVATE_KEY=
PLATFORM_WALLET_ADDRESS=

# Stripe (Get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
EOF
    echo ""
    echo "!!! IMPORTANT !!!"
    echo "Edit .env.production with your actual production values before running docker-compose"
    echo "Run: nano /opt/trueticket/.env.production"
    exit 1
fi

# Create data directory for SQLite
mkdir -p data

# Copy env to .env for docker-compose
cp .env.production .env

# Build and start containers
echo "Building and starting containers..."
docker-compose down || true
docker-compose build --no-cache
docker-compose up -d

# Wait for app to start
echo "Waiting for application to start..."
sleep 10

# Run database migrations
echo "Running database migrations..."
docker-compose exec -T app npx prisma db push

# Check health
echo "Checking application health..."
curl -s http://localhost:3000/api/health || echo "Health check pending..."

echo ""
echo "=== Deployment Complete ==="
echo "Your site should be accessible at:"
echo "  https://trueticket.me"
echo "  https://www.trueticket.me"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To restart: docker-compose restart"
