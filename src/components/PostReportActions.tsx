import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useSurgeryStore } from '@/stores/useSurgeryStore';
import { api } from '@/services/api';
import { downloadFile, formatDate, formatDuration } from '@/utils/helpers';
import { MediaFile } from '@/types';

export default function PostReportActions() {
  const navigate = useNavigate();
  const { currentReport, currentSurgery, mediaFiles, selectedMediaIds } = useSurgeryStore();
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMedia = useMemo(
    () => mediaFiles.filter(file => selectedMediaIds.includes(file.id)),
    [mediaFiles, selectedMediaIds]
  );
  const aiSuggested = useMemo(() => mediaFiles.filter(file => file.aiSuggested), [mediaFiles]);
  const keptAi = useMemo(() => selectedMedia.filter(file => file.aiSuggested), [selectedMedia]);
  const surgeonAdditions = useMemo(
    () => selectedMedia.filter(file => !file.aiSuggested),
    [selectedMedia]
  );
  const surgeonRemovals = useMemo(
    () => aiSuggested.filter(file => !selectedMediaIds.includes(file.id)),
    [aiSuggested, selectedMediaIds]
  );

  useEffect(() => {
    if (!currentReport) {
      navigate('/report');
    }
  }, [currentReport, navigate]);

  const ensureData = () => {
    if (!currentReport || !currentSurgery) {
      setError('Generate a surgical report first to access billing and audit exports.');
      return false;
    }
    return true;
  };

  const handleBillingDownload = async () => {
    if (!ensureData() || !currentReport || !currentSurgery) return;
    setIsBillingLoading(true);
    setError(null);

    try {
      const blob = await api.generateBillingProtocol({
        surgery: currentSurgery,
        report: currentReport,
        selectedMedia,
      });
      downloadFile(blob, `abrechnungsprotokoll-${currentSurgery.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate billing protocol', err);
      setError('Failed to generate the Abrechnungsprotokoll. Please try again.');
    } finally {
      setIsBillingLoading(false);
    }
  };

  const handleAuditDownload = async () => {
    if (!ensureData() || !currentReport || !currentSurgery) return;
    setIsAuditLoading(true);
    setError(null);

    try {
      const blob = await api.generateAuditReport({
        surgery: currentSurgery,
        report: currentReport,
        aiSuggested,
        finalSelection: selectedMedia,
        surgeonNotes: currentReport.additionalNotes,
      });
      downloadFile(blob, `audit-report-${currentSurgery.id}.pdf`);
    } catch (err) {
      console.error('Failed to generate audit report', err);
      setError('Failed to generate the audit report. Please try again.');
    } finally {
      setIsAuditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-cyan-50 text-slate-900">
      <header className="bg-white/90 backdrop-blur-lg sticky top-0 z-10 shadow-md border-b border-cyan-100">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/report')}
              className="btn-secondary flex items-center gap-2 bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
            >
              <ArrowLeft size={20} />
              Back to report
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Export options</h1>
              <p className="text-sm text-slate-600">
                Billing and audit deliverables for {currentSurgery?.procedureType || 'the surgery'}
              </p>
            </div>
          </div>

          {currentReport && (
            <div className="text-right text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Report ready</p>
              <p>Generated {formatDate(currentReport.generatedAt)}</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
            {error}
          </div>
        )}

        <section className="grid md:grid-cols-2 gap-5">
          <div className="glass-panel rounded-2xl p-8 border border-cyan-100 shadow-xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 text-white flex items-center justify-center shadow-xl">
                <Receipt size={32} />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-600 font-semibold">Insurance ready</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Abrechnungsprotokoll</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Generate a comprehensive billing protocol PDF for insurance submission with complete procedure documentation and compliance verification.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl p-4 mb-5 border border-cyan-100">
              <h3 className="text-xs uppercase tracking-[0.14em] text-cyan-700 font-semibold mb-3">Included Documentation</h3>
              <ul className="text-sm text-slate-700 space-y-2.5">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Complete patient demographics and procedure identification</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Detailed timeline with {selectedMedia.length} high-quality documentation frames</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Procedure duration, phase breakdown, and surgical team information</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>AI-generated narrative with surgeon annotations and clinical notes</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Compliance-ready format for immediate insurer review and processing</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Digital signatures and verification timestamps for authenticity</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-white rounded-lg p-3 border border-cyan-100 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">Total frames</p>
                <p className="text-2xl font-bold text-cyan-600">{selectedMedia.length}</p>
              </div>
              <div className="flex-1 bg-white rounded-lg p-3 border border-cyan-100 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">Surgery duration</p>
                <p className="text-2xl font-bold text-cyan-600">{currentSurgery ? formatDuration(currentSurgery.duration) : 'N/A'}</p>
              </div>
            </div>

            <button
              onClick={handleBillingDownload}
              className="btn-primary w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 py-4 text-base font-semibold shadow-lg"
              disabled={isBillingLoading}
            >
              {isBillingLoading ? <Loader2 size={20} className="animate-spin" /> : <Receipt size={20} />}
              Generate Abrechnungsprotokoll PDF
            </button>
          </div>

          <div className="glass-panel rounded-2xl p-8 border border-cyan-100 shadow-xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center shadow-xl">
                <ClipboardList size={32} />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-600 font-semibold">Complete audit trail</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Decision Log</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Export a comprehensive audit report documenting AI recommendations, surgeon modifications, and clinical decision-making process.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 mb-5 border border-slate-200">
              <h3 className="text-xs uppercase tracking-[0.14em] text-slate-700 font-semibold mb-3">Audit Trail Features</h3>
              <ul className="text-sm text-slate-700 space-y-2.5">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Complete AI suggestion history with quality metrics and reasoning</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Detailed surgeon override log with timestamps and modifications</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Manual image additions with clinical justification notes</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Comparative analysis: AI accuracy vs surgeon expertise</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Quality assurance metrics and compliance verification</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span>Regulatory-ready documentation for medical device audits</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <SummaryPill label="AI suggested" value={aiSuggested.length} tone="cyan" />
              <SummaryPill label="Kept by surgeon" value={keptAi.length} tone="emerald" />
              <SummaryPill label="Manual additions" value={surgeonAdditions.length} tone="amber" />
              <SummaryPill label="Removed suggestions" value={surgeonRemovals.length} tone="rose" />
            </div>

            <button
              onClick={handleAuditDownload}
              className="btn-primary w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black py-4 text-base font-semibold shadow-lg"
              disabled={isAuditLoading}
            >
              {isAuditLoading ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
              Generate Audit Trail PDF
            </button>
          </div>
        </section>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <span>Exports stay local to your browser during this demo.</span>
          </div>
          <button
            onClick={() => navigate('/gallery')}
            className="inline-flex items-center gap-2 text-cyan-700 font-semibold hover:text-cyan-800"
          >
            <Sparkles size={16} />
            Adjust AI selections
          </button>
        </div>
      </main>
    </div>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: 'cyan' | 'emerald' | 'amber' | 'rose' }) {
  const toneStyles: Record<'cyan' | 'emerald' | 'amber' | 'rose', string> = {
    cyan: 'bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-900 border-cyan-200',
    emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900 border-emerald-200',
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 border-amber-200',
    rose: 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-900 border-rose-200',
  };

  return (
    <div className={`rounded-xl border-2 px-4 py-3 shadow-sm ${toneStyles[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChangeList({ title, items }: { title: string; items: MediaFile[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">None recorded.</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-700">
          {items.slice(0, 5).map(media => (
            <li key={media.id} className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-cyan-600" />
              <span className="font-semibold">{media.id}</span>
              <span className="text-xs text-slate-500">{media.phase}</span>
              <span className="text-xs text-slate-500">{new Date(media.timestamp).toLocaleTimeString()}</span>
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-xs text-slate-500">+ {items.length - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
