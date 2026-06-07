"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarToggleProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  return (
    <div className="invisible lg:visible absolute top-[16px] -right-[16px] z-[9999]">
      <Button
        onClick={() => setIsOpen?.()}
        className="rounded-full w-8 h-8 bg-white border border-[#000000]/5 bb-shadow-sm hover:bg-[#000000]/5 bb-transition"
        variant="ghost"
        size="icon"
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform ease-in-out duration-500",
            isOpen === false ? "rotate-180" : "rotate-0"
          )}
        />
      </Button>
    </div>
  );
}
