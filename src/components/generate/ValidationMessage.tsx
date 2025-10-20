import { cn } from "@/lib/utils";

interface ValidationMessageProps {
  message: string | null;
  id?: string;
  className?: string;
}

export function ValidationMessage({ message, id, className }: ValidationMessageProps) {
  if (!message) return null;

  return (
    <p id={id} className={cn("text-sm text-red-600 dark:text-red-500 mt-1", className)} role="alert">
      {message}
    </p>
  );
}
