import {
  companyProfileToLegalVars,
  getCompanyProfile,
  isCompanyProfileComplete,
} from '@/config/company';

type MessageTree = Record<string, unknown>;

function mergeLegalVars(section: MessageTree, vars: Record<string, string>): MessageTree {
  return { ...section, ...vars };
}

export function applyCompanyToMessages(messages: MessageTree): MessageTree {
  const profile = getCompanyProfile();
  const vars = companyProfileToLegalVars(profile);
  const complete = isCompanyProfileComplete(profile);

  const legal = messages.Legal as MessageTree | undefined;
  const footer = messages.Footer as MessageTree | undefined;

  return {
    ...messages,
    Legal: legal
      ? {
          ...mergeLegalVars(legal, vars),
          imprintDisclaimer: complete
            ? ''
            : (legal.imprintDisclaimer as string) ||
              'Configure COMPANY_* environment variables before go-live.',
        }
      : legal,
    Footer: footer
      ? {
          ...footer,
          address: vars.companyFooterAddress || (footer.address as string),
        }
      : footer,
  };
}
