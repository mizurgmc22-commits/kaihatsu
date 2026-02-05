export const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0=Sunday, 6=Saturday
};

export const getNextWeekday = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  if (day === 0) {
    // Sunday -> Monday (+1 day)
    result.setDate(result.getDate() + 1);
  } else if (day === 6) {
    // Saturday -> Monday (+2 days)
    result.setDate(result.getDate() + 2);
  }
  return result;
};

export const calculateEndDate = (startDate: Date): Date => {
  // 1 week later
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  // If weekend, adjust to next Monday
  return getNextWeekday(endDate);
};

export const formatDateToString = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const parseStringToDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  return new Date(dateStr);
};

export const formatDisplayDate = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
};
