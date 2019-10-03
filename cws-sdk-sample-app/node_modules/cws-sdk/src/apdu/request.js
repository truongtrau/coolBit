const APDUCONFIG = require('../config/apdu.js');
const COMMAND = require('../config/command.js')
const ble = require('./ble.js');
import cwsble from 'cwsble';
const { RESPONSE, DFU_RESPONSE } = APDUCONFIG;

/**
 * Execute Bluethooth Command.
 * @param {command, data} apdu 
 * @param {string} commandType 'MCU_CMD' or null
 * @param {boolean} ignoreThrow 
 */
export const requestAPDUV2 = async (apdu, commandType, ignoreThrow) => {
	try {
		const eventName = !!commandType ? commandType : "BLE_CMD";	
		const req = {
			'event': eventName,
			status: 'success',
			data: {
			  command: apdu.command,
			  packets: apdu.data
			}
		}
		// console.log(`APDU: ${JSON.stringify(req)}`);
		let {response} = await cwsble.addRequest(req);
		
		if(eventName==='BLE_CMD'){
			let status = response.slice(-4)
			let outputData = response.slice(0, -4)
			if(status != RESPONSE.SUCCESS && status != RESPONSE.CANCELED && !ignoreThrow){
				console.log(`error on apdu: ${apdu.command}`)
				throw status;
			}
			return {status, outputData}
		}else{ 
			let status = response.slice(4, 6)
			let outputData = response.slice(6)
			if(status===DFU_RESPONSE.RECHARGING_ERROR) throw 'Please insert your card into the charger to initiate the update.'
			else if(status!=DFU_RESPONSE.SUCCESS) throw `MCU_CMD Error: ${status} `
			return {status, outputData}
		}
	} catch (e) {
		throw e;
	}
}

export const requestBLE = async (commandName, data, ignoreThrow, params1, params2) => {
  console.log(`APDU through requestBLE ${commandName}`)
  const commandParams = COMMAND[commandName];
  try {
    const P1 = !!params1 ? params1 : commandParams.P1;
    const P2 = !!params2 ? params2 : commandParams.P2;

    const apdu = ble.assemblyBytes(commandParams.CLA, commandParams.INS, P1, P2, data);
    const result = await requestAPDUV2(apdu, null, ignoreThrow);

    return result;
  } catch (errorCode) {
		throw `CWSError-${commandName}-${errorCode}`
  }
}
