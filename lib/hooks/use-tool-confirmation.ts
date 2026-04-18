import { useState, useCallback, useRef } from "react";

export interface PendingToolConfirmation {
  id: string;
  name: string;
  description?: string;
  args: Record<string, any>;
}

export interface ToolConfirmationState {
  enabled: boolean;
  showAlwaysApproveOption: boolean;
  alwaysApprove: Set<string>; // Tool names to always approve
}

export function useToolConfirmation() {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [pendingTool, setPendingTool] = useState<PendingToolConfirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationEnabled, setConfirmationEnabled] = useState(true);
  const [alwaysApproveTool, setAlwaysApproveTool] = useState<Set<string>>(new Set());

  const confirmationCallbackRef = useRef<((confirm: boolean, rememberChoice?: boolean) => void) | null>(null);

  const requestToolConfirmation = useCallback(
    (tool: PendingToolConfirmation): Promise<boolean> => {
      return new Promise((resolve) => {
        // Si está en la lista de "siempre aprobar", no pedir confirmación
        if (alwaysApproveTool.has(tool.name)) {
          resolve(true);
          return;
        }

        // Si confirmación está deshabilitada, aprobar automáticamente
        if (!confirmationEnabled) {
          resolve(true);
          return;
        }

        setPendingTool(tool);
        setIsConfirmationOpen(true);

        confirmationCallbackRef.current = (confirm: boolean, rememberChoice?: boolean) => {
          if (confirm && rememberChoice) {
            setAlwaysApproveTool((prev) => new Set([...prev, tool.name]));
          }
          resolve(confirm);
        };
      });
    },
    [confirmationEnabled, alwaysApproveTool]
  );

  const handleConfirm = useCallback((rememberChoice?: boolean) => {
    setIsConfirming(true);
    confirmationCallbackRef.current?.(true, rememberChoice);
    setTimeout(() => {
      setIsConfirmationOpen(false);
      setPendingTool(null);
      setIsConfirming(false);
      confirmationCallbackRef.current = null;
    }, 100);
  }, []);

  const handleCancel = useCallback(() => {
    setIsConfirming(true);
    confirmationCallbackRef.current?.(false);
    setTimeout(() => {
      setIsConfirmationOpen(false);
      setPendingTool(null);
      setIsConfirming(false);
      confirmationCallbackRef.current = null;
    }, 100);
  }, []);

  const toggleConfirmationEnabled = useCallback(() => {
    setConfirmationEnabled((prev) => !prev);
  }, []);

  const removeTool = useCallback((toolName: string) => {
    setAlwaysApproveTool((prev) => {
      const next = new Set(prev);
      next.delete(toolName);
      return next;
    });
  }, []);

  return {
    isConfirmationOpen,
    pendingTool,
    isConfirming,
    confirmationEnabled,
    alwaysApproveTool,
    requestToolConfirmation,
    handleConfirm,
    handleCancel,
    toggleConfirmationEnabled,
    removeTool,
  };
}
