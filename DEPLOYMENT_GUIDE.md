# AiPM Deployment Guide

This guide will help you successfully deploy AiPM to Replit Autoscale.

## Prerequisites

Before deploying, ensure you have:
- A PostgreSQL database (Neon) configured
- Admin credentials ready for your production environment

## Step 1: Configure Deployment Secrets

Your workspace secrets automatically sync to deployments, but you must configure all required secrets before deploying.

### Required Secrets (Critical)

1. **AIPM_ADMIN_EMAIL** - Your admin user email address (e.g., `admin@yourcompany.com`)
2. **AIPM_ADMIN_PASSWORD** - Strong admin password (min 12 characters, mixed case, numbers, symbols)
3. **DATABASE_URL** - PostgreSQL connection string from Neon (format: `postgresql://user:password@host/database`)
4. **JWT_SECRET** - Secure random string for authentication tokens (min 32 characters)
5. **JWT_REFRESH_SECRET** - Another secure random string for refresh tokens (min 32 characters)

### Optional Secrets (Feature-Dependent)

6. **SENDGRID_API_KEY** - Required if using email notifications for RFQs/POs
7. **GCS_BUCKET_NAME** - Google Cloud Storage bucket name for quote documents
8. **GCS_PROJECT_ID** - Google Cloud project ID for object storage
9. **GCS_CLIENT_EMAIL** - Service account email for GCS authentication
10. **GCS_PRIVATE_KEY** - Service account private key for GCS authentication

### How to Set Secrets

1. Click on the **Secrets** tool in your workspace (lock icon in sidebar)
2. Add each secret with its value
3. For JWT secrets, generate strong random values:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. **IMPORTANT**: Use a STRONG admin password - this is your production access!

### Security Best Practices

- ⚠️ Never reuse the same JWT secrets across environments
- ⚠️ Never use the default placeholder values in production
- ⚠️ Store admin password securely (password manager)
- ⚠️ Rotate credentials immediately if exposed

## Step 2: Initialize Production Database

After your first deployment, you need to run database migrations and seed the production database.

### Step 2.1: Run Database Migrations

You can run migrations either from your deployment shell or from your workspace.

**Option A: From Workspace (Recommended)**

1. In your workspace, temporarily add your production DATABASE_URL to the Secrets tool
2. Run migrations:
   ```bash
   npm run db:push --force
   ```
3. Remove the production DATABASE_URL from Secrets tool

**Option B: From Deployment Shell**

1. Go to your published deployment dashboard
2. Open the Shell/Console
3. Run:
   ```bash
   npm run db:push --force
   ```

**Note:** Using `--force` is safe on a fresh production database.

### Step 2.2: Seed Production Database

After migrations complete successfully, seed your production database.

**Recommended Approach: Run from Workspace**

**Security Note:** ⚠️ To avoid exposing secrets in shell history, use the Replit Secrets tool to temporarily add production values, then remove them after seeding.

1. **Option A: Using Secrets Tool (Most Secure)**
   - Open the Secrets tool (lock icon in sidebar)
   - Temporarily add these secrets with your production values:
     - `DATABASE_URL` = your production database URL
     - `AIPM_ADMIN_EMAIL` = your admin email
     - `AIPM_ADMIN_PASSWORD` = your admin password
   - Run: `tsx server/seed-production.ts`
   - **Important:** Delete these temporary secrets from the Secrets tool immediately after

2. **Option B: Using Environment Variables (Quick but less secure)**
   ```bash
   DATABASE_URL="your-prod-db-url" AIPM_ADMIN_EMAIL="admin@domain.com" AIPM_ADMIN_PASSWORD="password" tsx server/seed-production.ts
   ```
   ⚠️ This avoids persisting secrets in history but they may still be visible in process lists

**Alternative: Install tsx in Production**

If you prefer to run the seed directly in your deployment shell, you'll need tsx as a production dependency. Contact support for assistance with this approach.

### Expected Output

```
🚀 Starting production database initialization...
📧 Admin email: your-admin@domain.com
✅ Created organization: Domain Construction
✅ Created admin user: your-admin@domain.com
🎉 Production database initialized successfully!
```

### Important Notes

- ✅ The script is **idempotent** - safe to run multiple times
- ✅ If admin user exists, it will skip creation
- ✅ If organization exists, it will use the existing one
- ⚠️ Always run migrations (`db:push`) before seeding

## Step 3: Publish Your App

1. Click the **Publish** button in Replit
2. Choose **Autoscale** deployment
3. Wait 2-5 minutes for deployment to complete
4. Your app will be live at `https://your-app.replit.app`

## Step 4: First Login

1. Visit your published app URL
2. Login with:
   - **Email:** [Value from AIPM_ADMIN_EMAIL secret]
   - **Password:** [Value from AIPM_ADMIN_PASSWORD secret]

## Troubleshooting

### Issue: "Invalid credentials" on published app

**Solution:** The production database hasn't been seeded yet.
- Run the seed script as described in Step 2

### Issue: Secrets not working

**Solution:** Verify all required deployment secrets are configured
1. Go to your deployment settings
2. Navigate to "Deployment secrets" section
3. Verify these critical secrets are present:
   - AIPM_ADMIN_EMAIL
   - AIPM_ADMIN_PASSWORD
   - DATABASE_URL
   - JWT_SECRET
   - JWT_REFRESH_SECRET
4. If missing, click "Add deployment secret" to add them manually
5. Redeploy after adding secrets

### Issue: Database connection errors

**Solution:** Check DATABASE_URL
1. Ensure DATABASE_URL points to your production database (Neon)
2. Verify the connection string format: `postgresql://user:pass@host/dbname`
3. Test connection from deployment shell: `echo $DATABASE_URL`

### Issue: Preview not working in workspace

**Solution:** This is normal after deployment configuration changes
- Click the reload/refresh button in the preview pane
- If still not working, close and reopen the preview
- Preview is for development only - use the published URL for production

## Environment Differences

### Development (Workspace)
- Uses workspace DATABASE_URL
- Files in `attached_assets/` are accessible
- Secrets from workspace Secrets tool

### Production (Published)
- Uses deployment DATABASE_URL
- Files must be stored in Object Storage (Google Cloud Storage)
- Secrets from Deployment secrets configuration

## File Storage

**Important:** Files uploaded to `attached_assets/` in your workspace will NOT be available in production.

For production file storage:
- Quote documents: Already configured with Google Cloud Storage ✅
- Other uploads: Use Object Storage (already integrated)

## Health Check

Your app includes a health check endpoint at `/healthz` that returns:
```json
{"status":"ok"}
```

This is used by Replit Autoscale to monitor your app's health.

## Next Steps After Deployment

1. **Create your first project** - Set up a project with materials
2. **Add vendors** - Configure your vendor contacts
3. **Test the procurement workflow** - Create a requisition and convert it to a PO
4. **Invite team members** - Add PM, Purchaser, Field, and AP users

## Support

If you encounter issues not covered in this guide:
- Check the Replit deployment logs in your dashboard
- Review the health check endpoint: `https://your-app.replit.app/healthz`
- Verify all secrets are correctly set in deployment configuration
