const COINTYPE = require('../../config/coinType')
import * as Helper from '../../helper'
import * as icxSign from './icon_sign'

export default class ICX{
  constructor(){
    this.coinType = COINTYPE.ICX.type
  }

  /**
   * Sign ICON Transaction. 
   * @param {object} rawTx 
   * @param {Number} addressIndex 
   * @param {String} publicKey
   * @returns {Promise<object>}
   */
  async signTransaction(rawTx, addressIndex, publicKey=undefined){
    await Helper.Other.versionCheck(84)
    return await icxSign.signTransaction(this.coinType, rawTx, addressIndex, publicKey)
  }

  /**
   * @param {Number} addressIndex address index in BIP44 pointing to the target public key.
   * @returns {Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>}
   */
  async getPublicKey(addressIndex){
    await Helper.Other.versionCheck(84)
    const {accountPublicKey, accountChainCode} = await Helper.Other.getAccountExtKey(this.coinType, 0)
    return await Helper.Other.derivePubKey(accountPublicKey, accountChainCode, 0, addressIndex)
  }
}