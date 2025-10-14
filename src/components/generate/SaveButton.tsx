import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveButtonProps {
  acceptedCount: number;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

export function SaveButton({ acceptedCount, onSave, isLoading }: SaveButtonProps) {
  return (
    <div className="flex justify-end mt-6">
      <Button
        onClick={onSave}
        disabled={acceptedCount === 0 || isLoading}
        size="lg"
        className="min-w-[200px]"
      >
        {isLoading && <Loader2 className="animate-spin" />}
        Zapisz fiszki ({acceptedCount})
      </Button>
    </div>
  );
}

