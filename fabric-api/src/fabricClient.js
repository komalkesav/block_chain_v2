'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const { getOrgForUser } = require('./userOrgMap');

class FabricClient {
    constructor() {
        this.gateways = new Map();
        this.contracts = new Map();
    }

    /**
     * Get organization for a user
     */
    getOrgForUser(username) {
        return getOrgForUser(username);
    }

    /**
     * Get connection profile path for an organization
     */
    getConnectionProfilePath(org) {
        return path.resolve(__dirname, '..', '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, `connection-${org}.json`);
    }

    /**
     * Connect to Fabric network for a specific user
     */
    async connect(username) {
        try {
            const org = this.getOrgForUser(username);
            if (!org) {
                throw new Error(`Unknown user: ${username}`);
            }

            const orgNumber = org.replace('org', '');
            const mspId = `Org${orgNumber}MSP`;

            // Load the network configuration
            const ccpPath = this.getConnectionProfilePath(org);
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            // Create a new gateway for connecting to our peer node
            const gateway = new Gateway();

            // Use admin identity for all users from the same org
            // Blockchain permissions are org-based (MSP), not user-based
            const walletPath = path.join(__dirname, '..', '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', `${org}.example.com`, 'users', `Admin@${org}.example.com`, 'msp');
            const certPath = path.join(walletPath, 'signcerts', `Admin@${org}.example.com-cert.pem`);
            const keyPath = path.join(walletPath, 'keystore', 'priv_sk');

            const cert = fs.readFileSync(certPath).toString();
            const key = fs.readFileSync(keyPath).toString();

            const identity = {
                credentials: {
                    certificate: cert,
                    privateKey: key,
                },
                mspId: mspId,
                type: 'X.509',
            };

            await gateway.connect(ccp, {
                identity: identity,
                discovery: { enabled: false }
            });

            // Get the network (channel) our contract is deployed to
            const network = await gateway.getNetwork('mychannel');

            // Get the contract from the network
            const contract = network.getContract('land-registration');

            // Store gateway and contract for this user
            this.gateways.set(username, gateway);
            this.contracts.set(username, contract);

            console.log(`Successfully connected ${username} from ${org} to Fabric network`);
            return { gateway, contract };

        } catch (error) {
            console.error(`Failed to connect ${username}:`, error);
            throw error;
        }
    }

    /**
     * Disconnect from Fabric network
     */
    async disconnect(username) {
        const gateway = this.gateways.get(username);
        if (gateway) {
            await gateway.disconnect();
            this.gateways.delete(username);
            this.contracts.delete(username);
            console.log(`Disconnected ${username} from Fabric network`);
        }
    }

    /**
     * Submit a transaction to the blockchain
     */
    async submitTransaction(username, functionName, ...args) {
        try {
            const contract = this.contracts.get(username);
            if (!contract) {
                throw new Error(`No active connection for user: ${username}`);
            }

            console.log(`Submitting transaction: ${functionName} by ${username}`, args);
            const result = await contract.submitTransaction(functionName, ...args);
            console.log(`Transaction ${functionName} submitted successfully`);

            return result.toString();
        } catch (error) {
            console.error(`Failed to submit transaction ${functionName}:`, error);
            throw error;
        }
    }

    /**
     * Evaluate a transaction (query) on the blockchain
     */
    async evaluateTransaction(username, functionName, ...args) {
        try {
            const contract = this.contracts.get(username);
            if (!contract) {
                throw new Error(`No active connection for user: ${username}`);
            }

            console.log(`Evaluating transaction: ${functionName} by ${username}`, args);
            const result = await contract.evaluateTransaction(functionName, ...args);
            console.log(`Transaction ${functionName} evaluated successfully`);

            return result.toString();
        } catch (error) {
            console.error(`Failed to evaluate transaction ${functionName}:`, error);
            throw error;
        }
    }

    /**
     * Get application by ID
     */
    async getApplication(username, applicationId) {
        const result = await this.evaluateTransaction(username, 'getApplication', applicationId);
        return JSON.parse(result);
    }

    /**
     * Get all land requests
     */
    async getAllLandRequests(username) {
        const result = await this.evaluateTransaction(username, 'getAllLandRequest');
        return JSON.parse(result);
    }

    /**
     * Get application history
     */
    async getApplicationHistory(username, applicationId) {
        const result = await this.evaluateTransaction(username, 'getHistory', applicationId);
        return JSON.parse(result);
    }

    /**
     * Create new application
     */
    async createApplication(username, applicationId, userData) {
        const result = await this.submitTransaction(username, 'createApplication', applicationId, JSON.stringify(userData));
        return JSON.parse(result);
    }

    /**
     * Verify application by revenue department
     */
    async verifyByRevenue(username, applicationId, officerData) {
        const result = await this.submitTransaction(username, 'verifyByRevenue', applicationId, JSON.stringify(officerData));
        return JSON.parse(result);
    }

    /**
     * Update survey report
     */
    async surveyReportUpdate(username, applicationId, surveyData) {
        const result = await this.submitTransaction(username, 'surveyReportUpdate', applicationId, JSON.stringify(surveyData));
        return JSON.parse(result);
    }

    /**
     * Forward application to next stage
     */
    async forwardApplication(username, applicationId, forwardData) {
        const result = await this.submitTransaction(username, 'forwardApplication', applicationId, JSON.stringify(forwardData));
        return JSON.parse(result);
    }

    /**
     * Approve application by collector
     */
    async approveByCollector(username, applicationId, approvalData) {
        const result = await this.submitTransaction(username, 'approveByCollector', applicationId, JSON.stringify(approvalData));
        return JSON.parse(result);
    }
}

module.exports = new FabricClient();