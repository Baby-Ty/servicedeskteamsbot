const restify = require('restify');
const { 
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    createBotFrameworkAuthenticationFromConfiguration
} = require('botbuilder');

const { config, validateConfig } = require('./src/config');
const TeamsZohoDeskBot = require('./src/bot');

// Validate configuration on startup
try {
    validateConfig();
    console.log('✅ Configuration validated successfully');
} catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
}

// Create HTTP server
const server = restify.createServer({
    name: 'teams-zoho-desk-bot',
    version: '1.0.0'
});

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: config.MicrosoftAppId,
    MicrosoftAppPassword: config.MicrosoftAppPassword,
    MicrosoftAppType: config.MicrosoftAppType,
    MicrosoftAppTenantId: config.MicrosoftAppTenantId
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);
const adapter = new CloudAdapter(botFrameworkAuthentication);

// Error handler
adapter.onTurnError = async (context, error) => {
    console.error('Bot encountered an unhandled error:', error);
    console.error('Error details:', error.stack);

    // Send error message to user
    await context.sendActivity('Sorry, an error occurred while processing your request.');

    // Send error details to bot framework emulator (if connected)
    if (context.activity.channelId === 'emulator') {
        const errorMessage = `[${error.name}] ${error.message}`;
        await context.sendActivity(errorMessage);
    }
};

// Create bot instance
const bot = new TeamsZohoDeskBot();

// Health check endpoint
server.get('/health', (req, res, next) => {
    res.send(200, { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
    return next();
});

// Bot endpoint
server.post('/api/messages', async (req, res) => {
    try {
        await adapter.process(req, res, (context) => bot.run(context));
    } catch (error) {
        console.error('Error processing bot message:', error);
        res.send(500, { error: 'Internal server error' });
    }
});

// Default route for root path
server.get('/', (req, res, next) => {
    res.send(200, {
        name: 'Teams Zoho Desk Bot',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            messages: '/api/messages'
        }
    });
    return next();
});

// Start server
server.listen(config.port, () => {
    console.log(`🤖 Teams Zoho Desk Bot is running on port ${config.port}`);
    console.log(`📡 Bot endpoint: http://localhost:${config.port}/api/messages`);
    console.log(`🏥 Health check: http://localhost:${config.port}/health`);
    console.log('\n📋 Required environment variables:');
    console.log('   - MicrosoftAppId, MicrosoftAppPassword, MicrosoftAppTenantId');
    console.log('   - ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, ZOHO_ORG_ID');
    console.log('   - TEAMS_UPN_1, TEAMS_UPN_2');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
