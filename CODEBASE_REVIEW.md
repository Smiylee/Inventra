# Inventra codebase review

Reviewed 2026-11-08. This is a read-only review of the supplied application; no application source, dependencies, or databases were changed. The archive was extracted into `/tmp/inventra-code-review` for inspection. Paths below beginning with `home-page/` describe files inside `Inventra/home-page.zip`, not an existing source directory in the checkout.

## Overall assessment

Inventra is a partially implemented school store management application, branded variously as Inventra, SmartStore, Store App, and DLHS Store Management App. Its core workflow is recognizable: register/login, manage students and inventory, select a student, build a cart, record purchases, and view daily sales and low-stock reminders. It also includes notes and administrator backup/import/reset functions.

The current checkout is not a reproducible, runnable delivery. The application source is archived, Prisma schema/migrations/store database are absent, dependencies are not installed for the actual application, and there are confirmed inventory correctness and access-control problems. The existing code provides a useful starting point, but stock counts, backup restoration, and permissions need repair before relying on it for store operations.

## 1. Repository and source organization

The workspace contains two Git repositories:

- The outer workspace repository has no commits. Its package.json only declares the npm package `matplotlib`; there are no application scripts. The inner repository and outer dependencies are untracked here.
- `Inventra/` is the actual application repository. It has three commits visible locally, most recently `6d893c8`, a merge. Its working tree was clean when inspected.
- No applicable AGENTS.md was found during inspection.

The actual repository tracks 11 files: package manifests, a minimal README, two Electron entry-point candidates, preload.js, the source ZIP, a session SQLite database, Git settings, and a short task list. The task list says basic UI, basic functions, authentication, and UI fixes; it does not reliably describe current completion.

The ZIP has 110 entries, of which 95 are files: 24 JS/MJS files, 36 EJS files, four HTML files, four CSS files, two images, two JSON manifests, two session databases plus WAL/SHM files, and 19 uploaded JSON backups. It also contains an older application inside `public/electron try/home-page/`.

Keeping source inside a ZIP prevents normal per-file diffs, focused code review, and ordinary development tooling. There are no tests, CI workflows, lint/format configuration, TypeScript configuration, or meaningful setup documentation in the supplied application.

## 2. Architecture and startup

Intended flow:

`Electron main.js -> imports Express app.mjs -> localhost:3000 -> EJS pages + browser JavaScript -> Prisma -> SQLite store.db`

A separate SQLite database stores Express sessions.

The actual package declares ESM (`type: module`), points `main` to `main.js`, and has these commands:

- `start`: Electron desktop app.
- `dev`: nodemon on `home-page/app.mjs`.
- `build` and `dist`: electron-builder.
- `postinstall`: Prisma client generation.
- Prisma Studio, schema push, and migration development commands.

Lockfile versions include Electron 28.3.3, Express 5.1.0, Prisma/client 6.17.1, EJS 3.1.10, connect-sqlite3 0.9.16, and sqlite3 5.1.7. These are local lockfile observations, not a current vulnerability audit. Electron Packager and the Tauri CLI are declared too, but no active Tauri implementation is present.

`main.js` configures a 1280x800 window, disables renderer Node integration, enables context isolation, opens developer tools unconditionally, and starts the Express server in the Electron main process. It puts the store and session databases in Electron userData. A starter store database is copied there if available. It sets PORT to 3000 and polls the root URL every 300ms until an HTTP success response.

Confirmed startup/release gaps:

- `home-page/` is absent from the checkout; only its ZIP exists.
- `prisma/schema.prisma`, migrations, and `prisma/store.db` are absent from both the checkout and ZIP.
- Consequently the expected Prisma generation, schema management, and database bundling inputs are unavailable.
- `npm --prefix Inventra start` fails with `electron: command not found` in this environment.
- Development database source selection checks NODE_ENV rather than Electron packaging state; `start` does not set NODE_ENV. A normal development launch can therefore look in the packaged-resources location.
- Logging writes before ensuring the userData directory exists. First-run startup can fail if that directory is absent.
- Failed Express import is logged, but server polling continues without a timeout or visible error page.
- The fixed port has no conflict handling. Polling only checks an HTTP success, so another server on that port could be mistaken for this application.
- Express listen does not specify loopback, so it is not explicitly restricted to localhost.
- The app exports an Express app while immediately listening, complicating integration tests and server lifecycle management.
- macOS window recreation reuses the cached server module, but there is no explicit server shutdown management.
- Packaging is configured with a Windows NSIS target and no explicit macOS/Linux release configuration.
- The unused `main.cjs` references `isDev` even though its definition is commented out and points packaged mode at a missing build/index.html.
- `preload.js` uses require and exposes an empty electron object. Its interaction with the current ESM/preload configuration should be verified in Electron; it was not executed here.

