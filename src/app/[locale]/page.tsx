import { connection } from 'next/server';

export default async function IndexPage() {
  await connection();
  return (
    <div
      className="min-h-[calc(100vh-2rem)] bg-inherit flex flex-col"
      data-testid="home-page-shell"
      aria-label="หน้าหลัก"
    />
  );
}
