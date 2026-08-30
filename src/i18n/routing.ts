import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['th', 'en'],
  defaultLocale: 'th',
  /** Thai staff ERP do not auto-switch to /en from Accept-Language or locale cookie. */
  localeDetection: false,
});

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
