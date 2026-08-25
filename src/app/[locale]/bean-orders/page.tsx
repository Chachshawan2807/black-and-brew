import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { checkAuth } from '@/app/actions/auth';
import { fetchBeanOrders } from '@/app/actions/bean-order-actions';
import BeanOrdersClient from './BeanOrdersClient';

export default async function BeanOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await connection();
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) redirect(`/${locale}`);

  const result = await fetchBeanOrders();

  return (
    <BeanOrdersClient
      initialOrders={result.success ? result.data ?? [] : []}
      locale={locale}
    />
  );
}
