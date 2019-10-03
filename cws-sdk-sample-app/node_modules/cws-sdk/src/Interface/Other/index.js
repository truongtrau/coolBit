
import { AsyncStorage } from 'react-native';
import Promise from 'bluebird'
const APDUCONFIG = require('../../config/apdu.js');
// import {SDK_ERROR} from '../../config/error'
import * as APDU from '../../apdu';
import * as Helper from '../../helper'
import * as Update from '../../update'

const { RESPONSE } = APDUCONFIG;
const SRC_PATH = 'rootCore/Interface/Other/index.js';

/**
 * Get detail card information.
 * @returns {Promise<{"pairStatus":boolean,"freezeStatus":boolean,"walletStatus":boolean,"pairRemainTimes":Number,"accountDigest":String,"showFullAddress":boolean,"isCardRecognized":boolean,"SEVersion":Number,"MCUVersion":String}>}
 */
export const getCardInfo = async () => {
  try {
    const MCUVersion = await Helper.Other.getMCUVersion(true)
    const SEVersion = await Helper.Other.getSEVersion(true)
    
    const cardInfo = await APDU.Other.getCardInfo();
    
    const appId = await AsyncStorage.getItem("appId");
    const hiResponse = await APDU.Other.sayHi(appId, true);
    await APDU.Other.closePower();

    const { outputData } = cardInfo;
    const databuf = Buffer.from(outputData, 'hex');
    const pairIndex = databuf.slice(0, 1).toString('hex');
    const freezeIndex = databuf.slice(1, 2).toString('hex');
    const walletIndex = databuf.slice(3, 4).toString('hex');
    const accountDigest = databuf.slice(4, 9).toString('hex');
    const displayIndex = databuf.slice(9).toString('hex');
    
    const isCardRecognized = hiResponse.status == RESPONSE.SUCCESS ? true : false;
    let pairRemainTimes = databuf.slice(2, 3).toString('hex');
    pairRemainTimes = parseInt(pairRemainTimes, 16);

    let pairStatus;
    if(pairIndex == '01'){
      pairStatus = true;
    } else if (pairIndex == '00') {
      pairStatus = false;
    } else {
      throw new Helper.SystemError({msg: "Unsupported Pair_Status:" + pairIndex, src: SRC_PATH});
    }
    const freezeStatus = freezeIndex == '00' ? false : true;
    const walletStatus = walletIndex == '00' ? false : true;
    const showFullAddress = displayIndex == '00' ? true : false;
    if (accountDigest == "81c69f2d90" ||
        accountDigest == "3d84ba58bf" ||
        accountDigest == "83ccf4aab1" )
    {
      Helper.Other.toSystemError("00099", "Please Recover your wallet", SRC_PATH, 'getCardInfo')
    }
    const message = {
      pairStatus,
      freezeStatus,
      walletStatus,
      pairRemainTimes,
      accountDigest,
      showFullAddress,
      isCardRecognized,
      SEVersion,
      MCUVersion
    };
    console.log(`CardInfo Package: ${JSON.stringify(message)}`);
    return message;
  } catch (e) {
    Helper.Other.toSystemError("00000", "SDK Get Card Info Error. ", SRC_PATH, 'getCardInfo')
  }
};

/**
 * Register currenct device to CoolWalletS.
 * @param {String} password 
 * @param {String} device_name 
 * @returns {Promise}
 */
export const registerDevice = async (password, device_name) => {
  try {
    const appPubKey = await Helper.KeyChain.getValueFromKey('appPubKey');
    let nameToUTF = Buffer.from(device_name, 'utf8');
    const maxLen = 30;

    if (nameToUTF.length < maxLen) {
      let diff = maxLen - nameToUTF.length;
      let temp = Buffer.allocUnsafe(diff);
      temp.fill(0);
      nameToUTF = Buffer.concat([temp, nameToUTF]);
    } else if (nameToUTF.length > maxLen) {
      console.log('Before truncated length:' + nameToUTF.length);
      let msg = `device_name:${device_name} exceed limit 30 bytes and will be truncated`;
      nameToUTF = nameToUTF.slice(0, maxLen);
      console.log(msg);
    } else {
      console.log('Length of device name:' + nameToUTF.length);
    }
    const addedPassword = Helper.Other.fitZero(password, 8, 'F', true);

    nameToUTF = nameToUTF.toString('hex');
    let temp = addedPassword + appPubKey + nameToUTF, P1 = "00";

    const supportEncryptedRegister = await Helper.Other.isAvailable('A5');
    if(supportEncryptedRegister) {
      const SEPubKey = await AsyncStorage.getItem('SEPubKey');
      temp = Helper.Sign.ECIESenc(SEPubKey, temp);
      P1='01';
    } else {
        console.log('Not support encrypted pairing password');
    }
    const { outputData } = await APDU.Other.registerDevice(temp, P1);
    await APDU.Other.closePower();
    await AsyncStorage.setItem('appId', outputData);
  } catch (e) {
    Helper.Other.toSystemError(e, 'Register Device Error.', "00020", SRC_PATH, 'registerDevice')
  }
};

