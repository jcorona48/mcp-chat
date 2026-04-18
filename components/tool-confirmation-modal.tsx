"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";

interface ToolConfirmationModalProps {
  isOpen: boolean;
  toolName: string;
  toolDescription?: string;
  toolArgs: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ToolConfirmationModal({
  isOpen,
  toolName,
  toolDescription,
  toolArgs,
  onConfirm,
  onCancel,
  isLoading,
}: ToolConfirmationModalProps) {
  const hasArgs = Object.keys(toolArgs).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Confirmar ejecución</DialogTitle>
          </div>
          <DialogDescription className="text-base font-semibold text-foreground mt-2">
            {toolName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {toolDescription && (
            <div className="text-sm text-muted-foreground">
              {toolDescription}
            </div>
          )}

          {hasArgs && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Parámetros:
              </div>
              <ScrollArea className="h-[180px] w-full rounded-md border border-border/50 bg-muted/30 p-3">
                <pre className="text-xs font-mono text-foreground/80">
                  {JSON.stringify(toolArgs, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? "Confirmando..." : "Ejecutar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
