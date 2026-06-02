# @ethanhann/mantine-dataview

[![npm version](https://img.shields.io/npm/v/@ethanhann/mantine-dataview.svg)](https://www.npmjs.com/package/@ethanhann/mantine-dataview)
[![CI](https://github.com/ethanhann/mantine-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/ethanhann/mantine-grid/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fethanhann.github.io%2Fmantine-grid%2Fcoverage-badge.json)](https://ethanhann.github.io/mantine-grid)
[![Storybook](https://img.shields.io/badge/Storybook-deployed-ff4785?logo=storybook&logoColor=white)](https://ethanhann.github.io/mantine-grid)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A reusable React library that renders **server-driven, paginated datasets** as either a
**table** or a **card grid**, switchable at runtime, with full feature parity between the two —
built on [Mantine](https://mantine.dev) v9 and [TanStack Table](https://tanstack.com/table) v8.

## Features

- One hook drives both a Mantine `Table` and a Mantine `Card` grid; switch at runtime.
- Server-side pagination, sorting, column filters, and global search — backend-agnostic.
- Router-agnostic URL state sync with a default History-API adapter.
- Cross-page row selection + a shared bulk-action bar.
- Column-meta card composition (`title`/`subtitle`/`media`/`badge`/`meta`) + a `renderCard`
  escape hatch.
- Custom filter components — bring your own UI per column.
- Responsive: force-to-cards below a breakpoint, filters collapse to a bottom drawer on mobile.
- Loading / empty / filtered-empty / error states, consistent across both views.
- Strongly typed end to end; ships its own `.d.ts`. No icon or data-fetching dependency.

## Install

```sh
npm install @ethanhann/mantine-dataview
```

### Peer dependencies

```sh
npm install react react-dom @mantine/core @mantine/hooks @tanstack/react-table
```

The library renders Mantine components, so your app must import Mantine's styles and wrap the
tree in a provider:

```tsx
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";

<MantineProvider>{/* ... */}</MantineProvider>;
```

## Quickstart

The easiest path is `useDataViewFetcher`, which owns the fetch lifecycle for you:

```tsx
import {
  DataView,
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
  col.accessor("name", { header: "Name", meta: { card: { role: "title" } } }),
  col.accessor("email", { header: "Email", meta: { card: { role: "subtitle" } } }),
  col.accessor("status", {
    header: "Status",
    meta: {
      card: { role: "badge" },
      filter: {
        variant: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "invited", label: "Invited" },
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
      return { rows: json.items, rowCount: json.total };
    },
  });

  return <DataView view={view} />;
}
```

`<DataView view={view} />` renders the toolbar, the active presentation, and pagination.

## Custom layout

Compose your own layout by passing children:

```tsx
<DataView view={view}>
  <DataView.Toolbar />
  <DataView.BulkActions />
  <DataView.Body />
  <DataView.Pagination />
</DataView>
```

Or use the standalone components directly for full control:

```tsx
<DataToolbar view={view} showSearch showFilters />
<DataTable view={view} striped highlightOnHover />
<DataPagination view={view} />
```

## Controlled (bring your own data layer)

`useDataViewFetcher` is a thin convenience wrapper. The core, `useDataView`, is fully controlled —
you supply `rows`/`rowCount`/`status` and respond to `onRequestChange`:

```tsx
const [resp, setResp] = useState({ rows: [], rowCount: 0 });
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
col.accessor("avatar", { header: "Avatar", enableSorting: false });
```

## Custom headers

Column headers support the same render function pattern as cells — pass a component or
function to the `header` property:

```tsx
col.accessor("revenue", {
  header: () => (
    <Group gap={4}>
      <IconCurrencyDollar size={14} />
      <span>Revenue</span>
    </Group>
  ),
  meta: { align: "right" },
});
```

The header render function receives TanStack's `HeaderContext` with access to the column
and table instances.

## CSV export

Export the current page's visible columns as a CSV file:

```tsx
<Button onClick={() => view.exportCsv()}>Export CSV</Button>

// With options
view.exportCsv({ filename: "users.csv", separator: ";" });
```

The `exportCsv` function is also available as a standalone utility:

```tsx
import { exportCsv } from "@ethanhann/mantine-dataview";

exportCsv(view.table, { filename: "report.csv" });
```

## Filters

### Built-in filter variants

Define filters declaratively on column meta. Seven variants are built in:

```tsx
// Text search
meta: { filter: { variant: "text" } }

// Single select
meta: { filter: { variant: "select", options: [{ value: "active", label: "Active" }] } }

// Multi select
meta: { filter: { variant: "multiselect", options: [...] } }

// Boolean (Yes/No)
meta: { filter: { variant: "boolean" } }

// Number range (min/max)
meta: { filter: { variant: "numberRange" } }

// Date
meta: { filter: { variant: "date" } }

// Date range (from/to)
meta: { filter: { variant: "dateRange" } }
```

### Custom filter component

For filters that don't fit the built-in variants, provide a `component` instead:

```tsx
import type { CustomFilterComponentProps } from "@ethanhann/mantine-dataview";
import { Chip, Group } from "@mantine/core";

function LocationFilter({ value, onChange }: CustomFilterComponentProps) {
  return (
    <Chip.Group value={(value as string) ?? ""} onChange={(v) => onChange(v || undefined)}>
      <Group gap={4}>
        <Chip value="london" size="xs">London</Chip>
        <Chip value="berlin" size="xs">Berlin</Chip>
        <Chip value="tokyo" size="xs">Tokyo</Chip>
      </Group>
    </Chip.Group>
  );
}

col.accessor("location", {
  header: "Location",
  meta: { filter: { component: LocationFilter } },
});
```

Custom filter components receive:

| Prop       | Type                           | Description                              |
| ---------- | ------------------------------ | ---------------------------------------- |
| `value`    | `unknown`                      | Current filter value (`undefined` = off) |
| `onChange`  | `(value: unknown) => void`    | Update the filter; `undefined` to clear  |
| `column`   | `Column<any>`                  | TanStack column instance                 |

### Filter display behavior

- **Desktop, few filters** (at or below `filterInlineThreshold`, default 3): rendered inline in the toolbar.
- **Desktop, many filters**: collapsed into a "Filters" popover button with active count badge.
- **Mobile** (below `sm` breakpoint): always collapsed into a bottom drawer.
- A clear button appears automatically when any filter is active.

## Card composition

In card view, each visible column is placed by its `meta.card.role`:

| role       | rendered as                 |
| ---------- | --------------------------- |
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
<DataView
  view={view}
  renderCard={({ data, selected, toggleSelected }) => (
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
<DataView
  view={view}
  slots={{
    Card: ({ data, selected, children }) => (
      <Card
        withBorder
        padding="lg"
        style={{ background: selected ? "var(--mantine-color-blue-light)" : undefined }}
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
<DataView
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

The `selection` object provides `count`, `ids` (all selected row IDs across pages),
`rows` (selected row data on the current page), and `clear()`.

## Custom state slots

Override loading, empty, and error states:

```tsx
<DataView
  view={view}
  slots={{
    Empty: () => <Text>No users found.</Text>,
    ErrorState: ({ retry }) => (
      <Stack align="center">
        <Text c="red">Something went wrong.</Text>
        <Button onClick={retry}>Retry</Button>
      </Stack>
    ),
    LoadingTable: () => <MySkeleton />,
    LoadingCards: () => <MyCardSkeleton />,
  }}
/>
```

A filtered-empty state is handled automatically — it shows a "clear filters" action so
users can reset without manually removing each filter.

## URL state sync

Router-agnostic. The default adapter uses the History API; memoize it once:

```tsx
import { windowHistoryAdapter } from "@ethanhann/mantine-dataview/url";

const adapter = useMemo(() => windowHistoryAdapter(), []);
const view = useDataViewFetcher<User>({
  columns,
  getRowId,
  fetcher,
  urlSync: { adapter },
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
import { useSearchParams } from "react-router-dom";
import type { UrlStateAdapter } from "@ethanhann/mantine-dataview/url";

function useReactRouterAdapter(): UrlStateAdapter {
  const [searchParams, setSearchParams] = useSearchParams();
  return useMemo<UrlStateAdapter>(
    () => ({
      read: () => Object.fromEntries(new URLSearchParams(window.location.search)),
      write: (next, opts) => setSearchParams(next, { replace: opts?.replace }),
    }),
    [searchParams, setSearchParams],
  );
}
```

### TanStack Router

```tsx
import { useNavigate } from "@tanstack/react-router";
import type { UrlStateAdapter } from "@ethanhann/mantine-dataview/url";

function useTanStackRouterAdapter(): UrlStateAdapter {
  const navigate = useNavigate();
  return useMemo<UrlStateAdapter>(
    () => ({
      read: () => Object.fromEntries(new URLSearchParams(window.location.search)),
      write: (next, opts) => navigate({ search: () => next, replace: opts?.replace }),
    }),
    [navigate],
  );
}
```

### URL sync options

- Restrict which slices sync with `urlSync.include` (e.g. only pagination and sorting).
- Override param names or codecs with `urlSync.serialize`.
- Selection and column visibility are not URL-synced by design.

## Responsive behavior

Force the card view below a breakpoint:

```tsx
const view = useDataViewFetcher<User>({
  columns,
  getRowId,
  fetcher,
  responsive: { forceCardsBelow: "sm", lockSwitcherOnMobile: true },
});

<DataView view={view} lockSwitcherOnMobile />;
```

When `forceCardsBelow` is set and the viewport is below that breakpoint:
- The view is forced to cards regardless of the user's choice.
- The user's explicit choice is preserved and restored above the breakpoint.
- The view switcher is disabled (or hidden entirely with `lockSwitcherOnMobile`).

## API overview

| Export                                                                | Purpose                                       |
| --------------------------------------------------------------------- | --------------------------------------------- |
| `useDataView`                                                         | Headless core — owns all feature state        |
| `useDataViewFetcher`                                                  | Convenience wrapper that manages the fetch    |
| `DataView` (+ `.Toolbar` / `.BulkActions` / `.Body` / `.Pagination`) | Orchestrator + compound parts                 |
| `DataTable`, `DataCards`                                              | The two presentations (usable standalone)     |
| `DataToolbar`, `DataPagination`, `DataBulkActions`                   | Standalone affordances                        |
| `createColumnHelper`, `composeCardLayout`, `resolveColumnLabel`      | Column helpers                                |
| `@ethanhann/mantine-dataview/url`                                    | `windowHistoryAdapter` + serializer utilities |

### Customization slots

Passed via the `slots` prop on `DataView` or the presentation components:

| Slot           | Receives                                   | Purpose                           |
| -------------- | ------------------------------------------ | --------------------------------- |
| `Empty`        | `{ view }`                                 | No data state                     |
| `ErrorState`   | `{ retry }`                                | Error with retry action           |
| `LoadingTable` | —                                          | Table skeleton replacement        |
| `LoadingCards`  | —                                          | Card skeleton replacement         |
| `Row`          | `{ row, children }`                        | Wrap each table row               |
| `Card`         | `{ row, data, selected, children }`        | Wrap each card                    |
| `BulkActions`  | `{ count, ids, rows, clear }`              | Bulk action bar content           |

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
