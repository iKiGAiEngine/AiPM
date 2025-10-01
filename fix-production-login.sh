#!/bin/bash

# AiPM Production Login Fix Script
# Run this from your DEPLOYMENT SHELL (not workspace)

echo "🔧 Fixing production admin login..."
echo ""

# Step 1: Check if admin exists
echo "📋 Checking production database..."
ADMIN_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE email = '$AIPM_ADMIN_EMAIL';")

if [ -z "$AIPM_ADMIN_EMAIL" ] || [ -z "$AIPM_ADMIN_PASSWORD" ]; then
    echo "❌ ERROR: Missing secrets AIPM_ADMIN_EMAIL or AIPM_ADMIN_PASSWORD"
    echo "Please set these in your deployment secrets first!"
    exit 1
fi

echo "📧 Admin email: $AIPM_ADMIN_EMAIL"
echo "👤 Admin exists in DB: $ADMIN_EXISTS users found"
echo ""

# Step 2: Generate password hash
echo "🔐 Generating password hash..."
HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('$AIPM_ADMIN_PASSWORD', 12).then(h => console.log(h));")

# Step 3: Update or create admin user
if [ "$ADMIN_EXISTS" -gt 0 ]; then
    echo "♻️  Updating existing admin password..."
    psql "$DATABASE_URL" -c "UPDATE users SET password = '$HASH' WHERE email = '$AIPM_ADMIN_EMAIL';"
    echo "✅ Admin password updated!"
else
    echo "➕ Creating new admin user..."
    # Need to get organization ID first
    ORG_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM organizations LIMIT 1;")
    
    if [ -z "$ORG_ID" ]; then
        echo "❌ No organization found. Run migrations first: npm run db:push --force"
        exit 1
    fi
    
    psql "$DATABASE_URL" -c "INSERT INTO users (email, password, first_name, last_name, role, organization_id, is_active) VALUES ('$AIPM_ADMIN_EMAIL', '$HASH', 'Admin', 'User', 'Admin', '$ORG_ID', true);"
    echo "✅ Admin user created!"
fi

echo ""
echo "🎉 Production login fixed!"
echo ""
echo "Login credentials:"
echo "  Email: $AIPM_ADMIN_EMAIL"
echo "  Password: [value in AIPM_ADMIN_PASSWORD secret]"
echo ""
echo "Test login at: https://aipmapp.com"
