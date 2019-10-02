import {Sign} from '../../helper'
import * as commonUtils from '../commonUtils'

/** 
 * @description Combines Signature to and generates Raw Transaction
 * @param {String} encryptedSignature
 * @param {String} signatureKey
 * @param {String} payload
 * @return {Promise <String>} Transaction Hex
 */ 
export const generateRawTx = async (encryptedSignature, signatureKey, payload) => {
  try {
    const DERSignature = commonUtils.decryptDataFromCoolWallet(encryptedSignature, signatureKey)
    const parsedDERSignature = Sign.parseDERsignature(DERSignature);
    const canonicalSignature = Sign.getCanonicalSignature(parsedDERSignature);
    const DERCanonicalSignature = Sign.convertToDER(canonicalSignature).toUpperCase();

    payload = payload.slice(8); // Remove Hash Prefix
    
    // var payloadHead = payload.slice(0, 84) // 12 0000 22 80000000 24 0000001F 2E 00000000 20 1B02BE032E 6140000000002A9270 68 400000000000000C
    var payloadBody = payload.slice(84)

    if(payloadBody.slice(0,2) != '73') throw 'Slicing XRP Payload Error, expect 73(signing PublicKey Header)'
    let pubKeyLen = parseInt(payloadBody.slice(2,4), 16)*2
    console.log(`Len of sining pubkey: ${pubKeyLen}`)
    
    let payloadPre = payload.slice(0, 88+pubKeyLen) // before signingPubKey
    let payloadPost = payload.slice(88+pubKeyLen)   // after, including [account, destination]

    if(payloadPost.length != 88 || payloadPost.slice(0,2)!='81') throw `Slicing error: wrong cut of postfix ${payloadPost}`
    
    let signatureHeader = '74'
    let sigLen = DERCanonicalSignature.length/2
    let sigHexLen = sigLen.toString(16)

    let sigHex = signatureHeader + sigHexLen + DERCanonicalSignature
    let fullTx = payloadPre + sigHex + payloadPost
    return fullTx

  } catch (e) {
    throw "Ripple Generate Raw transaction Failed" + e;
  }
}