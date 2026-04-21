# Multi-Host Step-by-Step Setup Guide (3 Laptops)

This guide provides the exact steps to configure your Land Registration Hyperledger Fabric network across **three separate laptops**, assigning each laptop to one of the organizations.

We will assign:
- **Laptop 1 (Registration)**: Runs Orderer + Org1.
- **Laptop 2 (Revenue)**: Runs Org2.
- **Laptop 3 (Collectorate)**: Runs Org3.

> **Important Prerequisite**: Connect all three laptops to the **same Wi-Fi network**. Find their IPv4 addresses (using `ip a` or `ifconfig`).
> Let's assume for this guide:
> - Laptop 1 IP: `192.168.1.10`
> - Laptop 2 IP: `192.168.1.11`
> - Laptop 3 IP: `192.168.1.12`

---

## Phase 1: Preparation (Done ONLY on Laptop 1)

Laptop 1 must generate all the cryptographic materials so that all three laptops share the exact same keys and genesis block.

1. Open a terminal on **Laptop 1** in the `blockchain_p2p` directory.
2. Generate all the necessary certificates and channel artifacts:
   ```bash
   ./generate-artifacts.sh
   ```
3. Once generated, **compress the entire folder** so you can share it:
   ```bash
   cd ..
   tar -czvf blockchain_p2p_multihost.tar.gz blockchain_p2p/
   ```
4. Transfer `blockchain_p2p_multihost.tar.gz` to **Laptop 2** AND **Laptop 3** (via USB, Google Drive, network share, etc.).

---

## Phase 2: Configuration on Laptop 2 (Org2)

On Laptop 2, we must configure Docker to exclusively run Org2 and teach it where the other two laptops are.

1. Extract the package on Laptop 2:
   ```bash
   tar -xzvf blockchain_p2p_multihost.tar.gz
   cd blockchain_p2p/fabric-samples/test-network/docker
   ```
2. Open `docker-compose-full.yaml` in a text editor:
   ```bash
   nano docker-compose-full.yaml
   ```
3. Look for the `peer0.org2.example.com` service inside the file. Add an `extra_hosts` section mapping the domains to Laptop 1 & 3:
   ```yaml
     peer0.org2.example.com:
       container_name: peer0.org2.example.com
       # ... [existing lines] ...
       extra_hosts:
         - "orderer.example.com:192.168.1.10"
         - "peer0.org1.example.com:192.168.1.10"
         - "peer0.org3.example.com:192.168.1.12"
   ```
4. Comment out or delete all other services (`orderer.example.com`, `peer0.org1.example.com`, `peer0.org3.example.com`, `couchdb0`, `couchdb4`), leaving **only** the `peer0.org2.example.com` service and `couchdb1`. 

**Do NOT start Laptop 2 yet!**

---

## Phase 3: Configuration on Laptop 3 (Org3)

On Laptop 3, we do the same process as Laptop 2, but isolate Org3 instead.

1. Extract the package:
   ```bash
   tar -xzvf blockchain_p2p_multihost.tar.gz
   cd blockchain_p2p/fabric-samples/test-network/docker
   ```
2. Open `docker-compose-full.yaml`:
   ```bash
   nano docker-compose-full.yaml
   ```
3. Find `peer0.org3.example.com` and add its `extra_hosts`:
   ```yaml
     peer0.org3.example.com:
       container_name: peer0.org3.example.com
       # ... [existing lines] ...
       extra_hosts:
         - "orderer.example.com:192.168.1.10"
         - "peer0.org1.example.com:192.168.1.10"
         - "peer0.org2.example.com:192.168.1.11"
   ```
4. Comment out or delete everything else (`orderer`, `org1`, `org2`, `couchdb0`, `couchdb1`), leaving **only** `peer0.org3.example.com` and `couchdb4`.

**Do NOT start Laptop 3 yet!**

---

## Phase 4: Configuration on Laptop 1 (Orderer & Org1)

Laptop 1 remains the master node, running the Orderer and Org1. Give it the IP addresses of Laptops 2 & 3.

1. Navigate to the docker directory on Laptop 1:
   ```bash
   cd ~/blockchain_p2p/fabric-samples/test-network/docker
   ```
2. Open `docker-compose-full.yaml`:
   ```bash
   nano docker-compose-full.yaml
   ```
3. Add `extra_hosts` to both `orderer.example.com` and `peer0.org1.example.com`:
   ```yaml
     orderer.example.com:
       # ... [existing lines] ...
       extra_hosts:
         - "peer0.org2.example.com:192.168.1.11"
         - "peer0.org3.example.com:192.168.1.12"
         
     peer0.org1.example.com:
       # ... [existing lines] ...
       extra_hosts:
         - "peer0.org2.example.com:192.168.1.11"
         - "peer0.org3.example.com:192.168.1.12"
   ```
4. Comment out or delete `peer0.org2.example.com`, `peer0.org3.example.com` and their databases (`couchdb1`, `couchdb4`) from Laptop 1's compose file so they don't spin up locally.

---

## Phase 5: Launching the Network

### Step 1: Start Laptop 1 (Master)
```bash
cd ~/blockchain_p2p/fabric-samples/test-network
docker-compose -f docker/docker-compose-full.yaml up -d
docker ps  # verify orderer and org1 are running
```

### Step 2: Start Laptop 2 (Org2)
```bash
cd ~/blockchain_p2p/fabric-samples/test-network
docker-compose -f docker/docker-compose-full.yaml up -d
docker ps  # verify org2 is running!
```

### Step 3: Start Laptop 3 (Org3)
```bash
cd ~/blockchain_p2p/fabric-samples/test-network
docker-compose -f docker/docker-compose-full.yaml up -d
docker ps  # verify org3 is running!
```

---

## Phase 6: Joining the Channel & Deploying Chaincode

All chaincode/channel orchestration is securely pushed over the network from **Laptop 1**.

1. On **Laptop 1**, go back to the top-level directory:
   ```bash
   cd ~/blockchain_p2p
   ```
   *(Do NOT run `./setup-network.sh`! Run the commands manually.)*

2. **Create and Join the Channel:**
   ```bash
   # Org1 (Local)
   source setOrg1.sh
   createChannel
   joinChannel
   updateAnchorPeer

   # Org2 (Sent to Laptop 2)
   source setOrg2.sh
   joinChannel
   updateAnchorPeer

   # Org3 (Sent to Laptop 3)
   source setOrg3.sh
   joinChannel
   updateAnchorPeer
   ```

3. **Deploy the Chaincode:**
   ```bash
   cd chaincode/land-registration
   npm install
   cd ../..
   
   # Package
   peer lifecycle chaincode package chaincode/land-registration.tar.gz --path chaincode/land-registration --lang node --label land-registration_1.0
   
   # Install across all orgs (automatically routed to laptops)
   source setOrg1.sh && installChaincode
   source setOrg2.sh && installChaincode
   source setOrg3.sh && installChaincode
   
   # Approve across all orgs
   source setOrg1.sh && approveChaincode
   source setOrg2.sh && approveChaincode
   source setOrg3.sh && approveChaincode
   
   # Commit (from Org3 usually, or any authorized org)
   source setOrg3.sh && commitChaincode
   ```

### Success!
The Multi-Host Fabric Network is now functioning across 3 machines. 
You can run `cd fabric-api && npm start` on Laptop 1 to handle client requests, and the transactions will correctly distribute across the network.
