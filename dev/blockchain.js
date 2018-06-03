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
		transctions: this.pendingTransactions,
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

