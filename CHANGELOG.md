# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Programmatic selection API on `view.selection`: `select`, `deselect`, `toggle`, `set`, and
  `isSelected`, alongside the existing `count`, `ids`, `pageRows`, and `clear`. All are keyed by
  `getRowId` and span pages, so a row that is not on the current page can still be selected. `select`
  and `deselect` accept a single id or an array.
- `enableMultiRowSelection` option on `useDataView` (default `true`). When `false`, the selection
  mutators collapse to a single id for single-select tables and cards.
- Keyboard navigation for the table and card views, on by default. Arrow keys move a roving focus
  point, Home and End jump to the ends, Space toggles the active item's selection, and Shift with an
  arrow extends a contiguous range. The table navigates row by row; the card grid navigates in two
  dimensions, following the rendered layout (it reads the real geometry, so any responsive `cols`
  setting works, and it degrades to left/right traversal when geometry is unavailable). Both views are
  exposed as a `role="grid"` with `aria-selected` items. Set `keyboardNavigation={false}` on
  `DataTable` or `DataCards` to opt out.
- `onRowActivate` on `DataTable` and `onCardActivate` on `DataCards`: activate an item with Enter or a
  single click on its body, receiving the typed row. Clicks on the checkbox, on links or buttons in the
  item, or while selecting text, do not activate.

## [0.10.0] - 2026-06-28

### Added

- Opt-in **schedule presentation**: project event-shaped data into a Mantine calendar
  (day/week/month/year), switchable at runtime alongside the table and card views. It ships from a
  separate entry point, `@ethanhann/mantine-dataview/schedule`, so the scheduler dependency is never
  bundled unless you import it. `@mantine/schedule` and `dayjs` are **optional** peer dependencies.
- New exports from the `@ethanhann/mantine-dataview/schedule` subpath: `DataSchedule`,
  `DataScheduleNav`, `scheduleView`, `composeEvent`, `composeScheduleEvent`, `computeWindow`,
  `shiftWindow`, and the `ScheduleEventData` / `RegisteredView` types.
- Declarative row-to-event mapping via `meta.schedule` column roles (`start`, `end`, `duration`,
  `title`, `color`, `resource`, `allDay`) with an optional `map` transform, plus a `schedule`
  shorthand on the `col` builder. A `toEvent` escape hatch on `DataSchedule` bypasses role
  composition for derived event shapes.
- `DataViewer` gains a `views` prop to register opt-in presentations (e.g.
  `views={[scheduleView()]}`). The view switcher shows registered views; in schedule mode the
  toolbar hides the sort and column controls and the pager is suppressed (the calendar fetches by
  date window and owns its own navigation). With no `views`, behavior is unchanged.
- `DataViewRequest.window` (`{ start, end, level }`) and a `setWindow` method on the hook return:
  a schedule view fetches the visible date range instead of a page. Map `request.window` onto your
  backend the way you map pagination.
- Opt-in URL sync for the schedule window (`?view=schedule&ws=…&we=…&wl=week`), enabled by listing
  `"window"` in `urlSync.include`. Off by default, like selection and column pinning.
- `scheduleInitialState(level?, date?)` (from the `/schedule` subpath): seeds `initialState` so a
  viewer opens directly on the calendar with its window already set, making the first fetch a single
  windowed request instead of a window-less request followed by a windowed one.
- `DataSchedule` `leftSection` / `rightSection` props (also accepted by `scheduleView`): slot custom
  controls into a header row above the calendar, the schedule analog of the toolbar's sections. The
  header persists across the loading, error, and empty states.
- Two more schedule-family presentations: **agenda** (`agendaView` / `DataAgenda` — a date-grouped
  list; renders a `DataAgendaNav` header by default since Mantine's `AgendaView` has no navigation)
  and **resources** (`resourcesView` / `DataResourceSchedule` — one row per resource). The switcher
  can offer Table / Cards / Calendar / Agenda / Resources; switching among the windowed views reuses
  the loaded window without refetching.
- Resource rows are derived from the `resource`-role column's filter options (`deriveResources`
  helper), with an explicit `resources` prop (`ScheduleResourceData[]`) as override. Resource views
  clamp a `year` window to `month` (they have only day/week/month levels).
- The resource view overlays live **per-resource counts** when the response includes a value facet
  for the resource column (e.g. "Aspen (12)"): the rows stay stable while filtering, only the counts
  change. On by default (`showResourceCounts`); a `renderResourceLabel` in `resourcesProps` overrides
  it. `buildResourceCounts` helper exported.
- First-class `onEventClick(row, event, nativeEvent)` prop on all three presentations, handing back
  the typed original row. Replaces the default selection toggle; compose with the exported
  `toggleEventSelection` to keep both. `EventClickHandler` type and `findEventRow` helper exported.
