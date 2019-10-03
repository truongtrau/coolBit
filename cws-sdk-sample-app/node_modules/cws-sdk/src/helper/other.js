import { AsyncStorage } from 'react-native';
const VERSION = require('../config/version')
const COINTYPE = require('../config/coinType')
const COMMAND = require('../config/command')
import {SDK_ERROR} from '../config/error'
import SystemError from './system.error';
import * as KeyChain from './keyChainUtil'
import * as APDU from '../apdu'
import * as Sign from './sign'
const SRC_PATH = 'cws-sdk/helper/other.js';
import bip32 from 'bip32'


/**
 * Converts bip44 path to keyID that CoolWalltS needs
 * @param {String} path BIP44 Path
 * @param {Number} radix Index number radix in path
 * @returns {String} keyId
 */
export const bip44PathTOKeyId = (path, radix=10) => {
  const indexes = path.split('/')
  if (indexes.length != 6 || indexes[1]!="44'"){
    let msg = "BIP44 format error: should be in following format: m/44'/0'/0'/0/1"
    throw new SystemError({code:'PATH_NOT_SUPPORTED', msg})
  }
  const coinType = pathIndexToKeyIdIndex(indexes[2], radix, 2)
  const accountIndex = pathIndexToKeyIdIndex(indexes[3], radix, 2)
  const changeIndex = pathIndexToKeyIdIndex(indexes[4], radix, 2)
  const addressIndex = pathIndexToKeyIdIndex(indexes[5], radix, 4)
  const keyId = coinType.concat(accountIndex, changeIndex, addressIndex)
  console.log(`Convert Path ${path} to KeyID: ${keyId}`)
  return keyId
};

/**
 * Add specific char to string
 * @param {String} data 
 * @param {Number} length 
 * @param {String} addedData 
 * @param {Boolean} fromFront 
 */
export const fitZero = (data, length, addedData, fromFront) => {
    let temp = data
    if (data.length > length) {
      if (!!fromFront) {
        temp = '9';
        for (let i = temp.length; i < length; i++) {
          temp += '9';
        }
      } else {
        temp = temp.slice(0, length);
      }
    }
    for (let i = data.length; i < length; i++) {
      if (!!fromFront) {
        temp = `${addedData}${temp}`;
      } else {
        temp = `${temp}${addedData}`;
      }
    }
    return temp;
};

/**
 * Get supported Coin IDs ('BTC', 'ETH'...)
 * @returns {Promise <Array<String> >} 
 */
export const getSupportedCoin = async () => {
  try {
    const CardSEVersion = await getSEVersion()
    console.log(`supportedCoin CardSEVersion:${CardSEVersion}`)
    const supportedCoin = VERSION.SE_VERSION_LIST.find(v => v[CardSEVersion]);
    // If Card version maybe older than card SE Version
    if (!supportedCoin) {
      const lastVersion = VERSION.SE_VERSION_LIST[VERSION.SE_VERSION_LIST.length - 1];
      const getKey = Object.keys(lastVersion);
      return lastVersion[getKey];
    }
    return supportedCoin[CardSEVersion];
  } catch (e) {
    throw e;
  }
};

/**
 * Get Coin Code for CoolWalletS
 * @param {Array<String>} coinId 
 * @returns {Array<String>} coinCode
 */
export const getCoinCode = (coinId) => {
  let result = [];
  for (let key in coinId) {
    if (coinId.hasOwnProperty(key)) {
      let id = coinId[key];
      let coinCode = COINTYPE[id].type;
      if (coinCode) {
        result.push(coinCode);
      }
    }
  }
  return result;
};

/**
 * Convert CoinCode to CoinID
 * @param {Array} coinCode 
 * @returns {Array} coinId (BTC, ETH, ...)
 */
export const getCoinId = (coinCode) => {
  let result = [];
  for (let key in COINTYPE) {
    if (COINTYPE.hasOwnProperty(key)) {
      let item = COINTYPE[key];
      if (coinCode.includes(item.type)) {
        result.push(key);
      }
    }
  }
  return result;
};

