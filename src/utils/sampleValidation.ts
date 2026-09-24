import type { SampleItem } from '../store/lynkoStore';

export function nextSampleNumber(samples: SampleItem[], prefix: string): string {
  const used = new Set(samples.map(s => s.name.trim().toUpperCase()));
  let number = 1;
  for (const name of used) {
    const match = name.match(new RegExp(`^${prefix}-(\\d+)$`));
    const parsed = match ? Number(match[1]) : NaN;
    if (Number.isSafeInteger(parsed) && parsed < Number.MAX_SAFE_INTEGER - 1) number = Math.max(number, parsed + 1);
  }
  while (used.has(`${prefix}-${String(number).padStart(2, '0')}`)) number++;
  return `${prefix}-${String(number).padStart(2, '0')}`;
}

export function calculateVolume(flow: string = '', duration: string = ''): string | null {
  const decimal = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
  if (!decimal.test(flow.trim()) || !decimal.test(duration.trim())) return null;
  const volume = Number(flow) * Number(duration);
  if (!Number.isFinite(volume) || volume <= 0) return null;
  // Preserve fractional litres instead of rounding measurements to whole litres.
  return String(Number(volume.toPrecision(12)));
}

export function sampleError(sample: SampleItem, samples: SampleItem[], isMold: boolean): string | null {
  if (!sample.name.trim()) return 'Enter a sample ID.';
  if (samples.some(s => s.id !== sample.id && s.name.trim().toLowerCase() === sample.name.trim().toLowerCase())) {
    return 'This sample ID is already used in this project. Choose a different ID.';
  }
  if (!sample.description.trim()) return 'Add a short description of the material or location.';
  if (!(sample.photoUris?.length || sample.photoUri)) return 'Add at least one photo of this sample.';
  if (isMold && !sample.sampleCode?.trim()) return 'Enter the test code supplied by your lab.';
  if (isMold && calculateVolume(sample.flowRate, sample.duration) === null) {
    return 'Enter a flow rate and duration greater than zero, using numbers only.';
  }
  return null;
}

export function validInspectionDate(value: string): boolean {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return false;
  const [, month, day, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
