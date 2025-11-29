# Surgical Documentation Assistant

AI-powered surgical documentation tool with Tinder-style swipe interface for fast image selection and automatic report generation.

## Features

- 📤 **Upload & Process**: Upload surgical videos/images with drag-and-drop
- 🤖 **AI Quality Filtering**: Automatically removes blurry, dark, and low-quality images
- 🖼️ **Gallery View**: Browse and select images in a grid layout
- 👆 **Swipe Mode**: Tinder-style swipe interface for rapid image selection
- 📊 **Quality Metrics**: Real-time quality scores for each image
- ✨ **AI Suggestions**: Smart recommendations for important images
- 📝 **Auto Reports**: AI-generated surgical reports with selected images
- 📱 **Tablet Optimized**: Touch-friendly interface designed for 10-13" tablets

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Routing**: React Router v6
- **Icons**: Lucide React

## Quick Start

### Installation

```bash
# Navigate to project directory
cd surgical-doc-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
surgical-doc-app/
├── src/
│   ├── components/
│   │   ├── UploadScreen.tsx      # File upload with progress
│   │   ├── GalleryView.tsx       # Grid view of images
│   │   ├── SwipeMode.tsx         # Tinder-style swipe interface ⭐
│   │   └── ReportView.tsx        # Generated report display
│   ├── services/
│   │   ├── api.ts                # API service layer
│   │   └── mockData.ts           # Mock data for development
│   ├── stores/
│   │   └── useSurgeryStore.ts    # Global state management
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── utils/
│   │   └── helpers.ts            # Utility functions
│   ├── App.tsx                   # Main app with routing
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── package.json
└── README.md
```

## Using Mock Data vs Real Backend

### Development Mode (Mock Data - Default)

The app comes with realistic mock data including:
- 100 sample surgical images
- Quality scores and metrics
- AI suggestions
- Pre-generated reports

**To use mock data** (current setup):
```typescript
// src/services/api.ts
const USE_MOCK_DATA = true; // ✅ Default
```

### Production Mode (Real Backend)

**To switch to real backend**:

1. Update the API configuration:
```typescript
// src/services/api.ts
const USE_MOCK_DATA = false;
```

2. Set your backend URL:
```bash
# Create .env file
echo "VITE_API_URL=http://your-backend-url:8000" > .env
```

3. Ensure your backend implements these endpoints:
   - `POST /api/upload` - Upload video/images
   - `GET /api/surgeries/:id` - Get surgery details
   - `GET /api/surgeries/:id/media` - Get media files
   - `PATCH /api/media/:id` - Update media selection
   - `POST /api/surgeries/:id/report` - Generate report
   - `GET /api/reports/:id/export` - Export report

## Key Components

### 1. Upload Screen
- Drag-and-drop file upload
- Progress tracking
- Processing stages visualization

### 2. Gallery View
- Grid layout of filtered images
- Quality badges
- AI suggestions highlighted
- Sort by quality/time/selection
- Filter by selected/suggested/all

### 3. Swipe Mode (⭐ Key Feature)
- Smooth swipe animations
- Keyboard support (arrow keys)
- Undo functionality
- Progress tracking
- Quality metrics display
- Visual feedback for accept/reject

### 4. Report View
- AI-generated surgical report
- Selected images timeline
- Export to PDF
- Regenerate option

## Tablet Optimization

The UI is optimized for tablets (10-13"):
- Touch targets minimum 44x44px
- Smooth swipe gestures
- Responsive grid layouts
- Large, accessible buttons
- Optimized font sizes

### Testing on Tablet

#### iPad Simulator (Mac):
```bash
open -a Simulator
# Then navigate to http://localhost:5173
```

#### Chrome DevTools:
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPad Pro" or similar
4. Test touch interactions

## Customization

### Changing Mock Images

Replace the placeholder images in `src/services/mockData.ts`:

```typescript
const generatePlaceholderImage = (id: number, seed: string) => {
  // Replace with your own image URLs
  return `https://your-image-cdn.com/surgical-${id}.jpg`;
};
```

### Adjusting Quality Thresholds

Modify filtering logic in `src/services/mockData.ts`:

```typescript
const isGoodQuality = qualityScore >= 75; // Adjust threshold
```

### Customizing Swipe Threshold

In `src/components/SwipeMode.tsx`:

```typescript
const swipeThreshold = 100; // Adjust swipe distance
```

## Demo Preparation Checklist

Before the hackathon demo:

- [ ] Prepare 3-5 sample surgical videos
- [ ] Test on actual iPad/tablet
- [ ] Practice the 3-minute demo pitch
- [ ] Ensure smooth animations
- [ ] Test offline with mock data
- [ ] Record backup demo video
- [ ] Prepare talking points
- [ ] Test export PDF functionality

## Demo Script (3 Minutes)

**Minute 1**: Problem explanation
- "Surgeons spend hours manually documenting procedures"
- Show unorganized surgical footage

**Minute 2**: Live demo
1. Upload video → shows AI processing
2. Navigate to gallery → show filtered results
3. Switch to swipe mode → demonstrate swipe interface on tablet
4. Generate report → show AI-generated output

**Minute 3**: Impact
- "Reduces 2 hours to 5 minutes"
- Show tablet vs desktop
- Mention AI validation and standards

## Troubleshooting

### Images not loading
- Check network connection
- Verify placeholder image URLs are accessible
- Check browser console for errors

### Swipe not working
- Ensure you're using a touch device or mouse
- Check if Framer Motion is installed
- Clear browser cache

### Build errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Future Enhancements

- [ ] Voice annotations
- [ ] Real-time collaboration
- [ ] Advanced image cropping
- [ ] DICOM format support
- [ ] FHIR integration
- [ ] Dark mode
- [ ] Offline mode with IndexedDB
- [ ] Multi-language support

## License

MIT License - Feel free to use for your hackathon!

## Support

For issues or questions:
- Check browser console for errors
- Verify all dependencies are installed
- Ensure Node.js version >= 18

---

**Built for Challenge 3: Surgical Documentation**

Good luck with your hackathon! 🚀
