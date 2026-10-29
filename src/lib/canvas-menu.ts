/**
 * Context-menu model of the canvas — the same entries as svelte-treeview's `<Tree>`
 * (`TreeMenuEntry`: action items, `menuDivider()`, built-in action names), rendered by
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
	ActionEventDetail,
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

/** A menu ctx that has a node (node / group menus) — built-in actions apply. */
function hasNode(ctx: object): ctx is TreeMenuContext<unknown> {
	return !!(ctx as { node?: unknown }).node;
}

/** Resolve one menu level; built-in actions get their texts / state from the controller. */
export function resolveCanvasMenu<T, Ctx extends TreeCallbackContext<T>>(
	controller: TreeController<T>,
	entries: readonly (MenuEntry<Ctx, string> | string)[] | null | undefined,
	ctx: Ctx
): ResolvedMenuEntry<Ctx, string>[] {
	return resolveMenuEntries<Ctx, string>(entries, ctx, (item) =>
		hasNode(ctx)
			? controller.menuItemDefaults(item as unknown as TreeMenuItem<T>, ctx as unknown as TreeMenuContext<T>)
			: undefined
	);
}

/** Activate an item: `beforeActionCallback` → item `onClick(detail)` → built-in → `onAction`. */
export async function activateCanvasMenuItem<T, Ctx extends TreeCallbackContext<T>>(
	controller: TreeController<T>,
	item: MenuItem<Ctx, string>,
	ctx: Ctx,
	opts: {
		trigger?: HTMLElement;
		event?: Event;
		// The tree's handlers (typed for the node menu's detail); the empty-canvas menu's detail
		// has no node — documented on getCanvasContextMenuItemsCallback.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		beforeActionCallback?: ((detail: any) => unknown) | null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onAction?: ((detail: any) => void) | null;
	} = {}
): Promise<boolean> {
	if (hasNode(ctx)) {
		// Node / group menu: the controller's runner (built-in actions act on ctx.node or the selection).
		return controller.activateMenuItem(
			item as unknown as TreeMenuItem<T>,
			ctx as unknown as TreeMenuContext<T>,
			opts.trigger,
			opts.event
		);
	}
	// Empty-canvas menu: no node, so no built-ins — same order without that step.
	const detail = withController(controller, {
		...ctx,
		action: (item.action ?? 'custom') as string,
		...(item.id !== undefined ? { id: item.id } : {}),
		item,
		source: 'context-menu',
		sourceEvent: opts.event,
		triggerElement: opts.trigger,
		dataset: {}
	}) as unknown as ActionEventDetail<Ctx, string>;
	if (opts.beforeActionCallback) {
		try {
			if ((await opts.beforeActionCallback(detail)) === false) return false;
		} catch (error) {
			console.error('[CanvasTree] beforeActionCallback threw', error);
			return false;
		}
	}
	try {
		await item.onClick?.(detail);
	} catch (error) {
		console.error('[CanvasTree] menu item onClick threw', error);
	}
	opts.onAction?.(detail);
	return true;
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
