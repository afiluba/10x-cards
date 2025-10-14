import type { ProposalViewModel } from "./types";
import { ProposalsHeader } from "./ProposalsHeader";
import { ProposalsList } from "./ProposalsList";
import { SaveButton } from "./SaveButton";

interface ProposalsSectionProps {
  proposals: ProposalViewModel[];
  acceptedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCheck: (id: string) => void;
  onEdit: (id: string, data: { front: string; back: string }) => void;
  onReject: (id: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function ProposalsSection({
  proposals,
  acceptedCount,
  onSelectAll,
  onDeselectAll,
  onCheck,
  onEdit,
  onReject,
  onSave,
  isSaving,
}: ProposalsSectionProps) {
  return (
    <section className="space-y-6">
      <ProposalsHeader
        acceptedCount={acceptedCount}
        totalCount={proposals.length}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
      />
      
      <ProposalsList
        proposals={proposals}
        onCheck={onCheck}
        onEdit={onEdit}
        onReject={onReject}
      />
      
      <SaveButton
        acceptedCount={acceptedCount}
        onSave={onSave}
        isLoading={isSaving}
      />
    </section>
  );
}

