import { Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProposalActionsProps {
  onEdit: () => void;
  onReject: () => void;
}

export function ProposalActions({ onEdit, onReject }: ProposalActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="flex-1"
      >
        <Edit2 />
        Edytuj
      </Button>
      
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onReject}
        className="flex-1"
      >
        <X />
        Odrzuć
      </Button>
    </div>
  );
}

