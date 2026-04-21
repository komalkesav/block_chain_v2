#!/bin/bash

# Set environment for Org2 (Revenue Department)
# This script sets up the environment variables for Org2 operations

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export PEER0_ORG1_CA=${PWD}/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export PEER0_ORG2_CA=${PWD}/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export PEER0_ORG3_CA=${PWD}/fabric-samples/test-network/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt

# Set Org2 specific environment
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG2_CA
export CORE_PEER_MSPCONFIGPATH=${PWD}/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=peer0.org2.example.com:9051

echo "Environment set for Org2 (Revenue Department)"
echo "CORE_PEER_ADDRESS: $CORE_PEER_ADDRESS"
echo "CORE_PEER_LOCALMSPID: $CORE_PEER_LOCALMSPID"

# Channel operations for Org2
joinChannel() {
    echo "Org2 joining channel 'mychannel'..."
    peer channel join -b ${PWD}/fabric-samples/test-network/channel-artifacts/mychannel.block
}

updateAnchorPeer() {
    echo "Updating anchor peer for Org2..."
    peer channel update -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        -c mychannel -f ${PWD}/fabric-samples/test-network/channel-artifacts/Org2MSPanchors.tx \
        --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA
}

installChaincode() {
    echo "Installing chaincode on Org2 peer..."
    peer lifecycle chaincode install ${PWD}/chaincode/land-registration.tar.gz
}

approveChaincode() {
    echo "Approving chaincode for Org2..."
    CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "land-registration" | awk '{print $3}' | sed 's/.$//')

    peer lifecycle chaincode approveformyorg \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls $CORE_PEER_TLS_ENABLED \
        --cafile $ORDERER_CA \
        --channelID mychannel \
        --name land-registration \
        --version 1.0 \
        --package-id $CC_PACKAGE_ID \
        --sequence 1
}

# Display available commands
echo ""
echo "Available commands:"
echo "  joinChannel       - Join Org2 to the channel"
echo "  updateAnchorPeer  - Update anchor peer"
echo "  installChaincode  - Install chaincode"
echo "  approveChaincode  - Approve chaincode for Org2"
echo ""
echo "Usage: source setOrg2.sh && joinChannel"