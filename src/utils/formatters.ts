/**
 * Real-time input formatters for professional data entry.
 */

// US Phone Number: (XXX) XXX-XXXX
export const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// US ZIP Code: 5 digits (XXXXX) or 9 digits (XXXXX-XXXX)
export const formatZipCode = (value: string): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
};

// PO Number: Alphanumeric uppercase with hyphens (e.g. PO-99482)
export const formatPONumber = (value: string): string => {
  if (!value) return '';
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
};

// Digits-only generic filter
export const formatDigitsOnly = (value: string, maxLength?: number): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  return maxLength ? digits.slice(0, maxLength) : digits;
};
