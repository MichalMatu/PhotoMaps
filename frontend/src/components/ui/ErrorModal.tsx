import { SystemModal } from "./SystemModal";

export type OperationError = {
  details?: string | null;
  message: string;
  title: string;
};

type Props = OperationError & {
  onClose: () => void;
};

export function errorDetails(reason: unknown): string | null {
  return reason instanceof Error ? reason.message : null;
}

export function ErrorModal({ details = null, message, onClose, title }: Props) {
  return (
    <SystemModal
      confirmLabel="Rozumiem"
      details={details}
      eyebrow="Błąd"
      message={message}
      title={title}
      tone="error"
      onClose={onClose}
    />
  );
}
