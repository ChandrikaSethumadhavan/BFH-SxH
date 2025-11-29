import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  Loader2,
  FileText,
  RefreshCw,
  Edit2,
  Save,
  X,
  Play,
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';
import { useSurgeryStore } from '@/stores/useSurgeryStore';
import { api } from '@/services/api';
import { formatDate, formatDuration } from '@/utils/helpers';
import { SURGERY_PHASES, Surgery, MediaFile, Report, SurgeryPhase } from '@/types';

export default function ReportView() {
  const navigate = useNavigate();
  const {
    currentSurgery,
    selectedMediaIds,
    mediaFiles,
    currentReport,
    setCurrentReport,
  } = useSurgeryStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoTimeRange, setVideoTimeRange] = useState<{ start: number; end: number } | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [openMediaId, setOpenMediaId] = useState<string | null>(null);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [mediaDescriptions, setMediaDescriptions] = useState<Record<string, string>>({});
  const [swipingMediaId, setSwipingMediaId] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<'below' | 'above'>('below');
  const recognitionRef = useRef<any>(null);
  const timestampRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const selectedMedia = mediaFiles.filter(f => selectedMediaIds.includes(f.id));
  const sortedMedia = useMemo(
    () => [...selectedMedia].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [selectedMedia]
  );

  useEffect(() => {
    if (!currentReport && currentSurgery && selectedMediaIds.length > 0) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentReport) {
      setEditedContent(currentReport.content);
      if (currentReport.additionalNotes) {
        setAdditionalNotes(currentReport.additionalNotes);
      }
    }
  }, [currentReport]);

  useEffect(() => {
    // Initialize media descriptions with default text
    const descriptions: Record<string, string> = {};
    sortedMedia.forEach((media) => {
      descriptions[media.id] = `AI summary notes the surgical field during ${SURGERY_PHASES[media.phase].description.toLowerCase()}, captured with quality score ${media.qualityScore}%.`;
    });
    setMediaDescriptions(descriptions);
  }, [sortedMedia]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setDictationSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');
        setAdditionalNotes(prev => `${prev ? `${prev} ` : ''}${transcript}`);
      };

      recognitionRef.current.onerror = () => {
        setIsDictating(false);
      };

      recognitionRef.current.onend = () => {
        setIsDictating(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const generateReport = async () => {
    if (!currentSurgery) return;

    setIsGenerating(true);
    try {
      const report = await api.generateReport(currentSurgery.id, selectedMediaIds);
      setCurrentReport(report);
      setEditedContent(report.content);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdit = () => {
    if (currentReport) {
      setCurrentReport({
        ...currentReport,
        content: editedContent,
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(currentReport?.content || '');
    setIsEditing(false);
  };

  const handleExport = async () => {
    if (!currentReport) return;

    setIsExporting(true);
    try {
      const blob = await api.exportReport(currentReport.id, 'pdf');
      const filename = `surgical-report-${currentSurgery?.id}-${Date.now()}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePlayVideo = (timestamp: string) => {
    if (!currentSurgery?.videoUrl || !currentSurgery?.startTime) return;

    // Calculate seconds from surgery start
    const imageTime = new Date(timestamp).getTime();
    const surgeryStart = new Date(currentSurgery.startTime).getTime();
    const secondsFromStart = Math.floor((imageTime - surgeryStart) / 1000);

    // Set range to ±20 seconds
    const startTime = Math.max(0, secondsFromStart - 20);
    const endTime = secondsFromStart + 20;

    setVideoTimeRange({ start: startTime, end: endTime });
    setShowVideoPlayer(true);
  };

  const handleChooseDifferentImage = (mediaId: string) => {
    navigate('/gallery', { state: { focusMediaId: mediaId, from: '/report' } });
  };

  const handleToggleDictation = () => {
    if (!dictationSupported) return;

    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    recognitionRef.current?.start();
    setIsDictating(true);
  };

  const handleEditMediaDescription = (mediaId: string) => {
    setEditingMediaId(mediaId);
  };

  const handleSaveMediaDescription = (mediaId: string, newDescription: string) => {
    setMediaDescriptions(prev => ({
      ...prev,
      [mediaId]: newDescription
    }));
    setEditingMediaId(null);
  };

  const handleCancelMediaEdit = () => {
    setEditingMediaId(null);
  };

  const handleToggleMediaPopup = (mediaId: string) => {
    const isOpening = openMediaId !== mediaId;
    setOpenMediaId(prev => prev === mediaId ? null : mediaId);
    setEditingMediaId(null); // Close any editing when toggling

    // Calculate if popup should appear above or below based on viewport position
    if (isOpening) {
      const timestampElement = timestampRefs.current[mediaId];
      if (timestampElement) {
        const rect = timestampElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const popupHeight = 400; // Approximate height of popup

        // If not enough space below, show above
        setPopupPosition(spaceBelow < popupHeight ? 'above' : 'below');
      }
    }
  };

  const handleCloseMediaPopup = () => {
    setOpenMediaId(null);
    setEditingMediaId(null);
  };

  const handleOpenSwipe = (mediaId: string) => {
    setSwipingMediaId(mediaId);
  };

  const handleCloseSwipe = () => {
    setSwipingMediaId(null);
  };

  const handleReplaceMedia = (oldMediaId: string, newMediaId: string) => {
    // Add a delay for visual feedback before replacing
    setTimeout(() => {
      // Remove old media from selection
      const newSelectedIds = selectedMediaIds.filter(id => id !== oldMediaId);
      // Add new media to selection
      newSelectedIds.push(newMediaId);
      useSurgeryStore.getState().setSelections(newSelectedIds);

      // Close modals after a brief delay
      setTimeout(() => {
        setSwipingMediaId(null);
        setOpenMediaId(null);
      }, 300);
    }, 600);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 text-blue-600 animate-spin" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Generating Report...
          </h2>
          <p className="text-gray-600">
            AI is analyzing {selectedMediaIds.length} selected images and creating your report
          </p>
        </div>
      </div>
    );
  }

  if (!currentReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto mb-4 text-gray-400" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Report Generated
          </h2>
          <p className="text-gray-600 mb-6">
            Please select images and generate a report first
          </p>
          <button
            onClick={() => navigate('/gallery')}
            className="btn-primary"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-cyan-50 text-slate-900">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg sticky top-0 z-10 shadow-lg border-b border-cyan-100">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/gallery')}
                className="btn-secondary flex items-center gap-2 bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Surgical Report</h1>
                <p className="text-sm text-slate-600">
                  Generated: {formatDate(currentReport.generatedAt)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Edit2 size={20} />
                    Edit Report
                  </button>
                  <button
                    onClick={generateReport}
                    className="btn-secondary flex items-center gap-2"
                    disabled={isGenerating}
                  >
                    <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
                    Regenerate
                  </button>
                  <button
                    onClick={handleExport}
                    className="btn-primary flex items-center gap-2"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Download size={20} />
                    )}
                    Export PDF
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <X size={20} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="btn-success flex items-center gap-2"
                  >
                    <Save size={20} />
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Report Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white shadow-xl border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Op-Bericht</p>
                <h2 className="text-xl font-bold text-slate-900">{currentSurgery?.procedureType || 'Surgical Procedure Report'}</h2>
                <p className="text-sm text-slate-600">Patient {currentSurgery?.patientId || 'N/A'} • Fall-Nr: {currentSurgery?.id || 'N/A'}</p>
              </div>
              <div className="text-right text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Op-Datum: {currentSurgery ? formatDate(currentSurgery.date) : 'N/A'}</p>
                <p>Op-Dauer: {currentSurgery ? formatDuration(currentSurgery.duration) : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Patient Information Section */}
            <div className="pb-6 border-b border-slate-200">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                <InfoItem label="Pat.-Nr." value={currentSurgery?.patientId || '12345678'} />
                <InfoItem label="Fall-Nr." value={currentSurgery?.id || 'F-2024-0892'} />
                <InfoItem label="Aktuelle Klinik" value="Klinik für Allgemein-, Viszeral- und Gefäßchirurgie" />
                <InfoItem label="Station" value="Station 4B" />
                <InfoItem label="Pat.-Name" value="Müller, Anna" />
                <InfoItem label="Geb.-Dat." value="15.03.1975" />
                <InfoItem label="Geschlecht/Alter" value="w, 49 J." />
                <div className="md:col-start-1" />
              </div>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                <InfoItem label="Op-Datum" value={currentSurgery ? formatDate(currentSurgery.date) : '28.11.2024'} />
                <InfoItem label="Saal" value="OP 3" />
                <InfoItem label="Op-Dauer (Schnitt/Naht)" value={currentSurgery ? formatDuration(currentSurgery.duration) : '79 min'} />
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Personal</p>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <InfoItem label="Operateur" value="Dr. med. Schmidt, Thomas" />
                  <InfoItem label="Anästhesist" value="Dr. med. Weber, Sarah" />
                  <InfoItem label="1. Assistent" value="Dr. med. Bauer, Michael" />
                  <InfoItem label="Anästhesieschwester/pfl." value="Schneider, Julia" />
                  <InfoItem label="2. Assistent" value="Dr. med. Fischer, Lisa" />
                  <InfoItem label="Op-Schwester/-pfl." value="Meyer, Christina" />
                  <InfoItem label="Op-Springer" value="Wagner, Markus" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Vorgehen</h3>
                <span className="text-xs text-slate-500">AI chronicle with image timestamps</span>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                {sortedMedia.map((media, index) => (
                  <span key={media.id}>
                    {index > 0 && ' '}
                    {SURGERY_PHASES[media.phase].description}.{' '}
                    <span
                      className="relative inline-block"
                      ref={(el) => timestampRefs.current[media.id] = el}
                    >
                      <button
                        onClick={() => handleToggleMediaPopup(media.id)}
                        className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        {new Date(media.timestamp).toLocaleTimeString()}
                      </button>
                      {openMediaId === media.id && (
                        <TimestampHoverCard
                          media={media}
                          isEditing={editingMediaId === media.id}
                          description={mediaDescriptions[media.id] || ''}
                          position={popupPosition}
                          onEdit={() => handleEditMediaDescription(media.id)}
                          onSave={(newDesc) => handleSaveMediaDescription(media.id, newDesc)}
                          onCancel={handleCancelMediaEdit}
                          onClose={handleCloseMediaPopup}
                          onSwipe={() => handleOpenSwipe(media.id)}
                          onPlayVideo={() => handlePlayVideo(media.timestamp)}
                          hasVideo={!!currentSurgery?.videoUrl}
                        />
                      )}
                    </span>
                    {' '}{mediaDescriptions[media.id] || `AI summary notes the surgical field during ${SURGERY_PHASES[media.phase].description.toLowerCase()}, captured with quality score ${media.qualityScore}%.`}
                  </span>
                ))}
                {sortedMedia.length === 0 && (
                  <p className="text-sm text-slate-600">No images selected yet.</p>
                )}
              </div>
            </div>

            {additionalNotes && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">Surgeon Notes</h3>
                <div className="bg-sky-50 border border-cyan-100 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                  {additionalNotes}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => navigate('/gallery')}
            className="btn-secondary"
          >
            Edit Image Selection
          </button>
          <button
            onClick={generateReport}
            className="btn-primary flex items-center gap-2 bg-slate-900 hover:bg-slate-800"
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            Regenerate PDF with new images
          </button>
          <button
            onClick={() => navigate('/report-actions')}
            className="btn-secondary flex items-center gap-2 border border-cyan-200 text-cyan-800 hover:bg-cyan-50"
          >
            <ClipboardList size={20} />
            Billing & Audit
          </button>
          <button
            onClick={handleExport}
            className="btn-primary flex items-center gap-2"
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
            Download PDF
          </button>
        </div>
      </main>

      {/* Video Player Modal */}
      {showVideoPlayer && videoTimeRange && currentSurgery?.videoUrl && (
        <VideoPlayerModal
          videoUrl={currentSurgery.videoUrl}
          startTime={videoTimeRange.start}
          endTime={videoTimeRange.end}
          onClose={() => setShowVideoPlayer(false)}
        />
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <PdfPreviewModal
          currentSurgery={currentSurgery}
          currentReport={currentReport}
          editedContent={editedContent}
          selectedMedia={selectedMedia}
          additionalNotes={additionalNotes}
          onClose={() => setShowPdfPreview(false)}
          onExport={handleExport}
          isExporting={isExporting}
        />
      )}

      {/* Swipe Image Selector Modal */}
      {swipingMediaId && (
        <SwipeImageSelector
          currentMediaId={swipingMediaId}
          allMedia={mediaFiles}
          onReplace={(newMediaId) => handleReplaceMedia(swipingMediaId, newMediaId)}
          onClose={handleCloseSwipe}
        />
      )}
    </div>
  );
}

interface TimestampHoverCardProps {
  media: MediaFile;
  isEditing: boolean;
  description: string;
  position: 'below' | 'above';
  onEdit: () => void;
  onSave: (newDescription: string) => void;
  onCancel: () => void;
  onClose: () => void;
  onSwipe: () => void;
  onPlayVideo: () => void;
  hasVideo: boolean;
}

function TimestampHoverCard({
  media,
  isEditing,
  description,
  position,
  onEdit,
  onSave,
  onCancel,
  onClose,
  onSwipe,
  onPlayVideo,
  hasVideo,
}: TimestampHoverCardProps) {
  const [editText, setEditText] = useState(description);

  useEffect(() => {
    setEditText(description);
  }, [description, isEditing]);

  const handleSave = () => {
    onSave(editText);
  };

  // Position classes based on whether popup should appear above or below
  const positionClasses = position === 'above'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div className={`absolute z-20 ${positionClasses} w-80 rounded-xl border border-slate-200 bg-white shadow-2xl max-h-[400px] overflow-auto`}>
      <div className="relative">
        <img src={media.thumbnailUrl} alt={`Frame ${media.id}`} className="w-full h-32 object-cover rounded-t-xl" />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
          title="Close"
        >
          <X size={16} className="text-slate-700" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles size={14} />
            <span>{SURGERY_PHASES[media.phase].name}</span>
          </div>
          <div className="text-xs text-slate-600">
            Quality: {media.qualityScore}%
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              rows={4}
              placeholder="Edit description..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 flex items-center justify-center gap-1"
              >
                <Save size={12} />
                Save
              </button>
              <button
                onClick={onCancel}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-slate-700 bg-slate-50 rounded p-2 max-h-24 overflow-y-auto">
              {description}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onEdit}
                className="px-3 py-1 text-xs rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 flex items-center gap-1"
              >
                <Edit2 size={12} />
                Edit
              </button>
              <button
                onClick={onSwipe}
                className="px-3 py-1 text-xs rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 flex items-center gap-1 font-semibold"
              >
                <ArrowLeftRight size={12} />
                Swipe
              </button>
              {hasVideo && (
                <button
                  onClick={onPlayVideo}
                  className="px-3 py-1 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                  Video (±20s)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  );
}

interface VideoPlayerModalProps {
  videoUrl: string;
  startTime: number;
  endTime: number;
  onClose: () => void;
}

function VideoPlayerModal({ videoUrl, startTime, endTime, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();

      // Auto-pause at end time
      const interval = setInterval(() => {
        if (videoRef.current && videoRef.current.currentTime >= endTime) {
          videoRef.current.pause();
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [startTime, endTime]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Video Context ({startTime}s - {endTime}s)
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full rounded-lg"
        >
          Your browser does not support the video tag.
        </video>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Playing ±20 seconds around the image timestamp
          </p>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface PdfPreviewModalProps {
  currentSurgery: Surgery | null;
  currentReport: Report | null;
  editedContent: string;
  selectedMedia: MediaFile[];
  additionalNotes: string;
  onClose: () => void;
  onExport: () => void;
  isExporting: boolean;
}

function PdfPreviewModal({
  currentSurgery,
  currentReport,
  editedContent,
  selectedMedia,
  additionalNotes,
  onClose,
  onExport,
  isExporting,
}: PdfPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-5xl w-full mx-4 max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="text-cyan-600" size={28} />
            PDF Preview
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close preview"
          >
            <X size={24} />
          </button>
        </div>

        {/* PDF Preview Content */}
        <div className="flex-1 overflow-hidden mb-4">
          <div className="bg-slate-100 rounded-lg shadow-2xl h-full overflow-y-auto p-8" style={{ maxHeight: '70vh' }}>
            <div className="bg-white p-8 shadow-xl mx-auto" style={{ maxWidth: '8.5in', minHeight: '11in' }}>
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-4">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">Surgical Procedure Report</h1>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-semibold">Patient ID:</span> {currentSurgery?.patientId || 'N/A'}</div>
                  <div><span className="font-semibold">Surgery ID:</span> {currentSurgery?.id || 'N/A'}</div>
                  <div><span className="font-semibold">Procedure:</span> {currentSurgery?.procedureType || 'N/A'}</div>
                  <div><span className="font-semibold">Duration:</span> {formatDuration(currentSurgery?.duration || 0)}</div>
                  <div><span className="font-semibold">Generated:</span> {currentReport ? formatDate(currentReport.generatedAt) : 'N/A'}</div>
                </div>
              </div>

              {/* Report Content */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">Report Summary</h2>
                <div
                  className="text-sm space-y-2 text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: formatReportContent(editedContent || ''),
                  }}
                />
              </div>

              {/* Selected Images */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">Documented Images ({selectedMedia.length})</h2>
                <div className="grid grid-cols-3 gap-4">
                  {selectedMedia
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .slice(0, 9)
                    .map((media) => (
                      <div key={media.id} className="border border-slate-200 rounded-lg p-2">
                        <img
                          src={media.thumbnailUrl}
                          alt={`Frame ${media.id}`}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                        <p className="text-xs text-slate-600 font-medium">
                          {new Date(media.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {SURGERY_PHASES[media.phase].name}
                        </p>
                      </div>
                    ))}
                </div>
                {selectedMedia.length > 9 && (
                  <p className="text-sm text-slate-500 mt-3">+ {selectedMedia.length - 9} more images included in full report</p>
                )}
              </div>

              {/* Additional Notes */}
              {additionalNotes && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-3">Surgeon Notes</h2>
                  <div className="bg-sky-50 border-2 border-cyan-200 rounded-lg p-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{additionalNotes}</p>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t-2 border-slate-300 text-center">
                <p className="text-xs text-slate-500">Generated by SurgiDoc AI - Surgical Documentation Assistant</p>
                <p className="text-xs text-slate-500">AI-powered image selection and report generation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end border-t pt-4">
          <button onClick={onClose} className="btn-secondary">
            Close Preview
          </button>
          <button
            onClick={onExport}
            className="btn-primary flex items-center gap-2"
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatReportContent(content: string) {
  if (!content) return '';

  const strippedBold = content.replace(/\*\*(.*?)\*\*/g, '$1');
  const lines = strippedBold.split('\n').map(line => line.trimEnd());
  const parts: string[] = [];

  lines.forEach((line) => {
    if (!line.trim()) {
      parts.push('<div class="h-2"></div>');
      return;
    }

    if (line.startsWith('###')) {
      const text = line.replace(/^#+\s*/, '');
      parts.push(`<p class="text-lg font-semibold text-slate-900 mb-1">${escapeHtml(text)}</p>`);
    } else {
      parts.push(`<p class="text-base text-slate-700 leading-relaxed">${escapeHtml(line)}</p>`);
    }
  });

  return parts.join('\n');
}

interface SwipeImageSelectorProps {
  currentMediaId: string;
  allMedia: MediaFile[];
  onReplace: (newMediaId: string) => void;
  onClose: () => void;
}

function SwipeImageSelector({ currentMediaId, allMedia, onReplace, onClose }: SwipeImageSelectorProps) {
  const currentMedia = allMedia.find(m => m.id === currentMediaId);
  if (!currentMedia) return null;

  // Get all media from the same phase (excluding the current one)
  const samePhaseMedia = allMedia.filter(
    m => m.phase === currentMedia.phase && m.id !== currentMediaId
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSwipeMedia = samePhaseMedia[currentIndex];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right' && currentSwipeMedia) {
      // Include this image - replace the current one
      onReplace(currentSwipeMedia.id);
    } else if (direction === 'left') {
      // Reject - move to next
      if (currentIndex < samePhaseMedia.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // No more images to swipe
        onClose();
      }
    }
  };

  if (samePhaseMedia.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-lg text-slate-700 mb-4">No other images available in the {SURGERY_PHASES[currentMedia.phase].name} phase.</p>
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-t-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="text-purple-600" size={24} />
                Swipe to Replace Image
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Phase: {SURGERY_PHASES[currentMedia.phase].name} • {currentIndex + 1} / {samePhaseMedia.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} className="text-slate-700" />
            </button>
          </div>
        </div>

        {/* Swipe Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8">
          <div className="relative h-[500px] flex items-center justify-center">
            {currentSwipeMedia && (
              <SwipeImageCard
                media={currentSwipeMedia}
                onSwipe={handleSwipe}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/95 backdrop-blur rounded-b-2xl p-4 shadow-lg">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">←</div>
              <span className="text-slate-700 font-semibold">Swipe left to <span className="text-red-600">reject</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">→</div>
              <span className="text-slate-700 font-semibold">Swipe right to <span className="text-green-600">include</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SwipeImageCardProps {
  media: MediaFile;
  onSwipe: (direction: 'left' | 'right') => void;
}

function SwipeImageCard({ media, onSwipe }: SwipeImageCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;

    if (info.offset.x > swipeThreshold) {
      onSwipe('right');
    } else if (info.offset.x < -swipeThreshold) {
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

  return (
    <motion.div
      className="absolute w-full max-w-md cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity, zIndex: 100 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
        {/* Image */}
        <div className="aspect-[3/4] bg-slate-200 relative">
          <img
            src={media.fileUrl}
            alt={`Frame ${media.id}`}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Quality Badge */}
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-bold shadow-lg">
            Quality: {media.qualityScore}%
          </div>

          {/* AI Suggested Badge */}
          {media.aiSuggested && (
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-yellow-400 text-slate-900 rounded-lg text-sm font-bold shadow-lg flex items-center gap-1">
              <Sparkles size={16} />
              AI Pick
            </div>
          )}

          {/* REJECT Indicator */}
          <motion.div
            className="absolute inset-0 flex items-center justify-start p-8 pointer-events-none"
            style={{ opacity: useTransform(x, [-200, -50, 0], [1, 0.5, 0]) }}
          >
            <div className="bg-red-500 text-white font-bold text-3xl px-8 py-4 rounded-2xl border-4 border-white shadow-2xl rotate-[-25deg]">
              REJECT
            </div>
          </motion.div>

          {/* INCLUDE Indicator */}
          <motion.div
            className="absolute inset-0 flex items-center justify-end p-8 pointer-events-none"
            style={{ opacity: useTransform(x, [0, 50, 200], [0, 0.5, 1]) }}
          >
            <div className="bg-green-500 text-white font-bold text-3xl px-8 py-4 rounded-2xl border-4 border-white shadow-2xl rotate-[25deg]">
              INCLUDE
            </div>
          </motion.div>
        </div>

        {/* Info Footer */}
        <div className="bg-white p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-slate-900 text-lg">
                {new Date(media.timestamp).toLocaleTimeString()}
              </h4>
              <p className="text-sm text-slate-600">
                {SURGERY_PHASES[media.phase].name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Quality Metrics</div>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">Blur: {media.blurScore}%</span>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">Brightness: {media.brightnessScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
