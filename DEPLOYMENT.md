# Deployment Guide for Hackathon Demo

This guide helps you deploy the Surgical Documentation Assistant for your hackathon presentation.

## Option 1: Vercel (Recommended - Easiest)

Vercel offers free hosting with instant deploys, perfect for hackathons.

### Setup Steps:

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub/GitLab/Bitbucket

2. **Push Code to Git Repository**
   ```bash
   cd surgical-doc-app
   git init
   git add .
   git commit -m "Initial commit - Surgical Documentation App"

   # Create new repo on GitHub, then:
   git remote add origin https://github.com/YOUR-USERNAME/surgical-doc-app.git
   git push -u origin main
   ```

3. **Deploy to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Vite
   - Click "Deploy"
   - Wait ~2 minutes

4. **Your App is Live!**
   - You'll get a URL like: `https://surgical-doc-app.vercel.app`
   - Share this URL with judges
   - Every git push auto-deploys updates

### Environment Variables (If using real backend):

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://your-backend.com`
3. Redeploy

---

## Option 2: Netlify (Alternative)

Similar to Vercel, great for static sites.

### Setup Steps:

1. **Create Netlify Account**
   - Go to https://netlify.com
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "Add new site" → "Import existing project"
   - Connect GitHub
   - Select your repository
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy"

3. **Custom Domain (Optional)**
   - In Netlify dashboard: Domain settings
   - Add custom domain or use provided `.netlify.app` URL

---

## Option 3: GitHub Pages (Free)

Deploy directly from your GitHub repository.

### Setup Steps:

1. **Install gh-pages package**
   ```bash
   npm install -D gh-pages
   ```

2. **Update package.json**
   ```json
   {
     "homepage": "https://YOUR-USERNAME.github.io/surgical-doc-app",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Update vite.config.ts**
   ```typescript
   export default defineConfig({
     plugins: [react()],
     base: '/surgical-doc-app/', // Add this line
     // ... rest of config
   })
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**
   - Go to repository → Settings → Pages
   - Source: Deploy from branch `gh-pages`
   - Save

Your site will be at: `https://YOUR-USERNAME.github.io/surgical-doc-app`

---

## Option 4: Local Network Demo (No Internet Required)

Perfect if WiFi is unreliable during the hackathon.

### Setup for Local Demo:

1. **Build the production version**
   ```bash
   npm run build
   ```

2. **Serve locally on your network**
   ```bash
   npm run preview -- --host
   ```

   You'll see:
   ```
   ➜  Local:   http://localhost:4173/
   ➜  Network: http://192.168.1.100:4173/
   ```

3. **Connect Tablet to Same WiFi**
   - On your tablet, open browser
   - Go to the Network URL (e.g., `http://192.168.1.100:4173`)
   - Bookmark it for quick access

4. **Offline Fallback**
   - Keep laptop screen available as backup
   - Have screenshots ready
   - Record demo video beforehand

---

## Option 5: Docker (For Full Stack)

If you built a backend during hackathon.

### Dockerfile for Frontend:

Create `Dockerfile` in project root:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Build and Run:

```bash
# Build image
docker build -t surgical-doc-app .

# Run container
docker run -p 8080:80 surgical-doc-app
```

Access at: `http://localhost:8080`

---

## Pre-Hackathon Checklist

Before the hackathon starts:

### 1 Week Before:
- [ ] Choose deployment method (Vercel recommended)
- [ ] Create accounts (Vercel, GitHub, etc.)
- [ ] Test deployment process
- [ ] Verify mobile/tablet access

### 1 Day Before:
- [ ] Deploy latest version
- [ ] Test on actual tablet device
- [ ] Load real surgical images (replace placeholders)
- [ ] Test all features end-to-end
- [ ] Check loading speed
- [ ] Test offline fallback
- [ ] Record backup demo video

### Hackathon Day Morning:
- [ ] Verify deployment is live
- [ ] Test URL on tablet
- [ ] Charge all devices
- [ ] Download backup demo video
- [ ] Take screenshots of each screen
- [ ] Print QR code to deployed site

