import {Other} from '../../helper'
import * as ethUtil from '../ethereum/ethereum_utils'
import { convertToSignature } from './sig_utils';
import { genSignBuf, genSignedTxV1 } from './eos_utils';

/**
 * sign EOS transfer (1 transfer action)
 * @param {string} coinType eos cointype
 * @param {objectg} txObject 
 * @param {number} addressIndex
 * @param {string} chain_id  
 * @param {string?} publicKey publickey mapping from address index
 * @param {boolean?} isTestnet 
 */
export const signTransfer = async (coinType, txObject, addressIndex, chain_id, publicKey=undefined, isTestnet=false) => {
   try{
      const keyId = Other.addressIndexToKeyId(coinType, addressIndex);
      const signBuf  = genSignBuf(txObject, chain_id);
      const dataForSE = ethUtil.prepareSEData(keyId, signBuf, 'f6');
      
      const { derSig, cancel } = await ethUtil.sendDataToCoolWallet(dataForSE, '00', '00', null, isTestnet);
      if (cancel) return;
      
      publicKey = await Other.checkPublicKeyExist(coinType, addressIndex, publicKey)

      const signature = convertToSignature(derSig, signBuf, publicKey);
      const signedTransaction = genSignedTxV1(txObject, signature)
      return signedTransaction;
   } catch(error){
      Other.toSystemError(error, 'EOS SignTransaction Error.' + error, '39010', 'eos_sign.js', 'signTransaction')
   }   
}