/**
 * Format Balance to show on CoolWalletS screen
 * @param {String} balance 
 * @param {String} defaultValue 
 * @returns {String} Formatted Balance String
 */
export const formatBalance = function(balance, defaultValue="0.0"){
  let result
  if(isNaN(balance) || balance === null || balance === "undefined" ){
      console.log(`${balance} is not a number`)
      result = defaultValue
  } else {
      if (parseInt(balance) < 0){
          console.log(`${balance} is less than zero and set to ${defaultValue}`)
          result = defaultValue
      } else {
          let strVal = balance.toString()
          let splitVal = strVal.split('.');
          result = (splitVal.length > 1)? strVal : strVal + ".0"
      }
  }
  return result
};

/**
 * Get SE Version from local storage, or from CoolWalletS
 * @param {boolean} forceFromCard 
 * @returns {Promise<Number>} SE Version as Integer
 */
export const getSEVersion = async (forceFromCard=false) => {
  if(!forceFromCard){
    try{
      let result = await AsyncStorage.getItem('CardSEVersion')
      console.log(`Get card SE version from Storage: ${parseInt(result, 10)}`)
      return parseInt(result, 10)
    } catch{e} console.log('Get from local error, request APDU.')
  }
  const {outputData} = await APDU.Other.getSEVersion();
  let SEVersion = parseInt(outputData, 16)
  await AsyncStorage.setItem('CardSEVersion', SEVersion.toString());
  console.log(`Fetching SE Version from CoolWalletS... ${SEVersion}`)
  return SEVersion;
};

/**
 * Get MCU Version from local storage, or from CoolWalletS
 * @param {boolean} forceFromCard 
 * @returns {Promise<String>}
 */
export const getMCUVersion = async(forceFromCard=false) => {
  if (!forceFromCard){
    try{
      let result = await AsyncStorage.getItem('CardMCUVersion')
      console.log(`Get card MCU version from AsyncStorage ${result}`)
      if(result.length === 8) return result    
    } catch(e){
      console.log(`Got from local storage error, try fetching from card` + e)
    } 
  }
  const {outputData} = await APDU.Dfu.getFWStatus();
  let result = outputData.slice(4, 12).toUpperCase()
  await AsyncStorage.setItem('CardMCUVersion', result)    
  return result
};


/**
 * Check if specific command is available on this Card Version
 * @param {String} ruleType RuleType Code
 */
export const isAvailable = async (ruleType) => {
  let result = false;
  const rule = VERSION.RULES[ruleType];
  let CardSEVersion = 0, CardMCUVersion = 0;
  // Get SE and MCU version
  try {
    CardSEVersion = await getSEVersion();
  } catch (e) {
    throw new SystemError({ msg: 'isAvailable getSEVersion failed', ex: e, src: SRC_PATH });
  }
  try {
    CardMCUVersion = await getMCUVersion();
    CardMCUVersion = parseInt(CardMCUVersion, 16)
  } catch (e) {
    throw new SystemError({ msg: 'isAvailable getMCUVersion failed', ex: e, src: SRC_PATH });
  }
  console.log(`Current CardSEVersion(10): ${CardSEVersion} CardMCUVersion(16): ${CardMCUVersion.toString(16)}`);
  if (rule) {
    console.log(`Selected rule:${JSON.stringify(rule)}`);
    for (let key in rule) {
      if (rule.hasOwnProperty(key)) {
        let ver = rule[key];
        if (key === 'SE') {
          if(CardSEVersion >= parseInt(ver)){
            result = true;
          } else {
            result = false;
            break;
          }
        } else if (key === 'MCU') {
          if(CardMCUVersion >= parseInt(ver, 16)) {
            result = true;
          } else {
            result = false;
            break;
          }
        }
      }
    }
  } else {
    throw new SystemError({ msg: 'Cannot find the ruleType:' + ruleType, src: SRC_PATH });
  }
  return result;
};

