const BigInteger = require('bigi');
var createHash = require('create-hash');
const base58 = require('bs58');
import {Sign} from '../../helper'
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

/**
 * decrypt dignature from cws, convert to EOS signature.
 * @param {string} derSig
 * @param {Buffer} signBuf 
 * @param {*} publicKey 
 */
export const convertToSignature = (derSig, signBuf, publicKey) => { 
    let sig_obj = Sign.parseDERsignature(derSig);
    let sig = Sign.getCanonicalSignature(sig_obj);
    
    let ecQ  = ec.keyFromPublic(publicKey, 'hex').pub;
    let i = ec.getKeyRecoveryParam(sha256(signBuf), sig, ecQ);
    
    return combineSignature(sig.r, sig.s, i+31);
 }

/**
 * @param {string} r 
 * @param {string} s 
 * @param {number} i
 * @return {String} EOS K1 Signature
 */
const combineSignature = (r, s, i) => {
    r = BigInteger.fromHex(r);
    s = BigInteger.fromHex(s);

    const buf = Buffer.alloc(65);
    buf.writeUInt8(i, 0);

    r.toBuffer(32).copy(buf, 1);
    s.toBuffer(32).copy(buf, 33);

    const keyType = 'K1';
    const check = [buf];
    check.push(Buffer.from(keyType));

    var _checksum = ripemd160(Buffer.concat(check)).slice(0, 4);
    var encode = base58.encode(Buffer.concat([buf, _checksum]));
    return 'SIG_K1_' + encode;
}

function ripemd160(data) {
    return createHash('rmd160').update(data).digest();
}

function sha256(data, resultEncoding) {
    return createHash('sha256').update(data).digest(resultEncoding)
}