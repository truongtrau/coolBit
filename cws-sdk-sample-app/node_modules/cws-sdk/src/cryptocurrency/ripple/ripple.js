
const Promise = require('bluebird');
const rlp = require('rlp');
const COINTYPE = require('../../config/coinType')
import * as Helper from '../../helper'
import * as commonUtils from '../commonUtils'
import {generateRawTx} from './ripple_utils'
const SRC_FILE = 'cws-sdk/cryptocurrency/ripple/ripple.js'

export default class XRP {
  constructor(){
    this.coinType = COINTYPE.XRP.type
  }

  /**
   * sign Ripple Transaction.
   * @param {String} payload 
   * @param {Number} addressIndex 
   * @returns {String} signed transaction ready to be broadcast
   */
  async signTransaction(payload, addressIndex){
    try{
      const keyId = Helper.Other.addressIndexToKeyId(this.coinType, addressIndex)   
      let SEDataArray = []
      SEDataArray.push(Buffer.from('00','hex')) // inputId
      SEDataArray.push(Buffer.from('00','hex')) // signData
      SEDataArray.push(Buffer.from(this.coinType,'hex')) // coinType
      SEDataArray.push(Buffer.from(keyId,'hex')) //keyId
      SEDataArray.push(Buffer.from(payload,'hex'))
      
      let rlpData = rlp.encode(SEDataArray).toString('hex');
      const P1 = "00";
      const P2 = "00";
      const signature = await commonUtils.signForCoolWallet(rlpData, P1, P2)
      const encodedData = rlpData+signature
      const TxpPrepParams = [{encodedData, P1, P2 }]

      const encryptedSignatureArray = await commonUtils.getEncryptedSignature(TxpPrepParams, true)   
      const encryptedSignature = encryptedSignatureArray[0].encryptedSignature;
      const signatureKey = await commonUtils.getCWSEncryptionKey()
      const fullTransaction = await generateRawTx(encryptedSignature, signatureKey, payload);
      return fullTransaction
    }catch(error){
      Helper.Other.toSystemError(error, 'Ripple signTransaction Error', '35010', SRC_FILE, 'signTransaction')
    }
    
  }

  /**
   * @param {Number} addressIndex address index in BIP44 pointing to the target public key.
   * @returns {Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>}
   */
  async getPublicKey(addressIndex){
    const {accountPublicKey, accountChainCode} = await Helper.Other.getAccountExtKey(this.coinType, 0)
    return await Helper.Other.derivePubKey(accountPublicKey, accountChainCode, 0, addressIndex)
  }

}