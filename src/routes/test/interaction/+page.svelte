<script lang="ts">
	import { CanvasTree } from '$lib/index.js';
	import type { TreeEngine, LTreeNode, ClickBehavior } from '@keenmate/svelte-treeview';

	/**
	 * Minimal e2e fixture for canvas interaction (selection, focus, expand/collapse).
	 * Deliberately tiny + deterministic — the tutorial demo lives at /examples/interaction.
	 *
	 * State is surfaced as text in `.output[data-testid]` blocks so specs can assert
	 * without reading pixels. Canvas hit-testing uses `window.__canvasRect(path)` →
	 * CanvasTree.getNodeScreenRect(path), so a spec can click a node at its live centre.
	 */

	interface Item {
		id: number;
		path: string;
		parentPath: string;
		name: string;
		hasChildren: boolean;
	}

	const sampleData: Item[] = [
		{ id: 1, path: '1', parentPath: '', name: 'Documents', hasChildren: true },
		{ id: 2, path: '1.1', parentPath: '1', name: 'Work', hasChildren: true },
		{ id: 3, path: '1.1.1', parentPath: '1.1', name: 'Reports', hasChildren: false },
		{ id: 4, path: '1.1.2', parentPath: '1.1', name: 'Presentations', hasChildren: false },
		{ id: 5, path: '1.2', parentPath: '1', name: 'Personal', hasChildren: true },
		{ id: 6, path: '1.2.1', parentPath: '1.2', name: 'Photos', hasChildren: false },
		{ id: 7, path: '2', parentPath: '', name: 'Downloads', hasChildren: true },
		{ id: 8, path: '2.1', parentPath: '2', name: 'Software', hasChildren: false }
	];

	function sortByName({ nodes }: { nodes: LTreeNode<Item>[] }) {
		return [...nodes].sort((a, b) => (a.data?.name || '').localeCompare(b.data?.name || ''));
	}

	let canvasTreeRef = $state<CanvasTree<Item> | null>(null);
	let ctrlRef = $state<TreeEngine<Item> | null>(null);
	let clickBehavior = $state<ClickBehavior>('select');
	let focusedPath = $state<string | null>(null);
	let selectedPaths = $state<Set<string>>(new Set());
	let visibleCount = $state(0);
	let nodes = $state<Item[]>(sampleData);
	let expandedPaths = $state<Set<string>>(new Set());
	let lastClick = $state('(none)');
	let selectionEvents = $state(0);
	const expandedList = $derived([...expandedPaths].sort());
	let totalCount = $state(0);

	// Display the CONTROLLER'S state (source of truth) so both canvas clicks AND
	// programmatic ops (toolbar buttons) reflect immediately — the bound
	// focusedPath/selectedPaths props only update inside CanvasTree's own click
	// handlers, not on external controller mutations.
	let focusedDisplay = $derived(ctrlRef?.focusedNode?.path ?? '(none)');
	let selectedList = $derived(ctrlRef ? [...ctrlRef.selectedPaths].sort() : []);

	// Expose a live screen-rect getter for coordinate-based canvas clicks in e2e.
	$effect(() => {
		if (canvasTreeRef) {
			(window as unknown as Record<string, unknown>).__canvasRect = (path: string) =>
				canvasTreeRef?.getNodeScreenRect(path) ?? null;
			(window as unknown as Record<string, unknown>).__canvasReady = true;
		}
	});
</script>

<h1>Canvas Interaction — test fixture</h1>

<div class="toolbar">
	<label>
		Click behavior:
		<select bind:value={clickBehavior} data-testid="click-behavior">
			<option value="select">select</option>
			<option value="expand">expand</option>
			<option value="expand-and-focus">expand-and-focus</option>
		</select>
	</label>
	<button onclick={() => canvasTreeRef?.expandAll()}>Expand All</button>
	<button onclick={() => canvasTreeRef?.collapseAll()}>Collapse All</button>
	<button onclick={() => canvasTreeRef?.zoomToFit()}>Fit</button>
	<button onclick={() => ctrlRef?.clearSelection()}>Clear Selection</button>
	<button onclick={() => ctrlRef?.removeBranch('2.1')}>Remove 2.1</button>
	<button onclick={() => { expandedPaths = new Set(['2']); }}>Expand only 2</button>
	<button onclick={() => canvasTreeRef?.toggleNodeExpanded('2')}>Toggle 2</button>
</div>

<div class="canvas-host" data-testid="canvas-host">
	<CanvasTree
		bind:this={canvasTreeRef}
		bind:controller={ctrlRef}
		bind:nodes
		bind:expandedPaths
		onNodeClick={(ctx) => { lastClick = `${ctx.path}:${ctx.node?.data?.name}:${!!ctx.controller}`; }}
		onSelectionChange={(ctx) => { selectionEvents++; }}
		idMember="id"
		pathMember="path"
		parentPathMember="parentPath"
		hasChildrenMember="hasChildren"
		sortCallback={sortByName}
		isSorted={true}
		expandLevel={2}
		bind:clickBehavior
		bind:focusedPath
		bind:selectedPaths
		bind:visibleCount
		bind:totalCount
		getNodeLabelCallback={(node) => node.data?.name || node.path}
	/>
</div>

<div class="outputs">
	<div class="output">
		<p class="output-label">Focused Path</p>
		<pre data-testid="focused-path">{focusedDisplay}</pre>
	</div>
	<div class="output">
		<p class="output-label">Selected</p>
		<pre data-testid="selected-paths">{selectedList.length > 0 ? selectedList.join(', ') : '(none)'}</pre>
	</div>
	<div class="output">
		<p class="output-label">Selected Count</p>
		<pre data-testid="selected-count">{selectedList.length}</pre>
	</div>
	<div class="output">
		<p class="output-label">Node count (bind:nodes)</p>
		<pre data-testid="node-count">{nodes.length}</pre>
	</div>
	<div class="output">
		<p class="output-label">Expanded (bind:expandedPaths)</p>
		<pre data-testid="expanded-paths">{expandedList.join(', ') || '(none)'}</pre>
	</div>
	<div class="output">
		<p class="output-label">Last click (onNodeClick ctx)</p>
		<pre data-testid="last-click">{lastClick}</pre>
	</div>
	<div class="output">
		<p class="output-label">onSelectionChange events</p>
		<pre data-testid="selection-events">{selectionEvents}</pre>
	</div>
	<div class="output">
		<p class="output-label">Visible / Total</p>
		<pre data-testid="visible-total">{visibleCount}/{totalCount}</pre>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}
	.canvas-host {
		width: 820px;
		height: 460px;
		border: 1px solid #ccc;
	}
	.outputs {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
	}
	.output {
		min-width: 180px;
	}
	.output-label {
		font-weight: 600;
		margin: 0 0 0.25rem;
	}
	pre {
		margin: 0;
		padding: 0.4rem 0.6rem;
		background: #f4f4f4;
		border-radius: 4px;
		min-height: 1.2rem;
	}
</style>
