# FSQ Command v7.2.0 – ATLAS Knowledge Base

Denne version tilføjer et nyt ATLAS Knowledge-modul oven på FSQ Command v7.1.1.

## Nyt i v7.2.0

- Opret egne vidensmapper
- Knyt mapper til eksisterende adgangsområder
- Opret maskiner med producent, model, serienummer, placering og noter
- Upload manualer og øvrige filer til Azure Blob Storage
- Knyt dokumenter til mapper og maskiner
- Åbn og slet uploadede filer
- Stil spørgsmål til ATLAS på baggrund af filmetadata og tidligere FSQ-erfaringer
- Registrer spørgsmål og løsninger fra medarbejdere
- Flemming og Jakob kan verificere løsninger
- Teknikere kan bruge Knowledge Base og registrere erfaringer
- System Health viser antal Knowledge-filer og maskiner

## Vigtigt

Dokumenter gemmes i Azure Blob Storage, når `AZURE_STORAGE_CONNECTION_STRING` er konfigureret i Azure App Service. Mapper, maskinregister, metadata og erfaringer gemmes fortsat i browserens lokale lager i denne version. Fælles database og fuld dokumentindeksering/RAG kræver den planlagte Azure SQL/Azure AI Search-opgradering.

## Deployment

Upload projektet til GitHub-repositoriet, commit ændringerne og lad den eksisterende GitHub Actions-workflow deploye til Azure.


## v7.2.1 password administration
Flemming and Jakob can assign or reset passwords for every user from Settings > Users & Permissions. Passwords require at least 6 characters. A 12-character password generator and show/hide control are included.
