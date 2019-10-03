const bufferXOR = require('buffer-xor');
const random = require('react-native-randombytes');
const elliptic = require('elliptic');
import {setGenericPassword, getGenericPassword} from 'react-native-keychain';
import SystemError from './system.error';
import {AsyncStorage} from 'react-native';

const BLE_KEY_FILE = 'bleKeyFile';
const ec = new elliptic.ec('secp256k1');

const generateKeyPair = () => {
  try {
    let privateKey = random.randomBytes(32);
    const publicKey = ec.keyFromPrivate(privateKey, 'hex').getPublic(false, 'hex');
    let privateKeyStr = privateKey.toString('hex');
    return { privateKey: privateKeyStr, publicKey };
  } catch (e) {
    throw new SystemError({'code':"00101", "msg":`App Key Generation failed. ${e}`})
  }
};

/**
 * get appPrivKey or appPubKey by doing XOR operation on hashed keys and hashing keys 
 * @param {String} keyName either appPrivKey or appPubKey
 * @return {Promise<String>}
 */
export const getValueFromKey = async(keyName) => {
  const credentials = await getGenericPassword();
  if(credentials===false){
    let msg = "getValueFromKey Error: No Permission to get password from Keychain"
    throw new SystemError({code:"00105", msg})
  }
  if(credentials===null || !credentials.password){
    let msg = "getValueFromKey Error: get Generic Password from RN-Keychain Error: No saved keyFile."
    throw new SystemError({code:"00104", msg})
  }
  let hashedKey = JSON.parse(credentials.password);
  if(!hashedKey.appPrivKey || !hashedKey.appPubKey){
    let msg = "getValueFromKey Error: No saved hashed app Keys"
    throw new SystemError({code:"00104", msg})
  }
  let keyFile = await getKeyFile();
  if(!keyFile.appPrivKey || !keyFile.appPubKey){
    throw new SystemError({code:"00104", msg:"getValueFromKey Error: Missing KeyFile (Hashing Key)"})
  }
  if(keyName==='appPrivKey') {
    return bufferXOR(Buffer.from(keyFile.appPrivKey,'hex'), Buffer.from(hashedKey.appPrivKey, 'hex')).toString('hex');
  }else if(keyName==='appPubKey'){
    return bufferXOR(Buffer.from(keyFile.appPubKey,'hex'), Buffer.from(hashedKey.appPubKey, 'hex')).toString('hex');
  } 
  throw new SystemError({code:"00104", msg:"getValueFromKey Error: key name should be either appPrivKey or appPubKey"})

};

/**
 * Keychain flow run at init() to make sure we have all keys correctly.
 * @returns {Boolean} true if one of {appid, keyFile, appKey} missing hense re-generated; false if 
 */
export const keyChainModifyFlow = async () => {
  try {
    const appId = await AsyncStorage.getItem('appId');
    if(!appId){
      console.log('[keychain] No Appid: Create new appKey and store');
    }else{
      let appPrivKey = await getValueFromKey('appPrivKey');
      let appPubKey = await getValueFromKey('appPubKey')
      if( appPrivKey && appPubKey) {
        console.log(`[keychain] Checked: Hashing Key and Hashed AppKey exists: ${appPubKey}`);
        return false
      }
    }
  } catch(e) {
    let { code, msg } = e;
    if(code!=="00104")  throw e
    else console.log(`Got Error while checking appPrivKey: ${msg}, re-generating keys.`)
  }
  const KeyPair = await generateKeyPair();
  let appKey = { appPrivKey: KeyPair.privateKey, appPubKey: KeyPair.publicKey };
  await storeAppKeyFlow(appKey);
  return true
};

/**
 * Store app public key and private key to keychain and async storage
 * @param {Object<{appPrivKey:String, appPubKey:String}>} appKey
 * @returns {Promise}
 */
const storeAppKeyFlow = async (appKey) => {
  try {
    if (appKey == null) {
      throw 'storeKeyFlow Error: appKey is null';
    }
    const XORKey = await generateKeyPair();
    let keyFile = { appPrivKey: XORKey.privateKey, appPubKey: XORKey.publicKey };
    await storeKeyFile(keyFile);
    let hashedPubKey = bufferXOR(Buffer.from(appKey.appPubKey, 'hex'), Buffer.from(keyFile.appPubKey, 'hex')).toString('hex');
    let hashedPrivKey = bufferXOR(Buffer.from(appKey.appPrivKey, 'hex'), Buffer.from(keyFile.appPrivKey, 'hex')).toString('hex');
    let hashedKey = { appPrivKey: hashedPrivKey, appPubKey: hashedPubKey };
    await storeData2Keychain(hashedKey);
  } catch (e) {
    errHandler(e, 'storeKeyFlow error:');
  }
}

/**
 * Store hashed app key pair to keychain (via setGenericPassword)
 * @param {jsonObject} hashedKey
 * @returns {Promise}
 */
const storeData2Keychain = async(hashedKey)=> {
  try {
    let jsonStr = JSON.stringify(hashedKey);
    await setGenericPassword('appKey', jsonStr);
  } catch (e) {
    errHandler(e, 'storeData2Keychain error: ');
  }
};

/**
 * Store the hashing key pair in Async Storage
 * @param {{appPrivKey:string, appPubKey:String}} hashingKeyPair
 * @returns {Promise}
 */
const storeKeyFile = async (keyFile)=> {
  try {
    let storeData = JSON.stringify(keyFile);
    await AsyncStorage.setItem(BLE_KEY_FILE, storeData);
  } catch (e) {
    errHandler(e, 'store keyFile error:');
  }
};

/**
 * get the keypair used to XOR app keys. (from AsyncStorage)
 * @return {Promise<{appPrivKey:String, appPubKey:String} | null >} keyFile 
 */
const getKeyFile = async () => {
  try {
    let keyPair = await AsyncStorage.getItem(BLE_KEY_FILE);
    if (keyPair) {
      return JSON.parse(keyPair);
    }
    console.log('[keychain] Missing keyfile...')
    return null;
  } catch (e) {
    errHandler(e, 'get getKeyFile error:');
  }
};

/**
 * errorHandler
 * @param {object} e
 * @param {string} logInfo
 * @throws {throwable} e
 */
const errHandler = (e, logInfo) => {
  let { message } = e;
    if (message) {
      console.log(`[keychain] ${logInfo} ${message}`);
    }
    else {
      console.log(`[keychain] ${logInfo} ${e}`);
    }
    throw e;
};