- `DataResourceSchedule` `groups` / `renderGroupLabel` props (`ScheduleResourceGroup[]`): a rowspan
  column grouping resources, fanned out to all view levels. Mantine accepts groups only per-view, so
  this is the single-prop convenience. `ScheduleResourceGroup` type re-exported.
- Event editing callbacks on `DataSchedule` / `DataResourceSchedule`: `onEventMove`, `onEventResize`,
  `onRangeSelect`, `onSlotClick`. Each hands back the typed row and a `{ start, end }` `Date` range
  (resource views include `ctx.resourceId`) and auto-enables the matching Mantine interaction flag.
  Pair with `patchRow`/`insertRow`/`removeRow` to persist. Handler types exported (`EventMoveHandler`,
  `RangeSelectHandler`, `SlotClickHandler`, `EventRange`, etc.).
- `DataAgendaNav` — a purpose-built navigator for the agenda (prev / today / next and a day/week/month
  range, no year), rendered by `DataAgenda` by default in place of the calendar's `DataScheduleNav`.
- `scheduleInitialState` accepts a target `view`, so a viewer can open directly on agenda or
  resources as a single windowed fetch. It also accepts a `firstDayOfWeek` for the seed window.
- The fetched window now aligns to the active week start. The schedule views read `firstDayOfWeek`
  from Mantine's `DatesProvider`, so a non-Monday week (e.g. `firstDayOfWeek: 0`) keeps the fetched
  range, its facet counts, and the rendered grid in agreement with no extra prop. `computeWindow` and
  `shiftWindow` take an optional `firstDayOfWeek` for consumers driving `setWindow` themselves.
- `WINDOWED_VIEWS` constant and `isWindowedView` guard exported from the package root, for custom
  layouts that branch on whether a date-window view is active.
- New root-level type exports: `ScheduleRole`, `ScheduleFieldMeta`, `DataViewEvent`,
  `ScheduleLevel`, and `DataViewWindow`.

### Changed

- `ViewMode` now includes the schedule family (`"schedule"`, `"agenda"`, `"resources"`), and
  `DataViewState` / `DataViewRequest` gain an optional `window` slice. These are additive; the table
  and card public API surface is unchanged, and a `?view=…` URL restored without a registered view of
  that id degrades gracefully to the table.
- `request.window` is sent only while a windowed (schedule-family) view is active. A window set under
  the table or card view is held in state but never sent to the fetcher, so list requests are never
  polluted by a stale date range, and switching between table and cards never churns the request.
- `getViewMode` now reports the active schedule-family id (`"schedule"`/`"agenda"`/`"resources"`)
  instead of collapsing it to `"table"`.

## [0.9.0] - 2026-06-23

### Added

- `size` prop on the toolbar filter controls for layout customization.
- Package-validation tooling wired into the build and CI: `publint` (`lint:package`) and
  `@arethetypeswrong/cli` (`check:exports`) verify the published package and its type definitions.

### Fixed

- Emitted `.d.ts` files now rewrite relative imports with explicit `.js` extensions and directory
  `index.js` paths, so subpath type resolution works correctly under `node16`/`bundler` module
  resolution.
- The filter close button aligns to the bottom in `FilterControls` so it sits on the same baseline
  as the filter inputs.

### Changed

- Tooling: adopted Biome 2.5.1 (with the recommended preset) for lint and format, replaced the
  `justfile` recipes with standardized npm scripts, and upgraded dev dependencies
  (`@arethetypeswrong/cli` 0.18.4, `axe-core` 4.12.1).

## [0.8.1] - 2026-06-14

### Added

- `urlSync.historyMode` option (`"replace" | "push"`, default `"replace"`). With `"push"`, each
  filter, sort, or page change creates a new browser history entry so back and forward navigation
  steps through them.
- `ExportCsvOptions.sanitizeFormulas` option (default `true`). Controls spreadsheet formula
  injection sanitization on CSV export.
- `DataViewSelection.pageRows`, the selected rows materialized on the current page. Replaces the
  deprecated `rows` field under a clearer name.
- `RangeFacet.kind` optional discriminator (`"number" | "date"`) so consumers can interpret range
  bounds without inference.
- `isViewMode` type guard and `VIEW_MODES` constant exported from the package root.
- Additional serializer exports from `@ethanhann/mantine-dataview/url`: `stripManagedParams`,
  `SerializeContext`, `DeserializeContext`, and `SYNCABLE_KEYS`.

### Changed

- CSV export now terminates rows with `\r\n` per RFC 4180. Previous output used `\n`.
- CSV export now serializes object and array cell values as JSON instead of `String(value)`.
- CSV export appends a `.csv` extension to a `filename` that does not already end in `.csv`.
- CSV export returns without downloading a file when there are no exportable columns.
- CSV escaping now quotes values containing the active `separator` or a carriage return, in addition
  to comma, quote, and newline.
