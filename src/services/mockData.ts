import { MediaFile, Surgery, Report, SurgeryPhase } from '@/types';

// Generate mock surgical images using placeholder service
// In production, these will be real surgical images
const generatePlaceholderImage = (id: number, seed: string) => {
  // Using picsum.photos for realistic placeholder images
  // During hackathon, replace with actual surgical images
  return `https://picsum.photos/seed/${seed}${id}/800/600`;
};

// Mock surgery data
const surgeryDate = new Date();
const startTime = new Date(surgeryDate);
startTime.setHours(14, 23, 15); // 14:23:15
const endTime = new Date(startTime.getTime() + 9258 * 1000); // Add duration

export const mockSurgery: Surgery = {
  id: 'surgery-2024-1121-a',
  patientId: 'P-12345',
  procedureType: 'Laparoscopic Cholecystectomy',
  date: surgeryDate.toISOString(),
  startTime: startTime.toISOString(),
  endTime: endTime.toISOString(),
  duration: 9258, // 2 hours 34 minutes 18 seconds
  status: 'ready',
  totalFrames: 145,
  filteredFrames: 89,
  selectedFrames: 0,
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Mock video URL
};

// Assign phase based on index (distributing images across 5 phases)
const getPhaseForIndex = (index: number, total: number): SurgeryPhase => {
  const percentage = (index / total) * 100;

  if (percentage < 10) return 'preparation'; // First 10%
  if (percentage < 25) return 'port-placement'; // Next 15%
  if (percentage < 40) return 'exploration'; // Next 15%
  if (percentage < 85) return 'operative'; // Next 45% (main procedure)
  return 'closure'; // Last 15%
};

// Generate 100 mock media files with varying quality scores
export const generateMockMediaFiles = (count: number = 100): MediaFile[] => {
  const baseTime = new Date(startTime);

  return Array.from({ length: count }, (_, index) => {
    const qualityScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const isGoodQuality = qualityScore >= 75;
    const phase = getPhaseForIndex(index, count);

    // Calculate timestamp based on surgery progress
    const timeOffset = (mockSurgery.duration * 1000 * index) / count;
    const imageTime = new Date(baseTime.getTime() + timeOffset);

    return {
      id: `media-${index + 1}`,
      surgeryId: mockSurgery.id,
      fileType: 'image',
      fileUrl: generatePlaceholderImage(index + 1, 'surgical'),
      thumbnailUrl: generatePlaceholderImage(index + 1, 'surgical'),
      timestamp: imageTime.toISOString(),
      phase,
      qualityScore,
      blurScore: Math.floor(Math.random() * 40) + 60,
      brightnessScore: Math.floor(Math.random() * 30) + 70,
      noiseScore: Math.floor(Math.random() * 35) + 65,
      isSelected: false,
      isFiltered: !isGoodQuality, // Filter out low quality
      aiSuggested: isGoodQuality && Math.random() > 0.7, // AI suggests ~30% of good images
    };
  });
};

export const mockMediaFiles = generateMockMediaFiles(100);

// Mock report template
export const mockReport: Report = {
  id: 'report-001',
  surgeryId: mockSurgery.id,
  content: `# Surgical Report

**Patient ID:** ${mockSurgery.patientId}
**Procedure:** ${mockSurgery.procedureType}
**Date:** ${new Date(mockSurgery.date).toLocaleDateString()}
**Duration:** ${Math.floor(mockSurgery.duration / 3600)}h ${Math.floor((mockSurgery.duration % 3600) / 60)}m

## Procedure Timeline

### Initial Preparation (14:23:15)
Clear visualization of the surgical site was established. Proper instrument positioning was confirmed before proceeding.

### Port Placement (14:35:42)
Trocar placement completed successfully with optimal angles for instrument manipulation. All four ports placed without complications.

### Gallbladder Dissection (14:52:18)
Careful dissection of the gallbladder from the liver bed. Cystic duct and artery identified and isolated.

### Critical View of Safety (15:08:34)
Critical view of safety achieved. Clear visualization of the cystic duct and cystic artery. Calot's triangle dissected completely.

### Clip Application (15:22:47)
Surgical clips applied to cystic duct and artery. Double clipping proximally, single clip distally.

### Gallbladder Removal (15:45:12)
Gallbladder detached from liver bed successfully. Specimen placed in retrieval bag for extraction.

### Closure (15:57:28)
Final inspection of surgical site. No bleeding or bile leak observed. Ports removed and incisions closed.

## Conclusion
Procedure completed successfully without complications. Patient tolerated the procedure well.
`,
  generatedAt: new Date().toISOString(),
  approved: false,
  exportFormat: 'pdf',
  selectedMedia: [],
};

