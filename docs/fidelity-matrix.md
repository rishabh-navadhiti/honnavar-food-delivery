# POC fidelity matrix

Living document. Every spec references this and updates its rows. "Real" means fully implemented
against the shared database. "Stand-in" means the user sees something that looks real but no
external system is touched; stand-ins are deterministic and labelled in code. "Out of scope"
means not built in the POC.

| Capability | POC status | Stand-in behaviour | Owning feature |
|---|---|---|---|
| Phone + OTP login | Stand-in | Any 10-digit number accepted; OTP is always 123456; persona picker per role | 001 |
| Browse / search / filter kitchens | Real | | 001 |
| Partner menu, prices, availability, hours | Real | | 001 |
| Admin onboarding of partners and agents | Real | FSSAI / hygiene "verification" is an upload plus an admin button | 001 |
| Bilingual interface and content | Real | Kannada strings may be machine-drafted and marked for review | 001 |
| Cart, address, checkout | Real | | 002 |
| Payment (UPI, cash on delivery) | Stand-in | UPI shows a confirmation sheet then succeeds; nothing is charged | 002 |
| Order lifecycle across roles | Real | | 002 |
| Manual delivery assignment by admin | Real | | 002 |
| SMS / WhatsApp status updates | Stand-in | In-app notification log instead of outbound messages | 002 |
| Tracker map | Stand-in | Static map with kitchen and customer pins; no GPS | 002 |
| Loud new-order alert for partners | Stand-in | In-app sound while the tab is open; no push | 002 |
| Ratings with voice note | Out of scope | | |
| Kannada voice prompts | Stand-in | Pre-recorded clips on a few key steps | 003 |
| Payout and settlement summaries | Stand-in | Computed from orders; no money moves | 003 |
| Live GPS tracking, push notifications, offline mode | Out of scope | | |
| Scheduled orders, coupons, loyalty, in-app chat, human backup line | Out of scope | | |
