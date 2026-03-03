/**
 * Export the current page content as PDF using the browser's print dialog.
 * Print-specific styles are defined in globals.css under @media print.
 */
export function exportToPDF(): void {
  window.print();
}
