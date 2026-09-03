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
  // Only a genuinely missing order is a 404. Transient DB/auth/network failures
  // must surface a retryable error boundary instead of a blank not-found page.
  if (result.notFound) notFound();
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'โหลดรายละเอียดออเดอร์ไม่สำเร็จ');
  }

  return <BeanOrderDetailClient key={id} order={result.data} locale={locale} />;
}
