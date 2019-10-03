import * as Helper from '../../helper'
import * as icxUtil from './icon_utils'
import * as ethUtil from '../ethereum/ethereum_utils'

/**
 * Sign ICON Transaction
 * @param {string} coinType 
 * @param {object|string} rawTx 
 * @param {number} addressIndex 
 * @param {string} publicKey 
 */
export const signTransaction = async (coinType, rawTx, addressIndex, publicKey=undefined) =>{
    try{
        const keyId = Helper.Other.addressIndexToKeyId(coinType, addressIndex);
        const phraseToSign = icxUtil.generateHashKey(rawTx);
        const rawPayload = Buffer.from(phraseToSign, "utf-8");
        const dataForSE = ethUtil.prepareSEData(keyId, rawPayload, coinType);
        const { derSig, cancel } = await ethUtil.sendDataToCoolWallet(dataForSE, '00', '00', null);
        if (cancel) return;
        
        publicKey = await Helper.Other.checkPublicKeyExist(coinType, addressIndex, publicKey)
        const txObject = await icxUtil.generateRawTx(derSig, rawTx, publicKey);
        return txObject;   
    }catch(error){
        Helper.Other.toSystemError(error, 'ICON Transactino Error', '37010', '','signTransaction')
    }
}
