import { HttpErrorResponse } from '@angular/common/http';

export function getValue(record: any, ...keys: string[]): any {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return '';
}

export function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

export function isGuid(value: any): boolean {
  const str = String(value || '').trim();
  if (str.length !== 36) return false;
  const parts = str.split('-');
  return parts.length === 5 && parts.every(p => p.length > 0);
}

export function titleCase(value: any): string {
  if (!value) {
    return '';
  }
  return String(value)
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function extractApiMessage(error: any): string {
  if (error instanceof HttpErrorResponse) {
    const data = error.error;

    if (typeof data === 'string') {
      return data;
    }

    if (data?.message) {
      return data.message;
    }

    if (data?.errors) {
      return Object.entries(data.errors)
        .flatMap(([field, messages]: [string, any]) =>
          messages.map((message: string) => (field && field !== '$' ? `${field}: ${message}` : message))
        )
        .join(', ');
    }

    if (data?.title) {
      return data.title;
    }

    return error.message || 'Something went wrong. Please try again.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}

export function downloadBlob(data: any, filename: string, mimeType = 'application/octet-stream'): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function isPositiveInteger(value: any): boolean {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: any): string {
  const num = Number(amount);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
