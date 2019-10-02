const COINTYPE = require('../../config/coinType')
import * as eosSign from './eos_sign'
import {Other} from '../../helper'

export default class EOS {
  constructor(chain_id){
    this.coinType = COINTYPE.EOS.type
    this.chain_id = (chain_id===undefined)? COINTYPE.EOS.chain_id :chain_id
    this.isTestnet = this.chain_id!=COINTYPE.EOS.chain_id
  }

  /**
   * sign EOS transfer.
   * @param {object} txObject 
   * @param {number} addressIndex 
   * @param {string} publicKey
   * @returns {object} signed transactino object ready to be broadcast with eosjs@16.0.9
   */
  async signTransfer(txObject, addressIndex, publicKey=undefined){
    await Other.versionCheck(86)
    return await eosSign.signTransfer(this.coinType, txObject, addressIndex, this.chain_id, publicKey, this.isTestnet);
  }

  /**
   * Get specific public key. CoolWalletS derives EOS public key with bip44 path. 
   * @param {number} addressIndex
   * @returns {Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>}
   */
  async getPublicKey(addressIndex){
    await Other.versionCheck(86)
    const {accountPublicKey, accountChainCode} = await Other.getAccountExtKey(this.coinType, 0)
    return await Other.derivePubKey(accountPublicKey, accountChainCode, 0, addressIndex)
  }
}