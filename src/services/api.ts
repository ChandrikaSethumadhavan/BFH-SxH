import { MediaFile, Surgery, Report } from '@/types';
import { mockAPI, mockMediaFiles, mockSurgery } from './mockData';

// Configuration flag to switch between mock and real API
const USE_MOCK_DATA = true; // Set to false when backend is ready

// Base API URL - will be used when USE_MOCK_DATA is false
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIService {
  private baseUrl: string;
  private useMock: boolean;

  constructor(baseUrl: string, useMock: boolean = true) {
    this.baseUrl = baseUrl;
    this.useMock = useMock;
  }

  // Toggle between mock and real API
  setUseMock(useMock: boolean) {
    this.useMock = useMock;
  }

  // Upload video/images
  async uploadMedia(file: File): Promise<Surgery> {
    if (this.useMock) {
      return mockAPI.uploadVideo(file);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  // Get surgery details
  async getSurgery(surgeryId: string): Promise<Surgery> {
    if (this.useMock) {
      return mockSurgery;
    }

    const response = await fetch(`${this.baseUrl}/api/surgeries/${surgeryId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch surgery');
    }

    return response.json();
  }

  // Get media files for a surgery
  async getMediaFiles(surgeryId: string): Promise<MediaFile[]> {
    if (this.useMock) {
      return mockMediaFiles.filter(m => !m.isFiltered);
    }

    const response = await fetch(`${this.baseUrl}/api/surgeries/${surgeryId}/media`);

    if (!response.ok) {
      throw new Error('Failed to fetch media files');
    }

    return response.json();
  }

  // Update media selection status
  async updateMediaSelection(mediaId: string, isSelected: boolean): Promise<MediaFile> {
    if (this.useMock) {
      return mockAPI.updateMediaSelection(mediaId, isSelected);
    }

    const response = await fetch(`${this.baseUrl}/api/media/${mediaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isSelected }),
    });

    if (!response.ok) {
      throw new Error('Failed to update media selection');
    }

    return response.json();
  }

  // Generate report
  async generateReport(surgeryId: string, selectedMediaIds: string[]): Promise<Report> {
    if (this.useMock) {
      const selectedMedia = mockMediaFiles.filter(m => selectedMediaIds.includes(m.id));
      return mockAPI.generateReport(surgeryId, selectedMedia);
    }

    const response = await fetch(`${this.baseUrl}/api/surgeries/${surgeryId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ selectedMediaIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate report');
    }

    return response.json();
  }

  // Export report as PDF
  async exportReport(reportId: string, format: 'pdf' | 'html' = 'pdf'): Promise<Blob> {
    if (this.useMock) {
      // Return a mock PDF blob
      return new Blob(['Mock PDF content'], { type: 'application/pdf' });
    }

    const response = await fetch(`${this.baseUrl}/api/reports/${reportId}/export?format=${format}`);

    if (!response.ok) {
      throw new Error('Failed to export report');
    }

    return response.blob();
  }

  // Generate Abrechnungsprotokoll (billing protocol)
  async generateBillingProtocol(params: {
    surgery: Surgery;
    report: Report;
    selectedMedia: MediaFile[];
  }): Promise<Blob> {
    if (this.useMock) {
      return mockAPI.generateBillingProtocol(params);
    }

    const response = await fetch(`${this.baseUrl}/api/surgeries/${params.surgery.id}/billing-protocol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportId: params.report.id,
        selectedMediaIds: params.selectedMedia.map(media => media.id),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate billing protocol');
    }

    return response.blob();
  }

  // Generate audit PDF with AI suggestions vs surgeon changes
  async generateAuditReport(params: {
    surgery: Surgery;
    report: Report;
    aiSuggested: MediaFile[];
    finalSelection: MediaFile[];
    surgeonNotes?: string;
  }): Promise<Blob> {
    if (this.useMock) {
      return mockAPI.generateAuditReport(params);
    }

    const response = await fetch(`${this.baseUrl}/api/surgeries/${params.surgery.id}/audit-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportId: params.report.id,
        aiSuggestedIds: params.aiSuggested.map(media => media.id),
        finalSelectionIds: params.finalSelection.map(media => media.id),
        surgeonNotes: params.surgeonNotes,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate audit report');
    }

    return response.blob();
  }
}

// Export a singleton instance
export const api = new APIService(API_BASE_URL, USE_MOCK_DATA);

// Export the class for testing or custom instances
export default APIService;
