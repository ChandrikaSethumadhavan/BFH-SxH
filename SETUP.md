# Setup Guide for Surgical Documentation Assistant

## Prerequisites

- Node.js >= 18.0.0 (Download from https://nodejs.org/)
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, or Safari)
- Git (optional)

## Installation Steps

### Step 1: Verify Node.js Installation

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 9.0.0 or higher
```

### Step 2: Install Dependencies

Open your terminal and navigate to the project directory:

```bash
cd surgical-doc-app
```

Then install dependencies:

```bash
npm install
```

**If you encounter errors**, try:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

**Alternative: Use Yarn**

```bash
# Install yarn globally (if not already installed)
npm install -g yarn

# Install dependencies with yarn
yarn install
```

### Step 3: Start Development Server

```bash
npm run dev
```

You should see output like:

```
  VITE v5.0.8  ready in 432 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 4: Open in Browser

Open your browser and go to: `http://localhost:5173`

You should see the Upload Screen.

## Testing the Application

### Test Flow:

1. **Upload Screen**:
   - Try dragging a file or clicking to select
   - You should see processing animation
   - Wait for automatic redirect to Gallery

2. **Gallery View**:
   - See grid of 89 filtered images
   - Click images to select/deselect
   - Try different sort and filter options
   - Click "Switch to Swipe Mode"

3. **Swipe Mode** (Key Feature):
   - Swipe right to accept image
   - Swipe left to reject image
   - Use arrow keys on keyboard
   - Try the Undo button
   - Watch progress bar

4. **Report Generation**:
   - Click "Generate Report" button
   - Wait for AI generation animation
   - See generated report with selected images
   - Try Export PDF

## Tablet Testing

### Using Chrome DevTools:

1. Open DevTools: `F12` or `Ctrl+Shift+I`
2. Toggle device toolbar: `Ctrl+Shift+M`
3. Select device: "iPad Pro" or "iPad Mini"
4. Reload page
5. Test touch interactions

### Using iPad Simulator (Mac only):

```bash
# Open Xcode Simulator
open -a Simulator

# In Simulator, open Safari
# Navigate to: http://YOUR-LOCAL-IP:5173
```

To find your local IP:
```bash
# Mac/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

Then use your local network IP (e.g., `http://192.168.1.100:5173`)

## Building for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

The production build will be in the `dist/` folder.

## Troubleshooting

### Problem: npm install fails

**Solution 1**: Use legacy peer deps
```bash
npm install --legacy-peer-deps
```

**Solution 2**: Use Yarn instead
```bash
npm install -g yarn
yarn install
```

**Solution 3**: Update Node.js
```bash
# Download latest LTS from https://nodejs.org/
```

### Problem: Port 5173 already in use

**Solution**: Kill the process or use different port
```bash
# Kill process on port 5173
# Mac/Linux:
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port:
npm run dev -- --port 3000
```

### Problem: Images not loading

**Solution**: Check browser console
- Press `F12` to open DevTools
- Check Console tab for errors
- Verify network connection
- Try different browser

### Problem: Swipe not working

**Solution**:
- Clear browser cache
- Try in incognito mode
- Verify Framer Motion is installed:
  ```bash
  npm list framer-motion
  ```
- Reinstall if missing:
  ```bash
  npm install framer-motion
  ```

### Problem: TypeScript errors

**Solution**:
```bash
# Check TypeScript version
npm list typescript

# Reinstall TypeScript
npm install -D typescript@latest
```

## Development Tips

### Hot Reload

Vite has hot module replacement (HMR). Save any file and see changes instantly without full page reload.

### Inspecting State

Install React DevTools browser extension to inspect component state and props.

### Network Requests

Since we're using mock data, no actual network requests are made. To see what would be sent:

1. Open DevTools → Network tab
2. Change `USE_MOCK_DATA` to `false` in `src/services/api.ts`
3. Reload page
4. See failed requests (expected, since backend doesn't exist yet)

### Changing Mock Data

Edit `src/services/mockData.ts`:

```typescript
// Change number of images
export const mockMediaFiles = generateMockMediaFiles(50); // Instead of 100

// Change surgery details
export const mockSurgery: Surgery = {
  ...mockSurgery,
  procedureType: 'Your Procedure Name',
};
```

## Next Steps

Once the app is running:

1. ✅ Familiarize yourself with all screens
2. ✅ Test swipe interface thoroughly
3. ✅ Practice the demo flow
4. ✅ Customize colors/branding if needed
5. ✅ Prepare sample surgical images for hackathon
6. ✅ Test on actual tablet device
7. ✅ Read DEPLOYMENT.md for hackathon day setup

## Getting Help

- Check README.md for feature documentation
- Check DEPLOYMENT.md for deployment instructions
- Look at component source code for implementation details
- Browser console will show most errors

---

If you're still stuck, make sure:
- Node.js is up to date
- You're in the correct directory
- No firewalls blocking localhost
- Browser is modern (Chrome/Firefox/Safari)

Good luck! 🚀
