import type { ReactNode } from "react";

import { mediaUrl } from "../../api/client";
import type { AdminMediaItem, AdminMediaPlaceGroup } from "./adminMediaGroups";

type Props<TItem extends AdminMediaItem> = {
  countLabel: (count: number) => string;
  emptyMessage: string;
  expandedPlaceId: string | null;
  groups: Array<AdminMediaPlaceGroup<TItem>>;
  onTogglePlace: (placeId: string) => void;
  renderItem: (item: TItem, group: AdminMediaPlaceGroup<TItem>) => ReactNode;
};

export function AdminMediaAlbums<TItem extends AdminMediaItem>({
  countLabel,
  emptyMessage,
  expandedPlaceId,
  groups,
  onTogglePlace,
  renderItem,
}: Props<TItem>) {
  if (groups.length === 0) {
    return <p className="notice">{emptyMessage}</p>;
  }

  return (
    <div className="admin-media-albums">
      {groups.map((group) => {
        const isExpanded = expandedPlaceId === group.placeId;
        return (
          <section className={isExpanded ? "admin-media-album is-open" : "admin-media-album"} key={group.placeId}>
            <button
              aria-expanded={isExpanded}
              className="admin-media-album-summary"
              type="button"
              onClick={() => onTogglePlace(group.placeId)}
            >
              <img
                className="admin-media-album-cover"
                alt={group.title}
                decoding="async"
                loading="lazy"
                src={mediaUrl(group.coverItem.thumb_path)}
              />
              <div className="admin-media-album-meta">
                <strong className="admin-media-album-title">{group.title}</strong>
                <span className="admin-media-album-category">{group.categoryLabel}</span>
              </div>
              <span className="admin-media-count">{countLabel(group.items.length)}</span>
            </button>
            {isExpanded ? (
              <div className="admin-media-gallery">{group.items.map((item) => renderItem(item, group))}</div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
