const Tx = require('ethereumjs-tx');
const Util = require('ethereumjs-util');
const Web3 = require('web3');
const s2go = require('./index');

function toHex(nonHex, prefix = true) {
  let temp = nonHex.toString('hex');
  if (prefix) {
    temp = `0x${temp}`;
  }
  return temp;
}

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

async function sign(web3, rawTx, secondTx) {
  const wrapper = new s2go.security2goWrapper();
  const publickey = await wrapper.getPublicKey(1);
  console.log('publickey');
  console.log(publickey);

  // todo: get address from publickey
  let address = '0x' + web3.utils.sha3('0x' + publickey).slice(26);
  console.log('address');
  console.log(address);

  if (!secondTx) {
    rawTx.nonce = await web3.eth.getTransactionCount(address);
  } else {
    rawTx.nonce = (await web3.eth.getTransactionCount(address)) + 1;
  }
  // todo: is the nonce in 0x hex format?
  console.log('rawTx.nonce');
  console.log(rawTx.nonce);

  const tx = new Tx(rawTx);
  //tx.sign(privateKey);

  const hash = toHex(tx.hash(false), false);
  console.log('hash');
  console.log(hash);


  let serializedTx = '';
  let i = 0;
  do {
    console.log('tries to generate signature.');

    const cardSig = await wrapper.generateSignature(1, hash.toString('hex'));
    console.log('cardSig');
    console.log(cardSig);

    let rStart = 6;
    let length = 2;
    const rLength = parseInt(cardSig.slice(rStart, rStart + length), 16);
    console.log('rLength');
    console.log(rLength);
    rStart += 2;
    const r = cardSig.slice(rStart, rStart + rLength * 2);
    console.log('r');
    console.log(r);

    let sStart = rStart + rLength * 2 + 2;
    const sLength = parseInt(cardSig.slice(sStart, sStart + length), 16);
    console.log('sLength');
    console.log(sLength);
    sStart += 2;
    const s = cardSig.slice(sStart, sStart + sLength * 2);
    console.log('s');
    console.log(s);

    rawTx.r = '0x' + r;
    rawTx.s = '0x' + s;

    const tx2 = new Tx(rawTx);
    //console.log(tx2);

    serializedTx = tx2.serialize();
    console.log('serializedTx');
    console.log(toHex(serializedTx));
    console.log(web3.eth.accounts.recoverTransaction(toHex(serializedTx)));

    i += 1;
  } while (web3.eth.accounts.recoverTransaction(toHex(serializedTx)).toLocaleLowerCase() !== address);

  console.log(`trys: ${i}`);

  return toHex(serializedTx);
}

const web3 = new Web3('ws://ws.tau1.artis.network');

const rawTxOpen = {
  nonce: '0x00',
  gasPrice: 1000000000,
  gasLimit: '0x50000',
  to: '0xF6eF10E21166cf2e33DB070AFfe262F90365e8D4',
  value: 0,
  data: '0x0905186e00000000000000000000000001019e15b7beef611ac4659e7acdc272c4d90afa00000000000000000000000000000000000000000000000000000a86cc92e3da'
};

const rawTxClose = {
  nonce: '0x00',
  gasPrice: 1000000000,
  gasLimit: '0x50000',
  to: '0xF6eF10E21166cf2e33DB070AFfe262F90365e8D4',
  value: 0,
  data: '0x9abe837900000000000000000000000001019e15b7beef611ac4659e7acdc272c4d90afa'
};

let txOpen = null;
let txClose = null;

async function putCard() {
  console.log('putCard');
  // create both transactions
  txOpen = await sign(web3, rawTxOpen);
  txClose = await sign(web3, rawTxClose, true);

  // send open
  await web3.eth.sendSignedTransaction(txOpen).on('receipt', console.log);
}

async function takeCard() {
  console.log('takeCard');
  // send close
  await web3.eth.sendSignedTransaction(txClose).on('receipt', console.log);
}

async function start() {
  await putCard();
  await takeCard();

  //const tx = await sign(web3, rawTxOpen);
  //const tx = await sign(web3, rawTxClose);
  //await web3.eth.sendSignedTransaction(tx).on('receipt', console.log);
}

start();
