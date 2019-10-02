const COINTYPE = require('../../config/coinType')
import { Other } from '../../helper'
import * as bnbSign from './binance_sign'

export default class BNB{
  constructor(){
    this.coinType = COINTYPE.BNB.type
    this.readType = COINTYPE.BNB.READTYPE
  }

  /**
   * Sign Binance tansfer transaction.
   * @param {Object} signObj 
   * @param {Number} addressIndex 
   * @param {Boolean} returnTx return full transaction or signature only
   * @param {String} publicKey 
   */
  async signTransfer(signObj, addressIndex, returnTx=true, publicKey=undefined){
    await Other.versionCheck(86)
    let readType = this.readType.TRANSFER
    return await bnbSign.signTransaction(this.coinType, readType, signObj, addressIndex, returnTx, publicKey)
  }

  /**
   * Sign Order operation on Binance for Wallet Connect
   * @param {Object} signObj 
   * @param {Number} addressIndex 
   * @param {String} publicKey 
   * @return {Promise<{wcPublickey: string, wcSignature: string}>}
   */
  async makeOrder(signObj, addressIndex, publicKey=undefined){
    await Other.versionCheck(90)
    let readType = this.readType.ORDER
    return await bnbSign.signTransaction(this.coinType, readType, signObj, addressIndex, false, publicKey)
  }

  /**
   * Sign Cancel operation on Binance for Wallet Connect
   * @param {Object} signObj 
   * @param {Number} addressIndex 
   * @param {String} publicKey
   * @returns {Promise<{wcPublickey: string, wcSignature: string}>}
   */
  async cancelOrder(signObj, addressIndex, publicKey=undefined){
    await Other.versionCheck(90)
    let readType = this.readType.CANCEL
    return await bnbSign.signTransaction(this.coinType, readType, signObj, addressIndex, false, publicKey)
  }

  /**
   * @param {Number} addressIndex address index in BIP44 pointing to the target public key.
   * @returns {Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>}
   */
  async getPublicKey(addressIndex){
    await Other.versionCheck(86)
    const {accountPublicKey, accountChainCode} = await Other.getAccountExtKey(this.coinType, 0)
    return await Other.derivePubKey(accountPublicKey, accountChainCode, 0, addressIndex)
  }
}
