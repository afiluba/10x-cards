interface AcceptedCounterProps {
  accepted: number;
  total: number;
}

export function AcceptedCounter({ accepted, total }: AcceptedCounterProps) {
  return (
    <p className="text-sm font-medium" aria-live="polite">
      Zaakceptowano: <span className="text-primary">{accepted}</span> / {total}
    </p>
  );
}

