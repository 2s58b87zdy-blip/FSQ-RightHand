# FSQ Right Hand v1

Deployable Next.js starter for Azure App Service.

## Local run
1. Install Node.js 20+
2. `npm install`
3. `npm run dev`
4. Open http://localhost:3000

## Demo users
- Flemming
- Jakob
- Demo password shown in login field

## Current state
- JARVIS/FSQ login and dashboard
- Spoken login greeting using browser speech synthesis
- Responsive desktop/tablet/mobile layout
- Project creation and local persistence
- All V1 modules represented in the interface

## Azure production wiring still required
- Azure Database for PostgreSQL
- Azure Blob Storage
- Secure server-side authentication and password hashing
- Shared multi-user data
- Audit history and backups

Do not treat the demo password or browser localStorage as production security.
