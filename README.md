# @keenmate/svelte-treeview-canvas

Canvas 2D rendering plugin for [`@keenmate/svelte-treeview`](https://github.com/keenmate/svelte-treeview). Renders trees on an HTML Canvas with pan, zoom, multiple layout modes, and full interactivity.

This package was originally part of `@keenmate/svelte-treeview` but has been extracted into its own package to separate concerns — the core package handles tree data, expand/collapse, search, drag & drop logic, while this package provides a high-performance canvas renderer on top of the same core. **You still need `@keenmate/svelte-treeview` installed** — it is a required peer dependency.

## What's New (Unreleased) — follows `@keenmate/svelte-treeview` 5.0.0-rc16

Breaking — the same vocabulary as svelte-treeview / web-treeview (see CHANGELOG for every rename):

- **`data` → `nodes`** (bindable: after a mutation `bind:nodes` receives the tree's data).
- **`selectedPath` → `focusedPath`** (the cursor node); `selectedPaths` stays the selection.
  `isSelectedMember` → `isCheckedMember` (the checkbox set, `controller.checkedPaths`).
- **One ctx object per callback**: `onNodeClick(ctx)`, `onSelectionChange({ paths, nodes, controller })`,
  `onNodeDrop({ source, target, position, controller })`, `sortCallback({ nodes })`, `get*Callback({ node })`,
  `transformDataForPaste({ data, … })`; `onPaste` → `onNodePaste`.
- **Context menus use the core action-item model**: `{ text, icon, onClick(detail), isDanger, isToggled, children }`,
  `createMenuDivider(text?)` and built-in action names (`'copy'`, `'paste'`, `'delete'`, `'expand-subtree'`, `'sort'`…);
  `beforeActionCallback` / `onAction`. Menu callbacks take one ctx (`TreeMenuContext`).
- **Expand family**: `ExpandOptions { isExclusive, isSilent }`, `toggleNodeExpanded`, `bind:expandedPaths`,
  `onNodeExpand` / `onNodeCollapse` / `onExpandedChange` / `beforeExpandCallback`.
- **Sorting**: `isSortingEnabled`, `sortNodes` / `sortAll`, `onNodesReorder`. Also `labels`, `onTreeChange`.
- **`expandLevel` defaults to `0`** (only the roots), like svelte-treeview.
- **Boolean props use is / should prefixes**: `isCollapsingEnabled`, `shouldGroupSiblings`, `isDotGridShown`,
  `isFishboneCrossNavEnabled`, `shouldFocusOnSelect`, `isClipboardEnabled`; `FocusOptions { shouldAnimate, shouldSelect }`.
- Requires `@keenmate/svelte-treeview` `^5.0.0-rc16` (peerDependency).
- Fix: PageUp / PageDown and Shift+navigation no longer recurse forever.

## What's New in v1.0.0-rc04

- **Array variants on `expandAll` / `collapseAll`**: Pass `string[]` to expand or collapse multiple subtrees in one call (single emit).
- **`expandNodes` / `collapseNodes` exported on `CanvasTree`**: Parity with HTML `Tree` — no need to reach into `ctrlRef` for common ops. Both accept `string | string[]`.
- **`{ exclusive: true }` on `expandAll` / `expandNodes`**: Opens the target path(s) and collapses everything currently expanded that isn't on the spine — single pass, no intermediate fully-collapsed flicker.
- **`{ noEmit: true }` option**: Skips the change emit on any of the four expand/collapse methods; batch multiple ops and emit once via `controller.tree.refresh()`.
- **`isSelectedMember` / `isSelectableMember` props passthrough**: Forward to the core `TreeProvider` so canvas users can seed `selectedPaths` from data and gate selectability per node. Requires `@keenmate/svelte-treeview` >= 5.0.0-rc07.
- **Internal: migrated to `highlightNode` / `highlightNodes`**: Canvas interaction code and the dendrogram example now use the rc06 names instead of the deprecated `selectNode` / `selectNodes` aliases. No user-visible API change.
- **`/examples/expand-collapse` demo page**: Three cards — Array variants, Exclusive focus mode, and `isSelectedMember` seeding — each on a live canvas tree with current-expanded-paths readout.

## Installation

```bash
npm install @keenmate/svelte-treeview @keenmate/svelte-treeview-canvas
```

Both packages are required. `@keenmate/svelte-treeview` provides the core tree logic; this package provides the canvas renderer.

## Quick Start

```svelte
<script lang="ts">
  import { CanvasTree } from '@keenmate/svelte-treeview-canvas';
  import type { LTreeNode } from '@keenmate/svelte-treeview';

  const data = [
    { id: 1, path: '1', parentPath: '', name: 'Root', hasChildren: true },
    { id: 2, path: '1.1', parentPath: '1', name: 'Child A', hasChildren: false },
    { id: 3, path: '1.2', parentPath: '1', name: 'Child B', hasChildren: false },
  ];

  function sortByName({ nodes }: { nodes: LTreeNode<any>[] }) {
    return [...nodes].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
  }
</script>

<div style="height: 500px;">
  <CanvasTree
    nodes={data}
    idMember="id"
    pathMember="path"
    sortCallback={sortByName}
    isSorted={true}
    expandLevel={3}
    getNodeLabelCallback={(node) => node.data?.name || node.path}
  />
</div>
```

## Features

- **Layout modes**: Tree, balanced, fishbone, radial, box, and sunburst
- **Pan & zoom**: Mouse wheel zoom, click-drag pan, minimap navigation
- **Level-of-detail (LOD)**: Three zoom tiers (full, medium, simple) for progressive detail reduction
- **Custom node rendering**: Override individual render slots (background, color bar, body, chevron, badge) or the entire node via callbacks
- **CSS variable theming**: `--base-*` shared design tokens flow into `--ct-*` component variables. Priority chain: `theme` prop > `--ct-*` > `--base-*` > hardcoded default
- **Multi-select**: Ctrl+click toggle, Shift+click range (visual 2D or logical tree-order), Shift+drag rectangle selection
- **Drag and drop**: Canvas-native with drop zone overlays (before/after/child)
- **Context menu**: 4 levels — node, selection, group box, canvas. Icons, shortcuts, submenus, dividers, danger styling
- **Tooltip**: DOM-based tooltip snippet over hovered nodes
- **Search integration**: Dimming, match highlighting, and result navigation
- **Focus API**: `focusOnPath()` / `focusOnNode()` with anchor, zoom, and animation options
- **Depth colors**: 10-level cycling palette, configurable per-level via `levelConfig`
- **Per-level overrides**: Height, width, gap, color per depth level

## Layout Modes

| Mode | Description |
|------|-------------|
| `tree` | Classic hierarchical dendrogram |
| `balanced` | Balanced horizontal tree |
| `fishbone` | Alternating top/bottom branches |
| `radial` | Radial/sunburst circular layout |
| `box` | Grid-based box layout |
| `sunburst` | Accordion sunburst with arc rendering |

```svelte
<CanvasTree {nodes} layoutMode="fishbone" growthDirection="right" ... />
```

## Theming

Set shared design tokens on any ancestor element:

```html
<div style="--base-primary-color: #e11d48; --base-main-bg: #fff1f2;">
  <CanvasTree {nodes} ... />
</div>
```

Or use the `theme` prop for direct overrides:

```svelte
<CanvasTree {nodes} theme={{ bg: '#1a1a2e', nodeText: '#e2e8f0' }} ... />
```

Key CSS variables: `--base-primary-color`, `--base-main-bg`, `--base-elevated-bg`, `--base-text-color-1`, `--base-border-color`, `--base-font-family`. Component-specific: `--ct-node-radius`, `--ct-conn-color`, `--ct-menu-bg`, etc.

## Context Menu

The same entry model as svelte-treeview's `<Tree>` (core action items): items, `createMenuDivider(text?)`
and built-in action names (texts from `labels`; they act on the selection when the node is in it).

```typescript
import { createMenuDivider } from '@keenmate/svelte-treeview';
import type { TreeMenuContext, TreeMenuEntry } from '@keenmate/svelte-treeview';

function getContextMenu({ node, controller }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
  return [
    { icon: '👤', text: 'View', shortcut: 'V', onClick: () => view(node) },
    createMenuDivider('Actions'),
    { icon: '✏️', text: 'Edit', isDisabled: node.data.readonly, onClick: () => edit(node) },
    { icon: '📋', text: 'Copy...', children: [
      { text: 'Name', onClick: () => copyName(node) },
      { text: 'Email', onClick: () => copyEmail(node) },
    ]},
    'cut', 'paste', 'expand-subtree',          // built-in actions
    createMenuDivider('Danger zone'),
    { icon: '🗑️', text: 'Delete', isDanger: true, onClick: () => del(node) },
  ];
}
```

```svelte
<CanvasTree
  {nodes}
  getNodeContextMenuItemsCallback={getContextMenu}
  getGroupContextMenuItemsCallback={({ node, childNodes }) => [...]}
  getCanvasContextMenuItemsCallback={({ controller }) => [...]}
  onAction={(detail) => console.log(detail.action, detail.path)}
  ...
/>
```

## Custom Node Rendering

Override individual render slots or the entire node:

```typescript
import type { CanvasRenderContext } from '@keenmate/svelte-treeview-canvas';

function renderBody(rctx: CanvasRenderContext<Item>) {
  const { ctx, node, bounds, config, theme } = rctx;
  ctx.font = config.fontBold;
  ctx.fillStyle = theme.nodeText;
  ctx.fillText(node.data?.name || '', bounds.x + 10, bounds.y + bounds.h / 2);
}
```

```svelte
<CanvasTree {nodes} renderBodyCallback={renderBody} ... />
```

## Examples

Run the dev server to browse interactive examples:

```bash
npm run dev
```

- **Canvas Dendrogram** — 5000+ nodes with pan, zoom, drag-drop, multi-select, 4-level context menus
- **Org Chart** — Business card nodes with avatars and status indicators
- **NHL Playoff Bracket** — Custom matchup card rendering
- **Theming** — CSS variable presets and geometry controls
- **Context Menu** — All context menu features with 7 preset configurations

## License

MIT - [KeenMate](https://github.com/keenmate)
