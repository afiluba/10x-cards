import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AcceptedCounter } from "./AcceptedCounter";

interface ProposalsHeaderProps {
  acceptedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function ProposalsHeader({ acceptedCount, totalCount, onSelectAll, onDeselectAll }: ProposalsHeaderProps) {
  const handleSelectAll = () => {
    onSelectAll();
    toast.success("Wszystkie propozycje zaznaczone", {
      description: `Zaakceptowano ${totalCount} propozycji`,
    });
  };

  const handleDeselectAll = () => {
    onDeselectAll();
    toast.info("Wszystkie propozycje odznaczone");
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
          Zaznacz wszystkie
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll}>
          Odznacz wszystkie
        </Button>
      </div>

      <AcceptedCounter accepted={acceptedCount} total={totalCount} />
    </div>
  );
}
