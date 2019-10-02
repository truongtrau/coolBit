import * as DFU from './Dfu' 
import * as OTA from './OTA'
import * as Helper from '../helper'

/**
 * Check card SE and MCU version and check for updates
 * @returns {Promise< {updateMCU: Boolean, updateSE: Boolean}>}
 */
export const checkFirmwareUpdate = async() => {
    let updateMCU = await DFU.checkUpdate()
    let updateSE  = await OTA.checkUpdate()

    /* Special Case: need to update MCU first */
    let mcuVersion = await Helper.Other.getMCUVersion()
    updateSE = mcuVersion === "12031C08" ? false : updateSE

    return {updateMCU, updateSE}
}

/**
 * Main interface deal with firmware update
 * @param {String} cardId serial number of CoolWalletS
 * @param {Boolean} updateSE 
 * @param {Boolean} updateMCU
 */
export const firmwareUpdate = async(cardId, updateSE, updateMCU) => {
    if(updateSE===true){
        await OTA.SEUpdate(cardId)
        let newSEVersion = await Helper.Other.getSEVersion(true)
        console.log(`SE Update Completed. Upgraded to version ${newSEVersion}`)
    }
    if(updateMCU===true){
        let newMCUVersion = await DFU.MCUUpdate()
        console.log(`MCU Update Completed. Upgraded to version ${newMCUVersion}`)
    }
}