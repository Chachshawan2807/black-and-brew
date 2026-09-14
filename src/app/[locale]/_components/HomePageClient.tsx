'use client';

export default function HomePageClient() {
  return (
    <div
      className="min-h-[calc(100vh-2rem)] bg-inherit flex flex-col px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)]"
      data-testid="home-page-shell"
    />
  );
}