## 3. Features and inferred data model

The Prisma schema is missing, so these are fields inferred from live query code, not verified database definitions.

| Entity | Fields and behavior observed |
| --- | --- |
| Product | id, pname, price, quantity, reorderLevel, size, description, category |
| Student | id, studentName, studentClass, admissionNumber, gender, remark, purchases relation |
| Purchase | productId, name, price, quantity, size, description, date; related to a student |
| User | id, username, bcrypt password hash, isAdmin |
| Note | id, title, content, createdAt |

The UI uses Nigerian naira and school classes JSS1–SSS3. The intended environment appears to be a Nigerian secondary-school store; that is an inference from labels and currency.

Implemented route families:

- Landing page, signup, login, two logout endpoints.
- Dashboard with today's purchase-line count/revenue, student count, and low-stock count.
- Product creation, lookup/edit/delete, and name search.
- Student creation, lookup/edit/delete, search by name/class/admission number, record details, remarks, and purchase history.
- Student purchase screen, product search, session cart addition, cancel, and checkout.
- Today's sales, low-stock reminders, shared notes.
- Administrator JSON export/import/reset.

Product/student landing pages are navigation screens, rather than complete lists. Category creation exists, but the category selector on search has no submitted name and is not applied by the backend. No payment processing, receipts, returns/refunds, stock movement ledger, supplier/purchase-order workflow, or audit trail is implemented in the reviewed source. The historical MongoDB student model includes a balance concept, but the active Prisma routes do not implement an account-balance workflow.

## 4. Critical stock and purchase defects

### Cart cancellation creates stock

`home-page/app.mjs:610` adds items to a session cart without reserving or reducing inventory. `app.mjs:707` nevertheless adds those quantities back on cancellation.

An isolated execution of the actual cancel-handler body with mocked Prisma calls changed stock from 10 to 13 for a cart containing three items. Repeating add/cancel can inflate inventory.

### Checkout can lose stock without recording a sale

`app.mjs:658` decrements each product before looking up the student or writing purchases. There is no transaction across these operations. Invalid students, later product failures, or purchase insertion failures can leave stock reduced with no matching purchase record. If the student is absent, the handler still clears the cart and redirects.

The actual handler body, run with a mocked nonexistent student, changed stock from 10 to 7 for three items.

### Checkout can oversell

Cart quantity validation is only partially represented by HTML inputs; server handlers accept unchecked parsed values. There is no stock availability check during cart addition or checkout. Multiple additions can exceed stock even when each individual browser input stays below its maximum. Concurrent or repeated checkout requests are not protected by an atomic stock condition or idempotency mechanism.

An isolated checkout of 12 items against stock of 10 produced -2 stock. Negative quantities can also invert stock arithmetic. Session cart contents retain prices from add time, with no explicit policy for later price changes.

### Cart ownership is ambiguous

One session cart is reused across student pages, and checkout takes the student ID from the URL. The cart does not record which student it belongs to. Navigating between student records can attach a prior cart to a different student.

## 5. Permissions and data exposure