/**
 * Get Command signature to append to some specific APDU commands.
 * @param {String} commandName 
 * @param {String} data 
 * @param {String} params1 
 * @param {String} params2 
 * @returns {Promise<String>}
 */
export const generalAuthorization = async (commandName, data, params1, params2) => {
  try {
    // console.log(`General Auth for command ${commandName}`)
    const dataPackets = !!data ? data : '';
    const appId = await AsyncStorage.getItem('appId');

    let privateKey = await getAppPrivkey()
    const nonce = await APDU.Other.getNonce();

    const commandParams = COMMAND[commandName];
    const P1 = !!params1 ? params1 : commandParams.P1;
    const P2 = !!params2 ? params2 : commandParams.P2;
    const command = commandParams.CLA + commandParams.INS + P1 + P2;
    const signatureParams = command + dataPackets + nonce.outputData;
    const signature = Sign.sign(signatureParams, privateKey).toString('hex');
    await APDU.Other.sayHi(appId);
    return signature;
  } catch (e) {
    toSystemError(e, 'SDK generalAuthorization Failed.', '00000', SRC_PATH, 'generalAuthorization')
  }
};

/**
 * Get AppPrivKey from Keychain
 * @return {Promise<String>}
 */
export const getAppPrivkey = async () => {
  try {
    let appKey = await KeyChain.getValueFromKey('appPrivKey');
    return appKey
  } catch (err) {
    let { message, code } = err;
    let msg = message ? message : 'Error Fetching App Private Key.';
    code = code ? code : "00011";
    throw new SystemError({ code: code, ex: err, msg: msg })
  }
};

/**
 * Convert Number Index in bip44 to Hexa Format in KeyID
 * @param {String} pathIndex index in BIP44 path 
 * @param {Number} radix Number Radix in bip44 path index
 * @param {Number} digits length of target output
 */
const pathIndexToKeyIdIndex = function(pathIndex, radix, digits){
  let keyIdIndex = parseInt(pathIndex.replace("'",''), radix).toString(16).toUpperCase()
  return fitZero(keyIdIndex, digits, '0', true)
};

/**
 * Get account extend public key and chain code of a specific bip44 account node
 * @param {String} coinSEType 
 * @param {Number} accIndex The Index of account we want to fetch, in integer
 * @param {Boolean} authFirst whether we need to establish authentication 
 * @returns {Promise<{accountIndex:String, accountPublicKey:String, accountChainCode:String}>}
 */
export const getAccountExtKey = async (coinSEType, accIndex, authFirst=true) => {
  try{
    if(authFirst){
      const command = "AUTH_EXT_KEY";
      const signature = await generalAuthorization(command);
      await APDU.Wallet.authGetExtendedKey(signature);
    }
    const appPrivKey = await getAppPrivkey()
  
    accIndex = accIndex.toString(16);
    if (accIndex.length % 2 > 0) accIndex = '0' + accIndex;
    const encryptedResponse = await APDU.Wallet.getAccountExtendedKey(coinSEType, accIndex);
    const {outputData} = encryptedResponse;
    const decryptedData = Sign.ECIESDec(appPrivKey, outputData);
    if (!decryptedData) throw "Decryption Failed";
  
    const accBuf = Buffer.from(decryptedData, 'hex');
    const publicKey = accBuf.slice(0, 33);
    const chainCode = accBuf.slice(33);
    
    return {
      accountIndex: accIndex,
      accountPublicKey: publicKey.toString('hex'),
      accountChainCode: chainCode.toString('hex')
    }
  }catch(err){
    toSystemError(err, 'SDK getAccountExtKey Error', '00000', SRC_PATH, 'getAccountExtKey')
  }
  
};

