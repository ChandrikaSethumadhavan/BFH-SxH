import { useState, useRef } from 'react';
import {
  Upload,
  File,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Cpu,
  Activity,
  ArrowUpRight,
  PlayCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSurgeryStore } from '@/stores/useSurgeryStore';
import { api } from '@/services/api';
import { mockSurgery, mockMediaFiles } from '@/services/mockData';
import { MediaFile } from '@/types';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=1400&q=80&sat=-15';

const pickAutoSelections = (files: MediaFile[]) => {
  const prioritized = files
    .filter(file => file.aiSuggested)
    .sort((a, b) => b.qualityScore - a.qualityScore);

  const remaining = files
    .filter(file => !file.aiSuggested)
    .sort((a, b) => b.qualityScore - a.qualityScore);

  const combined = [...prioritized, ...remaining];
  const defaultCount = Math.min(12, combined.length || 0);

  return combined.slice(0, defaultCount);
};

export default function UploadScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [uploadComplete, setUploadComplete] = useState(false);

  const { setCurrentSurgery, setMediaFiles, setSelections, setCurrentReport } = useSurgeryStore();

  const openFilePicker = () => fileInputRef.current?.click();
  const handleDemoRun = () => {
    const demoFile = new File(['demo'], 'demo.mp4', { type: 'video/mp4' });
    handleFileUpload(demoFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setUploadComplete(false);
    setUploadProgress(0);
    setProcessingStage('Uploading file...');
    setCurrentReport(null);
    setSelections([]);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(uploadInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingStage('Extracting frames...');

      // Process video and extract frames
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingStage('Analyzing quality...');

      // Analyze quality
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingStage('Filtering images...');

      // Filter images
      await new Promise(resolve => setTimeout(resolve, 1000));

      const availableMedia = mockMediaFiles.filter(m => !m.isFiltered);
      const autoSelectedMedia = pickAutoSelections(availableMedia);
      const autoSelectedIds = autoSelectedMedia.map(m => m.id);

      // Set mock data
      setCurrentSurgery(mockSurgery);
      setMediaFiles(availableMedia);
      setSelections(autoSelectedIds);

      setProcessingStage('Generating report from AI-selected images...');
      setUploadProgress(100);

      const report = await api.generateReport(mockSurgery.id, autoSelectedIds);
      setCurrentReport(report);

      setUploadComplete(true);
      setProcessingStage('Report ready! Opening...');

      // Navigate to report after a brief delay
      setTimeout(() => {
        navigate('/report');
      }, 800);
    } catch (error) {
      console.error('Upload failed:', error);
      setProcessingStage('Upload failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 hero-grid" />
      <div className="absolute inset-0 mesh-lines opacity-20 pointer-events-none" />
      <div className="absolute -left-20 top-24 w-72 h-72 bg-cyan-400/20 blur-3xl rounded-full" />
      <div className="absolute -right-10 bottom-10 w-64 h-64 bg-rose-400/20 blur-3xl rounded-full" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-6 lg:py-10 space-y-10">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white text-sky-600 font-semibold flex items-center justify-center shadow-lg glow-ring">
              SD
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200">SurgiDoc AI</p>
              <p className="text-lg font-semibold text-white">Live surgical workspace</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm text-slate-200">
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold hover:bg-cyan-50 transition-colors"
            >
              Reports
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-100 text-xs uppercase tracking-[0.22em]">
              <ShieldCheck size={14} />
              Built for OR teams
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-white">
              SurgiDoc AI, <span className="text-cyan-300">for surgical documentation.</span>
            </h1>
            <p className="text-lg text-slate-200/90 max-w-2xl">
              Upload surgical video or imagery, see curated frames appear instantly, and deliver AI-ready reports without ever leaving the workspace.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <StatPill label="Frames triaged" value="Autopicks" icon={<Sparkles size={16} />} />
              <StatPill label="Report draft" value="Ready in minutes" icon={<Activity size={16} />} />
              <StatPill label="Quality floor" value="95% pass rate" icon={<Cpu size={16} />} />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="relative h-56 w-full overflow-hidden">
                <img src={HERO_IMAGE} alt="Surgical operating room" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/20 to-transparent" />
                <div className="absolute inset-0 mesh-lines opacity-40" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-cyan-100 uppercase tracking-[0.18em]">Live feed</p>
                    <p className="text-lg font-semibold text-white">Laparoscopic cholecystectomy</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white">
                    <Activity size={18} />
                    <span className="text-xs font-medium">Quality tracking</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white text-slate-900">
                {!isProcessing && !uploadComplete && (
                  <>
                    <div
                      className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                        transition-all duration-200 bg-slate-50
                        ${
                          isDragging
                            ? 'border-cyan-400 bg-cyan-50'
                            : 'border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40'
                        }
                      `}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={openFilePicker}
                    >
                      <Upload
                        className={`mx-auto mb-4 ${
                          isDragging ? 'text-cyan-500' : 'text-slate-400'
                        }`}
                        size={52}
                      />
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        Drop your surgical file or browse
                      </h3>
                      <p className="text-slate-500 mb-4">
                        MP4, MOV, AVI, JPG, PNG
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFilePicker();
                          }}
                          className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold shadow-sm hover:bg-slate-800 transition"
                        >
                          <File className="inline mr-2" size={18} />
                          Choose a file
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDemoRun();
                          }}
                          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-cyan-300 hover:text-slate-900 transition"
                        >
                          <ArrowUpRight className="inline mr-1" size={18} />
                          Try demo data
                        </button>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </>
                )}

                {isProcessing && (
                  <div className="text-center py-6">
                    <Loader2 className="mx-auto mb-4 text-cyan-500 animate-spin" size={52} />
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">
                      {processingStage}
                    </h3>

                    <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>

                    <div className="space-y-3 text-left max-w-md mx-auto">
                      <ProcessingStep
                        label="Upload file"
                        completed={uploadProgress >= 100}
                        active={processingStage.includes('Uploading')}
                      />
                      <ProcessingStep
                        label="Extract frames from video"
                        completed={processingStage.includes('Analyzing') || processingStage.includes('Filtering') || uploadComplete}
                        active={processingStage.includes('Extracting')}
                      />
                      <ProcessingStep
                        label="Analyze quality with AI"
                        completed={processingStage.includes('Filtering') || uploadComplete}
                        active={processingStage.includes('Analyzing')}
                      />
                      <ProcessingStep
                        label="Filter low-quality images"
                        completed={uploadComplete}
                        active={processingStage.includes('Filtering')}
                      />
                    </div>
                  </div>
                )}

                {uploadComplete && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="mx-auto mb-4 text-emerald-500" size={56} />
                    <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                      Processing complete
                    </h3>
                    <p className="text-slate-600 mb-6">
                      Redirecting to report...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isProcessing && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-900">
            <InfoCard
              title="AI Filtering"
              description="Automatically removes blurry and low-quality images"
              icon={<Sparkles size={18} />}
            />
            <InfoCard
              title="Smart Selection"
              description="Swipe interface for quick image selection"
              icon={<Upload size={18} />}
            />
            <InfoCard
              title="Instant Reports"
              description="Generate professional surgical reports in seconds"
              icon={<Cpu size={18} />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ProcessingStepProps {
  label: string;
  completed: boolean;
  active: boolean;
}

function ProcessingStep({ label, completed, active }: ProcessingStepProps) {
  return (
    <div className="flex items-center gap-3">
      {completed ? (
        <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
      ) : active ? (
        <Loader2 className="text-cyan-400 flex-shrink-0 animate-spin" size={20} />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-cyan-100 flex-shrink-0" />
      )}
      <span className={`${completed ? 'text-emerald-600 font-medium' : active ? 'text-cyan-600 font-medium' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}

interface InfoCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function InfoCard({ title, description, icon }: InfoCardProps) {
  return (
    <div className="rounded-xl p-4 text-left bg-white/80 border border-slate-200 shadow-lg">
      <div className="flex items-center gap-3 mb-2 text-cyan-600">
        <div className="w-10 h-10 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
          {icon}
        </div>
        <h4 className="font-semibold text-slate-900">{title}</h4>
      </div>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function StatPill({ label, value, icon }: StatPillProps) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white flex items-center gap-3 shadow-lg shadow-cyan-500/10">
      <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-cyan-200">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-slate-200">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
