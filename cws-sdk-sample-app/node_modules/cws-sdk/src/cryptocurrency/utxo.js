import utxolib from 'bitgo-utxo-lib'
const rlp = require('rlp');
import Promise from 'bluebird';
import * as Helper from '../helper'
import * as APDU from '../apdu'
import * as commonUtils from './commonUtils'
import {UTXO_COIN_ERROR_DOMAIN} from '../config/error'
const SRC_FILE = 'cws-sdk/cryptocurrency/utxo.js'

export const signUtxoTransaction = async (coinType, inputs, outputs, network, params, signType="P2WPKH") => { 
  try{
    let txb = new utxolib.TransactionBuilder(network)
    inputs.forEach(input => {
      txb.addInput(input.txId, input.vout)
    });
    outputs.forEach(output => {
      txb.addOutput(output.address, output.value)
    });

    let txOutputSent = false
    let TxpPrepParams = []
    await Promise.map(inputs, async(input, index) => {
      const {publicKey, redeemScript, value, addressIndex} = input
      let rawTx, outputScriptHex
      switch(signType){
        case "P2WPKH":
          var sigHash = txb.getSignatureHash(index, Buffer.from(publicKey, 'hex'), Buffer.from(redeemScript, 'hex'), params.HASHTYPE, value)
          rawTx = sigHash.rawTx
          outputScriptHex = sigHash.outputScriptHex
          break;
        case "P2PKH":
          var sigHash = txb.getSignatureHash(index, Buffer.from(publicKey, 'hex'), null, utxolib.Transaction.SIGHASH_ALL)
          rawTx = sigHash.rawTx
          outputScriptHex = sigHash.outputScriptHex
          break;
        case "BCH_P2PKH":
          var sigHash = txb.getSignatureHash(index, Buffer.from(publicKey, 'hex'), null, params.HASHTYPE, value);
          rawTx = sigHash.rawTx
          outputScriptHex = sigHash.outputScriptHex
          break;
      }
      const payload = '0x' + rawTx
      const signData = '0x00'
      const inputId = '0x' + Helper.Other.fitZero(index.toString(10), 2, "0", true);
      const readtype = '0x' + params.READTYPE
      const keyid = '0x' + Helper.Other.addressIndexToKeyId(coinType, addressIndex)
      
      let rlpData = [];
      rlpData.push(inputId, signData, readtype, keyid, payload);
      const encodedData = rlp.encode(rlpData).toString('hex')
      console.log(`payload ${payload}\nsigndata: ${signData}\ninputId: ${inputId} \nreadType ${readtype} \nkeyid: ${keyid}\nencoded RLP: ${encodedData}`)
      const sigForCWS = await commonUtils.signForCoolWallet(encodedData, "03", params.P2)
      if (!txOutputSent) {
        TxpPrepParams.push({'encodedData': outputScriptHex, 'P1':params.DISPLAY_P1 , 'P2':params.P2, publicKey})
        txOutputSent = true
      }
      TxpPrepParams.push({'encodedData': sigForCWS,   'P1':"02", 'P2':params.P2, publicKey})
      TxpPrepParams.push({'encodedData': encodedData, 'P1':"03", 'P2':params.P2, publicKey})
    })

    const encryptedSignature = await commonUtils.getEncryptedSignature(TxpPrepParams)
    const signatureKey = await commonUtils.getCWSEncryptionKey()

    const fullTransaction = await generateUtxoTransaction(txb, encryptedSignature, signatureKey, params.HASHTYPE);
    return fullTransaction
  }catch(err){
    let ERROR_DOMAIN = UTXO_COIN_ERROR_DOMAIN[coinType]
    let TX_ERROR_POSTFIX = '099'
    Helper.Other.toSystemError(err, 'UTXO Transaction Error.', ERROR_DOMAIN+TX_ERROR_POSTFIX, SRC_FILE, 'signUtxoTransaction')
  }
  
}

/**
 * Set change address's path to CoolWalletS.
 * @param {String} coinType
 * @param {Number} changeAddressIndex 
 * @param {String} redeemType 00 for P2PKH, 01 for P2WPKH
 * @returns {Promise<Boolean>}
 */
export const setChangeKeyid = async( coinType, changeAddressIndex, redeemType) => {
  try{
    let changeKeyId = Helper.Other.addressIndexToKeyId(coinType, changeAddressIndex)
    let isSupported = await Helper.Other.isAvailable('A4');
    if (isSupported) {
      console.log('Change is needed and SE Support change address verification');
      const command = 'SET_CHANGE_KEYID';
      const signature = await Helper.Other.generalAuthorization(command, changeKeyId, redeemType);
      const keyData = changeKeyId + signature;
      console.log(`Set keyId(${changeKeyId}) for change address`);
      await APDU.Transaction.setChangeKeyId(keyData, redeemType);
    }
    return true
  }catch(err){
    let ERROR_DOMAIN = UTXO_COIN_ERROR_DOMAIN[coinType]
    let SET_KEY = '097'
    Helper.Other.toSystemError(err, 'UTXO SetChagneKeyId Error', ERROR_DOMAIN+SET_KEY, SRC_FILE, 'setChangeKeyid')
  }
  
}

/** 
 * @description Combines Signature to and generates Raw Transaction
 * @param {TransactionBuilder} txBuilder
 * @param {Array<>} encryptedSignatureArray
 * @param {String} signatureKey
 * @param {Number} hashType
 * @return {Promise <String>} Transaction Hex
 */ 
const generateUtxoTransaction = async (txBuilder, encryptedSignatureArray, signatureKey, hashType) => {
  try {
    hashType = Helper.Other.fitZero(hashType.toString(16), 2, '0', true)
    await Promise.map(encryptedSignatureArray, (sig, i) => {
      const {encryptedSignature, publicKey} = sig
      let iv = Buffer.alloc(16);
      iv.fill(0);
      const DERsignature = Helper.Sign.aes256CbcDecrypt(iv, Buffer.from(signatureKey, 'hex'), encryptedSignature);
      let btc_sig = Helper.Sign.parseDERsignature(DERsignature.toString('hex'));
      let canonicalSignature = Helper.Sign.getCanonicalSignature(btc_sig);
      const derCanonicalSignature = Helper.Sign.convertToDER(canonicalSignature) + hashType
      txBuilder.addSignature(i, Buffer.from(publicKey, 'hex'), derCanonicalSignature);
    })
    const serialized_tx = txBuilder.build()
    return serialized_tx.toHex()
  } catch (e) {
    throw 'Generate utxo transaction error: ' + e
  }
}
