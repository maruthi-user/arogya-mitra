# Shared data tables

All healthcare record-list screens now use the shared table model and controls. Registration/edit forms, navigation tiles, single-record profiles and dashboard metric tiles remain dedicated controls rather than becoming tables.

## Implementation

- `frontend/src/components/data-display/table-model.js`: pure filtering, stable sorting and pagination. It never mutates fetched rows, fetches data, stores records or decides permissions.
- `frontend/src/components/data-display/table.js`: workflow HTML table renderer, session/module-scoped control state and delegated actions.
- `frontend/src/components/data-display/record-tables.js`: reusable column definitions for providers, services, requests, businesses, organisations, notifications, pharmacies and appointments. Expandable details retain the existing workflow actions and history.
- `frontend/src/components/data-display/RecordDataTable.jsx`: React adapter using the same model; used for account device sessions.
- `frontend/src/components/data-display/data-table.css`: shared teal styling, desktop/laptop scroll support and phone layouts with field labels and mobile sorting controls.

## Features

- Text search over data columns, including formatted labels.
- Stable ascending/descending column sorting; numbers use numeric comparison.
- Filtering and sorting before pagination.
- 10, 25, 50 or 100 rows per page; previous/next and visible record totals.
- Page clamping after filters/data updates, empty results and reset controls.
- Expandable details for long records and existing role-specific actions.
- Accessible labels, captions, sorting state and keyboard focus styles.
- Telugu/English table controls.
- Workflow table state isolated by role, account, authentication revision, module and table ID. State clears at identity changes, logout and teardown. React account tables remount with their account scope.

Existing service/location/status filters remain outside the table. Where a module already has a domain search form, its table uses `showSearch:false` to avoid duplicate search controls. Those searches filter the complete fetched collection before the shared table handles sorting/paging.

## Module coverage

| Role | Record lists |
|---|---|
| Patient | Home appointments/providers, provider search, service catalog and business-specific service catalogs, appointments, service requests, medicines, pharmacy results, medicine inquiries, global search results |
| Provider | Overview services, managed services, requests/pending requests, availability, team accounts, appointments/upcoming schedule, notifications, account device sessions |
| Admin | Pending provider approvals, all applications, overview pending applications, business reviews, managed services, service requests, organisations, mail delivery, audit history, pharmacies/stock details, medicine inquiries, account device sessions |

The APIs remain authoritative for role and ownership permissions. Tables only receive the records those APIs return. Existing approve/reject, booking, request transitions, stock controls, invitations and session-revocation actions remain module-owned. Service-review actions are shown only for pending services and admins.

## Reuse in workflow pages

```js
DataTable({
  id: 'my-records', // stable per module; do not derive from user data
  caption: 'My records',
  rows,
  columns: [
    {key: 'name', label: 'Name'},
    {key: 'fee', label: 'Fee'},
    {key: 'createdAt', label: 'Created', render: row => escapeHtml(formatDate(row.createdAt))},
    {label: 'Actions', sortable: false, searchable: false, render: row => permittedActions(row)}
  ]
});
```

Default cells and search values are escaped when inserted into HTML. HTML `render` callbacks are trusted application code: escape all user-provided values inside them. For derived display values use `value(row)`, for custom ordering use `sortValue(row)`, and for search-specific text use `searchValue(row)`. Mark action/detail columns `sortable:false, searchable:false`.

The bootstrap registers `createTableActions(render)`, sets the active table scope before each page render, preserves form datasets on submit and dispatches page-size/mobile-sort changes. Modules should pass all matching fetched rows rather than pre-slicing a page. The older practice and provider-search paging was removed from their table paths to prevent double pagination.

The React adapter accepts the same `rows`, `columns`, `value`, `sortValue` and `searchValue` contract, but its render callbacks return React nodes. Give it a stable table ID and remount it with the authenticated account's key when used across identities.

## Limits and validation

Search/sorting/paging are currently client-side over the records returned by existing APIs. A table does not retrieve older server records beyond an API's existing response limit (for example the audit feed's cap). No new backend endpoints or database changes were introduced.

Verification includes numeric/stable sorting, filtering before paging, page-size controls, reset/clamping, account/module isolation, safe HTML, formatted-label search, mobile control markup and patient/provider/admin integration. Browser screenshot/device-layout verification was not available in this session.
