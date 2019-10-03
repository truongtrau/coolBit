import * as Helper from '../helper'
import * as APDU from '../apdu'
const COMMAND = require('../config/command')
const FILE_NAME = 'sdl/cryptocurrency/commonUtils'
const APDUCONFIG = require('../config/apdu')
const {RESPONSE} = APDUCONFIG
import {AsyncStorage} from 'react-native'

/**
 * get command signature for CoolWalletS 
 * @param {String} data hex string
 * @param {String} P1 hex string
 * @param {String} P2 hex string
 * @param {Boolean} isTestnet
 * @return {String}
 */
export const signForCoolWallet = async (data, P1, P2, isTestnet=false) => {
    try {
		const { TX_PREPARE, TX_PREPARE_FOR_TESTNET } = COMMAND;
		const command = isTestnet ? TX_PREPARE_FOR_TESTNET : TX_PREPARE;
        const prefix = command.CLA + command.INS + P1 + P2;
		let payload = prefix + data;
		console.log(`payload for cws: ${payload}`);

        const appKey = await Helper.Other.getAppPrivkey();
		let signature_buffer = Helper.Sign.sign(Buffer.from(payload, 'hex'), appKey);
		let signature = signature_buffer.toString('hex');
		console.log(`signature for cws : ${signature}`);
		return signature;
	}catch(error){
		throw FILE_NAME + ", signForCoolWallet : " + error;
	}
};

/**
 * Send signing data to CoolWalletS, wait for encrypted signatures.
 * @param {Array<{encodedData:String, P1:String, P2:String}>} TxpPrepCommands Array of txPrepare command object
 * @returns {Array<{encryptedSignature:String, publicKey:String}>}
 */
export const getEncryptedSignature = async(TxpPrepCommands, sayHi=false) => {
    if(sayHi){
        let appId = await AsyncStorage.getItem('appId');
        await APDU.Other.sayHi(appId);
    }
    let sigArr = []
    for (const command of TxpPrepCommands) {
        const {encodedData, P1, P2, publicKey} = command
        const {outputData} = await APDU.Transaction.prepTx(encodedData, P1, P2);
        if (outputData != '' && outputData != null) {
            const sig = {encryptedSignature: outputData, publicKey};
            sigArr.push(sig)
        }
    }
    await APDU.Transaction.finishPrepare();
    return sigArr
}

/**
 * get the key used to encrypt transaction signature by CWS
 * @returns {Promise<String>}
 */
export const getCWSEncryptionKey = async() => {
    // show tx detail on screen
    let txDetailResponse = await APDU.Transaction.getTxDetail();
    if (txDetailResponse.status === RESPONSE.CANCELED) return undefined;
    
    const signKeyResponse = await APDU.Transaction.getSignatureKey();
    const signatureKey = signKeyResponse.outputData;
    await APDU.Transaction.clearTransaction();
    await APDU.Other.closePower();
    console.log(`Get CWS Encryption Key: ${signatureKey}`)
    return signatureKey
}

 /**
 * @description Decrypt Data from CoolWallet
 * @param {String} encryptedSignature
 * @param {String} signatureKey
 * @return {String} derSig
 */
export const decryptDataFromCoolWallet = (encryptedSignature, signatureKey) => {
   try {
      let iv = Buffer.alloc(16);
      iv.fill(0);
      const derSigBuff = Helper.Sign.aes256CbcDecrypt(iv, Buffer.from(signatureKey, 'hex'), encryptedSignature);
      return derSigBuff.toString('hex');
   }catch(error){
      throw FILE_NAME + ", decryptDataFromCoolWallet : " + error;
   }
};

