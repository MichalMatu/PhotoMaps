import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  open: boolean;
  subtitle?: ReactNode;
  title: string;
  onClose: () => void;
};

export function ResponsiveSheet({ children, footer, open, subtitle, title, onClose }: Props) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <aside className="pm-sheet" aria-label={title}>
      <div className="pm-sheet__handle" aria-hidden="true" />
      <header className="pm-sheet__header">
        <div>
          {subtitle ? <div className="pm-sheet__subtitle">{subtitle}</div> : null}
          <h2>{title}</h2>
        </div>
        <button className="pm-sheet__close" type="button" onClick={onClose} aria-label="Zamknij panel">
          <X aria-hidden="true" size={18} />
        </button>
      </header>
      <div className="pm-sheet__body">{children}</div>
      {footer ? <footer className="pm-sheet__footer">{footer}</footer> : null}
    </aside>
  );
}
