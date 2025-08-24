const { 
    ActivityHandler, 
    MessageFactory, 
    CardFactory,
    TurnContext 
} = require('botbuilder');
const ZohoClient = require('./zoho-client');
const AdaptiveCardBuilder = require('./adaptive-cards');

class TeamsZohoDeskBot extends ActivityHandler {
    constructor() {
        super();
        this.zohoClient = new ZohoClient();
        
        // Handle messages
        this.onMessage(async (context, next) => {
            await this.handleMessage(context);
            await next();
        });

        // Handle members added
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Welcome! I can help you manage Zoho Desk tickets. Try:\n' +
                '- **create ticket "Subject" for Company** - Create a new ticket\n' +
                '- **open tickets** - View open tickets';
            
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const welcomeMessage = MessageFactory.text(welcomeText);
                    await context.sendActivity(welcomeMessage);
                }
            }
            await next();
        });

        // Handle adaptive card actions
        this.onAdaptiveCardInvoke(async (context, invokeValue) => {
            return await this.handleAdaptiveCardAction(context, invokeValue);
        });
    }

    async handleMessage(context) {
        const text = context.activity.text?.trim().toLowerCase();
        
        if (!text) {
            return;
        }

        try {
            // Parse create ticket command
            const createTicketMatch = text.match(/^create ticket\s+"([^"]+)"\s+for\s+(.+)$/i);
            if (createTicketMatch) {
                const [, subject, company] = createTicketMatch;
                await this.handleCreateTicket(context, subject, company);
                return;
            }

            // Parse open tickets command
            if (text === 'open tickets') {
                await this.handleOpenTickets(context);
                return;
            }

            // Help message
            if (text === 'help' || text.includes('help')) {
                await this.sendHelpMessage(context);
                return;
            }

            // Default response
            await context.sendActivity(MessageFactory.text(
                'I didn\'t understand that command. Type "help" for available commands.'
            ));

        } catch (error) {
            console.error('Error handling message:', error);
            await context.sendActivity(MessageFactory.text(
                'Sorry, I encountered an error processing your request. Please try again.'
            ));
        }
    }

    async handleCreateTicket(context, subject, company) {
        try {
            await context.sendActivities([
                { type: 'typing' },
                MessageFactory.text('Creating ticket...')
            ]);

            const description = `Ticket created from Microsoft Teams for ${company}`;
            const ticket = await this.zohoClient.createTicket(subject, description);

            const successMessage = MessageFactory.text(
                `✅ Ticket created successfully!\n\n` +
                `**Ticket #${ticket.ticketNumber}**\n` +
                `Subject: ${subject}\n` +
                `Company: ${company}\n` +
                `Status: ${ticket.status}`
            );

            await context.sendActivity(successMessage);

        } catch (error) {
            console.error('Error creating ticket:', error);
            await context.sendActivity(MessageFactory.text(
                '❌ Failed to create ticket. Please check the configuration and try again.'
            ));
        }
    }

    async handleOpenTickets(context, page = 1) {
        try {
            await context.sendActivities([
                { type: 'typing' },
                MessageFactory.text('Fetching open tickets...')
            ]);

            const from = ((page - 1) * 10) + 1;
            const response = await this.zohoClient.getOpenTickets(from, 10);
            
            const tickets = response.data || [];
            const hasMore = tickets.length === 10; // Assume more if we got full page

            const card = AdaptiveCardBuilder.createTicketListCard(tickets, hasMore, page);
            const cardMessage = MessageFactory.attachment(CardFactory.adaptiveCard(card));

            await context.sendActivity(cardMessage);

        } catch (error) {
            console.error('Error fetching tickets:', error);
            await context.sendActivity(MessageFactory.text(
                '❌ Failed to fetch tickets. Please check the configuration and try again.'
            ));
        }
    }

    async handleAdaptiveCardAction(context, invokeValue) {
        const action = invokeValue.action?.data;
        
        if (!action) {
            return this.createInvokeResponse(400, 'Invalid action data');
        }

        try {
            switch (action.action) {
                case 'viewTicket':
                    await this.handleViewTicket(context, action.ticketId);
                    break;

                case 'loadMore':
                    await this.handleOpenTickets(context, action.page);
                    break;

                case 'addNote':
                    await this.handleAddNoteRequest(context, action.ticketId, action.ticketNumber);
                    break;

                case 'submitNote':
                    await this.handleSubmitNote(context, action, invokeValue.action);
                    break;

                case 'cancel':
                    await context.sendActivity(MessageFactory.text('Operation cancelled.'));
                    break;

                default:
                    return this.createInvokeResponse(400, 'Unknown action');
            }

            return this.createInvokeResponse(200);

        } catch (error) {
            console.error('Error handling adaptive card action:', error);
            await context.sendActivity(MessageFactory.text(
                'Sorry, I encountered an error processing that action.'
            ));
            return this.createInvokeResponse(500, 'Internal server error');
        }
    }

    async handleViewTicket(context, ticketId) {
        try {
            const ticket = await this.zohoClient.getTicket(ticketId);
            const card = AdaptiveCardBuilder.createTicketCard(ticket);
            const cardMessage = MessageFactory.attachment(CardFactory.adaptiveCard(card));
            
            await context.sendActivity(cardMessage);
        } catch (error) {
            console.error('Error viewing ticket:', error);
            await context.sendActivity(MessageFactory.text(
                '❌ Failed to load ticket details.'
            ));
        }
    }

    async handleAddNoteRequest(context, ticketId, ticketNumber) {
        const card = AdaptiveCardBuilder.createAddNoteCard(ticketId, ticketNumber);
        const cardMessage = MessageFactory.attachment(CardFactory.adaptiveCard(card));
        
        await context.sendActivity(cardMessage);
    }

    async handleSubmitNote(context, actionData, fullAction) {
        const { ticketId, ticketNumber } = actionData;
        const noteContent = fullAction.noteContent;

        if (!noteContent || noteContent.trim().length === 0) {
            await context.sendActivity(MessageFactory.text(
                '❌ Please enter a note before submitting.'
            ));
            return;
        }

        try {
            await context.sendActivities([
                { type: 'typing' },
                MessageFactory.text('Adding note to ticket...')
            ]);

            await this.zohoClient.addComment(ticketId, noteContent.trim(), true);

            await context.sendActivity(MessageFactory.text(
                `✅ Note added successfully to Ticket #${ticketNumber}!`
            ));

        } catch (error) {
            console.error('Error adding note:', error);
            await context.sendActivity(MessageFactory.text(
                '❌ Failed to add note to ticket. Please try again.'
            ));
        }
    }

    async sendHelpMessage(context) {
        const helpText = 
            '**Available Commands:**\n\n' +
            '🎫 **create ticket "Subject" for Company**\n' +
            '   - Creates a new ticket in Zoho Desk\n' +
            '   - Example: `create ticket "Login issue" for Acme Corp`\n\n' +
            '📋 **open tickets**\n' +
            '   - Shows a list of open tickets with pagination\n' +
            '   - Click on tickets to view details and take actions\n\n' +
            '**Ticket Actions:**\n' +
            '• **Take to Chat** - Start a Teams group chat\n' +
            '• **Add Note** - Add a comment to the ticket\n\n' +
            '❓ **help** - Show this help message';

        await context.sendActivity(MessageFactory.text(helpText));
    }

    createInvokeResponse(statusCode, body = null) {
        return {
            status: statusCode,
            body: body
        };
    }
}

module.exports = TeamsZohoDeskBot;