- Most routes in app.mjs have no login middleware: student records and remarks, inventory mutation, carts/checkout, reminders, and deletion endpoints are accessible without an authenticated user. Today's sales also lacks a login check.
- Dashboard and notes check login; settings routes check an admin session flag. These checks are inconsistent across the application.
- Public signup accepts isAdmin directly from the request. The signup UI explicitly offers an Admin checkbox. Any visitor can register as an administrator, which defeats settings authorization.
- Notes are labeled Admin Notes, but any logged-in user can create/delete any note; no owner or admin check is present.
- The session secret is hardcoded in tracked source. Login does not regenerate the session ID. There is no login throttling or CSRF-token mechanism. Login errors distinguish unknown users from incorrect passwords.
- Product, student, and remark values are inserted into HTML strings assigned to innerHTML. This creates stored HTML/script-injection paths through modal content, despite ordinary EJS output generally using escaped interpolation.
- `express.static(publicPath)` exposes the old application's source, manifests, templates, and assets nested beneath public. The old app is not automatically launched, but its files become downloadable once this server runs.
- The ZIP contains 19 JSON backup uploads, including user password fields and student information. One archived session database contains a session with user and cart data. These contents should not be treated as harmless source assets. This review inspected keys/counts and did not reproduce records or hashes.
- The older publicly nested prototype contains a hardcoded demonstration login and Electron settings with Node integration enabled and isolation disabled. It is not the active entry point; that distinction matters.

Positive foundations: bcrypt password hashing is used; active Electron renderer settings include isolation and disabled Node integration; Prisma queries use structured filters; settings endpoints have an explicit admin middleware function. Coverage and correctness need strengthening around those foundations.

## 6. Backup, import, and reset risks

`home-page/routes/settings.js` exports students, products, and users only. It does not explicitly export purchases or notes; its student query does not include purchases. A backup is therefore not a complete representation of the active application.

Import parses uploaded JSON, deletes existing students/products/users, then inserts the new data, with no schema/version validation and no transaction. A malformed or incompatible backup can cause deletion followed by failure. Actual effects depend on the missing schema's foreign-key/cascade settings. Existing purchases could prevent deletion or be removed by cascades; neither behavior can be verified here.

The archived uploads mix MongoDB-style fields (`_id`, `__v`, name/class) and Prisma-style fields (id, studentName/studentClass), which the current importer does not normalize. Reset similarly omits explicit handling of purchases/notes and deletes all users, including administrators. Existing session authorization is not invalidated when user records or privileges change.

Uploads have no configured size limit, use a working-directory-relative uploads folder, and are removed only after a successful import. Failed imports can leave sensitive files behind. Export includes password hashes. A reliable restore process and recovery/admin provisioning path are absent.

## 7. Reporting, pagination, and response defects

- Dashboard computes lowStockCount as a number and then checks `lowStockCount.length > 0`; the resulting flag is always false. This was also reproduced as a JavaScript expression.
- Low-stock middleware runs after the mounted dashboard/notes/sales/settings routers, so completed requests from those routers do not get its current locals. Defaults often conceal the issue.
- Global stock checking uses quantity < 5, while dashboard/reminders use quantity <= reorderLevel. Indicators can disagree.
- Dashboard salesCount counts purchase lines, not units sold or distinct checkout transactions.
- Today's-sales mapping reads p.pname, while checkout writes purchase.name; product labels will be missing if the active purchase model follows the write path.
- Product search returns all matches without pagination but calculates page count from every product. Search pagination links drop the search term.
- Student search applies skip/take, but navigation links drop the search text and filter. Page values lack strict positive-integer bounds, and student queries have no explicit stable ordering.
- Purchase-history pagination uses purchases.count instead of array.length, calculates skip but never applies it, always renders the first ten purchases, and links to an absent /view_purchase route. The template loop condition is reversed too.
- GET /products/:id queries a product but never responds. GET /delete/:id is an empty handler and also never responds.
- Several catch blocks log errors without sending a response, including product editing, student editing/creation, and remark updates.
- Duplicate student creation renders an error without returning, then continues trying to insert the duplicate. Admission numbers are trimmed for lookup but not consistently for storage.
- Missing students/products are not consistently converted into 404 responses.
- The error view uses `<%err%>` rather than an output tag, so it does not display the supplied error.

## 8. Browser code and UI

The interface uses server-rendered EJS wrapper templates, a shared layout/sidebar, vanilla JavaScript modals, a large shared stylesheet, and considerable page-local CSS. No frontend component framework or separate frontend build is present.

Specific wiring problems:

