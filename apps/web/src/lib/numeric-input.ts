/** Emri, mbiemri, qyteti: pa shifra; lejon shkronja (unicode), hapësirë, - ' . */
export function sanitizePersonOrPlaceName(value: string, maxLength = 80): string {
  const filtered = [...value]
    .filter((ch) => {
      if (/\d/.test(ch)) return false;
      if (/\p{L}/u.test(ch)) return true;
      return ch === ' ' || ch === '-' || ch === "'" || ch === '’' || ch === '.';
    })
    .join('');
  return filtered.slice(0, maxLength);
}

/** Phone: digits, spaces, + ( ) - */
export function sanitizePhone(value: string, maxLength = 24): string {
  const filtered = [...value]
    .filter((ch) => /\d/.test(ch) || ch === '+' || ch === ' ' || ch === '-' || ch === '(' || ch === ')')
    .join('');
  return filtered.slice(0, maxLength);
}

/** Digits only (0–9). */
export function sanitizeDigits(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, '');
  return maxLength !== undefined ? digits.slice(0, maxLength) : digits;
}

/** Non-negative integer for controlled inputs. */
export function sanitizeIntegerInput(value: string, maxLength?: number): string {
  return sanitizeDigits(value, maxLength);
}

/** Decimal with optional comma/dot and limited fractional digits. */
export function sanitizeDecimalInput(value: string, maxDecimals = 2): string {
  let normalized = value.replace(',', '.');
  normalized = normalized.replace(/[^\d.]/g, '');
  const dotIndex = normalized.indexOf('.');
  if (dotIndex === -1) {
    return normalized;
  }
  const intPart = normalized.slice(0, dotIndex);
  let fracPart = normalized.slice(dotIndex + 1).replace(/\./g, '');
  if (fracPart.length > maxDecimals) {
    fracPart = fracPart.slice(0, maxDecimals);
  }
  return `${intPart}.${fracPart}`;
}

export function parseIntegerInput(value: string): number {
  const n = Number.parseInt(sanitizeDigits(value), 10);
  return Number.isFinite(n) ? n : 0;
}

export function parseDecimalInput(value: string): number {
  const cleaned = value.trim().replace(',', '.');
  if (!cleaned || cleaned === '.') return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Phone: digits, spaces, + at start only. */
export function sanitizePhoneInput(value: string): string {
  const trimmed = value.trimStart();
  let out = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === '+' && out.length === 0) out += ch;
    else if (ch === ' ' || ch === '-') out += ch;
  }
  return out.slice(0, 24);
}
