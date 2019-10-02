import * as Helper from '../../helper'
import * as ethUtil from '../ethereum/ethereum_utils'
import * as bnbUtil from './binance_util'
import { convertObjectToSignBytes } from "./binance_util"


/**
 * Sign Binance Tranaction
 * @param {string} coinType 
 * @param {string} readType
 * @param {object} signObj 
 * @param {number} addressIndex 
 * @param {boolean} returnTx 
 * @param {string} publicKey
 * @return {string | object} transaction Hex or signature object { wcSignature, wcPublicKey }
 */
export const signTransaction = async (coinType, readType, signObj, addressIndex, returnTx, publicKey=undefined) =>{
  try{

    const keyId = Helper.Other.addressIndexToKeyId(coinType, addressIndex);
    let rawPayload = convertObjectToSignBytes(signObj) // .toString('hex');

    const dataForSE = ethUtil.prepareSEData(keyId, rawPayload, readType);

    const { derSig } = await ethUtil.sendDataToCoolWallet(dataForSE, '00', '00', null);
    publicKey = await Helper.Other.checkPublicKeyExist(coinType, addressIndex, publicKey);
    
    return await bnbUtil.generateRawTx(derSig, signObj, publicKey, returnTx);
  } catch (error){
      Helper.Other.toSystemError(error, 'BNB Transactino Error', '37010', '','signTransaction')
  }
}
