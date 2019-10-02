const zencashjs = require('zencashjs');
import COINTYPE from '../../config/coinType';
const rlp = require('rlp');
const zcrypto = require('zencashjs').crypto;
import * as Helper from '../../helper'
import * as commonUtils from '../commonUtils'
import * as uxtoUtils from '../utxo'
import Promise from 'bluebird'
const SRC_FILE = 'cws-sdk/cryptocurrency/zencash.js'

export default class ZEN{
  constructor(){
    this.PARAMS = COINTYPE.ZEN.PARAMS
    this.coinType = COINTYPE.ZEN.type
    console.log('construct ZEN')
  }

  /**
   * sign ZEN P2PKH transaction
   * @param {Array<{txId: string, vout: number, value: number, scriptPubKey: string, publicKey: string, addressIndex: number}>} inputs 
   * @param {Array<{address: string, satoshis: number}>} outputs 
   * @param {Number} changeAddressIndex 
   * @param {Number} blockHeight 
   * @param {String} blockHash 
   * @returns {Promise<String>} signed ZEN transaction ready to be broadcast.
   */
  async signTransaction(inputs, outputs, changeAddressIndex, blockHeight, blockHash){
    try{
      await uxtoUtils.setChangeKeyid(this.coinType, changeAddressIndex, "00")
      let _txObj = []
      let TxpPrepParams = []
      let txOutputSent = false
      await Promise.map(inputs, async (input, index) => { 
        let {txid,  vout, scriptPubKey, publicKey, addressIndex} = input
        let txobj = zencashjs.transaction.createRawTx(
          [
            {
              txid: txid,
              vout: vout,
              scriptPubKey: scriptPubKey
            }
          ], outputs,
          blockHeight,
          blockHash
        )
        _txObj.push(txobj);
        const signatureHash = zencashjs.transaction.getSignData(txobj)
        const startTxoutIndex = signatureHash.indexOf("ffffffff") + 2 + 8 //length + sequence
        const endTxoutIndex = signatureHash.length - 8 - 8 //sighHash Type + blockTime
        const txouts = signatureHash.slice(startTxoutIndex, endTxoutIndex);
    
        const payload = '0x' + signatureHash.toString('hex');
        const signData = '0x' + zcrypto.sha256x2(Buffer.from(signatureHash, 'hex')).toString('hex');
        const inputId = '0x' + Helper.Other.fitZero(index.toString(10), 2, "0", true);
        const readtype = '0x' + this.PARAMS.READTYPE
        const keyid = '0x' + Helper.Other.addressIndexToKeyId(this.coinType, addressIndex)

        let rlpData = [];
        rlpData.push(inputId, signData, readtype, keyid, payload);
        const encodedData = rlp.encode(rlpData).toString('hex')
        const signature = await commonUtils.signForCoolWallet(encodedData, "00", this.PARAMS.P2)
        
        if(!txOutputSent){
          TxpPrepParams.push({'encodedData': txouts, "P1":this.PARAMS.DISPLAY_P1 , "P2":this.PARAMS.P2, publicKey})
          txOutputSent = true
        }
        const assembleTx = assemblyCommand(encodedData.toString('hex') + signature.toString('hex'));
        const assembleTxLen = assembleTx.length
        assembleTx.forEach(function (data, idx) {
          P1 = "00";
          P2 = (idx + 1 == assembleTxLen) ? "8" + assembleTx.length : Helper.Other.fitZero((idx + 1).toString(10), 2, "0", true); // bit 8 = end batch;the next bit = total batch
          TxpPrepParams.push({'encodedData': data, P1, P2, publicKey})
        });
      })

      const encryptedSignatureArr = await commonUtils.getEncryptedSignature(TxpPrepParams)
      const signatureKey = await commonUtils.getCWSEncryptionKey()

      const fullTransaction = await generateRawTx(encryptedSignatureArr, signatureKey, _txObj);
      return fullTransaction
    }catch(error){
      Helper.Other.toSystemError(error, 'Horizen Transaction Error', '36010', SRC_FILE, 'signTransaction')
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

/** 
 * @description Combines Signature to and generates Raw Transaction
 * @param {Array<{encryptedSignature:String, publicKey:String}>} encryptedSignatureArray
 * @param {String} signatureKey
 * @return {Promise<String>} Transaction Hex
 */ 
const generateRawTx = async (encryptedSignatureArray, signatureKey, txObj) => {
  try {
    const SIGN_HASH_SINGLE = "81"
    const tx = await Promise.map(encryptedSignatureArray, (sig, i) => {
      const {encryptedSignature, publicKey} = sig
      let iv = Buffer.alloc(16);
      iv.fill(0);
      const DERsignature = Helper.Sign.aes256CbcDecrypt(iv, Buffer.from(signatureKey, 'hex'), encryptedSignature);

      let zenSig = Helper.Sign.parseDERsignature(DERsignature.toString('hex'));
      let canonicalSignature = Helper.Sign.getCanonicalSignature(zenSig);
      const derCanonicalSignature = Helper.Sign.convertToDER(canonicalSignature) + SIGN_HASH_SINGLE

      return zencashjs.transaction.inputSignature(txObj[i], i, derCanonicalSignature, publicKey);//(_txObj, i,scriptSig, pubKey)
    });
    const txs = zencashjs.transaction.assemblMultipleIns(tx);
    const serialized_tx = zencashjs.transaction.serializeTx(txs)
  
    return serialized_tx

  } catch (e) {
    throw "ZenCash Generate Transaction Failed" + e;
  }
}

const assemblyCommand = (data) => {
  const dataLen = data.length;
  const limitedLen = 500;
  const cmdBatchNums = Math.ceil(dataLen / limitedLen);
  let result = []
  for (let i = 0; i < cmdBatchNums; i++) {
    let startSlite = limitedLen * i
    let endtSlite = limitedLen * (i + 1)
    const batch = data.slice(startSlite, endtSlite)
    result.push(batch)
  }
  return result;
}
