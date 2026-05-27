export function isValidPhilippinePhone(phone: string): boolean {
  return /^(\+63|0)9\d{9}$/.test(phone.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function isValidPlateNumber(plate: string): boolean {
  return /^[A-Z]{3}\s?\d{3,4}$/.test(plate.toUpperCase().trim());
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
