# Contributions Widget for Azure DevOps

A dashboard widget that displays a GitHub-style contribution graph tracking developer activity in Azure DevOps.

![Contributions Widget](img/logo.png)

## Features

- **GitHub-style activity calendar** showing contributions over the past year
- **Track multiple contribution types:**
  - Git commits
  - Pull requests (created, closed, reviewed)
  - Work items (created, resolved, closed)
  - TFVC changesets
- **Flexible user selection:** Show specific users or all team contributors
- **In-widget filtering:** Quick dropdown to filter by user without opening settings
- **Multiple widget sizes:** From 3x1 to 6x3, default 5x2
- **Azure DevOps theme integration:** Automatically adapts to light/dark themes

## Installation

1. Install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=knowall-ai.contributions-widget)
2. Go to your Azure DevOps dashboard
3. Click **Edit** → **Add a widget**
4. Search for "Contributions Widget"
5. Configure the user and contribution types

## Development

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js 18+)
- Azure DevOps organization for testing

### Build

```bash
# Install dependencies
bun install

# Build development package (private)
bun run package-dev

# Build release package (public)
bun run package-release
```

### Local Testing

#### Option 1: Dev Build + Upload (Recommended)

```bash
# Build dev package (creates .vsix with "-dev" suffix)
bun run package-dev
```

1. Upload the `.vsix` file to [VS Marketplace](https://marketplace.visualstudio.com/manage/publishers/knowall-ai)
2. Share with your test organization
3. Install from Organization Settings → Extensions → Shared
4. Add the widget to a dashboard and test

#### Option 2: Local Dev Server

For faster iteration during development:

```bash
# Start webpack dev server on port 3000
bun run dev
```

Then create a `vss-extension-dev.json` with:
```json
{
  "baseUri": "https://localhost:3000"
}
```

And use `tfx extension create --manifest vss-extension-dev.json` to create a dev extension that loads from localhost.

> **Note:** You'll need to accept the self-signed certificate in Chrome by visiting `https://localhost:3000` first.

#### Option 3: Direct Publish

```bash
# Publish directly to marketplace (requires MARKETPLACE_PAT env var)
tfx extension publish --vsix knowall-ai.contributions-widget-dev*.vsix --token $MARKETPLACE_PAT
```

### Code Quality

```bash
# Run linter
bun run lint

# Fix lint issues
bun run lint:fix

# Check formatting
bun run format:check

# Fix formatting
bun run format
```

## CI/CD

The repository includes GitHub Actions for automated publishing.

### Setup

1. Create a PAT in Azure DevOps:
   - Organization: **All accessible organizations**
   - Scopes: **Marketplace → Publish**
2. Add as GitHub secret: `MARKETPLACE_PAT`

### Deploy

```bash
# Dev build (private)
git tag v3.1.0-dev
git push origin v3.1.0-dev

# Release build (public)
git tag v3.1.0
git push origin v3.1.0
```

## Documentation

- [Deployment Guide](docs/DEPLOY.adoc)
- [Solution Design](docs/SOLUTION_DESIGN.adoc)
- [Troubleshooting](docs/TROUBLESHOOTING.adoc)

## License

MIT

## Credits

Originally forked from [ostreifel/vsts-contributions](https://github.com/ostreifel/vsts-contributions). Rewritten as a dashboard widget by [KnowAll AI](https://github.com/knowall-ai).
