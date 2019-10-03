const rlp = require('rlp');
import * as Helper from '../../helper'
import * as ethUtil from './ethereum_utils'
import Web3 from 'web3';
const keccak256 = require('js-sha3').keccak256;
const typedDataUtils = require('eth-sig-util').TypedDataUtils;
let web3 = new Web3();
const FILE_NAME = 'ethereum/ethereum_sign.js'

/**
 * sign ETH Transaction
 * @param {coinType} coinType
 * @param {String} payload 
 * @param {Number} addressIndex 
 * @param {String} publicKey 
 */
export const signTransaction = async (coinType, payload, addressIndex, publicKey=undefined) => {
  try{
    const keyId = Helper.Other.addressIndexToKeyId(coinType, addressIndex)
    payload = Buffer.from(payload, 'hex');
    const rawPayload = rlp.decode(payload);
    const { P1, P2, readType, preAction } = await ethUtil.checkSECommands(rawPayload);
    const dataForSE = ethUtil.prepareSEData(keyId, rawPayload, readType);
    const { derSig, cancel } = await ethUtil.sendDataToCoolWallet(dataForSE, P1, P2, preAction, false);
    if (cancel) return;
    
    publicKey = await Helper.Other.checkPublicKeyExist(coinType, addressIndex, publicKey)

    const { v, r, s } = await ethUtil.genEthSigFromSESig( derSig, payload, publicKey, false);
    const serialized_tx = ethUtil.composeSignedTransacton(rawPayload, v, r, s);
    console.log(`Signed Trasaction : ${serialized_tx}`);
    return serialized_tx;
  }catch(error){
    Helper.Other.toSystemError(error, 'Ethereum signTransaction Error', '32010', FILE_NAME, 'signTransaction')
  } 
}

/**
 * Sign Message. 
 * @param {String} message hex or utf-8
 * @param {Number} addressIndex
 * @param {String} publicKey
 * @param {Boolean} needHash
 * @return {Promise<String>}
 */
export const signMessage = async (coinType, message, addressIndex, publicKey=undefined, isHashRequired=false) =>{
  const keyId = Helper.Other.addressIndexToKeyId(coinType, addressIndex)
  const caller = 'signMessage';
  try {
    let msgBuf;
    let preAction

    if (web3.utils.isHex(message)) {
      msgBuf = Buffer.from(ethUtil.removeHex0x(message), 'hex');
    } else {
      msgBuf = Buffer.from(decodeURIComponent(message), 'utf8');
    }

    if (isHashRequired) {
      preAction = ethUtil.apduForParsingMessage(msgBuf, '07'); // send prehashed message to card
      msgBuf = Buffer.from(keccak256(msgBuf), 'hex');
    }

    const len = msgBuf.length.toString();
    const prefix = Buffer.from('\u0019Ethereum Signed Message:\n' + len);
    const payload = Buffer.concat([prefix, msgBuf]);
    console.log(`sign message payload : ${payload.toString('hex')}`);

    const dataForSE = ethUtil.prepareSEData(keyId, payload, 'F5');

    const { derSig, cancel } = await ethUtil.sendDataToCoolWallet(dataForSE, '00', '00', preAction);

    if (cancel) return;

    publicKey = await Helper.Other.checkPublicKeyExist(coinType, addressIndex, publicKey)
    const { v, r, s } = await ethUtil.genEthSigFromSESig(derSig, payload, publicKey, false);
    const signature = '0x' + r + s + v.toString(16);
    console.log(`signature : ${signature}`);
    return signature;

  } catch (error) {
    Helper.Other.toSystemError(error, 'Ethereum signMessage Error', '32010', FILE_NAME, caller)
  }
};

/**
 * @description Sign Typed Data
 * @param {String} coinType
 * @param {Object} typedData
 * @param {String} addressIndex
 * @param {Stirng} publicKey
 * @return {Promise<String>}
 */
export const signTypedData = async (coinType, typedData, addressIndex, publicKey=undefined) => {
  const keyId = Helper.Other.addressIndexToKeyId(coinType, addressIndex)
	const caller = 'signTypedData';

	try {
		const sanitizedData = typedDataUtils.sanitizeData(typedData);
		const encodedData = typedDataUtils.encodeData(sanitizedData.primaryType, sanitizedData.message, sanitizedData.types);
    const preAction = ethUtil.apduForParsingMessage(encodedData, '09');

		const prefix = Buffer.from('1901', 'hex');
		const domainSeparate = typedDataUtils.hashStruct('EIP712Domain', sanitizedData.domain, sanitizedData.types);
		const dataHash =  Buffer.from(web3.utils.sha3(encodedData).substr(2),'hex');
		const payload = Buffer.concat([prefix, domainSeparate, dataHash]);
		console.log(`sign typed data payload : ${payload.toString('hex')}`);
		const dataForSE = ethUtil.prepareSEData(keyId, payload, 'F3');

		const { derSig, cancel } = await ethUtil.sendDataToCoolWallet(dataForSE, '00', '00', preAction);

		if (cancel) return;

    publicKey = await Helper.Other.checkPublicKeyExist(coinType, addressIndex, publicKey)
    const { v, r, s } = await ethUtil.genEthSigFromSESig(derSig, payload, publicKey, false);
		const signature = '0x' + r + s + v.toString(16);
		console.log(`signature : ${signature}`);

		return signature;

	} catch (error) {
    Helper.Other.toSystemError(error, 'Ethereum signTypedData Error', '32010', FILE_NAME, caller)
	}
};