- Landing page index.js expects password-toggle controls that do not exist there and will throw when attaching an event listener.
- Shared script.js attaches a changeRemark click handler without checking whether that element exists; most pages do not have it. A runtime error at that point stops the rest of that script's immediate execution, though previously registered listeners may still work.
- Dashboard attaches a listener to logoutBtn while its actual button is commented out.
- Dashboard's outside-click handler references undefined btn instead of settingsBtn.
- Purchase title uses student.name rather than student.studentName.
- Product update buttons have duplicate event-handler approaches; several list buttons reuse IDs instead of unique IDs/classes.
- A legacy student-delete handler calls GET /delete/:id, which hangs, and then uses an unmatched DELETE /students/:id endpoint. The current searchStudent template separately wires the correct endpoint through class-based handlers, so not all student deletion is broken.
- Product deletion first issues an unnecessary DELETE /delete/:id, which is not defined, before making the real delete request.
- Legacy search.js calls /search and expects JSON, while the active search route is /search/product and renders HTML.
- Notes markup omits a closing form tag; sales markup includes an unmatched closing ul.
- Login puts inline code in a script tag with src, so that inline forceReload logic is not executed as intended.

Styling has repeated selectors, broad element rules, light/dark inconsistencies, many inline rules, fixed dimensions, removed input outlines, and no media queries found. Modal keyboard/focus handling and accessible labeling are incomplete. These are source findings; visual appearance was not verified in a running browser.

## 9. Maintainability and performance

The main Express module is approximately 938 lines with business logic, HTML route wiring, sessions, startup, and substantial commented legacy code mixed together. Some routers are extracted, but there is no consistent service/validation boundary.

Multiple routers instantiate independent Prisma clients instead of sharing prismaClient.js. Dashboard and daily sales load all students and all their purchases, then filter dates in JavaScript. Dashboard also loads all products to count low stock. The later low-stock middleware performs a database query on each request reaching it, including unrelated routes and misses. These patterns will become more expensive as records grow.

Money is coerced with Number and totals use JavaScript numeric multiplication without an explicit rounding/storage policy. The absent schema prevents verifying whether persistent money values use a suitable representation. Business dates follow the machine's local timezone, with no configurable school timezone.

There is no visible audit history for stock edits, purchase changes, administrator actions, or deletions. Expected database indexes, constraints, purchase deletion behavior, and migration compatibility cannot be assessed without the Prisma schema.

## 10. Verification and limits

Performed:

- Inspected repository structure, Git state/history, manifests/lockfiles, Electron entry points, archive contents, backend routes, models, browser scripts, EJS templates, CSS, and legacy prototype.
- Checked JavaScript syntax in 27 JS/MJS/CJS files: all passed.
- Ran the real cancel/checkout handler bodies in isolation with mocked Prisma operations; reproduced stock inflation, stock loss for a missing student, and negative inventory.
- Inspected SQLite table names/counts and backup/session field structure without disclosing personal records or password hashes.
- Attempted the declared desktop start command; Electron was unavailable.

Not performed:

- Dependency installation, Prisma generation/migration, full application startup, real-database integration tests, UI rendering, packaging, or a current dependency vulnerability scan.
- Exact Prisma schema, relational constraints, indexes, and restore behavior could not be verified because the schema is missing.

Syntax success does not establish runtime or business correctness. No source fixes were made during this review.

## 11. Recommended order of work

1. Restore a normal source tree and recover the intended Prisma schema/migrations. Establish one documented application root, safe sample data, environment configuration, and a repeatable startup command. Preserve original backups separately while investigating recovery.
2. Correct cart/checkout invariants: validate positive integer quantities and student identity, bind carts to students, remove incorrect cancel restocking, and atomically update inventory and purchase records. Add focused regression checks for these failures and repeated/concurrent checkout.
3. Apply authentication consistently; prevent public admin self-assignment; define who can edit/delete inventory, students, notes, and settings. Repair session and browser injection weaknesses.
4. Make export/import complete, versioned, validated, transactional, and recoverable. Define what happens to purchases, notes, users, and sessions on reset/restore.
5. Repair reporting fields, low-stock rules, pagination, request responses, and browser event wiring.
6. Consolidate database access and business logic, remove or relocate legacy prototypes from public assets, document operation/recovery, and verify packaging and the UI.

The first concrete milestone should be a reproducible development build with a recovered schema, followed by trustworthy purchase and stock behavior.
