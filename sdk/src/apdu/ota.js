const request = require('./request.js');
const ble = require('./ble.js');

export const selectCardManager = (data) => {
  const command = 'SELECT_CARD_MANAGER';
  return request.requestBLE(command, data, true);
};

export const cardRequest = async (CLA, INS, P1, P2, packets, ignoreThrow) => {
  const apdu = ble.assemblyBytes(CLA, INS, P1, P2, packets);
  return request.requestAPDUV2(apdu, false, ignoreThrow);
};
