# FSQ Command v7.0 - ATLAS Operations Center

Azure-ready Next.js application.

## Main changes
- Freja renamed to ATLAS throughout the interface and voice assistant
- Glowing FSQ logo on login and sidebar
- ATLAS operations panel on the dashboard
- Existing project, user permission, Workshop QC and Azure Blob photo workflows retained
- GitHub Actions deployment for Azure App Service retained

## Azure
Set these App Service environment variables when using photo upload:
- AZURE_STORAGE_CONNECTION_STRING
- AZURE_STORAGE_CONTAINER (optional, defaults to fsq-documents)
