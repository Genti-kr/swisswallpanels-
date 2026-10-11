/** Admin lists (dashboard, orders, users, finance) — same page size as storefront catalog. */
export const ADMIN_LIST_PAGE_SIZE = 15;

export const adminCatalogPagerLabels = {
  orders: {
    page: 'Shfleto porositë — zgjidh faqen',
    prev: 'Faqja e mëparshme',
    next: 'Faqja tjetër',
  },
  users: {
    page: 'Shfleto përdoruesit — zgjidh faqen',
    prev: 'Faqja e mëparshme',
    next: 'Faqja tjetër',
  },
  finance: {
    page: 'Shfleto transaksionet — zgjidh faqen',
    prev: 'Faqja e mëparshme',
    next: 'Faqja tjetër',
  },
} as const;
