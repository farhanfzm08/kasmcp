/**
 * Format integer amount to Rupiah string
 * Example: 50000 -> "Rp 50.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('Rp', 'Rp ');
}

/**
 * Format Date to Indonesian long date string
 * Example: 2026-08-25 -> "25 Agustus 2026"
 */
export function formatDateIndo(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Format Date to Indonesian short date + time
 * Example: 2026-08-25T14:30:00 -> "25 Aug 2026, 14:30"
 */
export function formatDateTimeIndo(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Normalize Indonesian phone number to international format (628...)
 * Example: "0812-3456-7890" -> "6281234567890"
 * Example: "+62 812 3456 7890" -> "6281234567890"
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('62') && cleaned.length > 5) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Format phone for display (e.g. "0812-3456-7890")
 */
export function formatPhoneDisplay(phone: string): string {
  let cleaned = normalizePhone(phone);
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  }
  if (cleaned.length >= 10) {
    return cleaned.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  return cleaned;
}
