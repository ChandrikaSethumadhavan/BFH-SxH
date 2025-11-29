# Backend Integration Guide

This guide explains how to connect the frontend to your backend API during the hackathon.

## Current State: Using Mock Data

Right now, the app uses mock data defined in `src/services/mockData.ts`. This allows you to develop and test the UI without a backend.

## Switching to Real Backend

### Step 1: Configure API URL

Create `.env` file in project root:

```bash
VITE_API_URL=http://localhost:8000
# Or your deployed backend URL:
# VITE_API_URL=https://your-backend.railway.app
```

### Step 2: Toggle Mock Mode

Edit `src/services/api.ts`:

```typescript
// Change this line:
const USE_MOCK_DATA = false; // Was true
```

That's it! The app will now call your real backend.

---

## Required Backend Endpoints

Your backend must implement these endpoints:

### 1. Upload Media

```
POST /api/upload
Content-Type: multipart/form-data

Request Body:
- file: File (video or image)

Response: (201 Created)
{
  "id": "surgery-2024-1121-a",
  "patientId": "P-12345",
  "procedureType": "Laparoscopic Cholecystectomy",
  "date": "2024-11-21T10:30:00Z",
  "duration": 9258,
  "status": "processing",
  "totalFrames": 0,
  "filteredFrames": 0,
  "selectedFrames": 0
}
```

### 2. Get Surgery Details

```
GET /api/surgeries/{surgeryId}

Response: (200 OK)
{
  "id": "surgery-2024-1121-a",
  "patientId": "P-12345",
  "procedureType": "Laparoscopic Cholecystectomy",
  "date": "2024-11-21T10:30:00Z",
  "duration": 9258,
  "status": "ready", // or "processing" or "completed"
  "totalFrames": 145,
  "filteredFrames": 89,
  "selectedFrames": 12
}
```

### 3. Get Media Files

```
GET /api/surgeries/{surgeryId}/media

Response: (200 OK)
[
  {
    "id": "media-1",
    "surgeryId": "surgery-2024-1121-a",
    "fileType": "image",
    "fileUrl": "https://cdn.example.com/image1.jpg",
    "thumbnailUrl": "https://cdn.example.com/thumb1.jpg",
    "timestamp": "2024-11-21T10:35:42Z",
    "qualityScore": 87,
    "blurScore": 92,
    "brightnessScore": 85,
    "noiseScore": 88,
    "isSelected": false,
    "isFiltered": false,
    "aiSuggested": true
  },
  // ... more media files
]
```

### 4. Update Media Selection

```
PATCH /api/media/{mediaId}
Content-Type: application/json

Request Body:
{
  "isSelected": true
}

Response: (200 OK)
{
  "id": "media-1",
  "isSelected": true,
  // ... rest of media object
}
```

### 5. Generate Report

```
POST /api/surgeries/{surgeryId}/report
Content-Type: application/json

Request Body:
{
  "selectedMediaIds": ["media-1", "media-5", "media-12"]
}

Response: (201 Created)
{
  "id": "report-001",
  "surgeryId": "surgery-2024-1121-a",
  "content": "# Surgical Report\n\n...",
  "generatedAt": "2024-11-21T11:45:00Z",
  "approved": false,
  "exportFormat": "pdf",
  "selectedMedia": [...]
}
```

### 6. Export Report

```
GET /api/reports/{reportId}/export?format=pdf

Response: (200 OK)
Content-Type: application/pdf
Content-Disposition: attachment; filename="report.pdf"

[Binary PDF data]
```

---

## TypeScript Interfaces

These types are already defined in `src/types/index.ts`:

```typescript
interface Surgery {
  id: string;
  patientId: string;
  procedureType: string;
  date: string;
  duration: number;
  status: 'processing' | 'ready' | 'completed';
  totalFrames: number;
  filteredFrames: number;
  selectedFrames: number;
}

interface MediaFile {
  id: string;
  surgeryId: string;
  fileType: 'image' | 'video';
  fileUrl: string;
  thumbnailUrl: string;
  timestamp: string;
  qualityScore: number;
  blurScore: number;
  brightnessScore: number;
  noiseScore: number;
  isSelected: boolean;
  isFiltered: boolean;
  aiSuggested: boolean;
}

interface Report {
  id: string;
  surgeryId: string;
  content: string;
  generatedAt: string;
  approved: boolean;
  exportFormat: 'pdf' | 'html' | 'markdown';
  selectedMedia: MediaFile[];
}
```

---

## Testing Backend Integration

### Step 1: Verify Backend is Running

```bash
curl http://localhost:8000/health
# Should return: {"status": "ok"}
```

### Step 2: Test Upload Endpoint

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@test-video.mp4"
```

### Step 3: Test in Frontend

1. Start frontend: `npm run dev`
2. Upload a file
3. Check browser DevTools → Network tab
4. Verify requests are being sent to backend
5. Check Console tab for errors

---

## CORS Configuration

Your backend must allow requests from the frontend.

### FastAPI Example:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Dev
        "https://your-app.vercel.app",  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Express.js Example:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app'
  ],
  credentials: true
}));
```

---

