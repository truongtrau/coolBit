import { AsyncStorage } from 'react-native';
import Promise from 'bluebird'
const VERSION = require('../../config/version.js');
const COMMAND = require('../../config/command.js');
const APDUCONFIG = require('../../config/apdu')
const { RESPONSE } = APDUCONFIG;

const jwt = require('../../customlib/rn-jsonwebtoken.js');
import * as APDU from '../../apdu/';
import * as Helper from '../../helper'

import {loadScript, installScript, deleteScript, newLoadScript, newInstallScript} from './script'

const SRC_PATH = 'cws-sdk/update/OTA/index.js';
const hasBackupFlag = 'hasBackupFlag';


/**
 * check if SE need update (check card SE version versus config file.)
 * @return {Promise< Boolean >}
 */
export const checkUpdate = async() => {
  const cardSEVersion = await Helper.Other.getSEVersion(true)
  const versionObj = VERSION.SE_VERSION_LIST[VERSION.SE_VERSION_LIST.length - 1];
  const keyArr = Object.keys(versionObj);
  const targetVersion = keyArr[0];
  return targetVersion > cardSEVersion
}

/**
 * Update SE.
 * @param {String} cardId in form of CWS058916
 * @return {Promise}
 */
export const SEUpdate = async (cardId) => {
  const cardSEVersion = await Helper.Other.getSEVersion(true)
  try {
    if(await Helper.Other.isAvailable('A2')) await APDU.Other.startUpdate(); // Show update on the card
    await selectOneFn();
    let isAppletExist = await selectApplet();
       
    const appId = await AsyncStorage.getItem('appId')
    const hiResponse = await APDU.Other.sayHi(appId, true);
    const isCardRecognized = hiResponse.status == RESPONSE.SUCCESS ? true : false;
    
    let {outputData} = await APDU.Other.getCardInfo();
    let cardInfoBuf = Buffer.from(outputData, 'hex');
    const walletIndex = cardInfoBuf.slice(3, 4).toString('hex');
    const walletStatus = walletIndex == '00' ? false : true;

    console.log(`isCardRecognized: ${isCardRecognized}, walletStatus: ${walletStatus}`);
    await selectOneFn();
    let status  = await checkRecoverScriptExist();
    await APDU.Other.closePower();

    // 2 check if SE exists delete Backup Data, and backup Registered Data
    const hasBackupScriptSEVersion = 76;
    if (isAppletExist) {
      if (cardSEVersion >= hasBackupScriptSEVersion) {
        console.log(`isCardRecognized: ${isCardRecognized}`);
        if (isCardRecognized === true) {          
          await deleteBackupRegisterData();
          if (walletStatus == true) {
            await backupRegisterData();
          }
        }
      }
    }

    //card manager applet id
    const selectOne = 'A000000151000000';
    await APDU.OTA.selectCardManager(selectOne);
    //ssd applet id
    const selectTwo = 'A000000151535041';
    await APDU.OTA.selectCardManager(selectTwo);    
    await mutualAuthorization(cardId);
    
    if (cardSEVersion < hasBackupScriptSEVersion) {
      console.log(`se card < 76 cardSEVersion:${cardSEVersion}`);
      console.log(`checkScript status: ${status}`);
      // backup script not exists
      if (status.toUpperCase()=='6A82') {
        // insert new load script and install script
        console.log(`Start install loadscript`);
        await insertScript(newLoadScript, 'New Load Script failed');
        await insertScript(newInstallScript, 'New Install Script failed');
        console.log(`Install loadscript done`);
      }
    }

    console.log(`Insert deleteScript`);
    await insertDeleteScript(deleteScript);
    console.log('Delete Card Manager Done');
    
    await insertLoadScript(loadScript);
    console.log('Load OTA Script Done');

    await insertScript(installScript, 'Install Script Failed!');

    if(await Helper.Other.isAvailable('A2')) await APDU.Other.finishUpdate(); // Hide update from the card
    await APDU.Other.closePower();
    // 4 check if SE exists and isCard recognized do backup;
    await selectOneFn();
    isAppletExist = await selectApplet();
    console.log(`isAppletExist: ${isAppletExist}`);
    if (isAppletExist) {
      // start recover backupData
      console.log(`Start checking recovery`);
      let {outputData } = await APDU.Other.checkBackupRecover();
      let isNeedRecover = (outputData=="01");
      console.log(`isNeedRecover: ${isNeedRecover}, outputData: ${outputData}`);
      if (isNeedRecover == true) {
        await recoverBackupData();
      }
    }
    console.log('Install OTA Script (SE Update) Done');

  } catch (e) {
    try {
      if(await Helper.Other.isAvailable('A2')) await APDU.Other.finishUpdate(); // Hide update from the card
    } catch(ex) {
      console.log('APDU.Other.finishUpdate Failed' + e);
    }
    Helper.Other.toSystemError(e, 'SE Update Failed', '00000',SRC_PATH,'SEUpdate')
  }
};

