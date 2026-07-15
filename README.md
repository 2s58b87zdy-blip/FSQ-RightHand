# FSQ Right Hand v2

A deployable Next.js application for FSQ marine projects and workshop operations.

## Demo login
- Flemming / fsq2027
- Jakob / fsq2027

## Included now
- JARVIS-inspired login with optional spoken greeting
- FSQ dark blue responsive dashboard
- Workshop task board with local persistence
- Project overview with local persistence
- AI assistant demonstration
- Navigation prepared for quotations, reports, documents, drone, warehouse, finance and administration
- Azure App Service standalone deployment workflow

## Deploy
Upload the contents of this folder to the root of the GitHub repository. Keep the existing repository secret:
`AZURE_WEBAPP_PUBLISH_PROFILE`

The workflow deploys `.next/standalone` and copies static assets correctly.

## Important
This version stores demo projects and workshop tasks in the browser. Shared multi-user storage, secure production login, document uploads and database-backed modules are the next infrastructure layer.
