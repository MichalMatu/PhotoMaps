import type { ReactNode } from "react";

type AdminListPanelMode = "panel" | "responsive-cards";

type Props = {
  children: ReactNode;
  className?: string;
  mode?: AdminListPanelMode;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AdminListPanel({ children, className, mode = "panel" }: Props) {
  return (
    <div
      className={classNames(
        "ui-table-panel admin-list-panel",
        mode === "responsive-cards" && "admin-list-panel--responsive-cards",
        className,
      )}
    >
      {children}
    </div>
  );
}
