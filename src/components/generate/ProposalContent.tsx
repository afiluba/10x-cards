interface ProposalContentProps {
  frontText: string;
  backText: string;
}

export function ProposalContent({ frontText, backText }: ProposalContentProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">Przód:</p>
        <p className="text-sm">{frontText}</p>
      </div>
      
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">Tył:</p>
        <p className="text-sm">{backText}</p>
      </div>
    </div>
  );
}

