import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, CheckCircle2, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { useSurgeryStore } from '@/stores/useSurgeryStore';
import { getQualityColor, calculateMediaStats } from '@/utils/helpers';
import { MediaFile, SurgeryPhase, SURGERY_PHASES } from '@/types';

export default function GalleryView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mediaFiles, selectedMediaIds, toggleMediaSelection, currentSurgery } = useSurgeryStore();
  const [filterView, setFilterView] = useState<'all' | 'suggested'>('all');
  const [expandedPhases, setExpandedPhases] = useState<Set<SurgeryPhase>>(
    new Set(['preparation', 'port-placement', 'exploration', 'operative', 'closure'])
  );

  const focusMediaId = (location.state as { focusMediaId?: string } | undefined)?.focusMediaId;
  const hasScrolledRef = useRef(false);

  const stats = calculateMediaStats(mediaFiles);

  // Group files by phase
  const filesByPhase: Record<SurgeryPhase, MediaFile[]> = {
    preparation: [],
    'port-placement': [],
    exploration: [],
    operative: [],
    closure: []
  };

  mediaFiles.forEach(file => {
    if (filterView === 'all' || (filterView === 'suggested' && file.aiSuggested)) {
      filesByPhase[file.phase].push(file);
    }
  });

  useEffect(() => {
    if (focusMediaId && !hasScrolledRef.current) {
      const target = mediaFiles.find(file => file.id === focusMediaId);
      if (target) {
        setExpandedPhases((prev) => new Set([...Array.from(prev), target.phase]));
        setTimeout(() => {
          document
            .getElementById(`media-card-${target.id}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          hasScrolledRef.current = true;
        }, 200);
      }
    }
  }, [focusMediaId, mediaFiles]);

  const togglePhase = (phase: SurgeryPhase) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phase)) {
      newExpanded.delete(phase);
    } else {
      newExpanded.add(phase);
    }
    setExpandedPhases(newExpanded);
  };

  const handleImageClick = (mediaId: string) => {
    toggleMediaSelection(mediaId);
  };

  const handleGenerateReport = () => {
    if (selectedMediaIds.length === 0) {
      alert('Please select at least one image');
      return;
    }
    navigate('/report');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-cyan-50 text-slate-900">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg sticky top-0 z-10 shadow-lg border-b border-cyan-100">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate((location.state as { from?: string })?.from || '/report')}
                className="btn-secondary flex items-center gap-2 bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {currentSurgery?.procedureType || 'Surgery Review'}
                </h1>
                <p className="text-sm text-slate-600">
                  Surgery ID: {currentSurgery?.id || 'N/A'}
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              className="btn flex items-center gap-2 touch-target bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-500/30"
              disabled={selectedMediaIds.length === 0}
            >
                <Sparkles size={20} />
                Generate Report ({selectedMediaIds.length})
              </button>
          </div>

          {/* Stats Bar */}
            <div className="flex flex-wrap gap-4 mb-4">
              <StatBadge label="Total" value={stats.total} />
              <StatBadge label="Selected" value={stats.selected} color="blue" />
              <StatBadge label="AI Suggested" value={stats.suggested} color="yellow" />
              <StatBadge label="Avg Quality" value={`${stats.averageQuality}%`} color="green" />
            </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilterView('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all border border-cyan-100 ${
                filterView === 'all'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-200/60'
                  : 'bg-white text-slate-700 hover:bg-sky-50'
              }`}
            >
              All Images ({stats.total})
            </button>
            <button
              onClick={() => setFilterView('suggested')}
              className={`px-4 py-2 rounded-lg font-medium transition-all border border-cyan-100 ${
                filterView === 'suggested'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-200/60'
                  : 'bg-white text-slate-700 hover:bg-sky-50'
              }`}
            >
              <Sparkles className="inline mr-1" size={16} />
              AI Suggested ({stats.suggested})
            </button>

            <button
              onClick={() => navigate('/swipe')}
              className="btn-primary flex items-center gap-2 ml-auto bg-slate-900 text-white hover:bg-slate-800"
            >
              <Layers size={20} />
              Switch to Swipe Mode
            </button>
          </div>
        </div>
      </header>

      {/* Gallery organized by phases */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {(['preparation', 'port-placement', 'exploration', 'operative', 'closure'] as SurgeryPhase[]).map(phase => {
          const phaseFiles = filesByPhase[phase];
          const phaseSelected = phaseFiles.filter(f => f.isSelected).length;
          const isExpanded = expandedPhases.has(phase);

          if (phaseFiles.length === 0) return null;

          return (
            <div key={phase} className="glass-panel rounded-2xl overflow-hidden border border-cyan-100 bg-white/90">
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-sky-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="text-sky-600" size={24} />
                  ) : (
                    <ChevronRight className="text-sky-600" size={24} />
                  )}
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-slate-900">
                      {SURGERY_PHASES[phase].name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {SURGERY_PHASES[phase].description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700">
                    {phaseFiles.length} images
                  </span>
                  {phaseSelected > 0 && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      {phaseSelected} selected
                    </span>
                  )}
                </div>
              </button>

              {/* Phase Images Grid */}
              {isExpanded && (
                <div className="p-6 pt-0 border-t border-cyan-100">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {phaseFiles.map((file) => (
                      <MediaCard
                        key={file.id}
                        file={file}
                        onClick={() => handleImageClick(file.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}

interface StatBadgeProps {
  label: string;
  value: number | string;
  color?: 'blue' | 'green' | 'yellow' | 'gray';
}

function StatBadge({ label, value, color = 'gray' }: StatBadgeProps) {
  const colors = {
    blue: 'bg-sky-100 text-sky-800 border border-sky-200',
    green: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    yellow: 'bg-amber-100 text-amber-800 border border-amber-200',
    gray: 'bg-white text-slate-800 border border-slate-100',
  };

  return (
    <div className={`px-4 py-2 rounded-lg ${colors[color]}`}>
      <span className="text-sm font-medium">{label}: </span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

interface MediaCardProps {
  file: MediaFile;
  onClick: () => void;
}

function MediaCard({ file, onClick }: MediaCardProps) {
  const qualityColor = getQualityColor(file.qualityScore);

  return (
    <div
      id={`media-card-${file.id}`}
      className="relative group cursor-pointer rounded-xl overflow-hidden shadow-card transition-transform hover:scale-105 active:scale-95 touch-target bg-white border border-cyan-100"
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-slate-100 relative">
        <img
          src={file.thumbnailUrl}
          alt={`Frame ${file.id}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Quality Badge */}
        <div className={`quality-badge ${qualityColor}`}>
          {file.qualityScore}%
        </div>

        {/* AI Suggested Badge */}
        {file.aiSuggested && (
          <div className="suggested-badge">
            <Sparkles size={12} />
            AI
          </div>
        )}

        {/* Selection Overlay */}
        {file.isSelected && (
          <div className="selection-overlay bg-sky-500/20 border-sky-400">
            <CheckCircle2 size={48} className="text-white" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {!file.isSelected ? (
              <span className="text-white font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                Select
              </span>
            ) : (
              <span className="text-white font-semibold bg-blue-600 px-4 py-2 rounded-lg">
                Selected ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="bg-white p-2 border-t border-cyan-100">
        <p className="text-xs text-slate-600 truncate">
          {new Date(file.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
