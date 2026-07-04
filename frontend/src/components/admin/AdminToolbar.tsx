import type { ReactNode } from "react";

type Props = {
  actions?: {
    filter?: ReactNode;
    primary?: ReactNode;
    secondary?: ReactNode;
    tertiary?: ReactNode;
  };
  className?: string;
  primary: ReactNode;
  secondary?: ReactNode;
  summary?: ReactNode;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function actionSlot(className: string, content: ReactNode) {
  if (!content) {
    return null;
  }

  return <div className={classNames("admin-toolbar-action-slot", className)}>{content}</div>;
}

export function AdminToolbar({ actions, className, primary, secondary, summary }: Props) {
  const hasActions = Boolean(actions?.filter || actions?.tertiary || actions?.secondary || actions?.primary);

  return (
    <div className={classNames("admin-toolbar", className)}>
      <div className="admin-toolbar-primary">{primary}</div>
      {summary ? <div className="admin-toolbar-summary">{summary}</div> : null}
      {secondary ? (
        <>
          <span className="admin-toolbar-separator" aria-hidden="true" />
          <div className="admin-toolbar-secondary">{secondary}</div>
        </>
      ) : null}
      {actions && hasActions ? (
        <div className="admin-toolbar-actions">
          {actionSlot("admin-toolbar-action-slot--filter", actions.filter)}
          {actionSlot("admin-toolbar-action-slot--tertiary", actions.tertiary)}
          {actionSlot("admin-toolbar-action-slot--secondary", actions.secondary)}
          {actionSlot("admin-toolbar-action-slot--primary", actions.primary)}
        </div>
      ) : null}
    </div>
  );
}
