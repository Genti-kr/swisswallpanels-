import { prisma } from './prisma';

export const MWST_RATE = 0.081; // 8.1% standard Swiss VAT rate

export function calculateMWST(grossPriceChf: number): {
  netPrice: number;
  vatAmount: number;
  grossPrice: number;
} {
  const netPrice = grossPriceChf / (1 + MWST_RATE);
  const vatAmount = grossPriceChf - netPrice;
  return {
    netPrice: Math.round(netPrice * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grossPrice: grossPriceChf,
  };
}

export function formatCHF(amount: number): string {
  // Swiss format: CHF 1'234.50 (apostrophe as thousands separator)
  const formatted = new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
  }).format(amount);
  return formatted;
}

export function validateSwissPLZ(plz: string): boolean {
  return /^\d{4}$/.test(plz) && parseInt(plz) >= 1000 && parseInt(plz) <= 9699;
}

// Swiss cantons for dropdown
export const SWISS_CANTONS = [
  { code: 'AG', name: 'Aargau' }, { code: 'AR', name: 'Appenzell Ausserrhoden' },
  { code: 'AI', name: 'Appenzell Innerrhoden' }, { code: 'BL', name: 'Basel-Landschaft' },
  { code: 'BS', name: 'Basel-Stadt' }, { code: 'BE', name: 'Bern' },
  { code: 'FR', name: 'Fribourg' }, { code: 'GE', name: 'Genève' },
  { code: 'GL', name: 'Glarus' }, { code: 'GR', name: 'Graubünden' },
  { code: 'JU', name: 'Jura' }, { code: 'LU', name: 'Luzern' },
  { code: 'NE', name: 'Neuchâtel' }, { code: 'NW', name: 'Nidwalden' },
  { code: 'OW', name: 'Obwalden' }, { code: 'SG', name: 'St. Gallen' },
  { code: 'SH', name: 'Schaffhausen' }, { code: 'SZ', name: 'Schwyz' },
  { code: 'SO', name: 'Solothurn' }, { code: 'TG', name: 'Thurgau' },
  { code: 'TI', name: 'Ticino' }, { code: 'UR', name: 'Uri' },
  { code: 'VS', name: 'Valais' }, { code: 'VD', name: 'Vaud' },
  { code: 'ZG', name: 'Zug' }, { code: 'ZH', name: 'Zürich' },
];

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  const seq = String(count + 1).padStart(5, '0');
  return `SWP-${year}-${seq}`; // e.g. SWP-2026-00001
}

export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quote.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `Q-${year}-${seq}`;
}
