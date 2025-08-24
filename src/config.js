const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
    // Microsoft Teams Bot Configuration
    MicrosoftAppType: process.env.MicrosoftAppType || 'MultiTenant',
    MicrosoftAppId: process.env.MicrosoftAppId,
    MicrosoftAppPassword: process.env.MicrosoftAppPassword,
    MicrosoftAppTenantId: process.env.MicrosoftAppTenantId,
    
    // Server Configuration
    port: process.env.PORT || 3978,
    
    // Zoho Desk Configuration
    zoho: {
        clientId: process.env.ZOHO_CLIENT_ID,
        clientSecret: process.env.ZOHO_CLIENT_SECRET,
        refreshToken: process.env.ZOHO_REFRESH_TOKEN,
        orgId: process.env.ZOHO_ORG_ID,
        baseUrl: process.env.ZOHO_BASE_URL || 'https://desk.zoho.com'
    },
    
    // Teams Deep Link Configuration
    teams: {
        upn1: process.env.TEAMS_UPN_1,
        upn2: process.env.TEAMS_UPN_2
    }
};

// Validate required configuration
function validateConfig() {
    const required = [
        'MicrosoftAppId',
        'MicrosoftAppPassword',
        'ZOHO_CLIENT_ID',
        'ZOHO_CLIENT_SECRET',
        'ZOHO_REFRESH_TOKEN',
        'ZOHO_ORG_ID',
        'TEAMS_UPN_1',
        'TEAMS_UPN_2'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

module.exports = { config, validateConfig };
