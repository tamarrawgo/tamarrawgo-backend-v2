export function formatCurrency(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('63')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+63${cleaned.slice(1)}`;
  return `+63${cleaned}`;
}

export function maskPhone(phone: string): string {
  return phone.replace(/(\+63|\b0)(\d{3})\d{4}(\d{4})/, '$1$2****$3');
}

export function generateOtp(length = 6): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
