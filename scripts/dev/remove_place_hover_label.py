from pathlib import Path

place_marker = Path('frontend/src/components/map/PlaceMarker.tsx')
text = place_marker.read_text()
text = text.replace('import { Marker, Tooltip, useMap } from "react-leaflet";\n', 'import { Marker, useMap } from "react-leaflet";\n')
text = text.replace('  const markerTitle = place.title;\n\n', '')
text = text.replace('    const handleFocus = () => {\n      onPrefetchGallery();\n      marker.openTooltip();\n    };\n    const handleBlur = () => marker.closeTooltip();\n\n', '    const handleFocus = () => onPrefetchGallery();\n\n')
text = text.replace('    element.addEventListener("blur", handleBlur);\n', '')
text = text.replace('      element.removeEventListener("blur", handleBlur);\n', '')
text = text.replace('        title={markerTitle}\n', '        title={place.title}\n')
old = '''      >\n        {!isExpanded ? (\n          <Tooltip\n            className="place-marker-hover-tooltip"\n            direction="top"\n            offset={[0, -Math.round(placeLayout.height / 2) - 6]}\n            opacity={1}\n          >\n            {place.title}\n          </Tooltip>\n        ) : null}\n      </Marker>\n'''
new = '''      />\n'''
if old not in text:
    raise SystemExit('expected tooltip block not found')
text = text.replace(old, new)
place_marker.write_text(text)

css = Path('frontend/src/styles/map.css')
text = css.read_text()
old = '''.place-map .place-marker-hover-tooltip {\n  background: var(--surface-media-glass-action);\n  backdrop-filter: var(--blur-glass);\n  border: 1px solid var(--border-on-media-subtle);\n  border-radius: var(--radius-control);\n  box-shadow: var(--shadow-media-glass-action);\n  color: var(--content-on-media);\n  font-size: var(--text-caption);\n  font-weight: 650;\n  line-height: 1.15;\n  padding: var(--space-1) var(--space-2);\n  pointer-events: none;\n  white-space: nowrap;\n}\n\n.place-map .leaflet-tooltip-top.place-marker-hover-tooltip::before {\n  border-top-color: var(--surface-media-glass-action);\n}\n\n'''
if old not in text:
    raise SystemExit('expected tooltip css not found')
text = text.replace(old, '')
css.write_text(text)
