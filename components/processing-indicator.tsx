"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface ProcessingIndicatorProps {
  isLoading: boolean;
  startTime?: number;
}

export function ProcessingIndicator({ isLoading, startTime }: ProcessingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [criticalHang, setCriticalHang] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      setShowWarning(false);
      setCriticalHang(false);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(prev => {
        const newElapsed = prev + 1;
        
        // Show warning after 15 seconds
        if (newElapsed > 15 && !showWarning) {
          setShowWarning(true);
        }
        
        // Critical warning after 30 seconds (likely hung)
        if (newElapsed > 30 && !criticalHang) {
          setCriticalHang(true);
        }
        
        return newElapsed;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, showWarning, criticalHang]);

  if (!isLoading) return null;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-3">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
        criticalHang 
          ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
          : showWarning
          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
          : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
      }`}>
        {criticalHang ? (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        )}
        <span className={`text-sm font-medium ${
          criticalHang
            ? 'text-red-700 dark:text-red-300'
            : showWarning
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-blue-700 dark:text-blue-300'
        }`}>
          {criticalHang 
            ? '🔴 Tomando demasiado tiempo'
            : 'Procesando...'}
          <span className="ml-2 font-semibold">{formatTime(elapsed)}</span>
        </span>
      </div>
      
      {showWarning && (
        <p className={`text-xs text-center max-w-xs ${
          criticalHang
            ? 'text-red-600 dark:text-red-400 font-semibold'
            : 'text-amber-600 dark:text-amber-400'
        }`}>
          {criticalHang
            ? '⚠️ La solicitud parece estar colgada. Haz clic en detener (🛑) si quieres cancelar.'
            : '⚠️ Esto está tomando más de lo esperado. Puedes detener con el botón de parar.'}
        </p>
      )}
    </div>
  );
}
