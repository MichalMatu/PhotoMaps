import type { ReactNode } from "react";

import type { AdminMediaCityGroup, AdminMediaItem, AdminMediaPlaceGroup } from "./adminMediaGroups";
import { AdminDisclosureRow } from "./AdminDisclosureRow";
import { AdminListPanel } from "./AdminListPanel";
import { AdminMediaAlbums } from "./AdminMediaAlbums";
import { polishCountLabel } from "../ui/polishCountLabel";

type Props<TItem extends AdminMediaItem> = {
  countLabel: (count: number) => string;
  emptyMessage: string;
  expandedCityId: string | null;
  expandedPlaceId: string | null;
  groups: Array<AdminMediaCityGroup<TItem>>;
  onToggleCity: (cityId: string) => void;
  onTogglePlace: (placeId: string) => void;
  renderItem: (item: TItem, group: AdminMediaPlaceGroup<TItem>) => ReactNode;
  renderPanel?: (group: AdminMediaPlaceGroup<TItem>) => ReactNode;
};

function placeCountLabel(count: number) {
  return polishCountLabel(count, {
    few: "miejsca",
    many: "miejsc",
    one: "miejsce",
  });
}

export function AdminMediaCityAlbums<TItem extends AdminMediaItem>({
  countLabel,
  emptyMessage,
  expandedCityId,
  expandedPlaceId,
  groups,
  onToggleCity,
  onTogglePlace,
  renderItem,
  renderPanel,
}: Props<TItem>) {
  if (groups.length === 0) {
    return <p className="ui-empty">{emptyMessage}</p>;
  }

  return (
    <AdminListPanel className="admin-media-city-albums" mode="responsive-cards">
      {groups.map((group) => {
        const isExpanded = expandedCityId === group.cityId;
        const panelId = `admin-media-city-${group.cityId || "unknown"}`;
        return (
          <AdminDisclosureRow
            className="admin-list-group admin-media-city"
            collapseLabel={`Zwiń media miasta ${group.cityName}`}
            element="section"
            expandLabel={`Pokaż media miasta ${group.cityName}`}
            headerClassName="admin-list-group-row admin-media-city-row"
            isExpanded={isExpanded}
            key={group.cityId || "unknown"}
            meta={
              <>
                <span className="admin-list-group-meta-item">{placeCountLabel(group.placeGroups.length)}</span>
                <span className="admin-list-group-meta-item">{countLabel(group.itemCount)}</span>
              </>
            }
            metaClassName="admin-list-group-meta"
            panelClassName="admin-list-group-panel admin-media-city-panel"
            panelId={panelId}
            summary={<span className="admin-list-group-title">{group.cityName}</span>}
            summaryClassName="admin-list-group-label"
            toggleClassName="admin-list-group-toggle"
            onToggle={() => onToggleCity(group.cityId)}
          >
            <AdminMediaAlbums
              countLabel={countLabel}
              emptyMessage={emptyMessage}
              expandedPlaceId={expandedPlaceId}
              groups={group.placeGroups}
              onTogglePlace={onTogglePlace}
              renderItem={renderItem}
              renderPanel={renderPanel}
            />
          </AdminDisclosureRow>
        );
      })}
    </AdminListPanel>
  );
}
