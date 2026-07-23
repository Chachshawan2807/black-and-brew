import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { checkAuth } from '@/app/actions/auth';
import { fetchBeanOrderDetail } from '@/app/actions/bean-order-actions';
import BeanOrderDetailClient from '../BeanOrderDetailClient';

/** Build-time validation path for Cache Components (requires ≥1 static param). */
export async function generateStaticParams() {
  return [{ id: 'build-placeholder' }];
}

export default async function BeanOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await connection();
  const { locale, id } = await params;
  const authed = await checkAuth();
  if (!authed) redirect(`/${locale}`);

  const result = await fetchBeanOrderDetail(id);
  if (!result.success || !result.data) notFound();

  return <BeanOrderDetailClient order={result.data} locale={locale} />;
}