/**
 * Get Pairing Password for other device to connect CoolWalletS.
 * @return {Promise<String>} password
 */
export const getPairingPassword = async () => {
  try {
    const command = "GET_PAIR_PWD";
    const signature = await Helper.Other.generalAuthorization(command);
    const getPairPassword = await APDU.Other.getPairPassword(signature);
    await APDU.Other.closePower();

    let appPrivKey = await Helper.Other.getAppPrivkey()
    let password = Helper.Sign.ECIESDec(appPrivKey, getPairPassword.outputData);
    password = password.replace(/f/gi, '');
    return password
  } catch (e) {
    Helper.Other.toSystemError(e, 'SDK getPairPassword Failed.', "00000", SRC_PATH, 'getPairingPassword')
  }
};

/**
 * Get Paired device list
 * @returns {Promise<Array<{appId:String, deviceName:String, isCurrent:Boolean}>>}
 */
export const getPairedDevices = async () => {
  try {
    const command = "GET_PAIRED_DEVICES";
    const signature = await Helper.Other.generalAuthorization(command);

    const result = await APDU.Other.getPairedDevices(signature);
    await APDU.Other.closePower();
    let oldAppId = await AsyncStorage.getItem("appId");
    const allPairedDevice = result.outputData.match(/.{100}/g);
    const allDevices = await Promise.map(allPairedDevice, (pairedDevices) => {
      const appId = pairedDevices.slice(0, 40);
      const utfDevicename = pairedDevices.slice(40);
      const toBuf = Buffer.from(utfDevicename, 'hex');
      const deviceName = toBuf.toString().replace(/\u0000/gi, '');

      let isCurrent = appId == oldAppId;
      return { appId, deviceName, isCurrent };
    });
    console.log(`Got Paired Devices: ${JSON.stringify(allDevices)}`)
    return allDevices
  } catch (e) {
    Helper.Other.toSystemError(e, 'SDK getPairedDevices Failed', "00000", SRC_PATH, 'getPairedDevices')
  }
};

/**
 * Remove paired device from CoolWalletS
 * @param {String} appId 
 * @returns {Promise}
 */
export const removePairedDevice = async (appId) => {
  try {
    const command = "REMOVE_DEVICES";
    const signature = await Helper.Other.generalAuthorization(command, appId);
    const removeParams = appId+ signature;
    await APDU.Other.removePairedDevice(removeParams);
    await APDU.Other.closePower();
  } catch (e) {
    Helper.Other.toSystemError(e, 'SDK removePairedDevice failed', "00000", SRC_PATH)
  }
};

/**
 * Rename current device name.
 * @param {String} newDeviceName 
 * @returns {Promise}
 */
export const renamePairedDevice = async (newDeviceName) => {
  try {
    let nameToUTF = Buffer.from(newDeviceName);
    if (nameToUTF.length < 30) {
      let diff = 30 - nameToUTF.length;
      let temp = Buffer.allocUnsafe(diff);
      temp.fill(0);
      nameToUTF = Buffer.concat([temp, nameToUTF]);
    }
    nameToUTF = nameToUTF.toString('hex');

    const command = "RENAME_DEVICES";
    const signature = await Helper.Other.generalAuthorization(command, nameToUTF);
    const renameParams = nameToUTF + signature;
    await APDU.Other.renamePairedDevice(renameParams);
    await APDU.Other.closePower();
  } catch (e) {
    Helper.Other.toSystemError(e, 'SDK RenamePairedDevice failed', "00000", SRC_PATH)
  }
};

/**
 * Reset CoolWalletS.
 * @returns {Promise}
 */
