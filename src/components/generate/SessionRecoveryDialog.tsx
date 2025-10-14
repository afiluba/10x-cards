import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionRecoveryDialogProps {
  open: boolean;
  proposalsCount: number;
  onRecover: () => void;
  onDiscard: () => void;
}

export function SessionRecoveryDialog({ open, proposalsCount, onRecover, onDiscard }: SessionRecoveryDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Przywrócić poprzednią sesję?</AlertDialogTitle>
          <AlertDialogDescription>
            Znaleziono niezapisaną sesję generowania z {proposalsCount} propozycjami. Czy chcesz ją przywrócić?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Odrzuć</AlertDialogCancel>
          <AlertDialogAction onClick={onRecover}>Przywróć</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
