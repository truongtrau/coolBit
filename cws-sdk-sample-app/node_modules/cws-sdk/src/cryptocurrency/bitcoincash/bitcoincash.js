const utxolib = require('bitgo-utxo-lib')
const COINTYPE = require('../../config/coinType.js');
import * as Helper from '../../helper'
import * as utxoUtils from '../utxo'

export default class BCH{
  constructor(){
    this.coinType = COINTYPE.BCH.type
    this.network = utxolib.networks.bitcoincash
    this.PARAMS = COINTYPE.BCH.PARAMS
  }

  /**
   * @param {Array<{txId:String, vout:Number, value:Number, publicKey:String, addressIndex:Number}>} inputs 
   * @param {Array<{address:String, value:Number}>} outputs 
   * @param {Number} changeAddressIndex 
   * @returns {Promise<String>} the signed transaction ready to be broadcast.
   */
  async signP2PKH(inputs, outputs, changeAddressIndex){
    await utxoUtils.setChangeKeyid(this.coinType, changeAddressIndex, this.PARAMS.P2PKH.REDEEMTYPE)
    const fullTransactionHex = await utxoUtils.signUtxoTransaction(this.coinType, inputs, outputs, this.network, this.PARAMS.P2PKH, "BCH_P2PKH") // some hacking
    return fullTransactionHex
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
