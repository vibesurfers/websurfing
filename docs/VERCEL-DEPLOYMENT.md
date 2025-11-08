# Deploying to Vercel with Vertex AI

Guide for deploying the websurfing app with Gemini integration to Vercel.

## Challenge

Vercel's serverless environment can't access local files like `.secrets/gcloud-adc.json`.

**Local Development (works):**
```bash
GOOGLE_APPLICATION_CREDENTIALS=".secrets/gcloud-adc.json"  # ✅ File path
```

**Vercel Deployment (doesn't work):**
```bash
GOOGLE_APPLICATION_CREDENTIALS=".secrets/gcloud-adc.json"  # ❌ File doesn't exist
```

## Simplified Approach: Same Config Everywhere

**Use `GOOGLE_CREDENTIALS_JSON` for both local and Vercel:**

| Environment | Variable | Value |
|-------------|----------|-------|
| **Local Dev** | `GOOGLE_CREDENTIALS_JSON` | JSON string |
| **Vercel** | `GOOGLE_CREDENTIALS_JSON` | JSON string (same!) |

**Benefits:**
- ✅ Same `.env` config works everywhere
- ✅ No file path issues
- ✅ Easy to copy to Vercel
- ✅ Easy to share with team via password manager

## Unified Solution: JSON String Everywhere

**One environment variable works for both local and Vercel:**

```bash
GOOGLE_CREDENTIALS_JSON={"account":"","client_id":"...","refresh_token":"...","type":"authorized_user"}
```

**Benefits:**
- ✅ Same `.env` for local and Vercel
- ✅ No file path issues
- ✅ Easy to share with team
- ✅ Works in all environments
- ✅ Already implemented in `src/server/gemini/client.ts`

## Step-by-Step Deployment

### 1. Get Credentials as JSON String

```bash
cat .secrets/gcloud-adc.json | jq -c '.'
```

Copy the entire output (should be on one line).

### 2. Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

**Add these variables** (copy directly from your `.env`):

```bash
# Gemini/Vertex AI (copy from your .env)
GOOGLE_CREDENTIALS_JSON={"account":"","client_id":"...","client_secret":"...","refresh_token":"...","type":"authorized_user","universe_domain":"googleapis.com"}
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_CLOUD_LOCATION=us-central1

# Database & Auth (copy from your .env)
DATABASE_URL=postgresql://user:password@host/database
AUTH_SECRET=your-secret-here
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret
```

**Set for all environments:**
- ✅ Production
- ✅ Preview
- ✅ Development

**Tip**: Your `.env` already has the exact values you need - just copy-paste!

### 3. Database Configuration

Make sure these are set in Vercel:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

### 4. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or via git push (if connected to GitHub)
git push origin main
```

### 5. Verify

Check Vercel logs to see:
```
[Gemini Client] Initialized with Vertex AI using env credentials
```

## Alternative: Use Vercel AI SDK

If you prefer Vercel's approach:

```bash
# Install
pnpm add ai @ai-sdk/google-vertex

# Use in your code
import { vertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';

const result = await generateText({
  model: vertex('gemini-2.5-flash'),
  prompt: 'Hello',
});
```

**Vercel AI SDK env vars:**
```
GOOGLE_VERTEX_PROJECT=YOUR_PROJECT_ID
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_CLIENT_EMAIL=service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

But this would require refactoring all your operators.

## Troubleshooting Vercel Deployment

### Error: "GOOGLE_APPLICATION_CREDENTIALS file not found"

**Solution**: Use `GOOGLE_CREDENTIALS_JSON` env var instead of file path.

### Error: "Invalid credentials"

**Solution**: Ensure JSON is properly formatted in Vercel env var (no extra spaces, valid JSON).

### Error: "Permission denied"

**Solution**: Verify service account has `roles/aiplatform.user` role.

### Error: "Module not found"

**Solution**: Ensure `@google/genai` is in `dependencies`, not `devDependencies`.

## Production Checklist

- [ ] Update `src/server/gemini/client.ts` to support `GOOGLE_CREDENTIALS_JSON`
- [ ] Set all env vars in Vercel dashboard
- [ ] Test in Vercel preview deployment
- [ ] Monitor costs in GCP console
- [ ] Set up billing alerts
- [ ] Add error monitoring (Sentry, etc.)

## Next Steps

1. Decide: Keep current SDK or switch to Vercel AI SDK
2. Update client.ts to support both local and Vercel environments
3. Set environment variables in Vercel
4. Deploy and test

Would you like me to update the client to support Vercel deployment?
