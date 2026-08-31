import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
import { applyCompanyToMessages } from '@/lib/apply-company-legal';

export default getRequestConfig(async ({requestLocale}) => {
  // This will typically correspond to the [locale] segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  const rawMessages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages: applyCompanyToMessages(rawMessages),
  };
});
