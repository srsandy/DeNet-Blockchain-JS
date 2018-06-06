const sha256 = require('sha256');
const uuid = require('uuid/v1')
const currentNodeUrl = process.argv[3];

function Blockchain() {
	this.chain = []; //All the block that we create or mine will be stored here 
	this.pendingTransactions = [];

	this.currentNodeUrl = currentNodeUrl;
	this.networkNodes = [];

	this.createNewBlock(100, '0', '0');
}

/*
  This creates a new block 
  Here we have pendingTransactions since the new block was minned
  Clear outs the pendingTransactions[]
  Push the block into the chain[]
  Return newBlock
 */

Blockchain.prototype.createNewBlock =  function(nonce, previousBlockHash, hash){
	const newBlock = {
		index: this.chain.length +1,
		timestamp: Date.now(),
		transactions: this.pendingTransactions,
		nonce: nonce, //it a prove of work (here it is a just a no)
		hash: hash, // this will the data from the new block 
		previousBlockHash: previousBlockHash
	};

	/*
	Once we create our new block we are putting all the pendingTransactions in the block 
	so now we want to clear it so we can start over for the new block
	 */
	
	this.pendingTransactions = [];
	this.chain.push(newBlock);

	return newBlock;
}

Blockchain.prototype.getLastBlock = function() {
	return this.chain[this.chain.length-1];
}

Blockchain.prototype.createNewTransaction = function(amount, sender, recipient) {
	const newTransaction = {
		amount: amount,
		sender: sender,
		recipient: recipient,
		transctionId: uuid().split('-').join('')
	};

	return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransactions = function(transctionObject) {
	this.pendingTransactions.push(transctionObject);
	return this.getLastBlock()['index'] +1;
}

Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce) {
	const dataAsString = (previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData));
	const hash = sha256(dataAsString);

	return hash;
}

Blockchain.prototype.proofOfWork =  function(previousBlockHash, currentBlockData) {
	let nonce = 0;
	let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
	while(hash.substring(0,4)!=='0000') {
		nonce++;
		hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
	}

	return nonce;
}

Blockchain.prototype.chainIsValid = function(blockchain) {
	let validChain = true;

	for(var i=1; i<blockchain.length; i++) {
		const currentBlock = blockchain[i];
		const prevBlock = blockchain[i-1];
		const blockHash = this.hashBlock(prevBlock['hash'],{transaction: currentBlock['transactions'], index: currentBlock['index']}, currentBlock['nonce']);
		
		if(blockHash.substring(0,4) !== '0000'){ validChain = false; }

		if(currentBlock.previousBlockHash !== prevBlock.hash) { //chain in not valid
			validChain = false;
		}
	};

	const genesisBlock = blockchain[0];
	const correntNonce = genesisBlock.nonce === 100;
	const correntPrevBlockHash = genesisBlock.previousBlockHash === '0';
	const correntHash = genesisBlock.hash === '0';
	const correntTransactions = genesisBlock.transactions.length === 0;

	if(!correntNonce || !correntPrevBlockHash || !correntHash || !correntTransactions){ validChain=false; }

	return validChain;
}

module.exports = Blockchain;

/*class Block {
	constructor() {
		this.chain = []; 
		this.pendingTransactions = [];
	}

	getName() {
		console.log('hey');
	}
}
*/

