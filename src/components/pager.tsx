"use client";
import { Button } from "@/components/ui/button";
import { useFieldArrayValues } from "@/lib/hooks/use-field-array-values";
import { usePagerContext } from "@/lib/providers/pager-context";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageCounter } from "./page-counter";

interface Props extends React.HTMLAttributes<HTMLElement> {}

export default function Pager({}: Props) {
  const { currentPage, onPreviousClick, onNextClick, setCurrentPage } =
    usePagerContext();
  const { numPages } = useFieldArrayValues("slides");

  return (
    <div className="flex flex-col md:flex-row gap-2 items-center ">
      <div className="flex flex-row gap-1 items-center">
        <Button
          onClick={() => setCurrentPage(0)}
          variant="outline"
          size="sm"
          disabled={currentPage == 0}
          aria-label="Ir para o primeiro slide"
        >
          <ChevronFirst className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          onClick={onPreviousClick}
          variant="outline"
          size="sm"
          disabled={currentPage == 0}
          aria-label="Slide anterior"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </Button>
        <PageCounter></PageCounter>
        <Button
          onClick={onNextClick}
          variant="outline"
          size="sm"
          disabled={currentPage == numPages - 1 || numPages == 0}
          aria-label="Próximo slide"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          onClick={() => setCurrentPage(numPages - 1)}
          variant="outline"
          size="sm"
          disabled={currentPage == numPages - 1 || numPages == 0}
          aria-label="Ir para o último slide"
        >
          <ChevronLast className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>{" "}
    </div>
  );
}
