# Annora — Surplus Food Redistribution Network

A real-time web platform connecting food donors with NGOs and volunteers to reduce food waste in urban India.

🔗 **Live Demo:** [food-rescue-squad.vercel.app](https://food-rescue-squad.vercel.app)

## Tech Stack
React · TypeScript · Firebase · Tailwind CSS · Leaflet.js · Vercel

## Features
- Post surplus food listings with pickup window
- NGOs claim nearby food via live map or card view
- Instamart-style volunteer delivery dashboard
- Real-time updates with Firestore
- Google Sign-in + Email/Password auth
- Rating system and trust scores
- Admin analytics dashboard

## Roles
- **Donor** — Restaurants, canteens, caterers
- **Collector** — NGOs, community kitchens
- **Volunteer** — Delivery partners

## Firebase security

Firestore rules are in `firestore.rules`; `firebase.json` points Firebase CLI at
that rules file and the `functions` directory. Claiming a listing, creating its
delivery and donor notification, approving elevated roles, changing verification
status, advancing deliveries, listing eligible rating opportunities, and submitting
ratings are performed by trusted Cloud Functions. The rating form only offers
completed deliveries and participants approved by the backend eligibility checks.
Administrators can mark a profile verified after review; users cannot change their
own verification status.

New accounts start with the donor role. Collector and volunteer selections are
requests until an administrator approves them. Admin accounts must be provisioned
from a trusted environment with Application Default Credentials:

```powershell
cd functions
npm run grant-admin -- <firebase-auth-uid>
```

The grant operation sets both the Auth `admin` custom claim and the user's profile
role. The administrator must sign in again to refresh the custom claim. Never
grant admin privileges from client code.

Install the function dependencies with `npm install` from `functions/` before
deployment. Existing deliveries created by the earlier client flow use random
document IDs; they need a one-time trusted migration before enabling the new
deterministic claim workflow if those records must remain claimable/unclaimable.
Run `npm run migrate-roles` before enabling the new role policy so previously
self-selected collector/volunteer accounts are returned to donor access pending
admin approval. Review the output of `npm run migrate-deliveries`; it skips
duplicate or conflicting delivery records for manual resolution.
Migration commands are dry-run by default. Use `npm run migrate-roles -- --apply`
only after reviewing the affected users; use
`npm run migrate-ratings -- --apply` only after accepting that legacy ratings
cannot be verified and will no longer count toward trust scores. Delivery migration
requires `npm run migrate-deliveries -- --apply-reviewed` after a human has reviewed
the candidates. The read-only `npm run audit-notifications` command reports
malformed and exact-content duplicate notification records for manual review; it
does not change or remove them. These audits do not automatically delete unresolved
records. Back up Firestore before applying any migration.
## Developer
**Akshayakumari S** — CSE Student, Velammal College of Engineering and Technology
