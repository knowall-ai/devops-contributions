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

1. Upload the `.vsix` file to [VS Marketplace](https://marketplace.visualstudio.com/manage/publishers/knowall-ai)
2. Share with your test organization
3. Install from Organization Settings → Extensions → Shared

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
