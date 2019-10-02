const bip66 = require('bip66');
const BN = require('bn.js');
const crypto = require('crypto')
const Util = require('./other.js');
const KeyEncoder = require('key-encoder');
const keyencoder = new KeyEncoder('secp256k1');
const Buffer = require('buffer').Buffer

/**
 * @description
 * @param {String} signature derSig hex string
 */
exports.parseDERsignature = (signature) => {
  let obj = {};
  const index = parseInt(signature.slice(0, 4));
  if (index == 3045) {
    if (signature.slice(7, 8) == '1') {
      obj.r = signature.slice(10, 74);
      obj.s = signature.slice(78);
    } else {
      obj.r = signature.slice(8, 72);
      obj.s = signature.slice(78);
    }
  } else if (index == 3046) {
    obj.r = signature.slice(10, 74);
    obj.s = signature.slice(80)
  } else {
    obj.r = signature.slice(8, 72)
    obj.s = signature.slice(76)
  }
  return obj;
};

exports.convertToDER = (sig) => {
  let r = Buffer.from(sig.r, 'hex');
  let s = Buffer.from(sig.s, 'hex');
    
  const canSBuffer = Buffer.from(s, 'hex');
  const canRBuffer = Buffer.from(r, 'hex');
  if ((canSBuffer[0] & 0x80)) {
    const buf = Buffer.alloc(1);
    const temp = Buffer.concat([buf, canSBuffer], canSBuffer.length + 1);
    s = temp
  }
  if ((canRBuffer[0] & 0x80)) {
    const buf = Buffer.alloc(1);
    const temp = Buffer.concat([buf, canRBuffer], canRBuffer.length + 1);
    r = temp
  }
  
  const derSignature = bip66.encode(r, s).toString('hex')
  return derSignature
}

exports.getCanonicalSignature = (signature) => {
  try {
    let canonicalS, canonicalR;
    const modulusString = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'
    const modulus = new BN(modulusString, 16);
    const s = new BN(signature.s, 16);
    const r = new BN(signature.r, 16);
    const T = modulus.sub(s);

    if (s.ucmp(T) < 0) {
      canonicalS = s.toString(16);
    } else {
      canonicalS = T.toString(16);
    }

    const slength = canonicalS.length % 2 == 0 ? canonicalS.length : canonicalS.length + 1;
    canonicalS = Util.fitZero(canonicalS, slength, '0', true);
    let rBigNumber = r.toString(16);

    const rlength = rBigNumber.length % 2 == 0 ? rBigNumber.length : rBigNumber.length + 1;
    canonicalR = Util.fitZero(rBigNumber, rlength, '0', true);

    const canonicalSignature = {
      r: canonicalR,
      s: canonicalS
    };

    return canonicalSignature;
  } catch (e) {
    throw "Get Canonical Signature Failed"
  }
};

exports.sign = (data, rawpriv) => {
  try {
    const sign = crypto.createSign('sha256')
    data = Buffer.from(data, 'hex');
    sign.update(data);
    const privateKey = keyencoder.encodePrivate(rawpriv, 'raw', 'pem');
    const signature = sign.sign(privateKey);
    return signature;
  } catch (e) {
    throw `Failed to Sign: ${e}`;
  }
}

exports.ECIESenc = (recipientPubKey, msg) => {
  try {
    msg = Buffer.from(msg, 'hex')
    const ephemeral = crypto.createECDH('secp256k1')
    const ephemeralKey = ephemeral.generateKeys()
    const sharedSecret = ephemeral.computeSecret(Buffer.from(recipientPubKey, 'hex'), null, 'hex')
    const hashedSecret = sha512(Buffer.from(sharedSecret, 'hex'))
    const encryptionKey = hashedSecret.slice(0, 32)
    const macKey = hashedSecret.slice(32)
    let iv = Buffer.allocUnsafe(16)
    iv.fill(0)

    const ciphertext = exports.aes256CbcEncrypt(iv, encryptionKey, msg);
    const dataToMac = Buffer.concat([iv, ephemeral.getPublicKey(), ciphertext]);
    const mac = hmacSha1(macKey, dataToMac);
    const encData = ephemeral.getPublicKey().toString('hex') + mac.toString('hex') + ciphertext.toString('hex')
    return encData
  } catch (e) {
    throw "Encryption Error"
  }
}

exports.ECIESDec = (recipientPrivKey, encryption) => {
  try {
    encryption = Buffer.from(encryption, 'hex')
    const ephemeralPubKey = encryption.slice(0, 65)
    const mac = encryption.slice(65, 85)
    const ciphertext = encryption.slice(85)
    const recipient = crypto.createECDH('secp256k1')
    const recipientKey = recipient.setPrivateKey(Buffer.from(recipientPrivKey, 'hex'))
    const sharedSecret = recipient.computeSecret(ephemeralPubKey, null, 'hex')
    const hashedSecret = sha512(Buffer.from(sharedSecret, 'hex'))
    const encryptionKey = hashedSecret.slice(0, 32)
    const macKey = hashedSecret.slice(32)

    let iv = Buffer.alloc(16)
    iv.fill(0)
    const dataToMac = Buffer.concat([iv, ephemeralPubKey, ciphertext]);
    const realMac = hmacSha1(macKey, dataToMac);

    if (!!equalConstTime(mac, realMac)) {
      return exports.aes256CbcDecrypt(iv, encryptionKey, ciphertext).toString('hex');
    } else {
      return false;
    }
  } catch (e) {
    throw "Decryption Error"
  }
}

exports.aes256CbcEncrypt = (iv, key, plaintext) => {
  let cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const firstChunk = cipher.update(plaintext);
  const secondChunk = cipher.final();
  return Buffer.concat([firstChunk, secondChunk]);
}

exports.aes256CbcDecrypt = (iv, key, ciphertext) => {
  let isCipherBuffer = ciphertext
  if (!Buffer.isBuffer(ciphertext)) {
    isCipherBuffer = Buffer.from(isCipherBuffer, 'hex');
  }
  let decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const firstChunk = decipher.update(isCipherBuffer);
  const secondChunk = decipher.final();
  return Buffer.concat([firstChunk, secondChunk]);
}

const sha512 = (msg) => {
  return crypto.createHash("sha512").update(msg).digest();
}

const hmacSha1 = (key, msg) => {
  return crypto.createHmac("sha1", key).update(msg).digest();
}

const equalConstTime = (b1, b2) => {
  if (b1.length !== b2.length) {
    return false;
  }
  var res = 0;
  for (var i = 0; i < b1.length; i++) {
    res |= b1[i] ^ b2[i];  // jshint ignore:line

  }
  return res === 0;
}
