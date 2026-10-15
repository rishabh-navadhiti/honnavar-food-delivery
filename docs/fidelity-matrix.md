# POC fidelity matrix

Living document. Every spec references this and updates its rows. "Real" means fully implemented
against the shared database. "Stand-in" means the user sees something that looks real but no
external system is touched; stand-ins are deterministic and labelled in code. "Out of scope"
means not built in the POC.

| Capability | POC status | Stand-in behaviour | Owning feature |
|---|---|---|---|
| Phone + OTP login | Stand-in (code delivery only) | No message sent; code is always 123456 and the screen says so. Customers self-register with any valid number; partner and agent numbers must be registered by an admin; admins come from demo data. A demo-only panel on each sign-in screen lists that role's demo accounts | 001 |
| Browse / search / filter kitchens | Real | | 001 |
| Partner menu, prices, availability, hours | Real | | 001 |
| Admin onboarding of partners and agents | Real | FSSAI / hygiene verification is a stand-in: admin records a reference and marks it verified; no registry lookup | 001 |
| Bilingual interface and content | Real | Kannada strings may be machine-drafted and marked for review | 001 |
| Cart, address, checkout | Real | | 002 |
| Payment (UPI, cash on delivery) | Stand-in (UPI) | UPI shows a demo confirmation sheet then always succeeds with a DEMO-UPI reference; nothing is charged. Cash on delivery is real: the agent confirms collecting the grand total; no money moves through the platform | 002 |
| Order lifecycle across roles | Real | Updates reach other screens by 10-second polling, not push. An unanswered order is rejected automatically ("kitchen did not respond") when next read after the acceptance window | 002 |
| Manual delivery assignment by admin | Real | | 002 |
| SMS / WhatsApp status updates | Stand-in | In-app notification log instead of outbound messages | 002 |
| Tracker map | Stand-in | Static map with kitchen and customer pins; no GPS | 002 |
| Map search and reverse geocoding (address under the pin) | Real | OpenStreetMap Nominatim behind an adapter, no paid keys; a deterministic stand-in adapter is used in tests | 002 |
| Landmark voice note on addresses | Stand-in | Recorded, stored with the address and played back to the customer, the assigned agent and admins; never transcribed | 002 |
| Expected delivery time | Stand-in | Per-kitchen preparation minutes set by admin (default 25) plus a flat delivery-minutes setting (default 15); not based on distance, traffic or kitchen load | 002 |
| Loud new-order alert for partners | Stand-in | In-app tone repeating every 5 s plus a highlighted banner while any partner screen is open, after one tap to allow sound; no push | 002 |
| Ratings with voice note | Out of scope | | |
| Kannada voice prompts | Stand-in | Pre-recorded clips on a few key steps | 003 |
| Payout and settlement summaries | Stand-in | Computed from orders; no money moves | 003 |
| Live GPS tracking, push notifications, offline mode | Out of scope | | |
| Scheduled orders, coupons, loyalty, in-app chat, human backup line | Out of scope | | |
