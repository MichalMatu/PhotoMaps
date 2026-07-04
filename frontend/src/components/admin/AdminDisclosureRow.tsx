import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type DisclosureElement = "article" | "div" | "section";

type Props = {
  actions?: ReactNode;
  actionsClassName?: string;
  children: ReactNode;
  className?: string;
  collapseLabel: string;
  element?: DisclosureElement;
  expandLabel: string;
  headerClassName?: string;
  isExpanded: boolean;
  meta?: ReactNode;
  metaClassName?: string;
  onToggle: () => void;
  panelClassName?: string;
  panelId: string;
  summary: ReactNode;
  summaryClassName?: string;
  toggleClassName?: string;
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AdminDisclosureRow({
  actions,
  actionsClassName,
  children,
  className,
  collapseLabel,
  element: Element = "div",
  expandLabel,
  headerClassName,
  isExpanded,
  meta,
  metaClassName,
  onToggle,
  panelClassName,
  panelId,
  summary,
  summaryClassName,
  toggleClassName,
}: Props) {
  return (
    <Element className={classNames("admin-disclosure-row", className, isExpanded && "is-expanded")}>
      <div className={classNames("admin-disclosure-header", headerClassName)}>
        <button
          aria-controls={panelId}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? collapseLabel : expandLabel}
          className={classNames("admin-disclosure-toggle", toggleClassName)}
          type="button"
          onClick={onToggle}
        >
          <span className="admin-disclosure-indicator">
            {isExpanded ? <ChevronDown aria-hidden="true" size={18} /> : <ChevronRight aria-hidden="true" size={18} />}
          </span>
          <span className={classNames("admin-disclosure-summary", summaryClassName)}>{summary}</span>
          {meta ? <span className={classNames("admin-disclosure-meta", metaClassName)}>{meta}</span> : null}
        </button>
        {actions ? <div className={classNames("admin-disclosure-actions", actionsClassName)}>{actions}</div> : null}
      </div>
      {isExpanded ? (
        <div className={panelClassName} id={panelId}>
          {children}
        </div>
      ) : null}
    </Element>
  );
}
