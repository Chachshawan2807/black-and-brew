"use client";

import { MenuIcon } from "lucide-react";


import { Button } from "@/components/ui/button";
import Menu from "@/components/sidebar/Menu";
import {
  Sheet,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

export function SheetMenu() {
  return (
    <Sheet>
      <SheetTrigger className="lg:hidden" asChild>
        <Button className="h-8" variant="outline" size="icon">
          <MenuIcon size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:w-72 px-3 h-full flex flex-col" side="left">
        <SheetHeader>
          <SheetTitle className="sr-only">เมนูนำทาง</SheetTitle>

        </SheetHeader>
        <Menu isOpen />
      </SheetContent>
    </Sheet>
  );
}
