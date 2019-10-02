const request = require('./request.js');
const ble = require('./ble.js');

export const registerDevice = (data, P1) => {
  const command = 'REGISTER';
  return request.requestBLE(command, data, null, P1);
};

export const resetPair = () => {
  const command = 'RESET_PAIR';
  return request.requestBLE(command);
};

export const sayHi = (data, ignoreThrow) => {
  const command = 'SAY_HI';
  return request.requestBLE(command, data, ignoreThrow);
};
export const getNonce = () => {
  const command = 'GET_NONCE';
  return request.requestBLE(command);
};

/* DD */
export const getCardInfo = () => {
  const command = 'GET_CARD_INFO';
  return request.requestBLE(command);
};

export const startUpdate = () => {
  const command = 'START_UPDATE';
  return request.requestBLE(command);
};

export const finishUpdate = () => {
  const command = 'FINISH_UPDATE';
  return request.requestBLE(command);
};

export const closePower = () => {
  const command = 'CLOSE_PWR';
  return request.requestBLE(command);
};

export const updateBalance = (data) => {
  const command = 'UPDATE_BALANCE';
  return request.requestBLE(command, data);
};

export const getPairPassword = (data) => {
  const command = 'GET_PAIR_PWD';
  return request.requestBLE(command, data);
};

export const updateKeyId = (data, P1) => {
  const command = 'UPDATE_KEYID';
  return request.requestBLE(command, data, null, P1);
};

export const getLastKeyId = (P1) => {
  const command = 'GET_KEYID';
  return request.requestBLE(command,null,null,P1);
};

export const changePairStatus = (data, P1) => {
  const command = 'CHANGE_PAIR_STATUS';
  return request.requestBLE(command, data, null, P1);
};

export const getPairedDevices = (data) => {
  const command = 'GET_PAIRED_DEVICES';
  return request.requestBLE(command, data);
};

export const removePairedDevice = (data) => {
  const command = 'REMOVE_DEVICES';
  return request.requestBLE(command, data);
};

export const renamePairedDevice = (data) => {
  const command = 'RENAME_DEVICES';
  return request.requestBLE(command, data);
};

export const showFullAddress = (data, P1) => {
  const command = 'SHOW_FULL_ADDRESS';
  return request.requestBLE(command, data, null, P1);
};

export const getSEVersion = () => {
  const command = 'GET_SE_VERSION';
  return request.requestBLE(command);
};

export const cancelAPDU = () => {
  const command = 'CANCEL_APDU';
  return request.requestBLE(command);
};

export const echo = () => {
  const command = 'ECHO';
  const packets = '99001122334455667788991122334455667788';
  return request.requestBLE(command, packets);
};

export const APDUTest = (cla, ins, p1, p2, packets) => {
  try {
    const apdu = ble.assemblyBytes(cla, ins, p1, p2, packets);
    return request.requestAPDUV2(apdu);
  } catch (e) {
    throw e;
  }
};

export const backupRegisterData = (data) => {
  const command = 'BACKUP_REGISTER_DATA';
  return request.requestBLE(command, data);
};

export const recoverRegisterData = () => {
  const command = 'RECOVER_REGISER_DATA';
  return request.requestBLE(command);
};

export const checkBackupRecover = () => {
  const command = 'CHECK_BACKUP_RECOVER';
  return request.requestBLE(command);
};

export const deleteBackupRecover = (data) => {
  const command = 'DELETE_REGISTER_BACKUP';
  return request.requestBLE(command, data);
};