/**
 * Select Card Manager
 */
export const selectApplet = async () => {
  let isExist = false;
  try {
    const appletCommand = 'C1C2C3C4C5';
    const {status} = await APDU.OTA.selectCardManager(appletCommand);
    if (status == '9000') {
      isExist = true;
    }
    console.log(`selectApplet :${status}`);
    return isExist;
    // return {status: 'success', message: isExist};
  } catch (e) {
    Helper.Other.toSystemError(e, 'selectApplet Failed', '00000',SRC_PATH,'selectApplet')
  }
};

const selectOneFn = async () => {
  try {
    console.log(`before selectOneFn `);
    const selectOne = 'A000000151000000';
    await APDU.OTA.selectCardManager(selectOne);
    console.log(`after selectOneFn `);
  } catch (e) {
    let { message } = e;
    console.log(`selectOne Error ${message}`);
    console.log(e);
  }
};

const mutualAuthorization = async (cardId) => {
  try {
    console.log(`start mutual Authorization with cbx server: cardId ${cardId}`);
    const challengeUrl = `https://ota.cbx.io/api/challenge`;
    const challengeData = { cwid: cardId };
    const challengeObj = await getAuth(challengeUrl, challengeData);
    const challenge = challengeObj.outputData;
    console.log(`Challenge : ${challenge}`);

    const cryptogramUrl = `https://ota.cbx.io/api/cryptogram`;
    const cryptogramData = {cryptogram: challenge, cwid: cardId};
    await getAuth(cryptogramUrl, cryptogramData);
    console.log(`mutual Authorization Done`);
  } catch (e) {
    Helper.Other.toSystemError(e, 'mutualAuthorization Failed', '00000', SRC_PATH,'mutualAuthorization' )
  }
};

const insertScript = async (scriptHex, err) => {
  try {
    const scripts = await parseOTAScript(scriptHex);
    await Promise.each(scripts, async (script) => {
      const {CLA, INS, P1, P2, packets} = script;
      await APDU.OTA.cardRequest(CLA, INS, P1, P2, packets);
    });
    return;
  } catch (e) {
    throw err + e;
  }

};

const insertLoadScript = async (scriptHex) => {
  try {
    const scripts = await parseOTAScript(scriptHex);
    await Promise.each(scripts, async (script, index) => {
      const { CLA, INS, P1, P2, packets } = script;
      await APDU.OTA.cardRequest(CLA, INS, P1, P2, packets);
    });
    return;
  } catch (e) {
    throw SRC_PATH + ': ' + e;
  }
};

const insertDeleteScript = async (scriptHex) => {
  try {
    const scripts = await parseOTAScript(scriptHex);
    await Promise.each(scripts, async (script) => {
      const { CLA, INS, P1, P2, packets } = script;
      const { status } = await APDU.OTA.cardRequest(CLA, INS, P1, P2, packets, true);
      // Applet is not exits mean applet already deleted!
      if (status.toLowerCase() == "6a88" || status.toLowerCase() == "9000") {
        return;
      }
      throw "Delete failed"
    });
  } catch (e) {
    throw "Delete Script Failed! " + e;
  }

};

const checkRecoverScriptExist = async () => {
  try {
    console.log(`[checkRecoverScriptExist] data:`);
    const appletCommand = 'A1A2A3A4A5A6';
    const { status } = await APDU.OTA.selectCardManager(appletCommand);
    console.log(`[checkRecoverScriptExist] data: ${status}`);
    return status;
  } catch (e) {
    throw "Check Script Failed! " + e;
  }
};

