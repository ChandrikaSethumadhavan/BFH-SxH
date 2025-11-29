# 🚀 Quick Start - Get Running in 2 Minutes

## Step 1: Install Dependencies

```bash
cd surgical-doc-app
npm install
```

If that fails, try:
```bash
npm install --legacy-peer-deps
```

## Step 2: Run the App

```bash
npm run dev
```

## Step 3: Open Browser

Go to: **http://localhost:5173**

## That's it! 🎉

You should see the upload screen. Try:
1. Drag/drop a file (any image/video)
2. Watch the processing animation
3. Explore gallery view
4. **Try swipe mode** (the killer feature!)
5. Generate a report

---

## Common Issues

### Port already in use?
```bash
npm run dev -- --port 3000
```

### npm install fails?
```bash
npm install --legacy-peer-deps
```

### Still stuck?
Check **SETUP.md** for detailed troubleshooting.

---

## For Hackathon Demo

### Test on Tablet:

1. Find your IP:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. Run with network access:
   ```bash
   npm run dev -- --host
   ```

3. On tablet browser: `http://YOUR-IP:5173`

### Deploy to Vercel:

```bash
npm install -g vercel
vercel --prod
```

Done! You get a live URL in ~2 minutes.

---

## Project Structure Overview

```
src/
├── components/         # All UI screens
│   ├── UploadScreen   # Upload files
│   ├── GalleryView    # Grid of images
│   ├── SwipeMode      # ⭐ Tinder-style swipe
│   └── ReportView     # Generated report
├── services/
│   ├── api.ts         # API calls (swap mock/real)
│   └── mockData.ts    # Mock surgical data
├── stores/            # Global state
└── types/             # TypeScript types
```

---

## Switching to Real Backend

When backend is ready:

**File**: `src/services/api.ts`
```typescript
const USE_MOCK_DATA = false; // Change this
```

**File**: `.env`
```
VITE_API_URL=http://your-backend:8000
```

That's it! The UI automatically connects to your real backend.

---

## Key Features Built

✅ Upload with drag-and-drop
✅ AI quality filtering (mock)
✅ Gallery grid view
✅ **Swipe interface** (smooth animations!)
✅ Quality scores and badges
✅ AI suggestions
✅ Report generation
✅ PDF export
✅ Tablet optimized

---

## Next Steps

1. ✅ Get the app running
2. ✅ Test all features
3. ✅ Try on tablet/phone
4. ✅ Read **DEPLOYMENT.md** for going live
5. ✅ Customize colors/branding if needed
6. ✅ Add real surgical images
7. ✅ Practice your demo!

---

## Demo Flow (3 minutes)

**Minute 1**: Show the problem
- "Documentation takes 2+ hours"

**Minute 2**: Live demo
1. Upload video → shows processing
2. Gallery → filtered results
3. **Swipe mode on tablet** ⭐ WOW MOMENT
4. Generate report

**Minute 3**: Show impact
- "2 hours → 5 minutes"
- AI-powered
- Tablet-friendly

---

## Need Help?

- **SETUP.md**: Detailed installation guide
- **DEPLOYMENT.md**: How to deploy online
- **README.md**: Full feature documentation
- Browser Console (F12): Check for errors

---

Good luck with your hackathon! 🏆

**Remember**: The swipe interface is your killer feature.
Make sure it's buttery smooth!