// Helper function to simulate processing time
export const simulateProcessing = (duration: number = 2000): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, duration));
};

// Mock API responses
export const mockAPI = {
  uploadVideo: async (file: File): Promise<Surgery> => {
    await simulateProcessing(2000);
    return mockSurgery;
  },

  processVideo: async (surgeryId: string): Promise<MediaFile[]> => {
    await simulateProcessing(3000);
    return mockMediaFiles;
  },

  generateReport: async (surgeryId: string, selectedMedia: MediaFile[]): Promise<Report> => {
    await simulateProcessing(2000);
    return {
      ...mockReport,
      selectedMedia,
      generatedAt: new Date().toISOString(),
    };
  },

  updateMediaSelection: async (mediaId: string, isSelected: boolean): Promise<MediaFile> => {
    await simulateProcessing(100);
    const media = mockMediaFiles.find(m => m.id === mediaId);
    if (media) {
      media.isSelected = isSelected;
      return media;
    }
    throw new Error('Media not found');
  },

  generateBillingProtocol: async ({
    surgery,
    report,
    selectedMedia,
  }: {
    surgery: Surgery;
    report: Report;
    selectedMedia: MediaFile[];
  }): Promise<Blob> => {
    await simulateProcessing(1200);

    const content = `Abrechnungsprotokoll / Billing Protocol\n\n` +
      `Patient: ${surgery.patientId}\n` +
      `Procedure: ${surgery.procedureType}\n` +
      `Surgery ID: ${surgery.id}\n` +
      `Duration: ${Math.floor(surgery.duration / 60)} minutes\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `Selected documentation frames: ${selectedMedia.length}\n` +
      `Report reference: ${report.id}`;

    return new Blob([content], { type: 'application/pdf' });
  },

  generateAuditReport: async ({
    surgery,
    report,
    aiSuggested,
    finalSelection,
    surgeonNotes,
  }: {
    surgery: Surgery;
    report: Report;
    aiSuggested: MediaFile[];
    finalSelection: MediaFile[];
    surgeonNotes?: string;
  }): Promise<Blob> => {
    await simulateProcessing(1400);

    const kept = finalSelection.filter(media => media.aiSuggested);
    const manualAdditions = finalSelection.filter(media => !media.aiSuggested);
    const removedSuggestions = aiSuggested.filter(media => !finalSelection.some(final => final.id === media.id));

    const describeMedia = (items: MediaFile[]) =>
      items.map(item => `- ${item.id} (${item.phase} @ ${new Date(item.timestamp).toLocaleTimeString()})`).join('\n') || '- None recorded';

    const content = `Audit Report\n\n` +
      `Surgery: ${surgery.id} (${surgery.procedureType})\n` +
      `Patient: ${surgery.patientId}\n` +
      `Report ID: ${report.id}\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `AI suggested frames: ${aiSuggested.length}\n` +
      `Surgeon kept: ${kept.length}\n` +
      `Surgeon added manually: ${manualAdditions.length}\n` +
      `Surgeon removed: ${removedSuggestions.length}\n\n` +
      `Kept AI suggestions:\n${describeMedia(kept)}\n\n` +
      `Manual additions (not suggested by AI):\n${describeMedia(manualAdditions)}\n\n` +
      `AI suggestions removed by surgeon:\n${describeMedia(removedSuggestions)}\n\n` +
      `Surgeon notes: ${surgeonNotes || 'N/A'}`;

    return new Blob([content], { type: 'application/pdf' });
  },
};
