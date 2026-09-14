import { connection } from 'next/server';
import { redirect } from 'next/navigation';

export default async function IndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await connection();
  redirect(`/${locale}/home`);
}
