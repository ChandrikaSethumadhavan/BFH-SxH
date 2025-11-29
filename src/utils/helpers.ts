import { MediaFile } from '@/types';

// Format duration in seconds to readable string (e.g., "2h 34m 18s")
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

// Format timestamp to readable time (e.g., "14:23:45")
export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Format date to readable string
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Get quality badge color based on score
export const getQualityColor = (score: number): string => {
  if (score >= 90) return 'bg-green-500';
  if (score >= 80) return 'bg-green-400';
  if (score >= 70) return 'bg-yellow-400';
  if (score >= 60) return 'bg-orange-400';
  return 'bg-red-400';
};

// Get quality label based on score
export const getQualityLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Poor';
};

// Sort media files by various criteria
export const sortMediaFiles = (
  files: MediaFile[],
  sortBy: 'quality' | 'timestamp' | 'selected'
): MediaFile[] => {
  const sorted = [...files];

  switch (sortBy) {
    case 'quality':
      return sorted.sort((a, b) => b.qualityScore - a.qualityScore);
    case 'timestamp':
      return sorted.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    case 'selected':
      return sorted.sort((a, b) => {
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;
        return 0;
      });
    default:
      return sorted;
  }
};

// Filter media files based on criteria
export const filterMediaFiles = (
  files: MediaFile[],
  filters: {
    minQuality?: number;
    showSelected?: boolean;
    showSuggested?: boolean;
  }
): MediaFile[] => {
  let filtered = [...files];

  if (filters.minQuality !== undefined) {
    filtered = filtered.filter(f => f.qualityScore >= filters.minQuality!);
  }

  if (filters.showSelected) {
    filtered = filtered.filter(f => f.isSelected);
  }

  if (filters.showSuggested) {
    filtered = filtered.filter(f => f.aiSuggested);
  }

  return filtered;
};

// Calculate statistics for media files
export const calculateMediaStats = (files: MediaFile[]) => {
  const total = files.length;
  const selected = files.filter(f => f.isSelected).length;
  const suggested = files.filter(f => f.aiSuggested).length;
  const averageQuality = files.reduce((sum, f) => sum + f.qualityScore, 0) / total;

  return {
    total,
    selected,
    suggested,
    averageQuality: Math.round(averageQuality),
  };
};

// Download file utility
export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Class name utility (simple version of clsx)
export const cn = (...classes: (string | boolean | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ');
};
