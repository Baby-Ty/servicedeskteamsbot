const { config } = require('./config');

class AdaptiveCardBuilder {
    static createTicketCard(ticket) {
        return {
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body: [
                {
                    type: 'TextBlock',
                    text: `Ticket #${ticket.ticketNumber}`,
                    weight: 'Bolder',
                    size: 'Medium',
                    color: 'Accent'
                },
                {
                    type: 'TextBlock',
                    text: ticket.subject || 'No Subject',
                    weight: 'Bolder',
                    wrap: true
                },
                {
                    type: 'FactSet',
                    facts: [
                        {
                            title: 'Status:',
                            value: ticket.status || 'Unknown'
                        },
                        {
                            title: 'Priority:',
                            value: ticket.priority || 'Unknown'
                        },
                        {
                            title: 'Created:',
                            value: this.formatDate(ticket.createdTime)
                        },
                        {
                            title: 'Contact:',
                            value: ticket.contact?.name || 'Unknown'
                        }
                    ]
                },
                {
                    type: 'TextBlock',
                    text: ticket.description || 'No description available',
                    wrap: true,
                    maxLines: 3,
                    separator: true
                }
            ],
            actions: [
                {
                    type: 'Action.OpenUrl',
                    title: 'Take to Chat',
                    url: this.generateTeamsDeepLink()
                },
                {
                    type: 'Action.Submit',
                    title: 'Add Note',
                    data: {
                        action: 'addNote',
                        ticketId: ticket.id,
                        ticketNumber: ticket.ticketNumber
                    }
                }
            ]
        };
    }

    static createTicketListCard(tickets, hasMore = false, currentPage = 1) {
        const body = [
            {
                type: 'TextBlock',
                text: 'Open Tickets',
                weight: 'Bolder',
                size: 'Large'
            }
        ];

        if (tickets.length === 0) {
            body.push({
                type: 'TextBlock',
                text: 'No open tickets found.',
                wrap: true
            });
        } else {
            // Add ticket summary
            tickets.forEach(ticket => {
                body.push({
                    type: 'Container',
                    separator: true,
                    items: [
                        {
                            type: 'ColumnSet',
                            columns: [
                                {
                                    type: 'Column',
                                    width: 'stretch',
                                    items: [
                                        {
                                            type: 'TextBlock',
                                            text: `#${ticket.ticketNumber}`,
                                            weight: 'Bolder',
                                            color: 'Accent'
                                        },
                                        {
                                            type: 'TextBlock',
                                            text: ticket.subject || 'No Subject',
                                            wrap: true,
                                            maxLines: 2
                                        }
                                    ]
                                },
                                {
                                    type: 'Column',
                                    width: 'auto',
                                    items: [
                                        {
                                            type: 'TextBlock',
                                            text: ticket.priority || 'Medium',
                                            horizontalAlignment: 'Right'
                                        },
                                        {
                                            type: 'TextBlock',
                                            text: this.formatDate(ticket.createdTime),
                                            horizontalAlignment: 'Right',
                                            size: 'Small',
                                            color: 'Default'
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    selectAction: {
                        type: 'Action.Submit',
                        data: {
                            action: 'viewTicket',
                            ticketId: ticket.id
                        }
                    }
                });
            });
        }

        const actions = [];
        
        if (hasMore) {
            actions.push({
                type: 'Action.Submit',
                title: 'Load More',
                data: {
                    action: 'loadMore',
                    page: currentPage + 1
                }
            });
        }

        return {
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body,
            actions
        };
    }

    static createAddNoteCard(ticketId, ticketNumber) {
        return {
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body: [
                {
                    type: 'TextBlock',
                    text: `Add Note to Ticket #${ticketNumber}`,
                    weight: 'Bolder',
                    size: 'Medium'
                },
                {
                    type: 'Input.Text',
                    id: 'noteContent',
                    placeholder: 'Enter your note here...',
                    isMultiline: true,
                    maxLength: 1000
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Add Note',
                    data: {
                        action: 'submitNote',
                        ticketId: ticketId,
                        ticketNumber: ticketNumber
                    }
                },
                {
                    type: 'Action.Submit',
                    title: 'Cancel',
                    data: {
                        action: 'cancel'
                    }
                }
            ]
        };
    }

    static generateTeamsDeepLink() {
        const upns = [config.teams.upn1, config.teams.upn2];
        const upnList = upns.join(',');
        return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(upnList)}`;
    }

    static formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }
}

module.exports = AdaptiveCardBuilder;
