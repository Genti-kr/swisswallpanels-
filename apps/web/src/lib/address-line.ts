/** Split a single address line into street + house number for API/invoice fields. */
export function parseStreetAndNumber(line: string): { street: string; houseNumber: string } {
  const trimmed = line.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { street: '', houseNumber: '' };
  }

  const match = trimmed.match(
    /^(.+?)\s+(\d[\d\w\-\/]*(?:\s*(?:bis|ter|quater|a|b|c))?)$/iu
  );
  if (match) {
    return {
      street: match[1].trim().slice(0, 120),
      houseNumber: match[2].trim().slice(0, 20),
    };
  }

  return { street: trimmed.slice(0, 120), houseNumber: '—' };
}
