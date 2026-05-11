"use client";

import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/use-store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";

export default function SidebarLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const isOpen = sidebar?.isOpen ?? true;

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-screen bg-transparent transition-[margin-left] ease-in-out duration-300",
          isOpen === false ? "lg:ml-20" : "lg:ml-[280px]"
        )}
      >
        {children}
      </main>
    </>
  );
}
