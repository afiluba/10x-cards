import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Generuję fiszki... To może potrwać do 30 sekund" }: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] gap-4"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-12 animate-spin text-primary" />
      <p className="text-lg text-muted-foreground">{message}</p>
    </div>
  );
}

