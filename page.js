name: Build and deploy FSQ Command

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: fsq-command-production
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Hent kode
        uses: actions/checkout@v4

      - name: Installer Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Aktivér pnpm
        run: |
          corepack enable
          corepack prepare pnpm@11.7.0 --activate

      - name: Installer låste afhængigheder
        run: pnpm install --frozen-lockfile

      - name: Sikkerhedskontrol
        run: |
          pnpm test
          pnpm audit --prod --audit-level high

      - name: Byg appen
        run: pnpm run build

      - name: Klargør standalone-pakke
        run: |
          test -f .next/standalone/server.js
          mkdir -p .next/standalone/.next/static
          cp -a .next/static/. .next/standalone/.next/static/
          if [ -d public ]; then
            mkdir -p .next/standalone/public
            cp -a public/. .next/standalone/public/
          fi
          npm pkg set scripts.start="node server.js" --prefix .next/standalone

      - name: Deploy standalone-pakken til Azure
        uses: azure/webapps-deploy@v3
        with:
          app-name: fsq-right-hand
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .next/standalone