- URL serialization omits the page size parameter while it equals the default page size, and omits a
  trailing `?` when no managed parameters are present. The encoded state still decodes to the same
  value.
- The pagination control is hidden when the derived page count is one or zero. Previously a single
  inert page control was rendered.
- The number range filter slider now stores the full `[min, max]` range when dragged to the extent.
  Previously a full range cleared the filter, which made an explicit full range impossible to
  express. The filter is cleared through the dedicated clear action.
- Date only strings (`YYYY-MM-DD`) are parsed in local time by the date formatter and by the date
  and date range filter controls. Previous UTC parsing could render or reserialize a date as the
  previous day for users in negative UTC offsets.
- The number and currency formatters return the raw value for input that is not a valid number
  instead of `"NaN"`, and treat an empty string as empty instead of `0`.
- The boolean formatter resolves the strings `"true"`, `"false"`, `"1"`, `"0"`, `"yes"`, and `"no"`
  explicitly before falling back to truthiness.
- `isFiltered` ignores empty filter values such as a cleared multiselect (`[]`) or an empty range, so
  an empty result with no active value reports the unfiltered empty state.
- A failed background revalidation after an optimistic mutation now keeps the optimistic data,
  leaves `status` as `"success"`, and does not set `error`. A development warning is logged. A
  revalidation failure means the write could not be confirmed again, not that it failed.
- The filtered empty "clear filters" action now also resets the page index to the first page.
- `humanize` splits acronym runs and boundaries between letters and digits, so `HTTPStatus` becomes
  `HTTP Status` and `address1` becomes `Address 1`.
- `resolveColumnLabel` humanizes the column id fallback, so a column authored without a label shows
  `Created At` for the id `created_at`.
- The `col` builder `select` and `multiselect` presets set `dataType: "text"`, so a `format`
  override and the CSV `formatted` export apply to these columns.
- `DataToolbar` disables the search input while data is loading and propagates an explicit `disabled`
  prop to each control. The previous `fieldset` approach did not disable Mantine controls that are
  not native form elements and did not include the search input.
- The pagination request for a page or sort change is emitted immediately even while a search or
  filter debounce is pending. Previously the pending debounce could delay it.
- Customization slots (`Row`, `Card`, `Empty`, `ErrorState`, `LoadingTable`, `LoadingCards`,
  `BulkActions`) and the `renderCard` escape hatch are rendered as components rather than invoked as
  functions. Slots may now use hooks and appear in the React tree.
- The default error state renders the error message in development builds.
- `FilterParam` is widened to include `undefined`, `Date`, and mixed `Array<string | number>`. A
  value of `undefined` means the parameter is omitted.
- `windowHistoryAdapter` now lives in its own module. It is still exported from
  `@ethanhann/mantine-dataview/url`.

### Deprecated

- `DataViewSelection.rows`. Use `pageRows`. The alias holds the same value and will be removed in a
  future major release.

### Fixed

- CSV export quotes values for the configured `separator`, preventing corrupted output when a
  separator other than a comma is used and a value contains that separator.
- Optimistic mutations (`patchRow`, `insertRow`, `removeRow`) invalidate any primary fetch that is
  already running, so a slower response can no longer overwrite the optimistic state before
  revalidation.
- `onStateChange` receives a progressively correct snapshot when several state patches are batched in
  one tick. Previously a later patch in the same tick could emit a snapshot missing an earlier patch.
- The URL back and forward listener is subscribed once instead of being torn down and added again on
  every render, closing a window where a navigation event could be dropped.
- A URL write triggered by applying a back or forward navigation is skipped when the URL already
  encodes the state, preventing the current history entry from being rewritten.
- Untrusted URL parsing is hardened. Numeric range bounds that are not valid numbers decode to `null`
  instead of `NaN`, filter parameters for unknown column ids are ignored, and a page size that is
  zero, negative, or fractional falls back to the current page size.
- `useRowTransition` caches the computed entering set and generation by row id signature, so a render
  unrelated to the data no longer drops the row enter animation.
- The pagination range summary clamps the start index, so a page index beyond the available range can
  no longer read an inverted range such as `41 to 30 of 30`.
- The page size `Select` includes the active page size in its options, so it no longer shows an empty
  value when the current size is not one of the configured options.
- `process.env.NODE_ENV` access is guarded with a `typeof process` check for browser bundles that do
  not provide a `process` shim.

### Security

- CSV export sanitizes spreadsheet formula injection by default. Values beginning with `=`, `+`, `-`,
  or `@` are prefixed with a single quote so they are treated as text rather than evaluated as
  formulas in Excel, Google Sheets, and LibreOffice. Set `sanitizeFormulas: false` to opt out.
