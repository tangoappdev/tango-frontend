export const slugify = (value) =>
  (value || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const formatDateRange = (startDate, endDate, dateText) => {
  if (dateText) return dateText;
  if (!startDate) return null;
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} - ${endDate}`;
};

