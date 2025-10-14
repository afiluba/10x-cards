import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError } from "./types";

interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const [countdown, setCountdown] = useState(error.retryAfter || 0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <AlertCircle className="size-16 text-destructive" />
      <h3 className="text-xl font-semibold">Wystąpił błąd</h3>
      <p className="text-center text-muted-foreground max-w-md">{error.message}</p>
      
      {error.retryable && onRetry && (
        <div className="flex flex-col items-center gap-2 mt-4">
          {countdown > 0 && (
            <p className="text-sm text-muted-foreground">
              Spróbuj ponownie za {countdown} sekund
            </p>
          )}
          <Button
            onClick={onRetry}
            disabled={countdown > 0}
            variant="default"
          >
            {countdown > 0 ? `Odczekaj (${countdown}s)` : "Spróbuj ponownie"}
          </Button>
        </div>
      )}
    </div>
  );
}

