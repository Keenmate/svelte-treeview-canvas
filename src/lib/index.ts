// Component
export { default as CanvasTree } from "./CanvasTree.svelte"

// Canvas types (for users writing custom render callbacks)
export type {
    CanvasRenderContext, CanvasNodeBounds, CanvasNodeState, CanvasVisualConfig,
    CanvasLevelConfig,
    RenderNodeCallback, RenderSlotCallback,
    MeasureNodeWidthCallback, MeasureNodeHeightCallback, GetNodeLabelCallback, GetBadgeContentCallback,
    LodLevel, Orientation, GrowthDirection, LayoutMode, ClickBehavior, InitialViewport,
    LayoutNode, GroupBox, NodeRenderSlots,
    FocusAnchor, FocusZoom, FocusOptions,
    CanvasNodeDropContext, CanvasGroupMenuContext, CanvasMenuContext, CanvasScrollToPathOptions
} from "./types.js"

// Default renderers (for composition)
export {
    defaultRenderBackground, defaultRenderColorBar,
    defaultRenderBody, defaultRenderChevron, defaultRenderBadge,
    getBadgeWidth, defaultBadgeContent, truncateText
} from "./canvas-renderer.js"

// Canvas theming
export type { CanvasTheme } from "./canvas-theme.js"
export { defaultCanvasTheme } from "./canvas-theme.js"

// Re-export core types for convenience
export type {
    LTreeNode, DropPosition, TreeControllerProps, NodeRef, TreeCallbackContext,
    NodeEventContext, SelectionChangeContext, ExpandOptions, SortOptions, TreeLabels,
    TreeMenuContext, TreeMenuItem, TreeMenuEntry, TreeAction, TreeActionEventDetail, MenuEntry, MenuDivider,
    TreeNavigation, TreeNavigationOverrides
} from "@keenmate/svelte-treeview"
export { TreeController, createMenuDivider } from "@keenmate/svelte-treeview"
