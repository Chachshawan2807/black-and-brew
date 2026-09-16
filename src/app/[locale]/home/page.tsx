import { HomeClientEntry } from './_components/HomeClientEntry';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <HomeClientEntry locale={locale} />;
}
