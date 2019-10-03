const rlp = require('rlp');
import {AsyncStorage} from 'react-native'
import * as APDU from '../../apdu'
import * as Helper from '../../helper'
const FILE_NAME = 'sdk/cryptocurrency/etherem.js'
const ENV = require('../../config/environment')
const COINTYPE = require('../../config/coinType')
const TOKENSIG = require('../../config/tokenSig')
import Web3 from 'web3';
let web3 = new Web3();
const keccak256 = require('js-sha3').keccak256;
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');
import * as commonUtils from '../commonUtils'

/**
 * @description Check SE Commands by Raw Payload
 * @param {Array<Buffer>} rawPayload
 * @param {number} SEVersion
 * @return {Promise<{P1: String, P2: String, readType: String, preAction: function}>}
 */
export const checkSECommands = async (rawPayload) => {
	try {
		let P1 = '00';
		let P2 = '00';
		if (!Array.isArray(rawPayload)) throw 'Not ethereum transaction format';	
		
		const to = rawPayload[3].toString('hex');
		const data = rawPayload[5].toString('hex');

		// transfer ETH
		if (data == "") return { P1, P2, readType:'3C' };			

		// transfer with data. could be smart contract calls
		let {isERC20, preAction} = await checkToAddress(to);
		console.log(`isERC20 :${isERC20}, preAction: ${preAction}`)
		if(isERC20){
			let functionHash = data.slice(0, 8);			
			if (functionHash == "a9059cbb" || functionHash == "095ea7b3") {	// transfer(address,uint256)||approve
				readType = 'C2';
				return {P1, P2, readType, preAction}
			}
		}
		await Helper.Other.versionCheck(84)
		return { P1, P2, readType:'33'};

	} catch (error) {
		Helper.Other.toSystemError(error, 'Ethereum Transaction checkSECommands Error.', '32010', FILE_NAME, 'checkSECommands')
	}
};

/**
 * @description Prepare Data for CoolWallet
 * @param {String} keyId hex string
 * @param {Buffer|Array<Buffer>} rawData - signMessage: payload, signTransaction: rawPayload
 * @param {String} readType
 * @return {Buffer}
 */
export const prepareSEData = (keyId, rawData, readType) => {
	try {
		let inputIdBuffer = Buffer.from('00', 'hex');
		let signDataBuffer = Buffer.from('00', 'hex');
		let readTypeBuffer = Buffer.from(readType, 'hex');
		let keyIdBuffer = Buffer.from(keyId, 'hex');
    
		let data = [inputIdBuffer, signDataBuffer, readTypeBuffer, keyIdBuffer, rawData];
		let dataForSE = rlp.encode(data);
        return dataForSE;

	} catch (error) {
		throw FILE_NAME + ", prepareSEData : " + error;
	}
};

/**
 * @description Send Data to CoolWallet
 * @param {Buffer} data for SE
 * @param {String} P1 hex string
 * @param {String} P2 hex string
 * @param {Function} preAction
 * @param {Boolean} isTestnet blind signing for SE version 67
 * @return {Promise<{derSig: string, cancel:boolean}>}
 */
