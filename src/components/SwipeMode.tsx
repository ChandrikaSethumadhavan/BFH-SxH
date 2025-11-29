import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Grid3x3,
  Sparkles,
  Check,
} from 'lucide-react';
import { useSurgeryStore } from '@/stores/useSurgeryStore';
import { MediaFile, SURGERY_PHASES } from '@/types';
import { getQualityColor } from '@/utils/helpers';

export default function SwipeMode() {
  const navigate = useNavigate();
  const { mediaFiles, selectMedia, deselectMedia, selectedMediaIds } = useSurgeryStore();

  // Filter out already selected files for swipe stack
  const [swipeStack, setSwipeStack] = useState<MediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Initialize swipe stack with unselected files
    const unselectedFiles = mediaFiles.filter(f => !f.isSelected);
    setSwipeStack(unselectedFiles);
  }, [mediaFiles]);

  const currentCard = swipeStack[currentIndex];
  const isLastCard = currentIndex === swipeStack.length - 1;
  const progress = swipeStack.length > 0 ? ((currentIndex + 1) / swipeStack.length) * 100 : 0;

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentCard) return;

    if (direction === 'right') {
      // Accept
      selectMedia(currentCard.id);
    } else {
      // Reject
      deselectMedia(currentCard.id);
    }

    // Move to next card
    if (currentIndex < swipeStack.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all cards
      setTimeout(() => {
        navigate('/gallery');
      }, 500);
    }
  };

  const handleGenerateReport = () => {
    if (selectedMediaIds.length === 0) {
      alert('Please select at least one image');
      return;
    }
    navigate('/report');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-cyan-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/gallery')}
              className="btn-secondary flex items-center gap-2 bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
            >
              <Grid3x3 size={20} />
              Gallery
            </button>

            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Swipe Mode</h2>
              <p className="text-sm text-slate-600">
                {currentIndex + 1} / {swipeStack.length || 1}
              </p>
            </div>

            <button
              onClick={handleGenerateReport}
              className="btn flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white"
              disabled={selectedMediaIds.length === 0}
            >
              <Sparkles size={20} />
              Report ({selectedMediaIds.length})
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Swipe Area */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {swipeStack.length === 0 ? (
          <div className="text-center py-16">
            <Check className="mx-auto mb-4 text-green-600" size={64} />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              All Done!
            </h3>
            <p className="text-gray-600 mb-6">
              You've reviewed all images. {selectedMediaIds.length} images selected.
            </p>
            <button
              onClick={() => navigate('/gallery')}
              className="btn-primary"
            >
              Back to Gallery
            </button>
          </div>
        ) : (
          <>
            {/* Card Stack */}
            <div className="relative h-[600px] mb-8 flex items-center justify-center">
              {/* Background cards (for depth effect) */}
              {swipeStack
                .slice(currentIndex + 1, currentIndex + 3)
                .reverse()
                .map((file, index) => (
                  <div
                    key={file.id}
                    className="absolute w-full max-w-md"
                    style={{
                      transform: `scale(${1 - (index + 1) * 0.05}) translateY(${(index + 1) * 10}px)`,
                      opacity: 1 - (index + 1) * 0.3,
                      zIndex: 10 - index,
                    }}
                  >
                    <div className="card overflow-hidden shadow-xl">
                      <div className="aspect-[3/4] bg-gray-200">
                        <img
                          src={file.thumbnailUrl}
                          alt={file.id}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ))}

              {/* Active Card */}
              {currentCard && (
                <SwipeCard
                  file={currentCard}
                  onSwipe={handleSwipe}
                />
              )}
            </div>

            {/* Instructions */}
            <div className="text-center space-y-2">
              <p className="text-gray-600">
                <span className="font-semibold">Swipe left</span> to reject or{' '}
                <span className="font-semibold">swipe right</span> to include.
              </p>
              <p className="text-sm text-gray-500">
                Keyboard arrows also work if you prefer.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

interface SwipeCardProps {
  file: MediaFile;
  onSwipe: (direction: 'left' | 'right') => void;
}

function SwipeCard({ file, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;

    if (info.offset.x > swipeThreshold) {
      // Swiped right - Accept
      onSwipe('right');
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left - Reject
      onSwipe('left');
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        onSwipe('left');
      } else if (e.key === 'ArrowRight') {
        onSwipe('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwipe]);

  const qualityColor = getQualityColor(file.qualityScore);

  return (
    <motion.div
      className="absolute w-full max-w-md cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity, zIndex: 100 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div className="card overflow-hidden shadow-2xl">
        {/* Image */}
        <div className="aspect-[3/4] bg-gray-200 relative">
          <img
            src={file.fileUrl}
            alt={file.id}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Phase Label Badge - Top Left */}
          <div className="absolute top-2 left-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-lg">
            {SURGERY_PHASES[file.phase].name}
          </div>

          {/* Quality Badge */}
          <div className={`quality-badge ${qualityColor}`}>
            {file.qualityScore}%
          </div>

          {/* AI Suggested Badge */}
          {file.aiSuggested && (
            <div className="absolute top-12 left-2 px-2 py-1 bg-yellow-400 text-gray-900 rounded-md text-xs font-bold shadow-lg flex items-center gap-1">
              <Sparkles size={14} />
              AI Recommended
            </div>
          )}

          {/* Swipe Indicators */}
          <motion.div
            className="absolute inset-0 flex items-center justify-start p-8"
            style={{ opacity: useTransform(x, [-200, -50, 0], [1, 0.5, 0]) }}
          >
            <div className="bg-red-500 text-white font-bold text-2xl px-6 py-3 rounded-lg border-4 border-white shadow-lg rotate-[-20deg]">
              REJECT
            </div>
          </motion.div>

          <motion.div
            className="absolute inset-0 flex items-center justify-end p-8"
            style={{ opacity: useTransform(x, [0, 50, 200], [0, 0.5, 1]) }}
          >
            <div className="bg-green-500 text-white font-bold text-2xl px-6 py-3 rounded-lg border-4 border-white shadow-lg rotate-[20deg]">
              INCLUDE
            </div>
          </motion.div>
        </div>

        {/* Info Footer */}
        <div className="bg-white p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">
                Frame #{file.id.split('-')[1]}
              </h3>
              <p className="text-sm text-gray-600">
                {new Date(file.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <MetricBadge label="Blur" value={file.blurScore} />
            <MetricBadge label="Brightness" value={file.brightnessScore} />
            <MetricBadge label="Noise" value={file.noiseScore} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface MetricBadgeProps {
  label: string;
  value: number;
}

function MetricBadge({ label, value }: MetricBadgeProps) {
  return (
    <div className="bg-gray-100 rounded px-2 py-1 text-center">
      <div className="font-semibold text-gray-700">{value}%</div>
      <div className="text-gray-500">{label}</div>
    </div>
  );
}