const signDataWithAppKey = async (command) => {
  try {
    let cmdObj = COMMAND[`${command}`];
    let cmd = `${cmdObj.CLA}${cmdObj.INS}${cmdObj.P1}${cmdObj.P2}`;
    let nonce = await APDU.Other.getNonce();
    let appKey = await Helper.Other.getAppPrivkey()
    let result = Helper.Sign.sign(Buffer.from(`${cmd}${nonce.outputData}`,'hex'),appKey);
    return result.toString('hex');
  } catch (e) {
    let { message } = e;
    if (message) {
      console.log(message);
    } else {
      console.log(e);
    }
    throw e;
  }
};

const backupRegisterData = async () => {
  try {
    const command = 'BACKUP_REGISTER_DATA';
    let signedData = await signDataWithAppKey(command);
    let appId = await AsyncStorage.getItem('appId');
    await APDU.Other.sayHi(appId);
    let { status } = await APDU.Other.backupRegisterData(signedData);
    console.log('[backupRegisterData] status: ' ,status.toLowerCase());
    if (status.toLowerCase() == '9000') {
      await AsyncStorage.setItem(hasBackupFlag, 'true');
    }
    console.log(`[backupRegisterData] Done`)
  } catch(e) {
    if (e.message) {
      console.log('[backupRegisterData] fail:',e.message);
    }
    throw "backup Register data Failed " + e;
  }
};

const deleteBackupRegisterData = async () => {
  console.log(`Delete before Backup`);
  try {
    const command = 'DELETE_REGISTER_BACKUP';
    let signedData = await signDataWithAppKey(command);
    let appId = await AsyncStorage.getItem('appId');
    await APDU.Other.sayHi(appId);
    let { status } = await APDU.Other.deleteBackupRecover(signedData);
    console.log( '[deleteBackupRegisterData] status: ' ,status.toLowerCase());
  } catch(e) {
    if (e.message) {
      console.log('[deleteBackupRegisterData] fail:',e.message);
    }
    throw "backup Register data Failed " + e;
  }
};

const recoverBackupData = async () => {
  try {
    await APDU.Other.recoverRegisterData();
  } catch(e) {
    if (e.message) {
      console.log('[recoverBackupData] fail:',e.message);
    }
    throw "recover Backup data failed" + e;
  }
};

const parseOTAScript = async (OTAScript) => {
  const allApplet = OTAScript.split(/\n/);
  const parsedAPDU = await Promise.map(allApplet, (data, i) => {
    const CLA = data.slice(0, 2);
    const INS = data.slice(2, 4);
    const P1 = data.slice(4, 6);
    const P2 = data.slice(6, 8);
    const packets = data.slice(8);

    if (CLA != "80") throw `Problem in OTA Script in line ${i}`;
    return { CLA, INS, P1, P2, packets };
  });

  return parsedAPDU; 
};

const getAuth = (url, data) => {
  const secret = 'd579bf4a2883cecf610785c49623e1';
  // let payload = new TokenSigner('ES256K', secret).sign(data)
  // console.log(`signed token ${payload}`)
  
  let payload = jwt.sign(data, secret, {expiresIn: 60 * 60 * 24});
  console.log(`payload: ${payload}`)
  

  const body = {
    keyNum: '1',
    payload,
  };

  const options = {
    body: JSON.stringify(body),
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  return fetch(url, options)
    .then(async (result) => {
      // handle response result with
      let bodyText;
      try {
        bodyText = await result.json();
      } catch(e) {
        bodyText = await result.text();
      }
      console.log(`Server status ${result.status}`)
      if (result.status == 405) {
        console.log(`Mutaul Authentication Fail: ${result.status}`);
        throw `Mutaul Authentication Fail: ${result.status}`;
      }
      if (result.status != 200) {
        let { error } = bodyText;
        let message;
        if (error && error.message ) {
          message = bodyText.error.message;
        } else {
          message = bodyText;
        }
        console.log(`Server message ${JSON.stringify(message)}`);
        throw JSON.stringify(message);
      }
      return jwt.decode(bodyText.cryptogram);
    })
    .then((obj) => {
      console.log(`Server Auth Response : ${JSON.stringify(obj)}`);
      const { CLA, INS, P1, P2, packets } = obj;
      return APDU.OTA.cardRequest(CLA, INS, P1, P2, packets);
    });
};
