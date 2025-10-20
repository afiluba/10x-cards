import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  min?: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, min, max, className }: CharacterCounterProps) {
  const isValid = (!min || current >= min) && current <= max;
  const isOverMax = current > max;
  const isUnderMin = min && current < min;

  return (
    <div
      className={cn(
        "text-sm",
        isValid && "text-green-600 dark:text-green-500",
        isOverMax && "text-red-600 dark:text-red-500",
        isUnderMin && "text-orange-600 dark:text-orange-500",
        className
      )}
      aria-live="polite"
    >
      {current} / {max} znaków
    </div>
  );
}
