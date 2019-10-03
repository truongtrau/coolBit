import {Sign} from '../../helper'
const sha3_256 = require("js-sha3").sha3_256;
import { handleHex } from "./../ethereum/ethereum_utils"
const elliptic = require("elliptic");
const ec = new elliptic.ec("secp256k1");

/**
 * Get transaction object from payload and encrypted signature
 * @param {string} derSig
 * @param {string|object} payload 
 * @param {string} publicKey 
 * @returns {object} 
 */
export const generateRawTx = async (derSig, payload, publicKey) => {
  try {
    const phraseToSign = generateHashKey(payload);
    const signature = await generateCanonicalSig(derSig, phraseToSign, publicKey); //signature and recovery
    const b64encoded = Buffer.from(signature, "hex").toString("base64");

    let transaction;
    if (typeof payload === "object") transaction = payload;
    else transaction = JSON.parse(payload);
    transaction.signature = b64encoded;
    console.log(`icx transaction: ${JSON.stringify(transaction)}`)
    return transaction;
  } catch (error) {
    throw "generateRawTx Error: " + error
  }
};

export function generateHashKey(obj) {
  let jsonObject;
  try {
    jsonObject = JSON.parse(obj);
  } catch (error) {
    jsonObject = obj;
  }

  let resultStrReplaced = "";
  let resultStr = objTraverse(jsonObject);
  resultStrReplaced = resultStr.substring(1).slice(0, -1);
  const result = "icx_sendTransaction." + resultStrReplaced;
  return result;
}

function objTraverse(obj) {
  let result = "";
  result += "{";
  let keys;
  keys = Object.keys(obj);
  keys.sort();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    switch (true) {
      case value === null: {
        result += `${key}.`;
        result += String.raw`\0`;
        break;
      }
      case typeof value === "string": {
        result += `${key}.`;
        result += escapeString(value);
        break;
      }
      case Array.isArray(value): {
        result += `${key}.`;
        result += arrTraverse(value);
        break;
      }
      case typeof value === "object": {
        result += `${key}.`;
        result += objTraverse(value);
        break;
      }
      default:
        break;
    }
    result += ".";
  }
  result = result.slice(0, -1);
  result += "}";
  return result;
}

function arrTraverse(arr) {
  let result = "";
  result += "[";
  for (let j = 0; j < arr.length; j++) {
    const value = arr[j];
    switch (true) {
      case value === null: {
        result += String.raw`\0`;
        break;
      }
      case typeof value === "string": {
        result += escapeString(value);
        break;
      }
      case Array.isArray(value): {
        result += arrTraverse(value);
        break;
      }
      case typeof value === "object": {
        result += objTraverse(value);
        break;
      }
      default:
        break;
    }
    result += ".";
  }
  result = result.slice(0, -1);
  result += "]";
  return result;
}

function escapeString(value) {
  let newString = String.raw`${value}`;
  newString = newString.replace("\\", "\\\\");
  newString = newString.replace(".", "\\.");
  newString = newString.replace("{", "\\{");
  newString = newString.replace("}", "\\}");
  newString = newString.replace("[", "\\[");
  newString = newString.replace("]", "\\]");
  return newString;
}

const generateCanonicalSig = async (derSig, payload, compressedPubkey) => {
  try {
    let keyPair = ec.keyFromPublic(compressedPubkey, 'hex');
    let sig_obj = Sign.parseDERsignature(derSig);
    let canonicalSignature = Sign.getCanonicalSignature(sig_obj);
    
    console.log(`canonicalSignature : ${JSON.stringify(canonicalSignature)}`);

    const hashcode = sha3_256.update(payload).hex();
    const data = Buffer.from(handleHex(hashcode), "hex");
    
    // get v
    let recoveryParam = ec.getKeyRecoveryParam(data, canonicalSignature, keyPair.pub);
   

    let v;
    if (recoveryParam === 0) {
      v = "00";
    } else if (recoveryParam === 1) {
      v = "01";
    } else {
      throw "generateCanonicalSig failed unexpected value of recoveryParam: " + recoveryParam
    }
    let r = canonicalSignature.r; //string
    let s = canonicalSignature.s; //string
    
    return r + s + v;

  } catch (error) {
    throw 'generateCanonicalSig failed: ' + error
  }
};