export const sendDataToCoolWallet = async (data, P1, P2, preAction, isTestnet=false) => {
    try {
		let hexForSE = data.toString('hex');

        // 1. say Hi
        let appId = await AsyncStorage.getItem('appId');
		await APDU.Other.sayHi(appId);
		if (typeof preAction === 'function') await preAction();
        // 2. sign toSE data
        let signature = await commonUtils.signForCoolWallet(hexForSE, P1, P2, isTestnet);
        
		// 3. send toSE data and get fromSE signature
        let encryptedSignature;
		let sendData = hexForSE + signature;
		let patch = Math.ceil(sendData.length/500);
		for (let i = 0; i < patch; i++) {
			let patchData = sendData.substr(i*500, 500);
			let p2 = (patch == 1) ? '00' : ((i == patch-1) ? '8':'0')+(i+1);
			let { outputData } = await APDU.Transaction.prepTx(patchData, P1, p2, isTestnet);
			encryptedSignature = outputData;
		}
        console.log(`encryptedSignature : ${JSON.stringify(encryptedSignature)}`);
        
        await APDU.Transaction.finishPrepare();
		
		const signatureKey = await commonUtils.getCWSEncryptionKey()
		if(signatureKey===undefined) return {derSig:'', cancel: true}

		const derSig = commonUtils.decryptDataFromCoolWallet(encryptedSignature, signatureKey)
        return { derSig, cancel: false };

    }catch(error){
		Helper.Other.toSystemError(error, `sendDataToCoolWallet Error`, '30000', FILE_NAME, 'sendDataToCoolWallet')
    }
};
/**
 * check if target address is registered or built-in ERC20 token address.
 * @param {string} address
 * @return {Promise<{isERC20:boolean, ?preAction:Function}>}
 */
 
const checkToAddress = async (address) => {
	if (!web3.utils.isAddress(address)) {
		console.log("not ethereum address format : " + address);
		throw 'Payload Format Error: Not ethereum address format.';
	}
	let result = await getSetTokenPayload(address);
	if (result === false) return {isERC20: false};
	let { setTokenPayload, isBuiltIn } = result;
	let preAction = getSetTokenPreAction(isBuiltIn, setTokenPayload)
	return {isERC20:true, preAction}
}


/**
 * get Preaction
 * @param {boolean} isBuiltIn 
 * @param {string} setTokenPayload 
 * @return {Function}
 */
const getSetTokenPreAction = (isBuiltIn, setTokenPayload) => {
	if (isBuiltIn) {
		return async()=>{
			await APDU.Transaction.setToken(setTokenPayload);
		}
	}else{
		return async()=>{
			await APDU.Transaction.setCustomToken(setTokenPayload)
		}
	}
}

/**
 * @description Compose Signed Transaction
 * @param {Array<Buffer>} payload
 * @param {Number} v
 * @param {String} r
 * @param {String} s
 * @return {String}
 */
export const composeSignedTransacton = (payload, v, r, s) => {
    let { chainId } = COINTYPE.ETH.network[ENV.ETH];
    v += parseInt(chainId) * 2 + 8;
	
    let transaction = payload.slice(0, 6);

    transaction.push(
        Buffer.from([v]),
        Buffer.from(r, 'hex'),
        Buffer.from(s, 'hex')
    );
    
    let serialized_tx = rlp.encode(transaction);
    let signedTransaction = `0x${serialized_tx.toString('hex')}`;
	return signedTransaction;
};

export const handleHex = (hex) => {
	return evenHexDigit(removeHex0x(hex));
  };
  
/**
 * @description Check if Hex and Even Digit
 * @param {string} hex
 * @return {string}
 */
const evenHexDigit = (hex) => {
if (!web3.utils.isHex(hex)) 
	throw FILE_NAME + ", evenHexDigit : '" + hex + "' is not hex";
return ((hex.length % 2) != 0) ? `0${hex}` : hex ;
};

/**
 * @description Check and Remove Hex Prefix 0x 
 */
 export const removeHex0x = (hex) => {
   return (hex.slice(0, 2) == '0x') ? hex.slice(2) : hex;
 };


/**
 * @description Generate Canonical Signature from Der Signature
 * @param {String} derSig hex string
 * @param {Buffer} payload
 * @param {String} keyId hex string
 * @param {Boolean} isTesting
 * @return {Promise<{v: Number, r: String, s: String}>}
 */
