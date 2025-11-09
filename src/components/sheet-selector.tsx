'use client'

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown } from "lucide-react";

interface SheetSelectorProps {
  selectedSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
}

export function SheetSelector({ selectedSheetId, onSelectSheet }: SheetSelectorProps) {
  const router = useRouter();
  const { data: sheets } = api.sheet.list.useQuery();

  const currentSheet = sheets?.find((s) => s.id === selectedSheetId);

  if (!sheets || sheets.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">No sheets found</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/welcome')}
        >
          Create one
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Sheet:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[200px] justify-between gap-2">
            <span className="truncate">{currentSheet?.name ?? "Select sheet"}</span>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[200px]">
          {sheets.map((sheet) => (
            <DropdownMenuItem
              key={sheet.id}
              onClick={() => onSelectSheet(sheet.id)}
              className={selectedSheetId === sheet.id ? "bg-accent" : ""}
            >
              {sheet.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/welcome')}
      >
        <Plus className="h-4 w-4 mr-1" />
        New
      </Button>
    </div>
  );
}
