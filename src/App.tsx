import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import UploadScreen from './components/UploadScreen';
import GalleryView from './components/GalleryView';
import SwipeMode from './components/SwipeMode';
import ReportView from './components/ReportView';
import PostReportActions from './components/PostReportActions';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadScreen />} />
        <Route path="/gallery" element={<GalleryView />} />
        <Route path="/swipe" element={<SwipeMode />} />
        <Route path="/report" element={<ReportView />} />
        <Route path="/report-actions" element={<PostReportActions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
