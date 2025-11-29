import { create } from 'zustand';
import { MediaFile, Surgery, Report } from '@/types';
import { api } from '@/services/api';

interface SurgeryStore {
  // State
  currentSurgery: Surgery | null;
  mediaFiles: MediaFile[];
  selectedMediaIds: string[];
  currentReport: Report | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentSurgery: (surgery: Surgery) => void;
  setMediaFiles: (files: MediaFile[]) => void;
  setSelections: (mediaIds: string[]) => void;
  toggleMediaSelection: (mediaId: string) => void;
  selectMedia: (mediaId: string) => void;
  deselectMedia: (mediaId: string) => void;
  clearSelections: () => void;
  setCurrentReport: (report: Report) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  loadSurgery: (surgeryId: string) => Promise<void>;
  loadMediaFiles: (surgeryId: string) => Promise<void>;
  generateReport: (surgeryId: string) => Promise<void>;
}

export const useSurgeryStore = create<SurgeryStore>((set, get) => ({
  // Initial state
  currentSurgery: null,
  mediaFiles: [],
  selectedMediaIds: [],
  currentReport: null,
  isLoading: false,
  error: null,

  // Synchronous actions
  setCurrentSurgery: (surgery) => set({ currentSurgery: surgery }),

  setMediaFiles: (files) => set({ mediaFiles: files }),

  setSelections: (mediaIds) => {
    const { mediaFiles } = get();
    const updatedFiles = mediaFiles.map(file => ({
      ...file,
      isSelected: mediaIds.includes(file.id),
    }));

    set({
      selectedMediaIds: mediaIds,
      mediaFiles: updatedFiles,
    });
  },

  toggleMediaSelection: (mediaId) => {
    const { selectedMediaIds } = get();
    const isSelected = selectedMediaIds.includes(mediaId);

    if (isSelected) {
      set({ selectedMediaIds: selectedMediaIds.filter(id => id !== mediaId) });
    } else {
      set({ selectedMediaIds: [...selectedMediaIds, mediaId] });
    }

    // Update the media file's isSelected property
    const { mediaFiles } = get();
    const updatedFiles = mediaFiles.map(file =>
      file.id === mediaId ? { ...file, isSelected: !isSelected } : file
    );
    set({ mediaFiles: updatedFiles });
  },

  selectMedia: (mediaId) => {
    const { selectedMediaIds, mediaFiles } = get();
    if (!selectedMediaIds.includes(mediaId)) {
      set({ selectedMediaIds: [...selectedMediaIds, mediaId] });

      const updatedFiles = mediaFiles.map(file =>
        file.id === mediaId ? { ...file, isSelected: true } : file
      );
      set({ mediaFiles: updatedFiles });
    }
  },

  deselectMedia: (mediaId) => {
    const { selectedMediaIds, mediaFiles } = get();
    set({ selectedMediaIds: selectedMediaIds.filter(id => id !== mediaId) });

    const updatedFiles = mediaFiles.map(file =>
      file.id === mediaId ? { ...file, isSelected: false } : file
    );
    set({ mediaFiles: updatedFiles });
  },

  clearSelections: () => {
    const { mediaFiles } = get();
    const updatedFiles = mediaFiles.map(file => ({ ...file, isSelected: false }));
    set({ selectedMediaIds: [], mediaFiles: updatedFiles });
  },

  setCurrentReport: (report) => set({ currentReport: report }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Asynchronous actions
  loadSurgery: async (surgeryId) => {
    set({ isLoading: true, error: null });
    try {
      const surgery = await api.getSurgery(surgeryId);
      set({ currentSurgery: surgery, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadMediaFiles: async (surgeryId) => {
    set({ isLoading: true, error: null });
    try {
      const files = await api.getMediaFiles(surgeryId);
      set({ mediaFiles: files, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  generateReport: async (surgeryId) => {
    set({ isLoading: true, error: null });
    try {
      const { selectedMediaIds } = get();
      const report = await api.generateReport(surgeryId, selectedMediaIds);
      set({ currentReport: report, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