## Error Handling

The frontend expects these error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Status codes:
- `400`: Bad request (invalid data)
- `404`: Resource not found
- `500`: Server error

The frontend will show these errors to the user automatically.

---

## File Upload Best Practices

### Backend Recommendations:

1. **Validate file types**:
   - Accept: `video/mp4`, `video/quicktime`, `image/jpeg`, `image/png`
   - Max size: 500MB

2. **Process asynchronously**:
   - Return immediately with `status: "processing"`
   - Process in background job
   - Update status when done

3. **Store files securely**:
   - Use S3/Cloud Storage
   - Generate signed URLs
   - Set expiration times

4. **Progress updates** (optional):
   - Use WebSockets or polling
   - Update processing percentage

---

## AI Integration Points

The frontend expects these AI-powered features from backend:

### 1. Quality Analysis

Each image should have:
- `qualityScore`: Overall quality (0-100)
- `blurScore`: Sharpness metric (0-100)
- `brightnessScore`: Lighting quality (0-100)
- `noiseScore`: Noise level (0-100, higher = less noise)

**Implementation suggestions**:
- OpenCV for blur/brightness
- ML model for composition
- Combine scores with weights

### 2. AI Suggestions

Set `aiSuggested: true` for clinically relevant images.

**Implementation suggestions**:
- GPT-4 Vision API
- Claude Vision API
- Custom trained model
- Rule-based (key moments, unique angles)

### 3. Report Generation

Generate markdown/HTML report from selected images.

**Implementation suggestions**:
- OpenAI GPT-4 with prompts
- Template-based with AI enhancements
- LangChain agent pipeline

---

## Development Workflow

### Week 1: UI Development (Current)
- ✅ Frontend works with mock data
- ✅ All features tested
- ✅ Design polished

### Week 1-2: Backend Development
- [ ] Implement upload endpoint
- [ ] Video processing (FFmpeg)
- [ ] Quality analysis
- [ ] Database setup
- [ ] Report generation

### Integration Day:
1. Backend team deploys API
2. Frontend team updates `.env`
3. Change `USE_MOCK_DATA` to `false`
4. Test end-to-end
5. Fix any issues
6. Deploy both services

---

## Deployment Architecture

```
┌─────────────────┐
│   Vercel        │  Frontend (React)
│   (Frontend)    │  https://app.vercel.app
└────────┬────────┘
         │ API Calls
         ▼
┌─────────────────┐
│   Railway       │  Backend (FastAPI/Node)
│   (Backend)     │  https://api.railway.app
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   S3/Cloudinary │  Media Storage
│   (Storage)     │
└─────────────────┘
```

---

## Testing Checklist

Before hackathon demo:

### Backend Tests:
- [ ] All endpoints return correct format
- [ ] CORS configured properly
- [ ] File uploads work
- [ ] Video processing completes
- [ ] Quality scores calculated
- [ ] Reports generate correctly
- [ ] PDF export works

### Integration Tests:
- [ ] Frontend can upload files
- [ ] Images display in gallery
- [ ] Selection updates backend
- [ ] Report generation works
- [ ] PDF download works
- [ ] Error messages show properly

### Load Tests:
- [ ] Can handle multiple uploads
- [ ] Large files (100MB+) work
- [ ] Concurrent users supported

---

## Quick Debug Commands

```bash
# Check if backend is reachable
curl http://localhost:8000/health

# Test upload
curl -X POST http://localhost:8000/api/upload \
  -F "file=@video.mp4" \
  -v

# Check CORS headers
curl -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  http://localhost:8000/api/upload \
  -v

# Frontend: Check what requests are being made
# Open DevTools → Network → Filter: XHR
```

---

## Environment Variables Reference

### Frontend (.env):
```bash
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK_DATA=false
```

### Backend (.env):
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AWS_S3_BUCKET=surgical-media
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:5173,https://app.vercel.app
```

---

## Common Integration Issues

### Issue: CORS errors

**Symptom**: Console shows "blocked by CORS policy"

**Fix**: Add frontend URL to backend CORS config

---

### Issue: 404 on all requests

**Symptom**: All API calls return 404

**Fix**: Check `VITE_API_URL` in `.env` is correct

---

### Issue: Images don't display

**Symptom**: Image URLs return 403/404

**Fix**:
- Check S3 bucket permissions
- Use signed URLs
- Verify CORS on storage

---

### Issue: Uploads timeout

**Symptom**: Upload never completes

**Fix**:
- Increase timeout limits
- Use streaming uploads
- Add progress feedback

---

## Support During Integration

If you're integrating during the hackathon and hit issues:

1. Check browser console for errors
2. Check Network tab for failed requests
3. Check backend logs
4. Verify environment variables
5. Test endpoints with curl
6. Check CORS configuration

---

## Success Criteria

Integration is complete when:

✅ Can upload real surgical video
✅ Frames extracted and displayed
✅ Quality scores shown accurately
✅ Swipe selections update backend
✅ Report generates with real data
✅ PDF exports successfully
✅ No console errors
✅ Smooth performance

---

Good luck with the integration! 🚀

The frontend is ready - just connect your backend!
