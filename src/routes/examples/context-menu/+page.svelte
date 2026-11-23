<script lang="ts">
	import type { CanvasMenuContext } from '$lib/types.js';
	import { CanvasTree } from '$lib/index.js';
	import type { LTreeNode, TreeMenuEntry, TreeMenuContext, MenuEntry } from '@keenmate/svelte-treeview';
	import { createMenuDivider } from '@keenmate/svelte-treeview';
	import type { TreeEngine } from '@keenmate/svelte-treeview';

	// ── Types ──────────────────────────────────────────────────────────────

	interface Item {
		id: number;
		path: string;
		parentPath: string;
		level: number;
		name: string;
		role: string;
		email: string;
		status: 'active' | 'away' | 'busy';
		hasChildren: boolean;
		readonly: boolean;
	}

	// ── Sample data ──────────────────────────────────────────────────────

	const sampleData: Item[] = [
		{ id: 1,  path: '1',       parentPath: '',    level: 1, name: 'Engineering',     role: 'Department',       email: 'eng@acme.com',      status: 'active', hasChildren: true,  readonly: true },
		{ id: 2,  path: '1.1',     parentPath: '1',   level: 2, name: 'Frontend',        role: 'Team',             email: 'fe@acme.com',       status: 'active', hasChildren: true,  readonly: false },
		{ id: 3,  path: '1.1.1',   parentPath: '1.1', level: 3, name: 'Alice Chen',      role: 'Senior Developer', email: 'alice@acme.com',    status: 'active', hasChildren: false, readonly: false },
		{ id: 4,  path: '1.1.2',   parentPath: '1.1', level: 3, name: 'Bob Rivera',      role: 'Developer',        email: 'bob@acme.com',      status: 'away',   hasChildren: false, readonly: false },
		{ id: 5,  path: '1.1.3',   parentPath: '1.1', level: 3, name: 'Carol Wu',        role: 'Junior Developer', email: 'carol@acme.com',    status: 'busy',   hasChildren: false, readonly: false },
		{ id: 6,  path: '1.2',     parentPath: '1',   level: 2, name: 'Backend',         role: 'Team',             email: 'be@acme.com',       status: 'active', hasChildren: true,  readonly: false },
		{ id: 7,  path: '1.2.1',   parentPath: '1.2', level: 3, name: 'Dave Sharma',     role: 'Lead Engineer',    email: 'dave@acme.com',     status: 'active', hasChildren: false, readonly: false },
		{ id: 8,  path: '1.2.2',   parentPath: '1.2', level: 3, name: 'Eve Johnson',     role: 'Developer',        email: 'eve@acme.com',      status: 'active', hasChildren: false, readonly: true },
		{ id: 9,  path: '2',       parentPath: '',    level: 1, name: 'Design',          role: 'Department',       email: 'design@acme.com',   status: 'active', hasChildren: true,  readonly: true },
		{ id: 10, path: '2.1',     parentPath: '2',   level: 2, name: 'UX Research',     role: 'Team',             email: 'ux@acme.com',       status: 'active', hasChildren: true,  readonly: false },
		{ id: 11, path: '2.1.1',   parentPath: '2.1', level: 3, name: 'Frank Kim',       role: 'UX Researcher',    email: 'frank@acme.com',    status: 'away',   hasChildren: false, readonly: false },
		{ id: 12, path: '2.1.2',   parentPath: '2.1', level: 3, name: 'Grace Lee',       role: 'UX Designer',      email: 'grace@acme.com',    status: 'active', hasChildren: false, readonly: false },
		{ id: 13, path: '2.2',     parentPath: '2',   level: 2, name: 'Visual Design',   role: 'Team',             email: 'visual@acme.com',   status: 'active', hasChildren: false, readonly: false },
		{ id: 14, path: '3',       parentPath: '',    level: 1, name: 'Product',         role: 'Department',       email: 'product@acme.com',  status: 'active', hasChildren: true,  readonly: true },
		{ id: 15, path: '3.1',     parentPath: '3',   level: 2, name: 'PM Team',         role: 'Team',             email: 'pm@acme.com',       status: 'busy',   hasChildren: true,  readonly: false },
		{ id: 16, path: '3.1.1',   parentPath: '3.1', level: 3, name: 'Hannah Torres',   role: 'Product Manager',  email: 'hannah@acme.com',   status: 'active', hasChildren: false, readonly: false },
	];

	// ── State ────────────────────────────────────────────────────────────

	let treeData = $state.raw<Item[]>(sampleData);
	let focusedPath = $state<string | null>(null);
	let ctrlRef = $state<TreeEngine<Item> | null>(null);
	let eventLog = $state<string[]>([]);

	function sortByName({ nodes }: { nodes: LTreeNode<Item>[] }) {
		return [...nodes].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	function log(msg: string) {
		const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
		eventLog = [`[${time}] ${msg}`, ...eventLog.slice(0, 19)];
	}

	// ── Menu presets ─────────────────────────────────────────────────────

	type MenuPreset = 'basic' | 'icons-shortcuts' | 'submenus' | 'dividers' | 'disabled-hidden' | 'danger' | 'built-in' | 'full';

	let activePreset: MenuPreset = $state('full');

	const presetDescriptions: Record<MenuPreset, string> = {
		'basic': 'Simple text + onClick. No icons, no shortcuts.',
		'icons-shortcuts': 'Icons and keyboard shortcut hints on each item.',
		'submenus': 'Nested children menus that open on hover.',
		'dividers': 'Plain and named dividers to group related actions.',
		'disabled-hidden': 'Conditional isDisabled and isVisible based on node data.',
		'danger': 'isDanger: true for destructive actions.',
		'built-in': 'Built-in action names (copy, cut, paste, delete, expand-subtree, sort…) — texts from labels; they act on the selection when the node is in it.',
		'full': 'Everything combined: icons, shortcuts, submenus, dividers, disabled, danger, isVisible.',
	};

	function getBasicMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		return [
			{ text: 'Select', onClick: () => { focusedPath = node.path; log(`Selected: ${node.data?.name}`); } },
			{ text: 'Log Path', onClick: () => { log(`Path: ${node.path}`); } },
			{ text: 'Alert Name', onClick: () => { log(`Alert: ${node.data?.name}`); alert(node.data?.name); } },
		];
	}

	function getIconsShortcutsMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		const d = node.data!;
		return [
			{ icon: '👤', text: 'View Profile', shortcut: 'V', onClick: () => { log(`View profile: ${d.name}`); } },
			{ icon: '✉', text: 'Send Email', shortcut: 'E', onClick: () => { log(`Email: ${d.email}`); } },
			{ icon: '📋', text: 'Copy Email', shortcut: 'Ctrl+C', onClick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied: ${d.email}`); } },
			{ icon: '🔗', text: 'Copy Path', shortcut: 'Ctrl+P', onClick: async () => { await navigator.clipboard.writeText(node.path); log(`Copied path: ${node.path}`); } },
		];
	}

	function getSubmenusMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		const d = node.data!;
		return [
			{ icon: '👤', text: 'View', onClick: () => { log(`View: ${d.name}`); } },
			{
				icon: '📋', text: 'Copy As...', children: [
					{ text: 'Name', onClick: async () => { await navigator.clipboard.writeText(d.name); log(`Copied name: ${d.name}`); } },
					{ text: 'Email', onClick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied email: ${d.email}`); } },
					{ text: 'Path', onClick: async () => { await navigator.clipboard.writeText(node.path); log(`Copied path: ${node.path}`); } },
					{
						text: 'Formatted', children: [
							{ text: 'JSON', onClick: () => { log(`Copy JSON for ${d.name}`); } },
							{ text: 'CSV', onClick: () => { log(`Copy CSV for ${d.name}`); } },
							{ text: 'vCard', onClick: () => { log(`Copy vCard for ${d.name}`); } },
						]
					}
				]
			},
			{
				icon: '📧', text: 'Email To...', children: [
					{ icon: '👤', text: `${d.name}`, onClick: () => { log(`Email ${d.name}`); } },
					{ icon: '👥', text: 'Team', onClick: () => { log(`Email team`); } },
					{ icon: '🏢', text: 'Department', onClick: () => { log(`Email department`); } },
				]
			},
		];
	}

	function getDividersMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		const d = node.data!;
		return [
			{ icon: '👤', text: 'View Profile', onClick: () => { log(`View: ${d.name}`); } },
			{ icon: '✏️', text: 'Edit', onClick: () => { log(`Edit: ${d.name}`); } },
			{ divider: true },
			{ icon: '📋', text: 'Copy Name', onClick: async () => { await navigator.clipboard.writeText(d.name); log(`Copied: ${d.name}`); } },
			{ icon: '✉', text: 'Copy Email', onClick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied: ${d.email}`); } },
			{ divider: true, text: 'Navigation' },
			{ icon: '🔍', text: 'Focus', onClick: () => { log(`Focus: ${node.path}`); } },
			...(node.hasChildren ? [
				{
					icon: node.isExpanded ? '📂' : '📁',
					text: node.isExpanded ? 'Collapse' : 'Expand',
					onClick: () => {
						if (node.isExpanded) ctrlRef?.collapseNodes(node.path);
						else ctrlRef?.expandNodes(node.path);
						log(`${node.isExpanded ? 'Collapse' : 'Expand'}: ${node.path}`);
					}
				}
			] as TreeMenuEntry<Item>[] : []),
			{ divider: true, text: 'Danger zone' },
			{ icon: '🗑️', text: 'Delete', isDanger: true, onClick: () => { log(`Delete (blocked): ${d.name}`); } },
		];
	}

	function getDisabledHiddenMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		const d = node.data!;
		return [
			{ icon: '👤', text: 'View Profile', onClick: () => { log(`View: ${d.name}`); } },
			{ icon: '✏️', text: 'Edit', isDisabled: d.readonly, onClick: () => { log(`Edit: ${d.name}`); } },
			{ icon: '🗑️', text: 'Delete', isDisabled: d.readonly, onClick: () => { log(`Delete: ${d.name}`); } },
			{ divider: true },
			{ icon: '✉', text: 'Send Email', isVisible: d.level >= 3, onClick: () => { log(`Email: ${d.email}`); } },
			{ icon: '👥', text: 'View Team', isVisible: d.hasChildren, onClick: () => { log(`View team: ${d.name}`); } },
			{ icon: '🟢', text: 'Set Active', isVisible: d.status !== 'active', onClick: () => { log(`Set active: ${d.name}`); } },
			{ icon: '🟡', text: 'Set Away', isVisible: d.status !== 'away', onClick: () => { log(`Set away: ${d.name}`); } },
		];
	}

	function getDangerMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		const d = node.data!;
		return [
			{ icon: '👤', text: 'View Profile', onClick: () => { log(`View: ${d.name}`); } },
			{ icon: '✏️', text: 'Rename', onClick: () => { log(`Rename: ${d.name}`); } },
			{ divider: true },
			{ icon: '⚠️', text: 'Disable Account', isDanger: true, isDisabled: d.readonly, onClick: () => { log(`Disable: ${d.name}`); } },
			{ icon: '🗑️', text: 'Delete Permanently', isDanger: true, isDisabled: d.readonly, onClick: () => { log(`Delete: ${d.name}`); } },
			{ icon: '🔥', text: 'Remove from Organization', isDanger: true, onClick: () => { log(`Remove: ${d.name}`); } },
		];
	}

	function getFullMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		const d = node.data!;
		return [
			{ icon: '👤', text: 'View Profile', shortcut: 'V', onClick: () => { log(`View profile: ${d.name}`); } },
			{ icon: '✏️', text: 'Edit', shortcut: 'E', isDisabled: d.readonly, onClick: () => { log(`Edit: ${d.name}`); } },
			{ divider: true },
			{ icon: '✉', text: 'Send Email', shortcut: 'M', isVisible: d.level >= 3, onClick: () => { log(`Email: ${d.email}`); } },
			{
				icon: '📋', text: 'Copy...', children: [
					{ icon: '👤', text: 'Name', shortcut: 'N', onClick: async () => { await navigator.clipboard.writeText(d.name); log(`Copied name: ${d.name}`); } },
					{ icon: '✉', text: 'Email', shortcut: 'E', onClick: async () => { await navigator.clipboard.writeText(d.email); log(`Copied email: ${d.email}`); } },
					{ divider: true },
					{ icon: '🔗', text: 'Path', onClick: async () => { await navigator.clipboard.writeText(node.path); log(`Copied path: ${node.path}`); } },
				]
			},
			...(node.hasChildren ? [
				{ divider: true, text: 'Team' } as TreeMenuEntry<Item>,
				{
					icon: node.isExpanded ? '📂' : '📁',
					text: node.isExpanded ? 'Collapse' : 'Expand',
					shortcut: 'Space',
					onClick: () => {
						if (node.isExpanded) ctrlRef?.collapseNodes(node.path);
						else ctrlRef?.expandNodes(node.path);
						log(`${node.isExpanded ? 'Collapse' : 'Expand'}: ${node.path}`);
					}
				} as TreeMenuEntry<Item>,
				{
					icon: '👥', text: 'View Members', isVisible: node.isExpanded,
					onClick: () => { log(`View members: ${d.name} (${Object.keys(node.children).length} direct)`); }
				} as TreeMenuEntry<Item>,
			] : []),
			{ divider: true, text: 'Danger zone' },
			{ icon: '🗑️', text: 'Delete', shortcut: 'Del', isDanger: true, isDisabled: d.readonly, onClick: () => { log(`Delete (${d.readonly ? 'blocked - readonly' : 'confirmed'}): ${d.name}`); } },
		];
	}

	function getBuiltInMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		return [
			{ icon: '👤', text: 'View Profile', onClick: () => { log(`View: ${node.data?.name}`); } },
			createMenuDivider('Clipboard'),
			'copy', 'cut', 'paste',
			createMenuDivider('Structure'),
			'expand-subtree', 'collapse-subtree', 'sort',
			createMenuDivider(),
			'delete',
		];
	}

	function getContextMenu(ctx: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
		if (!ctx.node.data) return [];
		switch (activePreset) {
			case 'basic': return getBasicMenu(ctx);
			case 'icons-shortcuts': return getIconsShortcutsMenu(ctx);
			case 'submenus': return getSubmenusMenu(ctx);
			case 'dividers': return getDividersMenu(ctx);
			case 'disabled-hidden': return getDisabledHiddenMenu(ctx);
			case 'danger': return getDangerMenu(ctx);
			case 'built-in': return getBuiltInMenu(ctx);
			case 'full': return getFullMenu(ctx);
		}
	}

	function getCanvasContextMenu(): MenuEntry<CanvasMenuContext<Item>>[] {
		return [
			{ icon: '🌲', text: 'Expand All', shortcut: 'E', onClick: () => { ctrlRef?.expandAll(); log('Expand all'); } },
			{ icon: '📁', text: 'Collapse All', shortcut: 'C', onClick: () => { ctrlRef?.collapseAll(); log('Collapse all'); } },
			{ divider: true },
			{ icon: '🔢', text: `${treeData.length} nodes loaded`, isDisabled: true, onClick: () => {} },
			{ icon: '📊', text: `Preset: ${activePreset}`, isDisabled: true, onClick: () => {} },
		];
	}
</script>

<svelte:head>
	<title>Context Menu - Canvas Treeview</title>
	<link rel="stylesheet" href="/examples-shared.css" />
</svelte:head>

<div class="container">
	<header>
		<a href="/" class="back-link">&larr; Back to Examples</a>
		<h1>Context Menu</h1>
		<p class="subtitle">Right-click any node to see the node context menu, or right-click empty canvas space for the canvas menu. Switch presets to explore different <code>TreeMenuEntry</code> features.</p>
	</header>

	<!-- Preset selector -->
	<div class="card">
		<h2>Menu Preset</h2>
		<p class="description">Each preset demonstrates a different combination of context menu features. The menu is built dynamically via <code>getNodeContextMenuItemsCallback</code> callback.</p>

		<div class="preset-grid">
			{#each Object.entries(presetDescriptions) as [key, desc]}
				<button
					class="preset-btn"
					class:active={activePreset === key}
					onclick={() => { activePreset = key as MenuPreset; }}
				>
					<span class="preset-name">{key}</span>
					<span class="preset-desc">{desc}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Feature badges -->
	<div class="card">
		<h2>Active Features</h2>
		<div class="feature-badges">
			<span class="badge-item" class:badge-active={activePreset !== 'basic'}>Icons</span>
			<span class="badge-item" class:badge-active={activePreset === 'icons-shortcuts' || activePreset === 'full'}>Shortcuts</span>
			<span class="badge-item" class:badge-active={activePreset === 'submenus' || activePreset === 'full'}>Submenus</span>
			<span class="badge-item" class:badge-active={activePreset === 'dividers' || activePreset === 'full'}>Dividers</span>
			<span class="badge-item" class:badge-active={activePreset === 'dividers' || activePreset === 'full'}>Named Dividers</span>
			<span class="badge-item" class:badge-active={activePreset === 'disabled-hidden' || activePreset === 'full'}>isDisabled</span>
			<span class="badge-item" class:badge-active={activePreset === 'disabled-hidden' || activePreset === 'full'}>isVisible</span>
			<span class="badge-item" class:badge-active={activePreset === 'danger' || activePreset === 'dividers' || activePreset === 'full'}>className="danger"</span>
		</div>
	</div>

	<!-- Canvas tree -->
	<div class="card">
		<h2>Tree</h2>
		<p class="description">
			Right-click any node. Try different nodes to see conditional items (e.g., readonly nodes disable Edit/Delete, leaf nodes hide team actions).
		</p>

		<div class="tree-hints">
			<span class="hint">Readonly nodes: <strong>Engineering, Design, Product</strong> (departments) and <strong>Eve Johnson</strong></span>
			<span class="hint">Nodes with children show expand/collapse actions</span>
			<span class="hint">Status varies: active, away, busy</span>
		</div>

		<div class="canvas-wrapper">
			<CanvasTree
				nodes={treeData}
				idMember="id"
				pathMember="path"
				sortCallback={sortByName}
				isSorted={true}
				expandLevel={3}
				growthDirection="right"
				nodeHeight={32}
				nodeMinWidth={100}
				nodeMaxWidth={200}
				nodeGap={6}
				columnGap={45}
				fontSize={12}
				isDotGridShown={true}
				bind:focusedPath
				bind:controller={ctrlRef}
				getNodeLabelCallback={(node) => node.data?.name || node.path}
				getNodeContextMenuItemsCallback={getContextMenu}
				getCanvasContextMenuItemsCallback={getCanvasContextMenu}
				onAction={(d) => { if (d.action !== 'custom') log(`Built-in "${d.action}" on ${d.path}`); }}
			/>
		</div>
	</div>

	<!-- Event log -->
	<div class="card">
		<h2>Event Log</h2>
		<p class="description">Actions triggered by context menu clicks appear here.</p>

		<div class="log-controls">
			<button class="btn secondary" onclick={() => { eventLog = []; }}>Clear Log</button>
			<span class="log-count">{eventLog.length} events</span>
		</div>

		<div class="event-log">
			{#if eventLog.length === 0}
				<div class="log-empty">Right-click a node and select an action to see events here.</div>
			{:else}
				{#each eventLog as entry}
					<div class="log-entry">{entry}</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- API reference -->
	<div class="card">
		<h2>API Reference</h2>

		<div class="code-block">
			<pre>{`// Types (from @keenmate/svelte-treeview — the core action-item model, same as <Tree>)

// One entry: an item, a divider (createMenuDivider(text?)) or a built-in action name
type TreeMenuEntry<T> = TreeMenuItem<T> | MenuDivider | TreeAction;

interface TreeMenuItem<T> {
  id?: string;
  text?: string;
  icon?: string;          // emoji or icon character
  tooltip?: string;
  shortcut?: string;      // keyboard hint (e.g. "Ctrl+C"), also triggers the item
  isDisabled?: boolean;   // grayed out, not clickable
  isVisible?: boolean;    // false = skip rendering
  isDanger?: boolean;     // destructive styling
  isToggled?: boolean;    // checkable item (role="menuitemcheckbox")
  cssClass?: string;
  // get*Callback(ctx) variants of the fields above win over the static values
  onClick?: (detail) => void | Promise<void>;   // detail = menu ctx + { action, id, item, source }
  children?: TreeMenuEntry<T>[];                // nested submenu
  getChildrenCallback?: (ctx) => TreeMenuEntry<T>[] | Promise<...>;
  shouldCloseOnClick?: boolean;                 // default true
}

// Built-ins: 'copy' | 'cut' | 'paste' | 'delete' | 'expand' | 'collapse' | 'expand-subtree'
//   | 'collapse-subtree' | 'expand-all' | 'collapse-all' | 'sort' | 'sort-subtree' | 'sort-all'

// ctx: TreeMenuContext<T> = { node, path, parent, siblings, controller }`}</pre>
		</div>

		<div class="code-block" style="margin-top: 0.75rem;">
			<pre>{`// Usage with CanvasTree

<CanvasTree
  {nodes}
  getNodeContextMenuItemsCallback={getContextMenu}
  ...
/>

function getContextMenu({ node }: TreeMenuContext<Item>): TreeMenuEntry<Item>[] {
  return [
    { icon: '👤', text: 'View', shortcut: 'V', onClick: () => view(node) },
    { divider: true, text: 'Actions' },
    { icon: '✏️', text: 'Edit', isDisabled: node.data.readonly, onClick: () => edit(node) },
    { icon: '📋', text: 'Copy...', children: [
      { text: 'Name', onClick: () => copyName(node) },
      { text: 'Email', onClick: () => copyEmail(node) },
    ]},
    createMenuDivider('Danger zone'),
    { icon: '🗑️', text: 'Delete', isDanger: true, onClick: () => del(node) },
    'cut', 'paste',   // built-in actions
  ];
}`}</pre>
		</div>
	</div>

	<footer>
		<p><a href="/">&larr; Back to Examples</a></p>
	</footer>
</div>

<style>
	.preset-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.preset-btn {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		background: #ffffff;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.preset-btn:hover {
		border-color: #94a3b8;
	}

	.preset-btn.active {
		border-color: #667eea;
		box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
	}

	.preset-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: #1e293b;
		font-family: 'SF Mono', 'Cascadia Code', monospace;
	}

	.preset-desc {
		font-size: 0.8rem;
		color: #64748b;
		line-height: 1.4;
	}

	.feature-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.badge-item {
		padding: 0.3rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
		border: 1px solid #e2e8f0;
		color: #94a3b8;
		background: #f8fafc;
		transition: all 0.2s;
	}

	.badge-active {
		border-color: #667eea;
		color: #667eea;
		background: #eef2ff;
	}

	.canvas-wrapper {
		height: 500px;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 1rem;
	}

	.tree-hints {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: #64748b;
	}

	.hint::before {
		content: '•';
		margin-right: 0.4rem;
		color: #cbd5e1;
	}

	.description {
		color: #64748b;
		margin-bottom: 0.5rem;
	}

	.description code {
		background: #f1f5f9;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-size: 0.85em;
	}

	.event-log {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		max-height: 260px;
		overflow-y: auto;
		font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
		font-size: 0.8rem;
		background: #f8fafc;
	}

	.log-entry {
		padding: 0.35rem 0.75rem;
		border-bottom: 1px solid #f1f5f9;
		color: #334155;
	}

	.log-entry:last-child {
		border-bottom: none;
	}

	.log-empty {
		padding: 1.5rem;
		text-align: center;
		color: #94a3b8;
		font-family: inherit;
	}

	.log-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.log-count {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.code-block {
		background: #1e293b;
		color: #e2e8f0;
		padding: 1.25rem;
		border-radius: 8px;
		overflow-x: auto;
		margin-top: 0.5rem;
	}

	.code-block pre {
		font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
		font-size: 0.82rem;
		line-height: 1.6;
		margin: 0;
	}
</style>
