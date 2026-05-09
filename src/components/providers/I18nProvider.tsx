import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ReactNode } from 'react';

interface I18nProviderProps {
  children: ReactNode;
  locale: string;
}

export default async function I18nProvider({ children, locale }: I18nProviderProps) {
  // Fetch messages inside the provider to allow parent layout to stream
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
