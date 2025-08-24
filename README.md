# Teams Zoho Desk Bot

A production-ready Microsoft Teams bot that integrates with Zoho Desk for ticket management. Built for Node.js 20 LTS and deployable on Azure App Service.

## Features

- **Create Tickets**: Create Zoho Desk tickets directly from Teams with `create ticket "Subject" for Company`
- **View Open Tickets**: List open tickets with pagination using `open tickets`
- **Interactive Cards**: Rich Adaptive Cards with ticket details and actions
- **Take to Chat**: Generate Teams deep links to start group chats with configured users
- **Add Notes**: Post comments to Zoho tickets directly from Teams
- **Secure Authentication**: Server-side OAuth with refresh token handling

## Prerequisites

- Node.js 20 LTS
- Microsoft Teams app registration
- Zoho Desk account with API access
- Azure App Service (for production deployment)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd teams-zoho-desk-bot
npm install
```

### 2. Configure Environment

Copy `env.example` to `.env` and configure:

```env
# Microsoft Teams Bot Configuration
MicrosoftAppType=MultiTenant
MicrosoftAppId=your-bot-app-id
MicrosoftAppPassword=your-bot-app-password
MicrosoftAppTenantId=your-tenant-id

# Azure App Service Configuration
PORT=3978

# Zoho Desk Configuration
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
ZOHO_REFRESH_TOKEN=your-zoho-refresh-token
ZOHO_ORG_ID=your-zoho-org-id
ZOHO_BASE_URL=https://desk.zoho.com

# Teams Deep Link Configuration
TEAMS_UPN_1=user1@company.com
TEAMS_UPN_2=user2@company.com
```

### 3. Run Locally

```bash
npm start
```

The bot will be available at `http://localhost:3978/api/messages`

## Setup Guide

### Microsoft Teams App Registration

1. Go to [Azure Portal](https://portal.azure.com) > App registrations
2. Create a new registration:
   - Name: `Teams Zoho Desk Bot`
   - Supported account types: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
3. Note the `Application (client) ID` - this is your `MicrosoftAppId`
4. Go to `Certificates & secrets` > `New client secret`
5. Note the secret value - this is your `MicrosoftAppPassword`
6. Note your `Directory (tenant) ID` - this is your `MicrosoftAppTenantId`

### Teams App Manifest

Create a Teams app package with this manifest structure:

```json
{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
    "manifestVersion": "1.16",
    "version": "1.0.0",
    "id": "your-app-id",
    "packageName": "com.company.teamszohodeskbot",
    "developer": {
        "name": "Your Company",
        "websiteUrl": "https://your-website.com",
        "privacyUrl": "https://your-website.com/privacy",
        "termsOfUseUrl": "https://your-website.com/terms"
    },
    "icons": {
        "color": "color.png",
        "outline": "outline.png"
    },
    "name": {
        "short": "Zoho Desk Bot",
        "full": "Teams Zoho Desk Integration Bot"
    },
    "description": {
        "short": "Manage Zoho Desk tickets from Teams",
        "full": "Create and manage Zoho Desk tickets directly from Microsoft Teams with interactive cards and deep links."
    },
    "accentColor": "#FFFFFF",
    "bots": [
        {
            "botId": "your-bot-app-id",
            "scopes": [
                "personal",
                "team",
                "groupchat"
            ],
            "supportsFiles": false,
            "isNotificationOnly": false
        }
    ],
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": [
        "your-domain.azurewebsites.net"
    ]
}
```

### Zoho Desk Setup

1. **Create Connected App**:
   - Go to Zoho Developer Console
   - Create a new "Server-based Applications" app
   - Note the `Client ID` and `Client Secret`

2. **Generate Refresh Token**:
   ```bash
   # Step 1: Get authorization code
   https://accounts.zoho.com/oauth/v2/auth?scope=Desk.tickets.ALL,Desk.contacts.READ&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=YOUR_REDIRECT_URI

   # Step 2: Exchange code for refresh token
   curl -X POST https://accounts.zoho.com/oauth/v2/token \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=YOUR_REDIRECT_URI" \
     -d "code=AUTHORIZATION_CODE"
   ```

3. **Find Organization ID**:
   - Go to Zoho Desk > Setup > Developer Space > API
   - Note your Organization ID

## Commands

### Create Ticket
```
create ticket "Login issue" for Acme Corp
```
Creates a new ticket in Zoho Desk with the specified subject and company.

### View Open Tickets
```
open tickets
```
Displays a paginated list of open tickets with interactive cards.

### Help
```
help
```
Shows available commands and usage instructions.

## Adaptive Card Actions

### Take to Chat
- Generates a Teams deep link to start a group chat
- Uses the configured UPNs from environment variables
- Opens in Teams client or web app

### Add Note
- Presents an input form in Teams
- Posts comment to the Zoho ticket
- Confirms successful addition

## Deployment

### Azure App Service

1. **Create Azure App Service**:
   ```bash
   az webapp create \
     --resource-group myResourceGroup \
     --plan myAppServicePlan \
     --name teams-zoho-desk-bot \
     --runtime "NODE|20-lts" \
     --deployment-local-git
   ```

2. **Configure App Settings**:
   ```bash
   az webapp config appsettings set \
     --resource-group myResourceGroup \
     --name teams-zoho-desk-bot \
     --settings MicrosoftAppId="your-app-id" \
                MicrosoftAppPassword="your-app-password" \
                ZOHO_CLIENT_ID="your-zoho-client-id"
                # ... other settings
   ```

3. **Deploy via GitHub Actions**:
   - Fork this repository
   - Configure the `AZURE_WEBAPP_PUBLISH_PROFILE` secret
   - Push to `main` branch to trigger deployment

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Health check
curl http://localhost:3978/health
```

## Project Structure

```
├── src/
│   ├── bot.js              # Main bot logic and message handling
│   ├── config.js           # Configuration and validation
│   ├── zoho-client.js      # Zoho Desk API client
│   └── adaptive-cards.js   # Adaptive card builders
├── .github/workflows/
│   └── azure-deploy.yml    # GitHub Actions deployment
├── index.js                # Application entry point
├── package.json            # Dependencies and scripts
├── web.config              # IIS configuration for Azure
├── env.example             # Environment variable template
└── README.md               # This file
```

## API Endpoints

- `GET /` - Bot information and status
- `GET /health` - Health check endpoint
- `POST /api/messages` - Bot Framework messaging endpoint

## Security Considerations

- OAuth tokens are handled server-side only
- No sensitive data exposed in Adaptive Cards
- Environment variables for all secrets
- Secure Azure App Service configuration
- Bot Framework authentication

## Troubleshooting

### Common Issues

1. **Bot not responding**:
   - Verify `MicrosoftAppId` and `MicrosoftAppPassword`
   - Check Azure Bot Service configuration
   - Validate messaging endpoint URL

2. **Zoho API errors**:
   - Verify refresh token is valid
   - Check organization ID
   - Ensure proper API permissions

3. **Teams deep links not working**:
   - Verify UPN format (user@domain.com)
   - Check Teams client vs. web app behavior

### Logs

Check Azure App Service logs:
```bash
az webapp log tail --resource-group myResourceGroup --name teams-zoho-desk-bot
```

## Development

### Adding New Commands

1. Add command parsing in `src/bot.js` `handleMessage()`
2. Implement handler method
3. Add help text in `sendHelpMessage()`

### Extending Adaptive Cards

1. Add new card builders in `src/adaptive-cards.js`
2. Handle actions in `handleAdaptiveCardAction()`
3. Update action data structures

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Azure App Service logs
3. Validate all environment variables
4. Test Zoho API access independently
