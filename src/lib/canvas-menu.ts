/**
 * Context-menu model of the canvas — the same entries as svelte-treeview's `<Tree>`
 * (`TreeMenuEntry`: action items, `menuDivider()`, built-in action names), rendered by
 * CanvasTree's own menu markup.
 *
 * GAP (svelte-treeview 5.0.0-rc16): the pieces a custom renderer needs are not public there —
 * `TreeController.menuContext` / `menuItemDefaults` / `activateMenuItem` are `@internal`
 * (stripped from the published types) and the vendored core `resolveMenuEntries` /
 * `getMenuChildren` are not exported. Until they are:
 *   - the three controller methods are reached through `menuInternals()` (they exist at runtime);
 *   - `resolveMenuEntries` / `getMenuChildren` / `resolveActionItem` below are a copy of
 *     svelte-treeview `src/lib/vendor/actions/resolve.ts` (itself web-components-core
 *     v1.0.0-rc14 `src/actions/resolve.ts`) — keep byte-identical in behaviour; delete this
 *     copy once svelte-treeview exports them.
 */
import type {
	LTreeNode,
	TreeController,
	TreeMenuContext,
	TreeMenuItem,
	TreeAction,
	ActionItem,
	MenuEntry,
	MenuItem,
	ResolvedActionItem,
	ActionEventDetail,
	TreeCallbackContext
} from '@keenmate/svelte-treeview';
import { isMenuDivider } from '@keenmate/svelte-treeview';

// ── svelte-treeview controller internals (runtime-present, @internal in its types) ──

interface ControllerMenuInternals<T> {
	menuContext(node: LTreeNode<T>): TreeMenuContext<T>;
	menuItemDefaults(
		item: TreeMenuItem<T>,
		ctx: TreeMenuContext<T>
	): Partial<ResolvedActionItem<TreeAction>> | undefined;
	activateMenuItem(
		item: TreeMenuItem<T>,
		ctx: TreeMenuContext<T>,
		trigger?: HTMLElement,
		event?: Event
	): Promise<boolean>;
}

function menuInternals<T>(controller: TreeController<T>): ControllerMenuInternals<T> {
	return controller as unknown as ControllerMenuInternals<T>;
}

/** The node menu's surface ctx: `{ node, path, parent, siblings, controller }`. */
export function nodeMenuContext<T>(controller: TreeController<T>, node: LTreeNode<T>): TreeMenuContext<T> {
	return menuInternals(controller).menuContext(node);
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
			? menuInternals(controller).menuItemDefaults(item as unknown as TreeMenuItem<T>, ctx as unknown as TreeMenuContext<T>)
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
		return menuInternals(controller).activateMenuItem(
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

// ── Copy of svelte-treeview vendor/actions/resolve.ts (core v1.0.0-rc14) — see GAP above ──

function call<Ctx, R>(cb: ((ctx: Ctx) => R) | undefined, ctx: Ctx, field: string): R | undefined {
	if (typeof cb !== 'function') return undefined;
	try {
		return cb(ctx);
	} catch (error) {
		console.error(`[CanvasTree] action item ${field} threw — using the static value`, error);
		return undefined;
	}
}

function classList(value: string | string[] | undefined): string {
	if (!value) return '';
	return (Array.isArray(value) ? value : [value])
		.flatMap((c) => c.split(/\s+/))
		.filter(Boolean)
		.join(' ');
}

function resolveActionItem<Ctx, A extends string>(
	item: ActionItem<Ctx, A>,
	ctx: Ctx,
	defaults: Partial<ResolvedActionItem<A>> = {}
): ResolvedActionItem<A> {
	const cbClass = call(item.getClassCallback, ctx, 'getClassCallback');
	return {
		action: item.action ?? defaults.action ?? 'custom',
		id: item.id ?? defaults.id,
		text: call(item.getTextCallback, ctx, 'getTextCallback') ?? item.text ?? defaults.text ?? '',
		icon: call(item.getIconCallback, ctx, 'getIconCallback') ?? item.icon ?? defaults.icon,
		tooltip: call(item.getTooltipCallback, ctx, 'getTooltipCallback') ?? item.tooltip ?? defaults.tooltip,
		shortcut: item.shortcut ?? defaults.shortcut,
		cssClass: cbClass !== undefined ? classList(cbClass) : classList(item.cssClass ?? defaults.cssClass),
		isVisible: call(item.getIsVisibleCallback, ctx, 'getIsVisibleCallback') ?? item.isVisible ?? defaults.isVisible ?? true,
		isDisabled: call(item.getIsDisabledCallback, ctx, 'getIsDisabledCallback') ?? item.isDisabled ?? defaults.isDisabled ?? false,
		isDanger: item.isDanger ?? defaults.isDanger ?? false,
		isToggled: call(item.getIsToggledCallback, ctx, 'getIsToggledCallback') ?? item.isToggled ?? defaults.isToggled ?? false
	};
}

export type ResolvedMenuEntry<Ctx, A extends string> =
	| { kind: 'item'; item: MenuItem<Ctx, A>; resolved: ResolvedActionItem<A>; hasChildren: boolean }
	| { kind: 'divider'; text?: string };

function resolveMenuEntries<Ctx, A extends string>(
	entries: readonly (MenuEntry<Ctx, A> | string)[] | null | undefined,
	ctx: Ctx,
	defaults?: (item: MenuItem<Ctx, A>) => Partial<ResolvedActionItem<A>> | undefined
): ResolvedMenuEntry<Ctx, A>[] {
	const out: ResolvedMenuEntry<Ctx, A>[] = [];
	for (const raw of entries ?? []) {
		const entry = typeof raw === 'string' ? ({ action: raw } as MenuItem<Ctx, A>) : raw;
		if (isMenuDivider(entry)) {
			const last = out[out.length - 1];
			if (!last) continue; // leading
			const divider: ResolvedMenuEntry<Ctx, A> =
				entry.text === undefined
					? { kind: 'divider', ...(last.kind === 'divider' && last.text !== undefined ? { text: last.text } : {}) }
					: { kind: 'divider', text: entry.text };
			if (last.kind === 'divider') out[out.length - 1] = divider;
			else out.push(divider);
			continue;
		}
		const resolved = resolveActionItem(entry, ctx, defaults?.(entry));
		if (!resolved.isVisible) continue;
		const hasChildren = typeof entry.getChildrenCallback === 'function' || !!entry.children?.length;
		out.push({ kind: 'item', item: entry, resolved, hasChildren });
	}
	while (out.length && out[out.length - 1]!.kind === 'divider') out.pop(); // trailing
	return out;
}

/** A menu item's submenu: `getChildrenCallback` (may be async) wins over `children`. */
export async function getMenuChildren<Ctx, A extends string>(
	item: MenuItem<Ctx, A>,
	ctx: Ctx
): Promise<MenuEntry<Ctx, A>[]> {
	if (typeof item.getChildrenCallback === 'function') {
		try {
			return (await item.getChildrenCallback(ctx)) ?? [];
		} catch (error) {
			console.error('[CanvasTree] action item getChildrenCallback threw', error);
			return item.children ?? [];
		}
	}
	return item.children ?? [];
}
