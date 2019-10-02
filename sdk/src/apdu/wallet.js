const request = require('./request.js');

export const setSeed = (data) => {
  const command = 'SET_SEED';
  return request.requestBLE(command, data);
};

export const authGetExtendedKey = (data) => {
  const command = 'AUTH_EXT_KEY';
  return request.requestBLE(command, data);
};

export const getAccountExtendedKey = (P1, P2) => {
  const command = 'GET_EXT_KEY';
  return request.requestBLE(command, null, null, P1, P2);
};

export const createWallet = (data) => {
  const command = 'CREATE_WALLET';
  return request.requestBLE(command, data);
};

export const finishBackup = (data) => {
  const command = 'FINISH_BACKUP';
  return request.requestBLE(command, data);
};

