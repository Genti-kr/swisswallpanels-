export type CompanyProfile = {
  legalName: string;
  legalForm: string;
  street: string;
  postCode: string;
  city: string;
  country: string;
  phone: string;
  contactEmail: string;
  privacyEmail: string;
  websiteUrl: string;
  directorName: string;
  directorRole: string;
  uid: string;
  tradeRegister: string;
  shippingPolicy: string;
  hostingProvider: string;
  dataRetentionOrders: string;
  dataRetentionMarketing: string;
  dataRetentionLogs: string;
  productReturnPolicy: string;
  productExclusions: string;
  footerAddress: string;
};

const REQUIRED_FIELDS: (keyof CompanyProfile)[] = [
  'legalName',
  'street',
  'postCode',
  'city',
  'phone',
  'contactEmail',
  'directorName',
  'uid',
  'legalForm',
  'tradeRegister',
];

function readEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export function getCompanyProfile(): CompanyProfile {
  const legalName = readEnv('COMPANY_LEGAL_NAME');
  const street = readEnv('COMPANY_STREET');
  const postCode = readEnv('COMPANY_POST_CODE');
  const city = readEnv('COMPANY_CITY');
  const country = readEnv('COMPANY_COUNTRY', 'Schweiz');
  const contactEmail = readEnv('COMPANY_CONTACT_EMAIL', readEnv('ADMIN_EMAIL', 'info@swisswallpanels.ch'));
  const websiteUrl =
    readEnv('COMPANY_WEBSITE_URL') ||
    readEnv('NEXT_PUBLIC_SITE_URL', 'https://swisswallpanels.ch');

  const profile: CompanyProfile = {
    legalName,
    legalForm: readEnv('COMPANY_LEGAL_FORM', 'GmbH'),
    street,
    postCode,
    city,
    country,
    phone: readEnv('COMPANY_PHONE'),
    contactEmail,
    privacyEmail: readEnv('COMPANY_PRIVACY_EMAIL', contactEmail),
    websiteUrl,
    directorName: readEnv('COMPANY_DIRECTOR_NAME'),
    directorRole: readEnv('COMPANY_DIRECTOR_ROLE', 'Geschäftsführer'),
    uid: readEnv('COMPANY_UID'),
    tradeRegister: readEnv('COMPANY_TRADE_REGISTER'),
    shippingPolicy: readEnv(
      'COMPANY_SHIPPING_POLICY',
      'Lieferung in die Schweiz sowie nach Deutschland, Frankreich und Italien gemäss Checkout.'
    ),
    hostingProvider: readEnv('COMPANY_HOSTING_PROVIDER', 'Vercel (Web) / VPS (API)'),
    dataRetentionOrders: readEnv('COMPANY_DATA_RETENTION_ORDERS', '10 Jahre gemäss OR'),
    dataRetentionMarketing: readEnv('COMPANY_DATA_RETENTION_MARKETING', 'bis zum Widerruf der Einwilligung'),
    dataRetentionLogs: readEnv('COMPANY_DATA_RETENTION_LOGS', '90 Tage'),
    productReturnPolicy: readEnv(
      'COMPANY_PRODUCT_RETURN_POLICY',
      'Standardpaneele unbenutzt in Originalverpackung innerhalb von 14 Tagen.'
    ),
    productExclusions: readEnv(
      'COMPANY_PRODUCT_EXCLUSIONS',
      'Massgeschneiderte, zugeschnittene oder kundenspezifische Paneele'
    ),
    footerAddress: '',
  };

  profile.footerAddress =
    readEnv('COMPANY_FOOTER_ADDRESS') ||
    [street, `${postCode} ${city}`.trim(), country].filter(Boolean).join(', ');

  return profile;
}

export function isCompanyProfileComplete(profile: CompanyProfile = getCompanyProfile()): boolean {
  return REQUIRED_FIELDS.every((field) => Boolean(profile[field]?.trim()));
}

export function companyProfileToLegalVars(profile: CompanyProfile): Record<string, string> {
  return {
    companyLegalName: profile.legalName,
    companyLegalForm: profile.legalForm,
    companyStreet: profile.street,
    companyPostCode: profile.postCode,
    companyCity: profile.city,
    companyCountry: profile.country,
    companyPhone: profile.phone,
    companyContactEmail: profile.contactEmail,
    companyPrivacyEmail: profile.privacyEmail,
    companyWebsiteUrl: profile.websiteUrl,
    companyDirectorName: profile.directorName,
    companyDirectorRole: profile.directorRole,
    companyUid: profile.uid,
    companyTradeRegister: profile.tradeRegister,
    companyShippingPolicy: profile.shippingPolicy,
    companyHostingProvider: profile.hostingProvider,
    companyDataRetentionOrders: profile.dataRetentionOrders,
    companyDataRetentionMarketing: profile.dataRetentionMarketing,
    companyDataRetentionLogs: profile.dataRetentionLogs,
    companyProductReturnPolicy: profile.productReturnPolicy,
    companyProductExclusions: profile.productExclusions,
    companyFooterAddress: profile.footerAddress,
    companyPostAddress: `${profile.street}, ${profile.postCode} ${profile.city}, ${profile.country}`.replace(
      /^,\s*|,\s*$/g,
      ''
    ),
  };
}
