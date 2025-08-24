const axios = require('axios');
const { config } = require('./config');

class ZohoClient {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.baseUrl = config.zoho.baseUrl;
        this.orgId = config.zoho.orgId;
    }

    async getAccessToken() {
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
                params: {
                    refresh_token: config.zoho.refreshToken,
                    client_id: config.zoho.clientId,
                    client_secret: config.zoho.clientSecret,
                    grant_type: 'refresh_token'
                }
            });

            this.accessToken = response.data.access_token;
            // Set expiry to 5 minutes before actual expiry for safety
            this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
            
            return this.accessToken;
        } catch (error) {
            console.error('Failed to refresh Zoho access token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Zoho Desk');
        }
    }

    async makeRequest(method, endpoint, data = null) {
        const token = await this.getAccessToken();
        const url = `${this.baseUrl}/api/v1${endpoint}`;

        const config = {
            method,
            url,
            headers: {
                'Authorization': `Zoho-oauthtoken ${token}`,
                'Content-Type': 'application/json',
                'orgId': this.orgId
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`Zoho API request failed: ${method} ${endpoint}`, error.response?.data || error.message);
            throw error;
        }
    }

    async createTicket(subject, description, contactId = null) {
        const ticketData = {
            subject,
            description,
            departmentId: null, // Will use default department
            priority: 'Medium',
            status: 'Open'
        };

        if (contactId) {
            ticketData.contactId = contactId;
        }

        return await this.makeRequest('POST', '/tickets', ticketData);
    }

    async getOpenTickets(from = 1, limit = 10) {
        const params = new URLSearchParams({
            from: from.toString(),
            limit: limit.toString(),
            status: 'Open'
        });

        return await this.makeRequest('GET', `/tickets?${params}`);
    }

    async addComment(ticketId, content, isPublic = true) {
        const commentData = {
            content,
            isPublic
        };

        return await this.makeRequest('POST', `/tickets/${ticketId}/comments`, commentData);
    }

    async getTicket(ticketId) {
        return await this.makeRequest('GET', `/tickets/${ticketId}`);
    }

    async searchContacts(email) {
        const params = new URLSearchParams({
            email
        });

        return await this.makeRequest('GET', `/contacts/search?${params}`);
    }
}

module.exports = ZohoClient;
