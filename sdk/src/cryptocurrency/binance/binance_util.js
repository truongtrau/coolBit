import bech32 from "bech32"
import vstruct from "varstruct"
import VarInt, { UVarInt } from "./varint"
import _ from "lodash"
import typeToTyp3 from "./encoderHelper"

import * as Helper from '../../helper'
import elliptic from 'elliptic';
const ec = new elliptic.ec('secp256k1');

/**
 * Get transaction object from payload and encrypted signature
 * @param {string} derSig
 * @param {string|object} rawTransaction 
 * @param {string} publicKey 
 * @returns {object} 
 */
export const generateRawTx = async (derSig, signObj, publicKey, returnTx=true) => {
  try {
    
    const parsedDERSignature = Helper.Sign.parseDERsignature(derSig);
    const canonicalSignature = Helper.Sign.getCanonicalSignature(parsedDERSignature);
    const pubKeyBuffer = new Buffer(publicKey, 'hex');
    let signPubKey = await getPublicKey(pubKeyBuffer)
    
    if(returnTx === false){
      let wcSignature = canonicalSignature.r + canonicalSignature.s
      let wcPublicKey = '04' + signPubKey.x.toString('hex') + signPubKey.y.toString('hex')
      return { wcSignature, wcPublicKey }
    }
    // Only SignTransfer go beyond this section

    // add signature => Buffer
    let pubKey = await serializePubKey(signPubKey)

    let signatures = [{
      pub_key: pubKey,
      signature: Buffer.from(canonicalSignature.r + canonicalSignature.s, "hex"),
      account_number: parseInt(signObj.account_number, 10),
      sequence: parseInt(signObj.sequence),
    }]

    // encode addresses in signObj.msg
    let encodedMsgs = signObj.msgs
    for(let msg of encodedMsgs) {
      for(let input of msg.inputs){
        input.address = decodeAddress(input.address)
      }
      for (let output of msg.outputs){
        output.address = decodeAddress(output.address)
      }
      msg.msgType = "MsgSend"
    }

    const stdTx = {
      msg: encodedMsgs,
      signatures: signatures,
      memo: signObj.memo,
      source: 1, // web wallet value is 1
      data: "",
      msgType: txType.StdTx
    }

    return await marshalBinary(stdTx).toString("hex")
  } catch (error) {
    throw "Binance Generate Raw Tx failed :" + error;
  }
}

const txType = {
  MsgSend: "MsgSend",
  NewOrderMsg: "NewOrderMsg",
  CancelOrderMsg: "CancelOrderMsg",
  StdTx: "StdTx",
  PubKeySecp256k1: "PubKeySecp256k1",
  SignatureSecp256k1: "SignatureSecp256k1",
}

const typePrefix = {
  MsgSend: "2A2C87FA",
  NewOrderMsg: "CE6DC043",
  CancelOrderMsg: "166E681B",
  StdTx: "F0625DEE",
  PubKeySecp256k1: "EB5AE987",
  SignatureSecp256k1: "7FC4A495",
}

const VarString = vstruct.VarString(UVarInt)

const sortObject = obj => {
  if (obj === null) return null
  if (typeof obj !== "object") return obj
  // arrays have typeof "object" in js!
  if (Array.isArray(obj))
    return obj.map(sortObject)
  const sortedKeys = Object.keys(obj).sort()
  const result = {}
  sortedKeys.forEach(key => {
    result[key] = sortObject(obj[key])
  })
  return result
}

/**
 * encode number
 * @param num
 */
const encodeNumber = (num) => UVarInt.encode(num)

/**
 * encode bool
 * @param b
 */
const encodeBool = (b) => b ? VarInt.encode(1) : VarInt.encode(0)

/**
 * encode string
 * @param str
 */
const encodeString = (str) => VarString.encode(str)


/**
 * js amino MarshalBinary
 * @param {Object} obj
 *  */
const marshalBinary = (obj) => {
  if (!_.isObject(obj))
    throw new TypeError("data must be an object")

  return encodeBinary(obj, null, true).toString("hex")
}

/**
 * This is the main entrypoint for encoding all types in binary form.
 * @param {*} js data type (not null, not undefined)
 * @param {number} field index of object
 * @param {bool} isByteLenPrefix
 * @return {Buffer} binary of object.
 */
