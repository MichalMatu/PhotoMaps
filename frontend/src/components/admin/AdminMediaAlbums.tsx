import type { ReactNode } from "react";

import type { AdminMediaItem, AdminMediaPlaceGroup } from "./adminMediaGroups";
import { AdminMediaImage } from "./AdminAuthenticatedMedia";
import { AdminDisclosureRow } from "./AdminDisclosureRow";

type Props<TItem extends AdminMediaItem> = {
  countLabel: (count: number) => string;
  emptyMessage: string;
  expandedPlaceId: string | null;
  groups: Array<AdminMediaPlaceGroup<TItem>>;
  onTogglePlace: (placeId: string) => void;
  renderItem: (item: TItem, group: AdminMediaPlaceGroup<TItem>) => ReactNode;
  renderPanel?: (group: AdminMediaPlaceGroup<TItem>) => ReactNode;
};

export function AdminMediaAlbums<TItem extends AdminMediaItem>({
  countLabel,
  emptyMessage,
  expandedPlaceId,
  groups,
  onTogglePlace,
  renderItem,
  renderPanel,
}: Props<TItem>) {
  if (groups.length === 0) {
    return <p className="ui-empty">{emptyMessage}</p>;
  }

  return (
    <div className="admin-media-albums">
      {groups.map((group) => {
        const isExpanded = expandedPlaceId === group.placeId;
        const panelId = `admin-media-album-${group.placeId}`;
        return (
          <AdminDisclosureRow
            className="ui-panel admin-media-album"
            collapseLabel={`Zwiń media miejsca ${group.title}`}
            element="section"
            expandLabel={`Pokaż media miejsca ${group.title}`}
            isExpanded={isExpanded}
            key={group.placeId}
            meta={countLabel(group.itemCount)}
            metaClassName="admin-media-count"
            panelClassName="admin-media-gallery"
            panelId={panelId}
            summary={
              <>
                <AdminMediaImage
                  className="admin-media-album-cover"
                  alt={group.title}
                  decoding="async"
                  loading="lazy"
                  src={group.coverItem.admin_thumb_path ?? group.coverItem.thumb_path ?? ""}
                />
                <span className="admin-media-album-meta">
                  <strong className="admin-media-album-title">{group.title}</strong>
                  <span className="admin-media-album-category">{group.categoryLabel}</span>
                </span>
              </>
            }
            summaryClassName="admin-media-album-summary-content"
            toggleClassName="admin-media-album-summary"
            onToggle={() => onTogglePlace(group.placeId)}
          >
            {renderPanel ? renderPanel(group) : group.items.map((item) => renderItem(item, group))}
          </AdminDisclosureRow>
        );
      })}
    </div>
  );
}
