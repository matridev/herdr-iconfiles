// Picks a Material Icon Theme icon for a file or folder, the way VS Code does:
// exact file name, then the longest matching extension ("service.spec.ts"
// before "spec.ts" before "ts"), then the plain file icon. Light themes
// check the theme's light variants first.
import MAP from "./icon-map.js";

const BASE = "mods/file-icons/icons";
const path = id => `${BASE}/${id}.svg`;

function lookup(table, key, light) {
  return (light && MAP.light[table][key]) || MAP[table][key];
}

export function fileIcon(name, light) {
  const n = name.toLowerCase();
  const byName = lookup("names", n, light);
  if (byName) return path(byName);
  for (let i = n.indexOf("."); i !== -1; i = n.indexOf(".", i + 1)) {
    const icon = lookup("exts", n.slice(i + 1), light);
    if (icon) return path(icon);
  }
  return path(MAP.file);
}

export function folderIcon(name, open, light) {
  const icon = lookup("folders", name.toLowerCase(), light);
  if (icon) return path(open ? `${icon}-open` : icon);
  return path(open ? MAP.folderOpen : MAP.folder);
}
