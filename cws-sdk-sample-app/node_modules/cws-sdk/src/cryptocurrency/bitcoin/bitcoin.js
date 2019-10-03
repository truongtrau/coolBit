const utxolib = require('bitgo-utxo-lib')
const COINTYPE = require('../../config/coinType.js');
import * as Helper from '../../helper'
import * as utxoUtils from '../utxo'

export default class BTC {
  constructor(isOmni=false){
    this.coinType = COINTYPE.BTC.type
    this.network = utxolib.networks['bitcoin']
    this.isOmni = isOmni
    this.PARAMS = isOmni? COINTYPE.OMNI.PARAMS : COINTYPE.BTC.PARAMS
  }

  /**
   * @param {Number} addressIndex address index in BIP44 pointing to the target public key.
   * @returns {Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>}
   */
  async getPublicKey(addressIndex){
    const {accountPublicKey, accountChainCode} = await Helper.Other.getAccountExtKey(this.coinType, 0)
    return await Helper.Other.derivePubKey(accountPublicKey, accountChainCode, 0, addressIndex)
  }

  /**
   * @param {Array<{txId:String, vout:Number, value:Number, redeemScript:String, publicKey:String, addressIndex:Number}>} inputs 
   * @param {Array<{address:String, value:Number}>} outputs 
   * @param {Number} changeAddressIndex 
   * @returns {Promise<String>} the signed transaction ready to be broadcast.
   */
  async signP2WPKH(inputs, outputs, changeAddressIndex){
    if(this.isOmni) await Helper.Other.versionCheck(86)
    await utxoUtils.setChangeKeyid(this.coinType, changeAddressIndex, this.PARAMS.P2WPKH.REDEEMTYPE )
    const fullTransactionHex = await utxoUtils.signUtxoTransaction(this.coinType, inputs, outputs, this.network, this.PARAMS.P2WPKH, "P2WPKH")
    return fullTransactionHex
  }

  
  /**
   * @param {Array<{txId:String, vout:Number, value:Number, publicKey:String, addressIndex:Number}>} inputs 
   * @param {Array<{address:String, value:Number}>} outputs 
   * @param {Number} changeAddressIndex 
   * @returns {Promise<String>} the signed transaction ready to be broadcast.
   */
  async signP2PKH(inputs, outputs, changeAddressIndex){
    if(this.isOmni) await Helper.Other.versionCheck(86)
    await utxoUtils.setChangeKeyid(this.coinType, changeAddressIndex, this.PARAMS.P2PKH.REDEEMTYPE)
    const fullTransactionHex = await utxoUtils.signUtxoTransaction(this.coinType, inputs, outputs, this.network, this.PARAMS.P2PKH, "P2PKH")
    return fullTransactionHex
  }
}