const encodeBinary = (val, fieldNum, isByteLenPrefix) => {
  if (val === null || val === undefined)
    throw new TypeError("unsupported type")

  if (Buffer.isBuffer(val)) {
    if (isByteLenPrefix) {
      return Buffer.concat([UVarInt.encode(val.length), val])
    }
    return val
  }

  if (_.isPlainObject(val)) {
    return encodeObjectBinary(val, isByteLenPrefix)
  }

  if (_.isArray(val)) {
    return encodeArrayBinary(fieldNum, val, isByteLenPrefix)
  }

  if (_.isNumber(val)) {
    return encodeNumber(val)
  }

  if (_.isBoolean(val)) {
    return encodeBool(val)
  }

  if (_.isString(val)) {
    return encodeString(val)
  }

  return
}

/**
 * prefixed with bytes length
 * @param {Buffer} bytes
 * @return {Buffer} with bytes length prefixed
 */
const encodeBinaryByteArray = (bytes) => {
  const lenPrefix = bytes.length
  return Buffer.concat([UVarInt.encode(lenPrefix), bytes])
}

/**
 *
 * @param {Object} obj
 * @return {Buffer} with bytes length prefixed
 */
const encodeObjectBinary = (obj, isByteLenPrefix) => {
  const bufferArr = []

  Object.keys(obj).forEach((key, index) => {
    if (key === "msgType" || key === "version") return

    if (isDefaultValue(obj[key])) return

    if (_.isArray(obj[key]) && obj[key].length > 0) {
      bufferArr.push(encodeArrayBinary(index, obj[key]))
    } else {
      bufferArr.push(encodeTypeAndField(index, obj[key]))
      bufferArr.push(encodeBinary(obj[key], index, true))
    }
  })

  let bytes = Buffer.concat(bufferArr)

  // add prefix
  if (typePrefix[obj.msgType]) {
    const prefix = Buffer.from(typePrefix[obj.msgType], "hex")
    bytes = Buffer.concat([prefix, bytes])
  }

  // Write byte-length prefixed.
  if (isByteLenPrefix) {
    const lenBytes = UVarInt.encode(bytes.length)
    bytes = Buffer.concat([lenBytes, bytes])
  }

  return bytes
}

/**
 * @param {number} fieldNum object field index
 * @param {Array} arr
 * @param {bool} isByteLenPrefix
 * @return {Buffer} bytes of array
 */
const encodeArrayBinary = (fieldNum, arr, isByteLenPrefix) => {
  const result = []

  arr.forEach((item) => {
    result.push(encodeTypeAndField(fieldNum, item))

    if (isDefaultValue(item)) {
      result.push(Buffer.from("00", "hex"))
      return
    }

    result.push(encodeBinary(item, fieldNum, true))
  })

  //encode length
  if (isByteLenPrefix) {
    const length = result.reduce((prev, item) => (prev + item.length), 0)
    result.unshift(UVarInt.encode(length))
  }

  return Buffer.concat(result)
}

// Write field key.
const encodeTypeAndField = (index, field) => {
  const value = (index + 1) << 3 | typeToTyp3(field)
  return UVarInt.encode(value)
}

const isDefaultValue = (obj) => {
  if (obj === null) return false

  return (_.isNumber(obj) && obj === 0) || (_.isString(obj) && obj === "") || (_.isArray(obj) && obj.length === 0)
}


/**
 * @param {string} publicKey - Encoded public key
 * @return {Elliptic.PublicKey} public key hexstring
 */
const getPublicKey = publicKey => {
  let keyPair = ec.keyFromPublic(publicKey, "hex")
  return keyPair.getPublic()
}

/**
 * serializes a public key in a 33-byte compressed format.
 * @param {Elliptic.PublicKey} unencodedPubKey
 * @return {Buffer}
 */
const serializePubKey = (unencodedPubKey) => {
  let format = 0x2
  if (unencodedPubKey.y && unencodedPubKey.y.isOdd()) {
    format |= 0x1
  }

  let pubBz = Buffer.concat([
    UVarInt.encode(format),
    unencodedPubKey.x.toArrayLike(Buffer, "be", 32)
  ])
  // prefixed with length
  pubBz = encodeBinaryByteArray(pubBz)
  // add the amino prefix
  pubBz = Buffer.concat([Buffer.from("EB5AE987", "hex"), pubBz])
  return pubBz
}

/**
 * Decodes an address in bech32 format.
 * @param {string} value the bech32 address to decode
 */
const decodeAddress = (value) => {
  const decodeAddress = bech32.decode(value)
  return Buffer.from(bech32.fromWords(decodeAddress.words))
}

export const convertObjectToSignBytes = (obj) =>
  Buffer.from(JSON.stringify(sortObject(obj)))
