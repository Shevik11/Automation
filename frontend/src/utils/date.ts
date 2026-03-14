/**
 * Format time distance from a date string to human readable format
 */
export const formatDateDistance = (dateStr?: string): string => {
  if (!dateStr) {
    return 'Not executed yet';
  }

  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffDays} days ago`;
    }
  } catch {
    return 'Unknown';
  }
};

/**
 * Format interval in minutes to human readable format
 */
export const formatInterval = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hours`;
  }

  return `${hours} hours ${mins} minutes`;
};
