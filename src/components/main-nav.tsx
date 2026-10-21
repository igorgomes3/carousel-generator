import * as React from "react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Button, buttonVariants } from "./ui/button";
import { EditorMenubar } from "./editor-menubar";
import { Download, Loader2Icon, Package, Settings } from "lucide-react";
import Pager from "./pager";
import { FilenameForm } from "./forms/filename-form";
import { BringYourKeysDialog } from "@/components/api-keys-dialog";

export type NavItem = {
  title: string;
  href: string;
};

export type MainNavItem = NavItem;

interface MainNavProps {
  handlePrint: () => void;
  isPrinting: boolean;
  handleDownloadPngs: () => void;
  isExporting: boolean;
  className?: string;
}

export function MainNav({ handlePrint, isPrinting, handleDownloadPngs, isExporting, className }: MainNavProps) {
  return (
    <div className={cn("flex gap-4 md:gap-10 justify-between items-center", className)}>
      <div className="flex gap-4">
        <Link href="/" className="items-center space-x-2 flex">
          <Icons.logo />
          <span className="hidden font-bold md:inline-block">
            Carousel Generator
          </span>
        </Link>
        <EditorMenubar />
      </div>
      <div className="hidden lg:block">
        <Pager />
      </div>
      <div className="flex gap-2 items-center">
        <div className="hidden md:block">
          <FilenameForm />
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size={"sm"}
            onClick={handleDownloadPngs}
            disabled={isExporting}
            title="Baixar PNGs 1080×1350, um por slide, prontos para o Instagram"
          >
            <div className="flex flex-row gap-1.5 items-center">
              {isExporting ? (
                <>
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Gerando…</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">PNGs</span>
                </>
              )}
            </div>
          </Button>
          <Link
            className="block lg:hidden"
            href="https://github.com/FranciscoMoretti/carousel-generator"
            target="_blank"
            rel="noreferrer"
          >
            <div
              className={cn(
                buttonVariants({
                  variant: "ghost",
                }),
                "w-9 px-0"
              )}
            >
              <Icons.gitHub className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </div>
          </Link>
          {/* // TODO: Re-enable your own keys system  */}
          {/* <BringYourKeysDialog
            triggerButton={
              <Button variant="ghost" size={"icon"}>
                <div className="flex flex-row gap-1 items-center">
                  <Settings />
                </div>
              </Button>
            }
          */}.
        </div>
      </div>
    </div>
  );
}