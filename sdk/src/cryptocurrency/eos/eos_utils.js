var ByteBuffer = require('bytebuffer');
import {encodeName, toTransferByteBuffer} from './bytebuffer'

/**
 * encode data object in action.
 * @param {from:string, to:string, quantity:string, memo:string} data 
 */
export const hashTransferData = (data) => {
    const from = data.from;
    const to = data.to; 
    const quantity = data.quantity;
    const memo = data.memo;

    var b2 = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    b2.writeUint64(encodeName(from, false));
    b2.writeUint64(encodeName(to, false));
    var arr = quantity.split(' ');
    
    b2.writeInt64(arr[0].replace('.',''));
    var symbol = arr[1];
    var pad = '\0'.repeat(7 - symbol.length);
    var precision = arr[0].split('.')[1].length;
    b2.append(String.fromCharCode(precision) + symbol + pad);
    b2.writeVString(memo);
    return b2.copy(0, b2.offset).toString('hex');
}

 /**
  * concat chainId, signBuf, contextFreeData into buff
  * @param {object} txObject 
  * @param {string} chain_id 
  */
export const genSignBuf = (txObject, chain_id) => {
    const binary = toTransferByteBuffer(txObject).toBinary();
    const buf = Buffer.from(binary, 'binary');
    const chainIdBuf = Buffer.from(chain_id, 'hex');
    const packedContextFreeData = Buffer.from(new Uint8Array(32));
    return Buffer.concat([chainIdBuf, buf, packedContextFreeData]);
}

/**
 * return signed transaction object ready to broadcast
 * @param {object} txObject
 * @param {string} signature
 */
export const genSignedTxV1 = (txObject, signature)=>{
    let expiration =  new Date(txObject.expiration * 1000);
    expiration = expiration.toISOString().split('.')[0];
    
    const hashedData = hashTransferData(txObject.data);
    console.log(`data hash: ${hashedData}`)
    const signedTransaction = {
        "signatures":[signature],
        "compression":"none",
        "transaction": { 
            "expiration": expiration,
            "ref_block_num": txObject.ref_block_num,
            "ref_block_prefix": txObject.ref_block_prefix,
            "max_net_usage_words": txObject.max_net_usage_words,
            "max_cpu_usage_ms": txObject.max_cpu_usage_ms,
            "delay_sec": txObject.delay_sec,
            "context_free_actions":[],
            "actions":[
                {
                    "account":"eosio.token",
                    "name":"transfer",
                    "authorization":[ { "actor":txObject.data.from, "permission":"active" } ],
                    "data":hashedData
                }
            ],
            "transaction_extensions":[] 
        }
    };
    return signedTransaction
}