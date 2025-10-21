import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProposalViewModel, ProposalEditorData } from "./types";
import { ProposalContent } from "./ProposalContent";
import { ProposalActions } from "./ProposalActions";
import { ProposalEditor } from "./ProposalEditor";

interface ProposalCardProps {
  proposal: ProposalViewModel;
  onCheck: (id: string) => void;
  onEdit: (id: string, data: ProposalEditorData) => void;
  onReject: (id: string) => void;
}

export function ProposalCard({ proposal, onCheck, onEdit, onReject }: ProposalCardProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleSave = (data: ProposalEditorData) => {
    onEdit(proposal.temporary_id, data);
    setIsEditMode(false);
    toast.success("Propozycja zaktualizowana", {
      description: "Zmiany zostały zapisane i propozycja została zaakceptowana",
    });
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleReject = () => {
    onReject(proposal.temporary_id);
    toast.info("Propozycja odrzucona");
  };

  return (
    <Card className={cn("transition-all", proposal.isEdited && "border-purple-500 dark:border-purple-400")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`accept-${proposal.temporary_id}`}
              checked={proposal.isAccepted}
              onCheckedChange={() => onCheck(proposal.temporary_id)}
              disabled={isEditMode}
              aria-label={`Zaakceptuj propozycję`}
            />
            <label htmlFor={`accept-${proposal.temporary_id}`} className="text-sm font-medium cursor-pointer">
              Zaakceptuj
            </label>
          </div>

          {proposal.isEdited && (
            <Badge variant="secondary" className="text-xs">
              Edytowano
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditMode ? (
          <ProposalEditor
            initialFront={proposal.front_text}
            initialBack={proposal.back_text}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <>
            <ProposalContent frontText={proposal.front_text} backText={proposal.back_text} />

            <ProposalActions onEdit={handleEdit} onReject={handleReject} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