---

## Quick Deploy Commands Reference

```bash
# Vercel
npm install -g vercel
vercel --prod

# Netlify
npm install -g netlify-cli
netlify deploy --prod

# Local network
npm run build
npm run preview -- --host

# Check build works
npm run build
cd dist
npx serve
```

---

## Custom Domain (Optional)

If you want a custom URL like `surgical-ai.com` instead of `.vercel.app`:

### Buy Domain:
- Namecheap: ~$10/year
- Google Domains: ~$12/year

### Connect to Vercel:
1. Vercel Dashboard → Domains
2. Add your domain
3. Follow DNS instructions
4. Wait 5-10 minutes for propagation

### Result:
- `surgical-ai.com` → Your app
- Looks more professional for judges

---

## Performance Optimization

Before deployment:

### 1. Optimize Images

If using real surgical images:

```bash
# Install image optimizer
npm install -D vite-plugin-imagemin

# Add to vite.config.ts
import viteImagemin from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    react(),
    viteImagemin({
      // Image optimization config
    })
  ]
})
```

### 2. Enable Compression

Already handled by Vercel/Netlify automatically.

### 3. Lazy Loading

Already implemented with `loading="lazy"` on images.

---

## Troubleshooting Deployment

### Build fails on Vercel/Netlify

**Check**:
- Does `npm run build` work locally?
- Are all dependencies in `package.json`?
- Is Node version compatible?

**Fix in Vercel**:
- Settings → General → Node.js Version → 18.x

### Images don't load

**Check**:
- Are image URLs absolute?
- CORS enabled on image host?
- Images exist and accessible?

### App is slow

**Solutions**:
- Use CDN for images
- Enable caching
- Optimize bundle size
- Use lazy loading

### Can't access on tablet

**Check**:
- Same WiFi network?
- Firewall allowing connections?
- Using correct IP address?
- Port not blocked?

---

## Demo Day Best Practices

### Prepare Multiple Access Methods:

1. **Primary**: Deployed URL on Vercel
2. **Backup 1**: Local network URL
3. **Backup 2**: Localhost on laptop
4. **Backup 3**: Screen recording video

### Create QR Code:

Generate QR code of your deployed URL:
- Use https://qr.io or similar
- Print on poster/flyer
- Judges can scan to try immediately

### Test Checklist (1 hour before):

```bash
# On laptop
✓ Site loads on laptop browser
✓ All features work
✓ Images load fast
✓ Swipe is smooth
✓ Report generates

# On tablet
✓ Site loads on tablet
✓ Touch gestures work
✓ Swipe feels natural
✓ Buttons are tappable
✓ Text is readable

# Fallbacks ready
✓ Video downloaded
✓ Screenshots saved
✓ Laptop fully charged
✓ Tablet fully charged
✓ Backup hotspot available
```

---

## Monitoring & Analytics (Optional)

Track usage during judging:

### Add Vercel Analytics:

```bash
npm install @vercel/analytics
```

In `src/main.tsx`:
```typescript
import { inject } from '@vercel/analytics'
inject()
```

See real-time visitors in Vercel dashboard!

---

## Post-Hackathon

After winning 🏆:

1. Keep the deployment live
2. Add to your portfolio
3. Share on LinkedIn/Twitter
4. Add demo video to README
5. Clean up any test data
6. Add real backend integration docs

---

## Emergency Contacts

If deployment fails day-of:

- Vercel Status: https://vercel-status.com
- Netlify Status: https://netlifystatus.com
- GitHub Status: https://githubstatus.com

Have these bookmarked!

---

## Summary: Recommended Setup

**For Hackathon**:
1. Deploy to Vercel (takes 5 minutes)
2. Test on tablet
3. Also serve locally as backup
4. Record demo video

**Commands**:
```bash
# Deploy to Vercel
npm install -g vercel
vercel --prod

# Local backup
npm run build
npm run preview -- --host

# Record demo
# Use OBS Studio or QuickTime
```

You're ready to impress! 🚀
