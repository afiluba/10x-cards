import type { ProposalViewModel, ProposalEditorData } from "./types";
import { ProposalCard } from "./ProposalCard";

interface ProposalsListProps {
  proposals: ProposalViewModel[];
  onCheck: (id: string) => void;
  onEdit: (id: string, data: ProposalEditorData) => void;
  onReject: (id: string) => void;
}

export function ProposalsList({ proposals, onCheck, onEdit, onReject }: ProposalsListProps) {
  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Brak propozycji do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      role="region"
      aria-label="Lista propozycji fiszek"
    >
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.temporary_id}
          proposal={proposal}
          onCheck={onCheck}
          onEdit={onEdit}
          onReject={onReject}
        />
      ))}
    </div>
  );
}

