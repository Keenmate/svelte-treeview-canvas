import { test, expect } from '@playwright/test';
import { waitForCanvas, fitAndSettle, clickNode, nodeRect } from './helpers';

/**
 * E2E for /test/interaction — proves the real canvas pointer → hit-test → selection
 * pipeline (via getNodeScreenRect coordinate clicks) plus controller-driven
 * expand/collapse, asserted through the fixture's text outputs.
 *
 * Data (sorted by name): 1 Documents, 1.1 Work, 1.1.1 Reports, 1.1.2 Presentations,
 * 1.2 Personal, 1.2.1 Photos, 2 Downloads, 2.1 Software — 8 nodes total.
 */

const PAGE = '/test/interaction';

const focusedPath = (page: import('@playwright/test').Page) =>
	page.getByTestId('focused-path');
const selected = (page: import('@playwright/test').Page) =>
	page.getByTestId('selected-paths');
const selectedCount = (page: import('@playwright/test').Page) =>
	page.getByTestId('selected-count');
const visibleTotal = (page: import('@playwright/test').Page) =>
	page.getByTestId('visible-total');

test.beforeEach(async ({ page }) => {
	await page.goto(PAGE);
	await waitForCanvas(page);
	await fitAndSettle(page);
});

test('clicking a node on the canvas focuses and selects it', async ({ page }) => {
	await expect(focusedPath(page)).toHaveText('(none)');

	// 2.1 = Software (a leaf) — click in 'select' mode selects without expand side effects.
	await clickNode(page, '2.1');

	await expect(focusedPath(page)).toHaveText('2.1');
	await expect(selected(page)).toHaveText('2.1');
	await expect(selectedCount(page)).toHaveText('1');
});

test('Ctrl+click extends the selection to multiple nodes', async ({ page }) => {
	await clickNode(page, '2.1');
	await expect(selectedCount(page)).toHaveText('1');

	await clickNode(page, '1.1.1', { modifiers: ['Control'] });

	await expect(selectedCount(page)).toHaveText('2');
	await expect(selected(page)).toHaveText('1.1.1, 2.1');
});

test('Clear Selection empties the selection', async ({ page }) => {
	await clickNode(page, '2.1');
	await expect(selectedCount(page)).toHaveText('1');

	await page.getByRole('button', { name: 'Clear Selection' }).click();

	await expect(selectedCount(page)).toHaveText('0');
	await expect(selected(page)).toHaveText('(none)');
});

test('Collapse All hides descendants; Expand All brings them back', async ({ page }) => {
	// Baseline: expandLevel=2 renders all 8 nodes.
	await expect(visibleTotal(page)).toHaveText('8/8');

	await page.getByRole('button', { name: 'Collapse All' }).click();
	await fitAndSettle(page);

	// Only the two roots (Documents, Downloads) remain laid out (totalCount tracks
	// the current layout, not the full dataset).
	await expect(visibleTotal(page)).toHaveText('2/2');
	// A collapsed descendant is no longer in the layout → no screen rect.
	expect(await nodeRect(page, '1.1')).toBeNull();

	await page.getByRole('button', { name: 'Expand All' }).click();
	await fitAndSettle(page);

	await expect(visibleTotal(page)).toHaveText('8/8');
	expect(await nodeRect(page, '1.1.1')).not.toBeNull();
});

test('onNodeClick gets one ctx (NodeRef + controller); onSelectionChange fires', async ({ page }) => {
	await clickNode(page, '2.1');
	await expect(page.getByTestId('last-click')).toHaveText('2.1:Software:true');
	await expect(page.getByTestId('selection-events')).not.toHaveText('0');
});

test('bind:nodes receives the tree data after a mutation', async ({ page }) => {
	await expect(page.getByTestId('node-count')).toHaveText('8');
	await page.getByRole('button', { name: 'Remove 2.1' }).click();
	await expect(page.getByTestId('node-count')).toHaveText('7');
	await fitAndSettle(page);
	expect(await nodeRect(page, '2.1')).toBeNull();
});

test('bind:expandedPaths reflects toggles and an assigned set replaces the expanded state', async ({ page }) => {
	await expect(page.getByTestId('expanded-paths')).toContainText('1.1');

	await page.getByRole('button', { name: 'Expand only 2' }).click();
	await fitAndSettle(page);
	await expect(page.getByTestId('expanded-paths')).toHaveText('2');
	await expect(visibleTotal(page)).toHaveText('3/3'); // Documents, Downloads, Software

	await page.getByRole('button', { name: 'Toggle 2' }).click();
	await expect(page.getByTestId('expanded-paths')).toHaveText('(none)');
});

test('PageDown / Shift+End navigate without recursing (canvas delegates to the default navigation)', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await clickNode(page, '1');
	await page.keyboard.press('PageDown');
	await page.keyboard.press('Shift+End');
	await page.waitForTimeout(200);
	expect(errors.filter((m) => /call stack/i.test(m))).toEqual([]);
});
