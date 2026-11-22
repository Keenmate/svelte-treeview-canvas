/**
 * Context-menu model of the canvas — the same entries as svelte-treeview's `<Tree>`
 * (`TreeMenuEntry`: action items, `createMenuDivider()`, built-in action names), rendered by
 * CanvasTree's own menu markup over svelte-treeview's public custom-renderer API
 * (`controller.menuContext` / `menuItemDefaults` / `activateMenuItem`, `resolveMenuEntries`,
 * `getMenuChildren` — svelte-treeview 5.0.0-rc16).
 */
import type {
	LTreeNode,
	TreeController,
	TreeMenuContext,
	TreeMenuItem,
	MenuEntry,
	MenuItem,
	TreeCallbackContext,
	ResolvedMenuEntry
} from '@keenmate/svelte-treeview';
import { resolveMenuEntries } from '@keenmate/svelte-treeview';

export { getMenuChildren } from '@keenmate/svelte-treeview';
export type { ResolvedMenuEntry } from '@keenmate/svelte-treeview';

/** The node menu's surface ctx: `{ node, path, parent, siblings, controller }`. */
export function nodeMenuContext<T>(controller: TreeController<T>, node: LTreeNode<T>): TreeMenuContext<T> {
	return controller.menuContext(node);
}

/** Attach `controller` non-enumerably (like svelte-treeview's callback contexts). */
export function withController<T, C extends object>(controller: TreeController<T>, obj: C): C & TreeCallbackContext<T> {
	Object.defineProperty(obj, 'controller', { value: controller, enumerable: false, configurable: true });
	return obj as C & TreeCallbackContext<T>;
}

/** Resolve one menu level; built-in actions get their texts / state from the controller
 *  (on the empty-canvas menu — no node — the node-bound built-ins come out disabled). */
export function resolveCanvasMenu<T, Ctx extends TreeCallbackContext<T>>(
	controller: TreeController<T>,
	entries: readonly (MenuEntry<Ctx, string> | string)[] | null | undefined,
	ctx: Ctx
): ResolvedMenuEntry<Ctx, string>[] {
	return resolveMenuEntries<Ctx, string>(entries, ctx, (item) =>
		controller.menuItemDefaults(item as unknown as TreeMenuItem<T>, ctx as unknown as TreeMenuContext<T>)
	);
}

/**
 * Activate an item via svelte-treeview's `controller.activateMenuItem` — the built-in menu's path:
 * `beforeActionCallback` → item `onClick(detail)` → built-in → `onAction`. On the empty-canvas
 * menu (ctx without a node) only the node-free built-ins run (paste into the root, expand-all,
 * collapse-all, sort-all).
 */
export function activateCanvasMenuItem<T, Ctx extends TreeCallbackContext<T>>(
	controller: TreeController<T>,
	item: MenuItem<Ctx, string>,
	ctx: Ctx,
	opts: { trigger?: HTMLElement; event?: Event } = {}
): Promise<boolean> {
	return controller.activateMenuItem(
		item as unknown as TreeMenuItem<T>,
		ctx as unknown as TreeMenuContext<T>,
		opts.trigger,
		opts.event
	);
}

/** Find a visible, enabled item whose `shortcut` matches the key event (searches static children too). */
export function findItemByShortcut<T, Ctx extends TreeCallbackContext<T>>(
	controller: TreeController<T>,
	entries: readonly (MenuEntry<Ctx, string> | string)[] | null | undefined,
	ctx: Ctx,
	event: KeyboardEvent
): MenuItem<Ctx, string> | null {
	for (const entry of resolveCanvasMenu(controller, entries, ctx)) {
		if (entry.kind !== 'item' || entry.resolved.isDisabled) continue;
		const shortcut = entry.resolved.shortcut;
		if (shortcut) {
			const parsed = parseShortcut(shortcut);
			const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
			if (
				eventKey === parsed.key &&
				event.ctrlKey === parsed.ctrl &&
				event.shiftKey === parsed.shift &&
				event.altKey === parsed.alt
			) {
				return entry.item;
			}
		}
		if (entry.item.children?.length) {
			const found = findItemByShortcut(controller, entry.item.children, ctx, event);
			if (found) return found;
		}
	}
	return null;
}

function parseShortcut(shortcut: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean } {
	const parts = shortcut.split('+').map((p) => p.trim());
	const key = parts[parts.length - 1];
	return {
		key: key.length === 1 ? key.toLowerCase() : key,
		ctrl: parts.some((p) => p.toLowerCase() === 'ctrl'),
		shift: parts.some((p) => p.toLowerCase() === 'shift'),
		alt: parts.some((p) => p.toLowerCase() === 'alt')
	};
}
