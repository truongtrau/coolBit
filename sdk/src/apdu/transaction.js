import * as request from './request.js';

export const prepTx = (data, P1, P2, isTestnet=false) => {
  const command = isTestnet ? 'TX_PREPARE_FOR_TESTNET' : 'TX_PREPARE';
  return request.requestBLE(command, data, null, P1, P2);
}

export const finishPrepare = () => {
  const command = 'FINISH_PREPARE';
  return request.requestBLE(command);
}

export const getSignatureKey = (data) => {
  const command = 'GET_TX_KEY';
  return request.requestBLE(command, data);
}

export const clearTransaction = () => {
  const command = 'CLEAR_TX';
  return request.requestBLE(command);
}

export const getTxDetail = () => {
  const command = 'GET_TX_DETAIL';
  return request.requestBLE(command);
}

export const setToken = (data) => {
  const command = 'SET_TOKEN';
  return request.requestBLE(command, data);
}

export const setCustomToken = (data) => {
  const command = 'SET_TOKEN';
  return request.requestBLE(command, data, null, "04", "18");
};

export const setChangeKeyId = (data, P1) => {
  const command = 'SET_CHANGE_KEYID';
  return request.requestBLE(command, data, null, P1);
}