/**
 * @description Derive an address's public key from a parent account public key (change index default to 00)
 * @param {String} accountPublicKey 
 * @param {String} chainCode 
 * @param {Number} changeIndex
 * @param {Number} addressIndex
 */
export const derivePubKey = (accountPublicKey, chainCode, changeIndex=0, addressIndex=0) => {
  try {
    const accountNode = bip32.fromPublicKey(Buffer.from(accountPublicKey, 'hex'), Buffer.from(chainCode, 'hex'))
    const changeNode = accountNode.derive(changeIndex)
    const addressNode = changeNode.derive(addressIndex)
    const publicKey = addressNode.publicKey.toString('hex')
    
    const parentPublicKey = changeNode.publicKey.toString('hex')
    const parentChainCode = changeNode.chainCode.toString('hex')

    return {publicKey, parentPublicKey, parentChainCode}
  } catch (ex) {
    throw new SystemError({ code:'00000', msg: 'SDK Derive Address Public Key Failed', ex, src:SRC_PATH, caller:'derivePubKey'});
  }
}

/**
 * @param {String} coinType 
 * @param {String} Number 
 */
export const addressIndexToKeyId = (coinType, addressIndex) => {
  addressIndex = addressIndex.toString(16)
  addressIndex = fitZero(addressIndex, 4, "0", true)
  const keyId = coinType+"0000"+addressIndex
  console.log(`Convert to keyId: ${keyId}`)
  return keyId
}

/**
 * Check if target SEVersion is satisfied
 * @param {number} requiredSEVersion 
 * @param {bool} throwError  true: throw SystemError if requirement not satisfied
 * @returns {boolean}
 */
export const versionCheck = async(requiredSEVersion, throwError=true) =>{
  let SEVersion = await getSEVersion()
  if( SEVersion >= requiredSEVersion ) return true
  if(throwError) throw new SystemError({code:'00013',msg:`Need to update SE to version ${requiredSEVersion} to enable this operation`})
  return false
}

/**
 * Get public key from card if provided publickey is undefined
 * @param {string} coinType 
 * @param {number} addressIndex 
 * @param {string} publicKey 
 * @returns {Promise<string>} 
 */
export const checkPublicKeyExist = async(coinType, addressIndex, publicKey) => {
  if(publicKey!=undefined) return publicKey
  const {accountPublicKey, accountChainCode} = await getAccountExtKey(coinType, 0)
  let keyObject = await derivePubKey(accountPublicKey, accountChainCode, 0, addressIndex)
  return keyObject.publicKey
}

/**
 * Convert Error Object to customized SystemError
 * @param {SystemError | Error} err System Error, normal error or SE Error (plain SE Error Code)
 * @param {String?} message Default message if no corresponding error message can be found under this caller - SE error code.
 * @param {String?} code Default code (larger scope) if no corresponding error message can be found under this caller - SE error code.
 * @param {String?} src Source file of the error thrown
 * @param {String?} caller Function name use to identify Error source, also used for mapping SE error code to SDK error code
 */
export const toSystemError = (err, message, code="00099", src, caller)=>{
  if(err instanceof SystemError) throw err
  console.log(`Original Error Message: ${err}`)
  if(err instanceof Error){
    throw new SystemError({code, msg:message, ex:err, src, caller});
  }

  if(err.indexOf('CWSError-')===-1) throw new SystemError({code, msg:message, ex:err, src, caller});
  let bleErr = err.split('CWSError-')[1]
  const commad = bleErr.split('-')[0]
  const seError = bleErr.split('-')[1]
  if(SDK_ERROR.hasOwnProperty(commad)){
    if(SDK_ERROR[commad].hasOwnProperty(seError)){ // err is SE error code
      throw new SystemError({
        code: SDK_ERROR[commad][seError].code,
        msg: SDK_ERROR[commad][seError].msg,
        ex: err,
        src,
        caller
      })
    }
  }
  
  throw new SystemError({code, msg:message, ex:err, src, caller});
}