export const resetCard = async () => {
  try {
    const reset = await APDU.Other.resetPair();
    const { status } = reset;
    if (status == RESPONSE.CANCELED) {
      throw new Helper.SystemError({code:"00000", msg:"resetPair command canceled."})
    }
    await APDU.Other.closePower();
    return true
  } catch (e) {
    Helper.Other.toSystemError(e, 'SDK ResetPair failed', "00000", SRC_PATH)
  }
};

/**
 * Setting about whether you want CoolWalletS to display destination address during transaction confirmations.
 * @param {Boolean} isFullDetail set true if you want to display destination address
 * @returns {Promise}
 */
export const toggleShowAddress = async (isFullDetail) => {
  try {
    let {outputData} = await APDU.Other.getCardInfo();
    let cardInfoBuf = Buffer.from(outputData, 'hex');
    const displayIndex = cardInfoBuf.slice(9).toString('hex');
    const currentStatus = displayIndex == '00' ? true : false;
    if (currentStatus === isFullDetail) return true
    
    const command = "SHOW_FULL_ADDRESS";
    const detailFlag = !!isFullDetail ? '00' : '01';
    const signature = await Helper.Other.generalAuthorization(command, null, detailFlag);
    await APDU.Other.showFullAddress(signature, detailFlag);
    await APDU.Other.closePower();
  } catch (e) {
    Helper.Other.toSystemError(e, 'SDK showFullAddress Failed', "00000", SRC_PATH)
  }
};

/**
 * Setting about whether you allow other devices to pair your CoolWalletS.
 * @param {Boolean} freezePair Set true if you want to freeze(lock) your CoolWalletS
 * @returns {Promise}
 */
export const toggleLockCard = async (freezePair) => {
  try {
    const command = "CHANGE_PAIR_STATUS";
    const pairLockStatus = !!freezePair ? '01' : '00';
    const signature = await Helper.Other.generalAuthorization(command, null, pairLockStatus);

    await APDU.Other.changePairStatus(signature, pairLockStatus);
    await APDU.Other.closePower();
  } catch (e) {
    Helper.Other.toSystemError(e, 'SDK changePairLockStatus Failed', "00000", SRC_PATH)
  }
};

/**
 * Cancel APDU command.
 * @returns {Promise}
 */
export const cancelCommand = async () => {
  await APDU.Other.cancelAPDU();
};

/**
 * Switch SE power off for battery saving
 * @returns {Promise}
 */
export const powerOffSE = async() => {
  await APDU.Other.closePower();
};


/**
 * Record Paired CoolWalletS ID to local storage
 * @param {String} cardId 
 * @return {Promise<String>}
 */
export const setCardId = async (cardId) => {
  await AsyncStorage.setItem('cardId', cardId);
  return cardId;
};

/**
 * Get CoolWalletS ID from local storage.
 * @returns {Promise<String>}
 */
export const getCardId = async () => {
  return await AsyncStorage.getItem('cardId');
};

/**
 * Original getCardSEVersion
 * @param {Boolean} getHex set True if you want to get Hex String of SE Version
 * @returns {Promise<Number|String>}
 */
export const getSEVersion = async (getHex=false) => {
  let SEVersion =  await Helper.Other.getSEVersion()
  if(getHex){
    return SEVersion.toString(16)
  }else{
    return SEVersion
  }
};

/**
 * Get MCU Version from local storage, or from CoolWalletS
 * @param {Boolean} getHex set True if you want to get Hex String of SE Version
 * @returns {Promise<Number|String>}
 */
export const getMCUVersion = async(getHex=false) => {
  let MCUVersion = await Helper.Other.getMCUVersion()
  if(!getHex){
    return parseInt(MCUVersion,16)
  }else{
    return MCUVersion
  }
};

/** 
 * check if MCU or SE update is available
 * @returns {Promise< {updateMCU: Boolean, updateSE: Boolean} >}
 */
export const checkFirmwareUpdate = async() => {
  return await Update.checkFirmwareUpdate()
}

/**
 * start firmware update process
 * @param {String} cardId CWS serial number. ex: CWS058916
 * @param {Boolean} updateSE update SE or not.
 * @param {Boolean} updateMCU update MCU or not.
 */
export const firmwareUpdate = async(cardId, updateSE, updateMCU) => {
  return await Update.firmwareUpdate(cardId, updateSE, updateMCU)
}