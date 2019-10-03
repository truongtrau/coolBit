import Promise from 'bluebird'
import {AsyncStorage} from 'react-native';
import {program_A, program_B, sig_A, sig_B} from './script'
import * as APDU from '../../apdu/';
import * as Helper from '../../helper/index'

const SRC_PATH = 'cws-sdk/src/update/Dfu/index.js';

/**
 * check if MCU need update.
 * @returns {Promise< Boolean >}
 */
export const checkUpdate = async () => {
  const info = await APDU.Dfu.getFWStatus();
  const fwStatus = info.outputData.slice(0, 4); //3900
  const fwVersion = info.outputData.slice(4, 12).toUpperCase()
  const programVersion = getUpdateVersion(fwStatus).toUpperCase()

  console.log(`getFWStatus, Parsing... \nfwStatus: ${fwStatus}\nfwVersion: ${fwVersion}\n updateVersion: ${programVersion} `)
  
  await AsyncStorage.setItem('MCUUpdateStatus', fwStatus);
  await AsyncStorage.setItem('CardMCUVersion', fwVersion);
  return programVersion > fwVersion
}

/**
 * Update MCU with script files.
 * @return {Promise}
 */
export const MCUUpdate = async () => {
  let sig;
  let program;
  try {
    /* pre-update */
    const mcuUpdateStatus = await AsyncStorage.getItem('MCUUpdateStatus');

    if (mcuUpdateStatus === '3900') {
      sig = sig_A;
      program = program_A;
    } else {
      sig = sig_B;
      program = program_B;
    }

    await APDU.Dfu.sendFWsign(sig);
    await APDU.Dfu.FWreset();

    /* FW update */
    const command = await assemblyDFUcommand(program);
    await executeDFU(command);

    const latestVersion = getUpdateVersion(mcuUpdateStatus);
    return latestVersion;

  } catch (e) {
    Helper.Other.toSystemError(e, 'MCU Update Failed', '00000',SRC_PATH, 'MCUUpdate')
  }
};

const executeDFU = async (DFUCmd) => {
  const {apduCmd} = DFUCmd
  const mcuLatestVersion = apduCmd[0].packets.slice(0, 8);
  await Promise.each(apduCmd, async (batch) => {
    const {p1, p2, packets} = batch;
    const { outputData, status } = await APDU.Dfu.FWupdate(p1, p2, packets)
    console.log(`FW Update result: ${status} - ${outputData}`);
    
  });
  return mcuLatestVersion;
};

const assemblyDFUcommand = (data) => {

  const packetLen = 2048 * 2;//hex length is double longer than bytes's
  let result = [];

  const packetNums = Math.ceil(data.length / packetLen);

  let srcPos = 0;
  let dstPos = 0;

  console.log('data length=' + data.length + '/ packetNums=' + packetNums);
  let p2 = (packetNums).toString(16);
  if (p2.length % 2 > 0)
    p2 = '0' + p2;

  for (let i = 0; i < packetNums; i++) {
    srcPos = packetLen * i;
    dstPos = (
      packetLen * (i + 1) >= data.length
        ? srcPos + data.length - packetLen * i
        : packetLen * (i + 1));

    let cmd = data.slice(srcPos, dstPos);

    let p1 = (i + 1).toString(16);
    if (p1.length % 2 > 0)
      p1 = '0' + p1;

    let obj = {
      'p1': p1,
      'p2': p2,
      'packets': cmd //packet
    };

    // put all ota data to native for executing loop ble command
    result.push(obj)
  }
  return { "apduCmd": result, "packetNums": packetNums };
};

/**
 * Decide to go Program A or Program B
 * @param {String} fwStatus 
 */
const getUpdateVersion = (fwStatus) => {
  let programVersion = "";
  if (fwStatus === '3900') {
    programVersion = program_A.slice(0, 8);
  } else {
    programVersion = program_B.slice(0, 8);
  }
  console.log(fwStatus === '3900'?`go program a`:`go program b`,` MCU upgrading to ${programVersion}`)
  return programVersion;
}
