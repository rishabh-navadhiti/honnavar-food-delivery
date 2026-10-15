# Contract: Integration Adapters (002)

Constitution Principle III, continuing [001 adapters](../../001-platform-core/contracts/adapters.md).
Each external dependency is reached through one module in `src/shared/adapters/` with a stable
interface. Stand-ins are deterministic, never fail randomly, carry a `STAND-IN` header comment and
appear in `docs/fidelity-matrix.md`.

## Payment: `src/shared/adapters/payment/`

```ts
export interface PaymentProvider {
  /** Confirm a UPI payment the customer approved on the confirmation sheet. */
  confirmUpi(input: { orderRef: string; amountRupees: number }):
    Promise<{ status: 'succeeded'; reference: string } | { status: 'failed'; reason: 'declined' | 'unavailable' }>;
}
```

**Stand-in (`stand-in.ts`)**:
- Always returns `{ status: 'succeeded', reference: 'DEMO-UPI-<orderRef>' }`. No provider is
  contacted and nothing is charged.
- The confirmation sheet is UI, not adapter. It states, through translation keys, that this is a
  demo and nothing will be charged (FR-011).
- A real UPI provider adds the `failed` path. The place-order service already maps `failed` to a
  translated error, so callers do not change.
- Cash on delivery does not use the adapter. Cash is recorded by the agent on delivery.

## Notifications (SMS and WhatsApp): `src/shared/adapters/notifications/`

```ts
export type Notification = {
  recipient: { kind: 'customer'; customerId: string } | { kind: 'kitchen'; kitchenId: string } | { kind: 'agent'; agentId: string };
  orderId: string;
  kind: MessageKind;               // see data-model.md
  params: { orderNo: number; amount?: number; reason?: string; reasonNote?: string; agentId?: string };
};
export interface Notifier {
  /** Record (and, for a real provider, send) one status update. Runs inside the caller's transaction. */
  notify(executor: Executor, notification: Notification): Promise<void>;
}
```

**Stand-in (`stand-in.ts`)**:
- Inserts the row into `messages` and sends nothing. The in-app list is the stand-in (FR-045).
- Every list screen labels entries "Demo: not sent by SMS or WhatsApp".
- A real provider would keep the log row and add delivery after commit (for example an outbox read
  by the sender). That is a change inside this module.

## Geocoding: `src/shared/adapters/geocoding/`

```ts
export type Place = { label: string; lat: number; lng: number };
export type GeoError = 'unavailable' | 'busy';
export interface Geocoder {
  search(query: string, opts: { locale: 'en' | 'kn' }): Promise<Result<Place[], GeoError>>;
  reverse(point: { lat: number; lng: number }, opts: { locale: 'en' | 'kn' }): Promise<Result<string | null, GeoError>>;
}
```

**Real (`nominatim.ts`)**, server-only:
- `GET {NOMINATIM_BASE_URL}/search?format=jsonv2&q=…&countrycodes=in&viewbox=<Honnavar box>&limit=5&accept-language=<locale>`.
- `GET {NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=…&lon=…&zoom=18&accept-language=<locale>`.
- `User-Agent: honnavar-food-delivery-poc/<package version> (+<GEOCODING_CONTACT>)`.
- One request per second per process through an internal queue; returns `busy` if more than 5 are
  waiting. 4 s timeout returns `unavailable`. An LRU cache of 500 entries is keyed by rounded
  coordinates or normalised query, plus locale. Details:
  [research R7](../research.md#r7-geocoding-adapter-map-search-and-the-address-under-the-pin).

**Stand-in (`stand-in.ts`)**:
- A fixed table of about ten Honnavar places with coordinates and both-language labels.
- `search` returns the places whose label contains the query (case-insensitive), at most 5.
- `reverse` returns "Near <closest place>" in the requested language.
- It never fails and never calls the network. Integration tests and the e2e web server use it
  (`GEOCODING_PROVIDER=stand-in`).

`index.ts` exports the implementation selected by `GEOCODING_PROVIDER` (default `nominatim`).

## Not adapters

- **Map tiles**: a URL template and attribution from settings (`MAP_TILE_URL`,
  `MAP_TILE_ATTRIBUTION`), drawn by Leaflet in the browser. No provider code runs on our side.
- **Open in maps**: a Google Maps directions URL (no key), handed to the phone like `tel:`.
- **Device location and microphone**: browser APIs on the user's own phone, not external services.