export const genEthSigFromSESig = async (derSig, payload, compressedPubkey=undefined, isTesting=false) => {
    try {
		// parse sig
        let sig_obj = Helper.Sign.parseDERsignature(derSig);
        let canonicalSignature = Helper.Sign.getCanonicalSignature(sig_obj);
        console.log(`canonicalSignature : ${JSON.stringify(canonicalSignature)}`);
		
		// msg hash
		let data;
		if (isTesting) {
			data = payload;
		} else {
			const hash = keccak256(payload);
			data = Buffer.from(handleHex(hash), 'hex');
		}

        let keyPair = ec.keyFromPublic(compressedPubkey, 'hex');

		// get v
        let recoveryParam = ec.getKeyRecoveryParam(data, canonicalSignature, keyPair.pub);
        console.log(`recoveryParam : ${recoveryParam}`);

        let v = recoveryParam + 27;
        let r = canonicalSignature.r;
        let s = canonicalSignature.s;

        return { v, r, s };

    }catch(error){
        throw FILE_NAME + ", generateCanonicalSig : " + error;
    }
};

/**
 * Get the payload of SET_TOKEN command.
 * @param {String} tokenAddress 
 * @param {String} decimals 
 * @param {String} symbol 
 */
const getSetTokenPayload = async (tokenAddress) => {
    try{
        let isBuiltIn = false
        let paddedAddr = '0x'+tokenAddress
        if(TOKENSIG.hasOwnProperty(paddedAddr)){
            isBuiltIn = true
            setTokenPayload = TOKENSIG[paddedAddr]
        }else{
            let tokens = await AsyncStorage.getItem('ethereum_custom_token')
            tokens = (tokens === null) ? {} : JSON.parse(tokens); 
            let upperCaseAddress = paddedAddr.toUpperCase();
            let token = tokens[upperCaseAddress];
			// if(!token) throw new Helper.SystemError({code:'32031', msg:`Token not registered`, caller:'getSetTokenPayload', src:FILE_NAME });
			if(!token) return false
            setTokenPayload = token.setTokenPayload   
        }
        return {setTokenPayload, isBuiltIn}
    }catch(error){
        Helper.Other.toSystemError(error, 'Ethereum ERC20 Transaction Error', '21030', FILE_NAME, 'getSetTokenPayload')
    }
}

/**
 * 
 * @param {String} contractAddress contract Address (0x prefixed)
 * @param {Number} decimals 
 * @param {String} symbol 
 */
export const storeCustomToken = async(contractAddress, symbol, decimals) => {
    console.log(`${contractAddress} - ${decimals} - ${symbol}`)
    let tokens = await AsyncStorage.getItem('ethereum_custom_token')
    tokens = (tokens === null) ? {} : JSON.parse(tokens);
    
    let token = tokens[contractAddress.toUpperCase()];
    if (!token) token = {};
    let unit = handleHex(decimals.toString(16));
    let leng = handleHex(symbol.length.toString(16));
    let symb = handleHex(web3.utils.asciiToHex(symbol));
    const setTokenPayload = unit + leng + web3.utils.padRight(symb, 14, '0') + removeHex0x(contractAddress);
    token.symbol = symbol
    token.decimals = decimals
    token.setTokenPayload = setTokenPayload
    tokens[contractAddress.toUpperCase()] = token
    await AsyncStorage.setItem('ethereum_custom_token', JSON.stringify(tokens))
    console.log(`Set Custom Token Success: ${JSON.stringify(tokens)}`)
}

/**
 * @description APDU Send Raw Data for Segregated Signature
 * @param {Buffer} msgBuf
 * @param {String} p1
 * @return {Function}
 */
export const apduForParsingMessage = (msgBuf, p1) => {
	let rawData = msgBuf.toString('hex');
	rawData = handleHex(rawData);
	let patch = Math.ceil(rawData.length/500);
	console.log(rawData.length)
	// if (patch > 1) return; // To Do : if card support patch, remove this line
	return async () => {
		for (let i = 0; i < patch; i++) {
			let patchData = rawData.substr(i*500, 500);
			let p2 = (patch == 1) ? '00' : ((i == patch-1) ? '8':'0')+(i+1);
			await APDU.Transaction.prepTx(patchData, p1, p2, false);
		}
	};
};