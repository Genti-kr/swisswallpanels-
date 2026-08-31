/**
 * Patches Legal + Footer message templates to use {company*} interpolation vars.
 * Run once: pnpm exec tsx scripts/patch-legal-messages.ts
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const locales = ['de', 'en', 'fr', 'sq'] as const;

const legalPatches: Record<string, string> = {
  agbIntro:
    'Geltungsbereich: Diese AGB gelten für alle Bestellungen über den Onlineshop von {companyLegalName}.',
  imprintIntro:
    '{companyLegalName}, {companyCity}, {companyCountry}. E-Mail: {companyContactEmail}',
  imprintDisclaimer:
    'Hinweis: Bitte alle COMPANY_* Umgebungsvariablen mit echten Firmendaten befüllen, bevor die Seite live geht.',
  agbSec1Text:
    '{companyLegalName} vertreibt Wandpaneele und verwandte Produkte an Kunden in der Schweiz und, sofern angeboten, ausgewählten Nachbarländern. Diese Bestimmungen gelten für alle über diesen Onlineshop geschlossenen Verträge und Lieferungen.',
  agbSec2Text:
    'Die Bestellung im Onlineshop stellt ein verbindliches Angebot zum Abschluss eines Kaufvertrags dar. Der Vertrag kommt erst mit der Bestellbestätigung per E-Mail von {companyLegalName} zustande.',
  agbSec3Text:
    'Alle Preise sind in Schweizer Franken (CHF) ausgewiesen und enthalten die gesetzliche Mehrwertsteuer. Die Zahlung erfolgt über Stripe (Kreditkarte, TWINT und weitere im Checkout angezeigte Methoden). {companyLegalName} speichert keine vollständigen Kartendaten.',
  agbSec4Text:
    'Die Lieferung erfolgt an die von Ihnen angegebene Lieferadresse. Versandkosten und Lieferzeiten werden im Checkout angezeigt. {companyShippingPolicy}',
  privacySec4Text:
    'Wir geben Daten nur bei Bedarf weiter an:\n• Stripe (USA/EU): Zahlungsabwicklung — stripe.com/privacy\n• Postmark (USA): Transaktions-E-Mails — postmarkapp.com/privacy\n• Cloudflare R2 (globales CDN): Produktbilder — cloudflare.com/privacypolicy\n• Hosting-Anbieter: {companyHostingProvider}\nWir verkaufen Ihre personenbezogenen Daten nicht an Dritte.',
  privacySec5Text:
    'Einige Dienstleister verarbeiten Daten ausserhalb der Schweiz/EU (z.B. Stripe, Postmark). Wo erforderlich, stützen wir uns auf geeignete Garantien wie Standardvertragsklauseln. Details auf Anfrage unter {companyPrivacyEmail}.',
  privacySec7Text:
    'Bestell- und Rechnungsdaten: {companyDataRetentionOrders}\nKontodaten: bis zur Löschungsanfrage\nMarketing-Einwilligungen: {companyDataRetentionMarketing}\nCookie-Einwilligungsprotokolle: 3 Jahre\nServer-Logs: {companyDataRetentionLogs}',
  privacySec8Text:
    'Nach revDSG und, soweit anwendbar, DSGVO haben Sie das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch.\n\nKontakt für Rechteausübung oder Löschung:\n{companyLegalName}\n{companyPrivacyEmail}\n{companyPostAddress}\n\nWir antworten innerhalb von 30 Tagen. Beschwerde beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB): edoeb.admin.ch',
  imprintSec1Text:
    '{companyLegalName}\n{companyStreet}\n{companyPostCode} {companyCity}\n{companyCountry}',
  imprintSec2Text:
    'Telefon: {companyPhone}\nE-Mail: {companyContactEmail}\nWeb: {companyWebsiteUrl}',
  imprintSec3Text: '{companyDirectorName}, {companyDirectorRole}',
  imprintSec4Text:
    'Eingetragener Firmenname: {companyLegalName}\nUID/MWST-Nummer: {companyUid}\nHandelsregister: {companyTradeRegister}\nRechtsform: {companyLegalForm}',
  widerrufIntro:
    'Verbraucher haben das Recht, von Fernabsatzverträgen mit {companyLegalName} unter den nachstehenden Bedingungen zurückzutreten.',
  widerrufSec2Text:
    'Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung (z.B. Brief per Post oder E-Mail) informieren:\n\n{companyLegalName}\n{companyPostAddress}\nE-Mail: {companyContactEmail}\n\nSie können das nachstehende Muster-Widerrufsformular verwenden, dies ist jedoch nicht verpflichtend.',
  widerrufSec4Text:
    'Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen 14 Tagen ab Mitteilung des Widerrufs zurückzusenden. Sie tragen die unmittelbaren Kosten der Rücksendung. {companyProductReturnPolicy}',
  widerrufSec5Text:
    'Das Widerrufsrecht gilt nicht für:\n• Nach Kundenspezifikation angefertigte oder eindeutig personalisierte Waren\n• Versiegelte Waren, die aus Hygiene- oder Gesundheitsschutzgründen nicht zur Rückgabe geeignet sind\n• {companyProductExclusions}\n\nFür digitale Inhalte und Dienstleistungen gelten gesonderte Regeln, wie im Checkout angegeben.',
  widerrufSec6Text:
    '(Nur ausfüllen und zurücksenden, wenn Sie widerrufen möchten.)\n\nAn {companyLegalName}, {companyPostAddress}, {companyContactEmail}:\n\nHiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*)/die Erbringung der folgenden Dienstleistung (*):\n\nBestellt am (*)/erhalten am (*):\n\nName des/der Verbraucher(s):\n\nAnschrift des/der Verbraucher(s):\n\nUnterschrift (nur bei Mitteilung auf Papier):\n\nDatum:\n\n(*) Unzutreffendes streichen.',
};

const localeOverrides: Record<string, Partial<typeof legalPatches>> = {
  en: {
    agbIntro: 'Scope: These terms apply to all orders through the online shop of {companyLegalName}.',
    imprintIntro:
      '{companyLegalName}, {companyCity}, {companyCountry}. Email: {companyContactEmail}',
    imprintDisclaimer:
      'Note: Set all COMPANY_* environment variables with real company data before go-live.',
    agbSec1Text:
      '{companyLegalName} sells wall panels and related products to customers in Switzerland and selected neighbouring countries where offered.',
    agbSec2Text:
      'Placing an order constitutes a binding offer. The contract is formed when {companyLegalName} confirms the order by email.',
    agbSec3Text:
      'All prices are in CHF including statutory VAT. Payment is processed via Stripe. {companyLegalName} does not store full card details.',
    agbSec4Text:
      'Delivery is made to your specified address. Shipping costs and times are shown at checkout. {companyShippingPolicy}',
    privacySec4Text:
      'We share data only when necessary with:\n• Stripe — payment processing\n• Postmark — transactional email\n• Cloudflare R2 — product images\n• Hosting provider: {companyHostingProvider}',
    privacySec5Text:
      'Some providers process data outside Switzerland/EU. Contact {companyPrivacyEmail} for details.',
    privacySec7Text:
      'Order/invoice data: {companyDataRetentionOrders}\nAccount data: until deletion request\nMarketing consents: {companyDataRetentionMarketing}\nCookie consent logs: 3 years\nServer logs: {companyDataRetentionLogs}',
    privacySec8Text:
      'You have rights of access, rectification, erasure, restriction, portability and objection.\n\nContact:\n{companyLegalName}\n{companyPrivacyEmail}\n{companyPostAddress}\n\nComplaints: edoeb.admin.ch',
    imprintSec1Text:
      '{companyLegalName}\n{companyStreet}\n{companyPostCode} {companyCity}\n{companyCountry}',
    imprintSec2Text:
      'Phone: {companyPhone}\nEmail: {companyContactEmail}\nWeb: {companyWebsiteUrl}',
    imprintSec3Text: '{companyDirectorName}, {companyDirectorRole}',
    imprintSec4Text:
      'Registered name: {companyLegalName}\nUID/VAT: {companyUid}\nTrade register: {companyTradeRegister}\nLegal form: {companyLegalForm}',
    widerrufIntro:
      'Consumers may withdraw from distance contracts with {companyLegalName} under the conditions below.',
    widerrufSec2Text:
      'To exercise your right, notify us clearly by post or email:\n\n{companyLegalName}\n{companyPostAddress}\nEmail: {companyContactEmail}',
    widerrufSec4Text:
      'Return goods within 14 days at your cost. {companyProductReturnPolicy}',
    widerrufSec5Text:
      'Right of withdrawal does not apply to:\n• Custom-made goods\n• Sealed hygiene products once opened\n• {companyProductExclusions}',
    widerrufSec6Text:
      'To {companyLegalName}, {companyPostAddress}, {companyContactEmail}:\n\nI/We (*) withdraw from the contract for the following goods/services (*):\n\n(*) Delete as applicable.',
  },
  fr: {
    agbIntro:
      'Champ d\'application : les présentes CGV s\'appliquent à toutes les commandes via la boutique en ligne de {companyLegalName}.',
    imprintIntro:
      '{companyLegalName}, {companyCity}, {companyCountry}. E-mail : {companyContactEmail}',
    imprintDisclaimer:
      'Note : renseignez les variables COMPANY_* avec les données réelles de l\'entreprise avant la mise en ligne.',
    widerrufIntro:
      'Les consommateurs peuvent se rétracter des contrats à distance avec {companyLegalName} selon les conditions ci-dessous.',
  },
  sq: {
    agbIntro:
      'Fushëveprimi: këto kushte zbatohen për të gjitha porositë përmes dyqanit online të {companyLegalName}.',
    imprintIntro:
      '{companyLegalName}, {companyCity}, {companyCountry}. Email: {companyContactEmail}',
    imprintDisclaimer:
      'Kujdes: plotësoni variablat COMPANY_* me të dhëna reale të kompanisë para publikimit.',
    widerrufIntro:
      'Konsumatorët kanë të drejtë tërheqjeje nga kontratat në distancë me {companyLegalName}.',
  },
};

for (const locale of locales) {
  const filePath = path.join(root, 'apps/web/messages', `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
    Legal: Record<string, string>;
    Footer: { address: string };
    Metadata?: { imprintDesc?: string };
  };

  const patches = { ...legalPatches, ...(localeOverrides[locale] || {}) };
  for (const [key, value] of Object.entries(patches)) {
    if (data.Legal[key] !== undefined) {
      data.Legal[key] = value;
    }
  }

  data.Footer.address = '{companyFooterAddress}';

  if (data.Metadata?.imprintDesc) {
    data.Metadata.imprintDesc = data.Metadata.imprintDesc.replace(
      /\[.*?\]/g,
      '{companyLegalName}'
    );
    if (!data.Metadata.imprintDesc.includes('{companyLegalName}')) {
      data.Metadata.imprintDesc = 'Impressum — {companyLegalName}';
    }
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Patched ${locale}.json`);
}

console.log('Done.');
