export function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    alert('No data to export.');
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Format rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? '' : row[header];
      // Escape quotes
      cell = cell.toString().replace(/"/g, '""');
      // Wrap in quotes if it contains commas, quotes, or newlines
      if (cell.search(/("|,|\n)/g) >= 0) {
        cell = " + cell + ";
      }
      return cell;
    }).join(',');
  });

  // Join headers and rows
  const csvString = [headers.join(','), ...csvRows].join('\n');
  
  // Create blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
