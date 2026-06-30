# @ethanhann/mantine-dataview

[![npm version](https://img.shields.io/npm/v/@ethanhann/mantine-dataview.svg)](https://www.npmjs.com/package/@ethanhann/mantine-dataview)
[![CI](https://github.com/ethanhann/mantine-dataview/actions/workflows/ci.yml/badge.svg)](https://github.com/ethanhann/mantine-dataview/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fethanhann.github.io%2Fmantine-dataview%2Fcoverage-badge.json)](https://ethanhann.github.io/mantine-dataview)
[![Storybook](https://img.shields.io/badge/Storybook-deployed-ff4785?logo=storybook&logoColor=white)](https://ethanhann.github.io/mantine-dataview)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A reusable React library that renders **server-driven, paginated datasets** as either a
**table** or a **card grid**, switchable at runtime, with full feature parity between the two.

Built on [Mantine](https://mantine.dev) v9 and [TanStack Table](https://tanstack.com/table) v8.

## Changelog

See CHANGELOG.md

## Features

- One hook drives both a Mantine `Table` and a Mantine `Card` grid; switch at runtime.
- Opt-in **schedule** presentation: project event data into a Mantine calendar (day/week/month/year),
  switchable alongside table and cards. Ships from a separate subpath so the scheduler dependency is
  never bundled unless you use it.
- Server-side pagination, sorting (including multi-sort), column filters, and global search.
- Column data types (`text`, `number`, `currency`, `date`, `boolean`) with automatic Intl-based formatting.
- Seven filter variants with smart controls: `SegmentedControl` for booleans, `RangeSlider` for bounded numbers,
  `DatePickerInput` for dates.
- Custom filter components. Bring your own UI per column.
- Column pinning (left/right) with sticky positioning.
- CSV export with optional formatted output.
- Router-agnostic URL state sync with a default History-API adapter.
- Cross-page row selection + a shared bulk-action bar.
- Column-meta card composition (`title`/`subtitle`/`media`/`badge`/`meta`) + a `renderCard` escape hatch.
- Responsive: force-to-cards below a breakpoint, filters collapse to a bottom drawer on mobile.
- Faceted search with server-provided counts on filter options and range buckets with dynamic totals.
- External parameters (`params`) for scope selectors, toggles, and other non-column filters.
- Controls automatically disabled while data is loading (opt-out with `disableWhileLoading`).
- Loading / empty / filtered-empty / error states, consistent across both views.
- Dark mode support via Mantine's color scheme system.
- Strongly typed end to end; ships its own `.d.ts`. No icon dependency.

## Install

```sh
npm install @ethanhann/mantine-dataview
```

### Peer dependencies

```sh
npm install react react-dom @mantine/core @mantine/dates @mantine/hooks @tanstack/react-table
```

The library renders Mantine components, so your app must import Mantine's styles and wrap the
tree in a provider:

```tsx
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@ethanhann/mantine-dataview/styles.css"; // required for row animations
import {MantineProvider} from "@mantine/core";

<MantineProvider>{/* ... */}</MantineProvider>;
```

## Quickstart

The easiest path is `useDataViewFetcher`, which owns the fetch lifecycle for you:

```tsx
import {
    DataViewer,
    useDataViewFetcher,
    createColumnHelper,
    type DataColumnDef,
} from "@ethanhann/mantine-dataview";

interface User {
    id: string;
    name: string;
    email: string;
    status: "active" | "invited";
}

const col = createColumnHelper<User>();
const columns = [
    col.accessor("name", {header: "Name", meta: {card: {role: "title"}}}),
    col.accessor("email", {header: "Email", meta: {card: {role: "subtitle"}}}),
    col.accessor("status", {
        header: "Status",
        meta: {
            card: {role: "badge"},
            filter: {
                variant: "select",
                options: [
                    {value: "active", label: "Active"},
                    {value: "invited", label: "Invited"},
                ],
            },
        },
    }),
] satisfies DataColumnDef<User>[];

function Users() {
    const view = useDataViewFetcher<User>({
        columns,
        getRowId: (u) => u.id,
        fetcher: async (request) => {
            const res = await fetch(`/api/users?${toParams(request)}`);
            const json = await res.json();
            return {rows: json.items, rowCount: json.total};
        },
    });

    return <DataViewer view={view}/>;
}
```

`<DataViewer view={view} />` renders the toolbar, the active presentation, and pagination.

## Column builder

The fluent `col<T>()` builder reduces column definition verbosity. Each method sets
`dataType`, `filter`, `align`, and `meta.label` with sensible defaults for the type:

```tsx
import {col} from "@ethanhann/mantine-dataview";

const columns = col<User>()
    .text("name", {card: "title"})
    .text("email", {card: "subtitle", filter: false})
    .currency("salary", {card: "meta"})
    .number("age", {card: "meta", filter: {min: 18, max: 100}})
    .boolean("active", {card: "badge"})
    .date("createdAt", {card: "meta"})
    .select("role", {
        options: [{value: "admin", label: "Admin"}, {value: "user", label: "User"}],
        card: "badge",
    })
    .build();
```

### Available presets

| Method                             | `dataType` | `filter`      | `align` |
|------------------------------------|------------|---------------|---------|
| `.text(field)`                     | `text`     | `text`        | left    |
| `.number(field)`                   | `number`   | `numberRange` | right   |
| `.currency(field)`                 | `currency` | `numberRange` | right   |
| `.date(field)`                     | `date`     | `dateRange`   | left    |
| `.boolean(field)`                  | `boolean`  | `boolean`     | left    |
| `.select(field, { options })`      | —          | `select`      | left    |
| `.multiselect(field, { options })` | —          | `multiselect` | left    |
| `.custom(colDef)`                  | —          | —             | —       |

Headers are auto-humanized from field names (`createdAt` → `"Created At"`,
`first_name` → `"First Name"`). Override with `{ header: "Custom Label" }`.

Options: `header`, `card` (role shorthand), `cardOrder`, `filter` (`false` to disable,
or object to merge), `format`, `align`, `cell`, `enableSorting`, `width`.

### Column widths

Set `width` (pixels) on columns that need a fixed size. Columns without a width share
the remaining space equally:

```tsx
col<User>()
    .text("name")                    // shares remaining space
    .text("status", {width: 120}) // fixed 120px
    .number("age", {width: 80})   // fixed 80px
    .build();
```

With raw column defs, use TanStack's `size` property:

```tsx
col.accessor("status", {header: "Status", size: 120});
```

## Custom layout

Compose your own layout by passing children:

```tsx
<DataViewer view={view}>
    <DataViewer.Toolbar/>
    <DataViewer.BulkActions/>
    <DataViewer.Body/>
    <DataViewer.Pagination/>
</DataViewer>
```

Or use the standalone components directly for full control:

```tsx
<DataToolbar view={view} showSearch showFilters/>
<DataTable view={view} striped highlightOnHover/>
<DataPagination view={view}/>
```

### Toolbar sections

Inject controls into the toolbar without rebuilding it from scratch using `leftSection`
and `rightSection`:

```tsx
<DataViewer.Toolbar
    leftSection={<Text fw={600}>Users</Text>}
    rightSection={
        <Group gap="xs">
            <Button size="xs" onClick={() => view.exportCsv()}>Export</Button>
            <Button size="xs" onClick={() => view.refetch()}>Refresh</Button>
        </Group>
    }
/>
```

- `leftSection` renders before the search input (start of the left group).
- `rightSection` renders after the view switcher (end of the right group).

Both sections are disabled during loading along with the other toolbar controls.

### View switcher

The `ViewSwitcher` is exported for standalone use with customizable labels:

```tsx
import {ViewSwitcher} from "@ethanhann/mantine-dataview";

// Default
<ViewSwitcher view={view}/>

// Custom labels (text or icons)
<ViewSwitcher view={view} tableLabel="List" cardsLabel="Grid"/>
<ViewSwitcher view={view} tableLabel={<IconList/>} cardsLabel={<IconGrid/>}/>
```

Or drive the view programmatically:

```tsx
view.setView("cards"); // switch to cards
view.view;             // current view: "table" | "cards"
```

## Controlled (bring your own data layer)

`useDataViewFetcher` is a thin convenience wrapper. The core, `useDataView`, is fully controlled.
You supply `rows`/`rowCount`/`status` and respond to `onRequestChange`:

```tsx
const [resp, setResp] = useState({rows: [], rowCount: 0});
const [status, setStatus] = useState<Status>("idle");

const view = useDataView<User>({
    columns,
    getRowId: (u) => u.id,
    rows: resp.rows,
    rowCount: resp.rowCount,
    status,
    onRequestChange: async (request) => {
        setStatus("loading");
        try {
            setResp(await myApi.list(request));
            setStatus("success");
        } catch {
            setStatus("error");
        }
    },
});
```

The request is emitted immediately for pagination/sorting and debounced for search/filters.

### External parameters

Pass arbitrary parameters that aren't tied to a column. They're included in every
`DataViewRequest`, trigger a refetch when they change, and reset pagination to page 1:

```tsx
const [tenantId, setTenantId] = useState("acme");
const [showArchived, setShowArchived] = useState(false);

const view = useDataViewFetcher<User>({
    columns,
    getRowId,
    fetcher: async (request) => {
        // request.params = { tenantId: "acme", showArchived: false }
        const res = await api.list(request);
        return {rows: res.items, rowCount: res.total};
    },
    params: {tenantId, showArchived},
});

// Render your own controls...
<Select data={tenants} value={tenantId} onChange={setTenantId}/>
<Switch checked={showArchived} onChange={(e) => setShowArchived(e.currentTarget.checked)}/>
```

Values are typed as `FilterParam` (`string | number | boolean | null | undefined | Date |
string[] | number[] | Array<string | number>`). A value of `undefined` means "omit this param".

### Refetching on external changes

For cases where external state affects the fetcher but isn't a named parameter (e.g. it's
baked into the closure), use `deps` to trigger a refetch:

```tsx
const view = useDataViewFetcher<User>({
    columns,
    getRowId,
    fetcher,
    deps: [selectedTenantId],
});
```

When any value in `deps` changes, the current request is re-emitted to the fetcher.
Prefer `params` when the server needs to see the values; use `deps` when they're already
in the fetcher closure.

### Manual refresh

Re-fetch the current data without changing any state:

```tsx
<Button onClick={() => view.refetch()}>Refresh</Button>
```

This re-emits the current request to the fetcher. It's the same mechanism the built-in
error retry button uses.

### Optimistic reconciliation

When a sibling library (e.g. a detail panel) saves, creates, or deletes a record, the list
can reflect the change instantly without a full reload. Three primitives on the return value
apply in-place mutations, then schedule a background revalidation fetch that reconciles with
server truth.

```tsx
const view = useDataViewFetcher({...});

// A record was updated, replace it in place.
view.patchRow(updatedRecord);

// A new record was created, prepend it to the current page.
view.insertRow(newRecord);

// A record was deleted, remove it from the current page.
view.removeRow(recordId);
```

Each call immediately updates the rendered rows and then kicks off a debounced background
refetch (default 1 second, configurable via `revalidateDelay`). Rapid mutations coalesce
into a single fetch. When the server responds, its data fully replaces the optimistic state,
correcting sort position, filter membership, pagination counts, and facet buckets. If that
background revalidation fails, the optimistic data is kept (the failure means it couldn't be
re-confirmed, not that your write failed) — `status` stays `success` and no error is surfaced.

`view.isRevalidating` is `true` while the background fetch is in flight. Use it to show a
subtle sync indicator without replacing content with loading skeletons.

```tsx
const view = useDataViewFetcher({
    fetcher,
    columns,
    getRowId: (row) => row.id,
    revalidateDelay: 500, // default 1000ms
});

{
    view.isRevalidating && <Loader size="xs"/>
}
```

**Semantics.** The client cannot reproduce server-side filter membership, sort order, or facet
counts. The optimistic patch is a best-effort visual preview. The background revalidation is
the source of truth. An edited row that no longer matches the active filter will disappear
when the server responds. A created row that doesn't belong on the current page will be
repositioned. This is the stale-while-revalidate pattern: instant perceived speed with
eventual correctness.

When using the raw `useDataView` hook (without the fetcher wrapper), the three methods fall
back to calling `refetch()`, since you control the row data externally.

## Column data types and formatting

Set `dataType` on a column's meta to enable automatic value formatting. When no explicit
`cell` renderer is provided, the library formats values using `Intl.NumberFormat` or
`Intl.DateTimeFormat` based on the data type. Raw values are preserved for server requests,
sorting, and filtering. Formatting is display-only.

```tsx
col.accessor("price", {
    header: "Price",
    meta: {dataType: "currency", align: "right"},
});

col.accessor("createdAt", {
    header: "Created",
    meta: {dataType: "date"},
});
```

| Data type  | Default format                    | Example       |
|------------|-----------------------------------|---------------|
| `text`     | `String(value)`                   | `"hello"`     |
| `number`   | `Intl.NumberFormat`               | `1,234`       |
| `currency` | `Intl.NumberFormat` with currency | `$1,234.56`   |
| `date`     | `Intl.DateTimeFormat`             | `Jun 2, 2026` |
| `boolean`  | `"Yes"` / `"No"`                  | `Yes`         |

### Format overrides (three levels)

1. **Library defaults**, the built-in formatters per data type (above).
2. **Table-scoped**, `formatDefaults` on the hook options, keyed by data type.
3. **Column-scoped**, `format` on `ColumnMeta`, overrides everything for that column.

```tsx
const view = useDataViewFetcher({
    columns,
    getRowId,
    fetcher,
    // All dates in this table use short format, currency is EUR
    formatDefaults: {
        date: {dateStyle: "short"},
        currency: {currency: "EUR"},
    },
});

// This column overrides the table default
col.accessor("createdAt", {
    header: "Created",
    meta: {
        dataType: "date",
        format: {dateStyle: "long"},
    },
});

// Or use a function for full control
col.accessor("revenue", {
    header: "Revenue",
    meta: {
        dataType: "currency",
        format: (v) => `€${(v as number).toFixed(0)}`,
    },
});
```

If you provide your own `cell` renderer on a column, it takes full precedence over `dataType`
formatting.

## Sorting

Columns are sortable by default via table header clicks. The `request.sorting` array is sent
to the server so it can apply the sort.

### Multi-column sorting

Hold **Shift** and click additional column headers to add secondary, tertiary, etc. sort keys.
The header shows a small index number (2, 3, ...) next to the sort icon for secondary sorts.

The toolbar's sort control drives the primary sort. Multi-sort is available through table
headers only.

### Disabling sorting

Disable sorting on a specific column:

```tsx
col.accessor("avatar", {header: "Avatar", enableSorting: false});
```

## Custom headers

Column headers support the same render function pattern as cells. Pass a component or
function to the `header` property:

```tsx
col.accessor("revenue", {
    header: () => (
        <Group gap={4}>
            <IconCurrencyDollar size={14}/>
            <span>Revenue</span>
        </Group>
    ),
    meta: {align: "right"},
});
```

## View mode in cell renderers

Cell renderers can check whether they're rendering in table or card view using `getViewMode`:

```tsx
import {getViewMode} from "@ethanhann/mantine-dataview";

col.accessor("name", {
    cell: (ctx) => {
        const mode = getViewMode(ctx); // "table" | "cards"
        return mode === "cards" ? <Text>{ctx.getValue()}</Text> : <Anchor>{ctx.getValue()}</Anchor>;
    },
});
```

`getViewMode` accepts a cell context, header context, or table instance. It updates
automatically when the user toggles the view.

## CSV export

Export the current page's visible columns as a CSV file:

```tsx
<Button onClick={() => view.exportCsv()}>Export CSV</Button>

// With options
view.exportCsv({filename: "users.csv", separator: ";"});

// Export formatted values instead of raw data
view.exportCsv({formatted: true});
```

Cell values are sanitized against spreadsheet **formula injection** by default — values that begin
with `=`, `+`, `-`, or `@` are prefixed with a single quote so they aren't evaluated as formulas
when the file is opened. Disable it with `view.exportCsv({sanitizeFormulas: false})` only when the
output is consumed by a non-spreadsheet parser. Object and array cell values are serialized as JSON.

The `exportCsv` function is also available as a standalone utility:

```tsx
import {exportCsv} from "@ethanhann/mantine-dataview";

exportCsv(view.table, {filename: "report.csv"});
```

## Column pinning

Pin columns to the left or right edge so they stay visible while scrolling horizontally.

### Via initial state

```tsx
const view = useDataViewFetcher<User>({
    columns,
    getRowId,
    fetcher,
    initialState: {
        columnPinning: {left: ["name"], right: ["actions"]},
    },
});
```

### Via the UI

The **Columns** dropdown in the toolbar includes pin toggle buttons (left/right) next to each
column's visibility checkbox. Clicking a pin button freezes that column to the corresponding
edge; clicking it again unpins.

### Programmatic

```tsx
view.table.getColumn("name")?.pin("left");
view.table.getColumn("name")?.pin(false); // unpin
```

## Filters

### Built-in filter variants

Define filters declaratively on column meta. Seven variants are built in:

| Variant       | Control                             | Notes                           |
|---------------|-------------------------------------|---------------------------------|
| `text`        | `TextInput`                         | Free-text search                |
| `select`      | `Select` (dropdown)                 | Single choice, clearable        |
| `multiselect` | `MultiSelect`                       | Multiple choices                |
| `boolean`     | `SegmentedControl` (All/Yes/No)     | One-click toggle                |
| `numberRange` | `RangeSlider` or two `NumberInput`s | Slider when `min`/`max` are set |
| `date`        | `DatePickerInput`                   | Calendar picker                 |
| `dateRange`   | `DatePickerInput` (range)           | Two-date calendar picker        |

```tsx
// Boolean, renders as a segmented control
meta: {
    filter: {
        variant: "boolean"
    }
}

// Number range with slider
meta: {
    filter: {
        variant: "numberRange", min
    :
        0, max
    :
        1000, step
    :
        10
    }
}

// Number range without bounds (falls back to two number inputs)
meta: {
    filter: {
        variant: "numberRange"
    }
}

// Date range
meta: {
    filter: {
        variant: "dateRange"
    }
}
```

### Custom filter component

For filters that don't fit the built-in variants, provide a `component` instead:

```tsx
import type {CustomFilterComponentProps} from "@ethanhann/mantine-dataview";

function LocationFilter({value, onChange}: CustomFilterComponentProps) {
    return (
        <Chip.Group value={(value as string) ?? ""} onChange={(v) => onChange(v || undefined)}>
            <Group gap={4}>
                <Chip value="london" size="xs">London</Chip>
                <Chip value="berlin" size="xs">Berlin</Chip>
            </Group>
        </Chip.Group>
    );
}

col.accessor("location", {
    header: "Location",
    meta: {filter: {component: LocationFilter}},
});
```

### Inline filter placement

`FilterControl` is exported so you can place individual filters anywhere in your layout:

```tsx
import {FilterControl} from "@ethanhann/mantine-dataview";

<DataViewer view={view}>
    {view.table.getColumn("inStock") && (
        <FilterControl column={view.table.getColumn("inStock")!}/>
    )}
    <DataViewer.Toolbar/>
    <DataViewer.Body/>
    <DataViewer.Pagination/>
</DataViewer>
```

### Programmatic filter control

Reset all filters or clear a specific column from anywhere, no need to be inside the toolbar:

```tsx
// Reset all filters
<Button onClick={() => view.resetAllFilters()}>Reset all filters</Button>

// Clear a single column's filter
<Button onClick={() => view.resetFilter("status")}>Clear status filter</Button>
```

### Filter display behavior

- **Desktop, few filters** (at or below `filterInlineThreshold`, default 3): rendered inline in the toolbar.
- **Desktop, many filters**: collapsed into a "Filters" popover button with active count badge.
- **Mobile** (below `sm` breakpoint): always collapsed into a bottom drawer.
- A "Reset filters" button appears automatically when any filter is active.

## Faceted search

When the server returns `facets` in the response, filter controls automatically adapt to show
dynamic counts, disable zero-result options, and render clickable range buckets.

### Server response with facets

```tsx
fetcher: async (request) => {
    const res = await api.list(request);
    return {
        rows: res.items,
        rowCount: res.total,
        facets: {
            size: {
                type: "values",
                values: [
                    {value: "S", label: "Small", count: 12},
                    {value: "M", label: "Medium", count: 34},
                    {value: "L", label: "Large", count: 0},
                ],
            },
            price: {
                type: "ranges",
                ranges: [
                    {label: "Under $25", from: 0, to: 25, count: 15},
                    {label: "$25-$50", from: 25, to: 50, count: 28},
                    {label: "$50+", from: 50, to: 999, count: 7},
                ],
                min: 5,
                max: 249,
            },
        },
    };
};
```

### How controls adapt

| Filter type  | Without facets   | With value facets                      | With range facets                |
|--------------|------------------|----------------------------------------|----------------------------------|
| Select       | Static options   | Options with counts, zero-count dimmed | -                                |
| Boolean      | All / Yes / No   | All / Yes (12) / No (3)                | -                                |
| Number range | Slider or inputs | Slider (bounds from facet)             | Clickable range buckets + slider |
| Date range   | Date picker      | Date picker                            | Clickable range buckets + picker |

Facets are optional and backward compatible. Facet data updates on every fetch, creating the
classic faceted search loop where filtering one dimension updates counts on all others.

### Facet types

```ts
// Discrete values - for select, multiselect, boolean filters
type ValueFacet = {
    type: "values";
    values: { value: string; label?: string; count: number }[];
};

// Bucketed ranges - for numberRange, dateRange filters
type RangeFacet = {
    type: "ranges";
    /** Optional: whether bounds are numbers or ISO date strings, so consumers needn't guess. */
    kind?: "number" | "date";
    ranges: { label: string; from: number | string; to: number | string; count: number }[];
    min?: number | string;
    max?: number | string;
};
```

## Card composition

In card view, each visible column is placed by its `meta.card.role`:

| role       | rendered as                 |
|------------|-----------------------------|
| `title`    | card heading                |
| `subtitle` | dimmed line under the title |
| `media`    | full-bleed top section      |
| `badge`    | inline badge                |
| `meta`     | label / value pair          |
| `hidden`   | omitted                     |

Hiding a column via the toolbar hides both its table cell **and** its card field. Within each
role group, columns are ordered by `meta.card.order`.

### Custom card rendering

For full control over card content, use `renderCard`:

```tsx
<DataViewer
    view={view}
    renderCard={({data, selected, toggleSelected}) => (
        <Card withBorder padding="md" onClick={toggleSelected}>
            <Text fw={700}>{data.name}</Text>
            <Text size="sm" c="dimmed">{data.email}</Text>
            {selected && <Badge>Selected</Badge>}
        </Card>
    )}
/>
```

To keep the default composition but wrap it in a custom card shell, use the `Card` slot:

```tsx
<DataViewer
    view={view}
    slots={{
        Card: ({data, selected, children}) => (
            <Card
                withBorder
                padding="lg"
                style={{background: selected ? "var(--mantine-color-blue-light)" : undefined}}
            >
                {children}
            </Card>
        ),
    }}
/>
```

## Bulk actions

Provide a `BulkActions` slot to add actions when rows are selected:

```tsx
<DataViewer
    view={view}
    slots={{
        BulkActions: (selection) => (
            <Button
                color="red"
                variant="light"
                onClick={() => {
                    deleteUsers(selection.ids);
                    selection.clear();
                }}
            >
                Delete {selection.count}
            </Button>
        ),
    }}
/>
```

The `selection` object exposes the current selection and methods to change it.

Read the selection with `count`, `ids` (every selected row id across pages), and `pageRows` (selected
row data on the current page).
The older `rows` alias still works and equals `pageRows`.

Change the selection programmatically with `select`, `deselect`, `toggle`, `set`, `clear`, and
`isSelected`.
All are keyed by `getRowId` and span pages, so you can select a row that is not on the current page.
`select` and `deselect` accept a single id or an array.

```tsx
view.selection.select("42");
view.selection.select(["7", "9"]);
view.selection.toggle("3");
view.selection.set(["1", "2"]); // replace the whole selection
view.selection.clear();
const isOn = view.selection.isSelected("42");
```

Pass `enableMultiRowSelection={false}` to `useDataView` for single-select, where these methods collapse
to a single id.

## Keyboard navigation

The table and card views support keyboard navigation, on by default.
A roving focus point moves through the rows or cards with the arrow keys, and the body is exposed as a
`role="grid"` with `aria-selected` items.

| Key                       | Action                                             |
| ------------------------- | -------------------------------------------------- |
| Arrow keys                | Move the focused row or card                        |
| Home / End                | Jump to the first or last item                      |
| Space                     | Toggle selection on the focused item                |
| Shift and an arrow        | Extend a contiguous selection from the anchor       |

The table navigates one row at a time.
The card grid navigates in two dimensions, following the rendered layout.
It reads the real card geometry, so any responsive `cols` value works, and it falls back to left and
right traversal when the layout reports no rows (for example during tests).

Selection from the keyboard uses the same state as the checkboxes and the bulk-action bar.
Set `keyboardNavigation={false}` on `DataTable` or `DataCards` to opt out, for instance when embedding a
view inside your own keyboard model.

```tsx
<DataViewer view={view}>
    <DataViewer.Body tableProps={{keyboardNavigation: false}}/>
</DataViewer>;
```

## Custom state slots

Override loading, empty, and error states:

```tsx
<DataViewer
    view={view}
    slots={{
        Empty: () => <Text>No users found.</Text>,
        ErrorState: ({retry}) => (
            <Stack align="center">
                <Text c="red">Something went wrong.</Text>
                <Button onClick={retry}>Retry</Button>
            </Stack>
        ),
        LoadingTable: () => <MySkeleton/>,
        LoadingCards: () => <MyCardSkeleton/>,
    }}
/>
```

A filtered-empty state is handled automatically. It shows a "clear filters" action so
users can reset without manually removing each filter.

## URL state sync

Router-agnostic. The default adapter uses the History API; memoize it once:

```tsx
import {windowHistoryAdapter} from "@ethanhann/mantine-dataview/url";

const adapter = useMemo(() => windowHistoryAdapter(), []);
const view = useDataViewFetcher<User>({
    columns,
    getRowId,
    fetcher,
    urlSync: {adapter},
});
```

State round-trips through the query string
(`?page=2&size=25&sort=name:asc&q=ada&view=cards&f.status=active`) and stays in sync with
browser back/forward.

### `UrlStateAdapter` interface

To integrate with a router, implement these three methods:

```ts
interface UrlStateAdapter {
    /** Current query params as a flat record. */
    read(): Record<string, string>;

    /** Write the next params; `replace` controls history entry vs push. */
    write(next: Record<string, string>, opts?: { replace?: boolean }): void;

    /** Optional: notify on external nav (back/forward). Returns an unsubscribe fn. */
    subscribe?(onChange: () => void): () => void;
}
```

> Always memoize the adapter so the sync effects don't re-bind every render.

### React Router

```tsx
import {useSearchParams} from "react-router-dom";
import type {UrlStateAdapter} from "@ethanhann/mantine-dataview/url";

function useReactRouterAdapter(): UrlStateAdapter {
    const [searchParams, setSearchParams] = useSearchParams();
    return useMemo<UrlStateAdapter>(
        () => ({
            read: () => Object.fromEntries(new URLSearchParams(window.location.search)),
            write: (next, opts) => setSearchParams(next, {replace: opts?.replace}),
        }),
        [searchParams, setSearchParams],
    );
}
```

### TanStack Router

```tsx
import {useNavigate} from "@tanstack/react-router";
import type {UrlStateAdapter} from "@ethanhann/mantine-dataview/url";

function useTanStackRouterAdapter(): UrlStateAdapter {
    const navigate = useNavigate();
    return useMemo<UrlStateAdapter>(
        () => ({
            read: () => Object.fromEntries(new URLSearchParams(window.location.search)),
            write: (next, opts) => navigate({search: () => next, replace: opts?.replace}),
        }),
        [navigate],
    );
}
```

### URL sync options

- Restrict which slices sync with `urlSync.include` (e.g. only pagination and sorting).
- Override param names or codecs with `urlSync.serialize`.
- Choose how writes affect history with `urlSync.historyMode`: `"replace"` (default) keeps a clean
  history so the back button doesn't replay each filter/sort/page change; `"push"` creates a new
  entry per change so back/forward steps through them.
- URLs are kept clean: the page param is omitted on page 1, and the size param is omitted while it
  equals the default page size.
- Selection, column visibility, and column pinning are not URL-synced by design.

## Responsive behavior

Force the card view below a breakpoint:

```tsx
const view = useDataViewFetcher<User>({
    columns,
    getRowId,
    fetcher,
    responsive: {forceCardsBelow: "sm", lockSwitcherOnMobile: true},
});

<DataViewer view={view} lockSwitcherOnMobile/>;
```

When `forceCardsBelow` is set and the viewport is below that breakpoint:

- The view is forced to cards regardless of the user's choice.
- The user's explicit choice is preserved and restored above the breakpoint.
- The view switcher is disabled (or hidden entirely with `lockSwitcherOnMobile`).
- Filters always open in a bottom drawer on mobile.

## Loading behavior

By default, filter controls, sort controls, and column visibility/pinning menus are disabled
while data is loading. Sort headers in the table also become non-interactive, with a dimmed
appearance showing the current sort state. The search input stays enabled so users can keep
typing during debounced search.

Opt out per component:

```tsx
<DataTable view={view} disableWhileLoading={false}/>
<DataToolbar view={view} disableWhileLoading={false}/>
```

### Animated row transitions

Instead of skeleton loading, rows can animate in and out with CSS transitions. New rows
fade and slide in, removed rows fade out, and unchanged rows stay in place:

```tsx
<DataViewer view={view} animateRows/>
```

Be sure the CSS file from the package is included alongside Mantine's CSS:

```tsx
import "@ethanhann/mantine-dataview/styles.css";
```

When `animateRows` is enabled:

- Previous rows stay visible while new data loads (no skeleton flash).
- New rows enter with a slide-down fade-in animation (200ms).
- Removed rows fade out (150ms) before being removed from the DOM.
- Works in both table and card views.

This is opt-in. The default behavior (skeleton loading) is unchanged.

## Schedule presentation

Event-shaped data (anything with a start time, and usually an end or duration) has a third
projection: a **calendar**. It's **opt-in** and ships from a separate subpath so the scheduler
dependency stays out of everyone else's bundle — if you don't import
`@ethanhann/mantine-dataview/schedule`, you pay nothing for it.

### Install

The schedule presentation wraps [`@mantine/schedule`](https://mantine.dev/schedule/getting-started/),
which are **optional** peer dependencies (along with `dayjs`):

```sh
npm install @mantine/schedule dayjs
```

Import its styles after Mantine's, in order:

```tsx
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/schedule/styles.css";
import "@ethanhann/mantine-dataview/styles.css";
```

### Add it to a `DataViewer`

Register the schedule view; it adds a "Schedule" option to the view switcher and renders the
calendar when active. Table, cards, and schedule are then switchable at runtime, driven by the
same hook:

```tsx
import {DataViewer} from "@ethanhann/mantine-dataview";
import {scheduleView} from "@ethanhann/mantine-dataview/schedule";

<DataViewer view={view} views={[scheduleView<Booking>()]}/>;
```

Or render the calendar standalone:

```tsx
import {DataSchedule} from "@ethanhann/mantine-dataview/schedule";

<DataSchedule view={view}/>;
```

### Agenda and resource views

The same event data projects into two more presentations, each a registered view alongside the
calendar. Register any subset; the switcher shows **Table / Cards / Calendar / Agenda / Resources**,
and switching among the schedule-family views reuses the loaded window (no refetch).

```tsx
import {scheduleView, agendaView, resourcesView} from "@ethanhann/mantine-dataview/schedule";

<DataViewer view={view} views={[scheduleView(), agendaView(), resourcesView()]}/>;
```

- **Agenda** (`agendaView` / `DataAgenda`) — a date-grouped list over the visible window. Mantine's
  `AgendaView` has no navigation of its own, so `DataAgenda` renders a `DataAgendaNav` header by
  default (prev / today / next and a day/week/month range, no year; set `withNav={false}` to supply
  your own via `leftSection`).
- **Resources** (`resourcesView` / `DataResourceSchedule`) — one row per resource. The rows are
  **derived** from the `resource`-role column's filter options; pass an explicit `resources` prop
  (`ScheduleResourceData[]`) to control labels, colors, or order. Resource views have only
  day/week/month levels — a `year` window is clamped to `month`. When the response includes a value
  **facet** for the resource column, each row shows a live count (e.g. "Aspen (12)"); the rows stay
  stable as you filter, only the counts change. Opt out with `showResourceCounts={false}`. Pass a
  `groups` prop (`ScheduleResourceGroup[]`) to render a rowspan column grouping resources (e.g. rooms
  into wings) — it's applied across all levels.

To show the agenda *inside* the calendar instead of as a separate view, enable Mantine's built-in
toggle: `<DataSchedule scheduleProps={{withAgenda: true}}/>`.

### Locking to the schedule view

There is no responsive `forceScheduleBelow` — that fallback is specific to cards (a dense table is
unusable on small screens, so cards take over). To make the calendar the **only** view, lock the
`DataViewer` to it: register the schedule view, open directly on it with `scheduleInitialState()`,
and hide the switcher. Compose the layout manually so you can pass `showViewSwitcher={false}`:

```tsx
import {scheduleInitialState, scheduleView} from "@ethanhann/mantine-dataview/schedule";

// Seeds both the view and the initial window, so the first fetch is already windowed (no double
// fetch). Memoize it so the anchor date is fixed to first render.
const initialState = useMemo(() => scheduleInitialState("week"), []);

const view = useDataViewFetcher<Booking>({columns, getRowId, fetcher, initialState});

<DataViewer view={view} views={[scheduleView<Booking>()]}>
    <DataViewer.Toolbar showViewSwitcher={false}/> {/* no table/cards toggle */}
    <DataViewer.BulkActions/>
    <DataViewer.Body/>
    <DataViewer.Pagination/> {/* auto-suppressed in schedule mode */}
</DataViewer>;
```

The toolbar's search and filters still apply across the calendar; there is no table/cards toggle and
no pager. (For just the calendar with no toolbar at all, use the standalone `<DataSchedule>` above.)

Without `scheduleInitialState`, opening on the calendar still works — the calendar sets its own
window on mount — but it costs one extra fetch (a window-less request, then a windowed one). Seeding
the window avoids that. A `window` set while the view is not the schedule view is held but never sent
to the fetcher, so table and card requests are never polluted by a stale range.

### Week start

The fetched window aligns to the same week start the calendar grid renders.
Mantine defaults to Monday, and the schedule views read `firstDayOfWeek` from your `DatesProvider`, so
setting it in one place keeps the grid and the request in agreement with no extra prop.

```tsx
<DatesProvider settings={{firstDayOfWeek: 0}}> {/* Sunday */}
    <DataSchedule view={view}/>
</DatesProvider>;
```

`scheduleInitialState` runs before render, so it cannot read the provider.
Pass `firstDayOfWeek` to it as well when your `DatesProvider` overrides the default, otherwise the
first seeded window is Monday-aligned until the first navigation:
`scheduleInitialState("week", new Date(), "schedule", 0)`.

### Header sections

Slot custom controls into a header row above the calendar with `leftSection` and `rightSection` —
the schedule analog of the toolbar's sections. The header persists across the loading, error, and
empty states.

```tsx
<DataSchedule
    view={view}
    leftSection={<Text fw={600}>Team calendar</Text>}
    rightSection={
        <Group gap="xs">
            <Button size="xs" variant="default" onClick={() => view.refetch()}>Refresh</Button>
            <Button size="xs" onClick={createEvent}>New event</Button>
        </Group>
    }
/>;
```

- `leftSection` renders at the start of the header row, `rightSection` at the end.
- They also flow through `scheduleView({ leftSection, rightSection })` for the integrated `DataViewer`.
- Unlike the toolbar's sections, these are not auto-disabled while loading — read `view.status` or
  `view.isRevalidating` if you want to disable your own controls.

### Mapping rows to events

Rows become calendar events the same way columns become card fields — declaratively, via
`meta.schedule` roles (or the `col` builder's `schedule` shorthand):

| role       | supplies                                                                  |
|------------|---------------------------------------------------------------------------|
| `start`    | event start (required). A `Date`, ISO string, or epoch ms.                |
| `end`      | event end. Mutually exclusive with `duration`.                            |
| `duration` | event length — minutes (number) or ISO-8601 (`"PT1H30M"`). Derives `end`. |
| `title`    | event label.                                                              |
| `color`    | a Mantine color or CSS color.                                             |
| `resource` | resource/group id (reserved; resource views are a follow-up).             |
| `allDay`   | boolean all-day flag.                                                     |

```tsx
import {col} from "@ethanhann/mantine-dataview";

const columns = col<Booking>()
    .text("title", {schedule: "title"})
    .date("start", {schedule: "start"})
    .date("end", {schedule: "end"})            // or .number("mins", { schedule: "duration" })
    .select("status", {
        schedule: {role: "color", map: (s) => STATUS_COLOR[s]},
        options: statusOptions,
    })
    .build();
```

The `map` transform handles values that aren't the event value directly — a status mapped to a
color, or an epoch number mapped to a `Date`.

For event shapes that aren't column-backed, use the `toEvent` escape hatch, which returns a
`@mantine/schedule` event directly and bypasses role composition:

```tsx
<DataSchedule
    view={view}
    toEvent={(b) => ({
        id: b.id,
        title: b.title,
        start: new Date(b.start),
        end: new Date(b.end),
        color: STATUS_COLOR[b.status],
    })}
/>;
```

### Handling event clicks

All three presentations take an `onEventClick(row, event, nativeEvent)` that hands you the typed
original row (plus the Mantine event and the DOM event):

```tsx
<DataSchedule
    view={view}
    onEventClick={(booking) => openDetail(booking)} // `booking` is your row type
/>;
```

Same prop on `DataAgenda` and `DataResourceSchedule`. By default (no handler) clicking an event
toggles that row's selection, feeding the bulk-action bar. Providing `onEventClick` replaces that
default; to keep selection as well, call the exported helper inside your handler:

```tsx
import {toggleEventSelection} from "@ethanhann/mantine-dataview/schedule";

<DataSchedule
    view={view}
    onEventClick={(booking, event) => {
        toggleEventSelection(view, event.id); // keep selection
        openDetail(booking);                  // plus your action
    }}
/>;
```

For full control, a raw `onEventClick` in `scheduleProps` / `agendaProps` / `resourcesProps` still
overrides everything.

### Editing events

`DataSchedule` and `DataResourceSchedule` (not the read-only agenda) accept typed editing callbacks.
Each hands back the original row and the new `{ start, end }` as `Date`s, and **auto-enables** the
matching Mantine interaction — you don't also set `withEventsDragAndDrop` etc.

| Callback                                  | Interaction                                                    |
|-------------------------------------------|----------------------------------------------------------------|
| `onEventMove(row, { start, end }, ctx)`   | drag an event to a new time (resource views: `ctx.resourceId`) |
| `onEventResize(row, { start, end }, ctx)` | drag an event's edge to resize                                 |
| `onRangeSelect({ start, end }, ctx)`      | drag-select an empty range (to create)                         |
| `onSlotClick({ start, end }, ctx)`        | click an empty slot (to create)                                |

The library doesn't perform the write — pair these with the reconciliation primitives so you persist
to your backend and reflect the change instantly:

```tsx
<DataSchedule
    view={view}
    onEventMove={(row, {start, end}) => {
        api.update(row.id, {start, end});                 // your server
        view.patchRow({...row, start: start.toISOString(), end: end.toISOString()});
    }}
    onRangeSelect={({start, end}) => openCreateModal({start, end})}
/>;
```

`canDragEvent`, `canResizeEvent`, and external-drag handlers remain available through the
`scheduleProps` / `resourcesProps` escape hatch.

### Fetching by date window

A calendar fetches the visible date range, not a page. When a schedule view is active the core
emits a `window` on the request — map it onto your backend the way you map pagination:

```tsx
fetcher: async (request) => {
    if (request.window) {
        // request.window = { start, end, level: "day" | "week" | "month" | "year" }
        return api.listEvents({from: request.window.start, to: request.window.end});
    }
    return api.list(request); // table/cards: paginate as usual
};
```

In schedule mode the pager is replaced by the calendar's own date navigation, and the toolbar
drops the sort and column controls (a calendar has neither) while keeping search and filters.
`DataScheduleNav` is exported if you want a standalone prev/today/next + level control.

### URL sync

The visible window round-trips through the query string
(`?view=schedule&ws=…&we=…&wl=week`), but only when you **opt in** by listing `"window"` in
`urlSync.include` (it's off by default, like selection and pinning):

```tsx
urlSync: {
    adapter,
        include
:
    ["pagination", "sorting", "columnFilters", "globalFilter", "view", "window"],
}
```

### v1 scope

The schedule presentation is **read-only apart from click-to-select** (clicking an event toggles
its row selection, feeding bulk actions). Drag-to-create, move, and resize are not wired in v1 —
forward Mantine's `onEventDrop`/`onEventResize`/`onTimeSlotClick` through `scheduleProps` to handle
them yourself (they pair well with the reconciliation primitives). Recurrence is pass-through only
(emit an `rrule` from `toEvent` and Mantine expands it), and resource views are a follow-up (the
`resource` role is reserved).

## API overview

| Export                                                                 | Purpose                                                                                                                                                             |
|------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `useDataView`                                                          | Headless core, owns all feature state                                                                                                                               |
| `useDataViewFetcher`                                                   | Convenience wrapper that manages the fetch                                                                                                                          |
| `DataViewer` (+ `.Toolbar` / `.BulkActions` / `.Body` / `.Pagination`) | Orchestrator + compound parts                                                                                                                                       |
| `DataTable`, `DataCards`                                               | The two presentations (usable standalone)                                                                                                                           |
| `DataToolbar`, `DataPagination`, `DataBulkActions`                     | Standalone affordances                                                                                                                                              |
| `FilterControl`                                                        | Individual filter control (place anywhere)                                                                                                                          |
| `ViewSwitcher`                                                         | Table/Cards toggle (customizable labels)                                                                                                                            |
| `exportCsv`                                                            | Standalone CSV export utility                                                                                                                                       |
| `col`                                                                  | Fluent column builder factory                                                                                                                                       |
| `getViewMode`                                                          | Detect table vs cards from cell context                                                                                                                             |
| `createColumnHelper`, `composeCardLayout`, `resolveColumnLabel`        | Column helpers                                                                                                                                                      |
| `@ethanhann/mantine-dataview/url`                                      | `windowHistoryAdapter` + serializer utilities                                                                                                                       |
| `@ethanhann/mantine-dataview/schedule`                                 | Opt-in calendar / agenda / resources: `scheduleView` · `agendaView` · `resourcesView` (and `DataSchedule` / `DataAgenda` / `DataResourceSchedule`, `DataScheduleNav` / `DataAgendaNav`) |

### Reconciliation primitives

Returned by `useDataViewFetcher` (fall back to `refetch()` on raw `useDataView`):

| Method / Property   | Purpose                                                         |
|---------------------|-----------------------------------------------------------------|
| `patchRow(record)`  | Replace an existing row by identity, then background revalidate |
| `insertRow(record)` | Prepend a new row, increment `rowCount`, then revalidate        |
| `removeRow(id)`     | Remove a row, decrement `rowCount`, then revalidate             |
| `isRevalidating`    | `true` while the background revalidation fetch is in flight     |

### Customization slots

Passed via the `slots` prop on `DataViewer` or the presentation components:

| Slot           | Receives                            | Purpose                    |
|----------------|-------------------------------------|----------------------------|
| `Empty`        | `{ view }`                          | No data state              |
| `ErrorState`   | `{ retry }`                         | Error with retry action    |
| `LoadingTable` | —                                   | Table skeleton replacement |
| `LoadingCards` | —                                   | Card skeleton replacement  |
| `Row`          | `{ row, children }`                 | Wrap each table row        |
| `Card`         | `{ row, data, selected, children }` | Wrap each card             |
| `BulkActions`  | `{ count, ids, pageRows, clear }`   | Bulk action bar content    |

## Development

```sh
npm run dev          # Storybook
npm test             # Vitest (watch)
npm run test:coverage
npm run typecheck
npm run build
```

## License

MIT
