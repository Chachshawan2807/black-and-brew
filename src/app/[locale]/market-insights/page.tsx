import MarketInsightsClient from './MarketInsightsClient';
import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';

export default async function MarketInsightsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  return <MarketInsightsClient />;
}
