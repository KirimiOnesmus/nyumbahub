
const escapeCell = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const rowToCsv = (row) => row.map(escapeCell).join(',');

export const buildCsv = (sections) =>
  sections
    .map((section) => {
      const lines = [];
      if (section.title) lines.push(escapeCell(section.title));
      lines.push(rowToCsv(section.headers));
      section.rows.forEach((row) => lines.push(rowToCsv(row)));
      return lines.join('\n');
    })
    .join('\n\n');


export const downloadCsv = (filename, csvContent) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};