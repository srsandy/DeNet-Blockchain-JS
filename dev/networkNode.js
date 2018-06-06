const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid/v1');
const rp = require('request-promise');
const Blockchain = require('./blockchain');

const nodeAddress = uuid().split('-').join('');

const PORT = process.argv[2];

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const bitcoin = new Blockchain();

app.get('/blockchain', (req, res) => {
    res.send(bitcoin);
});

app.post('/transaction', (req, res) => {
    const blockIndex = bitcoin.addTransactionToPendingTransactions(req.body.newTransaction);
    res.json({ note: `Transaction will be added in ${blockIndex}.` });
});

app.post('/transaction/brodcast', (req, res) => {
    const newTransaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    bitcoin.addTransactionToPendingTransactions(newTransaction);

    const requestPromises = [];

    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: { newTransaction },
            json: true
        }

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises).then(data => {
        res.json({
            note: 'Transaction created and brodcast successfully.'
        });
    });
});

app.get('/mine', (req, res) => {
    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];

    const currentBlockData = {
        transaction: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };

    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

    const requestPromises = [];

    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: { newBlock },
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises).then(data => {
        const requestOptions = {
            uri: bitcoin.currentNodeUrl + '/transaction/brodcast',
            method: 'POST',
            body: {
                amount: 12.5,
                sender: "00",
                recipient: nodeAddress
            },
            json: true
        };

        return rp(requestOptions);
    }).then(data => {
        res.json({
            note: "New Block mined and brodcast successfully",
            block: newBlock
        });
    });
});

app.post('/receive-new-block', (req, res) => {
	const newBlock = req.body.newBlock;
	const lastBlock = bitcoin.getLastBlock();
	const correctHash = lastBlock.hash === newBlock.previousBlockHash;
	const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

	if(correctIndex && correctHash) {
		bitcoin.chain.push(newBlock);
		bitcoin.pendingTransactions = [];
		res.json({
			note: 'New block received and accpected',
			newBlock
		});
	} else {
		res.json({
			note: 'New block rejected',
			newBlock
		})
	}
});

app.post('/register-and-brodcast-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);

    const registerNodesPromises = [];

    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl },
            json: true
        };

        registerNodesPromises.push(rp(requestOptions));
    });

    Promise.all(registerNodesPromises).then(data => {
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-nodes-bulk',
            method: 'POST',
            body: {
                allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl]
            },
            json: true
        };

        return rp(bulkRegisterOptions);
    }).then(data => {
        res.json({
            note: 'New node registered successfully.'
        });
    });
});

app.post('/register-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(newNodeUrl);

    res.json({
        note: 'New node registered successfully.'
    });
});

app.post('/register-nodes-bulk', (req, res) => {
    const allNetworkNodes = req.body.allNetworkNodes;

    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;
        if (nodeNotAlreadyPresent && notCurrentNode) bitcoin.networkNodes.push(networkNodeUrl);
    });

    res.json({
        note: 'Bulk registration successfully'
    });
});

app.get('/consensus', (req, res) => {
    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
    
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises).then(blockchains => {
        const currentChainLength = bitcoin.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;
        blockchains.forEach(blockchain => {
            if(blockchain.chain.length > maxChainLength) {
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            }  
        }); 

        if(!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
            res.json({
                note: 'Current chain has not been replaced',
                chain: bitcoin.chain
            }); 
        } else if(newLongestChain && bitcoin.chainIsValid(newLongestChain)) {
            bitcoin.chain = newLongestChain;
            bitcoin.pendingTransactions = newPendingTransactions;
            res.json({
                note: 'this chain has been replaced',
                chain: bitcoin.chain
            });
        }
    });
});

app.get('/block/:blockHash', (req, res) => {
    const blockHash = req.params.blockHash;
    const block = bitcoin.getBlock(blockHash);
    res.json({block});
});

app.get('/transaction/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;
    const transactionData = bitcoin.getTransaction(transactionId);
    res.json(transactionData);
});

app.get('/address/:address', (req, res) => {
    const address = req.params.address;
    const addressData = bitcoin.getAddressData(address);
    res.json(addressData);
});

app.get('/block-explorer', (req, res) => {
    res.sendFile('./block-explorer/index.html', { root: __dirname})
});

app.listen(PORT, () => {
    console.log(`API running on ${PORT}`);
});