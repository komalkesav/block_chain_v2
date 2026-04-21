#!/bin/bash

# Generate channel artifacts for the land registration network
# This script creates the necessary channel configuration files

echo "Generating channel artifacts..."

# Set the path to the test-network directory
TEST_NETWORK_DIR="${PWD}/fabric-samples/test-network"
CONFIGTX_PATH="${TEST_NETWORK_DIR}/configtx.yaml"

# Create channel-artifacts directory if it doesn't exist
mkdir -p "${TEST_NETWORK_DIR}/channel-artifacts"

cd "$TEST_NETWORK_DIR"

# Export paths so binaries and configs are found
export PATH="${PWD}/../bin:${PWD}/../../bin:${PATH}"
export FABRIC_CFG_PATH="${PWD}"

# Generate crypto materials if they don't exist
echo "Generating crypto materials..."
if [ -d "organizations/peerOrganizations" ]; then
    echo "existing organizations directory found, skipping cryptogen."
else
    cryptogen generate --config=./crypto-config.yaml --output="organizations"
fi

# Generate genesis block for orderer
echo "Generating orderer genesis block..."
configtxgen -profile ThreeOrgsOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

# Generate channel configuration transaction
echo "Generating channel configuration..."
configtxgen -profile ThreeOrgsChannel -outputCreateChannelTx ./channel-artifacts/mychannel.tx -channelID mychannel

# Generate anchor peer updates
echo "Generating anchor peer updates..."
configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP
configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org3MSPanchors.tx -channelID mychannel -asOrg Org3MSP

echo "Channel artifacts generated successfully!"
echo "Files created:"
echo "  - system-genesis-block/genesis.block"
echo "  - channel-artifacts/mychannel.tx"
echo "  - channel-artifacts/Org1MSPanchors.tx"
echo "  - channel-artifacts/Org2MSPanchors.tx"
echo "  - channel-artifacts/Org3MSPanchors.tx"