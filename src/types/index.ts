export type SurgeryPhase =
  | 'preparation'
  | 'port-placement'
  | 'exploration'
  | 'operative'
  | 'closure';

export const SURGERY_PHASES: Record<SurgeryPhase, { name: string; description: string }> = {
  'preparation': {
    name: 'Patient Preparation',
    description: 'Anesthesia and positioning'
  },
  'port-placement': {
    name: 'Port Placement',
    description: 'Trocar insertion and insufflation'
  },
  'exploration': {
    name: 'Exploration & Exposure',
    description: 'Initial exploration and exposure'
  },
  'operative': {
    name: 'Operative Procedure',
    description: 'Main surgical intervention'
  },
  'closure': {
    name: 'Hemostasis & Closure',
    description: 'Final steps and closure'
  }
};

export interface MediaFile {
  id: string;
  surgeryId: string;
  fileType: 'image' | 'video';
  fileUrl: string;
  thumbnailUrl: string;
  timestamp: string;
  phase: SurgeryPhase;
  qualityScore: number;
  blurScore: number;
  brightnessScore: number;
  noiseScore: number;
  isSelected: boolean;
  isFiltered: boolean;
  aiSuggested: boolean;
}

export interface Surgery {
  id: string;
  patientId: string;
  procedureType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  status: 'processing' | 'ready' | 'completed';
  totalFrames: number;
  filteredFrames: number;
  selectedFrames: number;
  videoUrl?: string; // URL to full surgery video
}

export interface Annotation {
  id: string;
  mediaId: string;
  type: 'drawing' | 'pin' | 'text' | 'box';
  content: string;
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  createdAt: string;
}

export interface Report {
  id: string;
  surgeryId: string;
  content: string;
  generatedAt: string;
  approved: boolean;
  exportFormat: 'pdf' | 'html' | 'markdown';
  selectedMedia: MediaFile[];
  additionalNotes?: string;
}

export interface QualityMetrics {
  overall: number;
  blur: number;
  brightness: number;
  noise: number;
  composition: number;
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
}
