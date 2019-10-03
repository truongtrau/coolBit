# EOS

> SE Requirement: 86

EOS Interface. Currently only support **1 transfer action in a transaction**.

```javascript
let cwsEOS = new cws.EOS('e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473')
```

* Initial the EOS instance with `chain_id`. Default: mainnet chain_id: `aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906`

## Examples

* Before broadcasting a transaction, you may need to get the public keys from CoolWalletS and use them to crate a EOS account.

```javascript
let result = cwsEOS.getPublicKey(0)
let publicKey = result.publicKey
```

* You can use the following sample code to covert hex `publicKey` to EOS public key format:

```javascript
import {PublicKey} from 'eosjs-ecc'
let EOSpublicKey = new PublicKey(Buffer.from(publicKey, 'hex'))
console.log(EOSpublicKey) 
// EOS5hUxwCqCZCLbRsKsRMng6xYgMUpCw5HKhVDEmW48nXNrCxd8Dw
```

* Make sure the `from` account is created with the EOS public key got from CoolWalletS. 
* Currently we only support simple transfer with **active** permission, so the `addressIndex` you pass in should match the one you used to get the key to create **active** permission.

```javascript
let txObject= {
    "expiration": 1555921263,
    "ref_block_num": 25384,
    "ref_block_prefix": 3136891093,
    "max_net_usage_words":0,
    "max_cpu_usage_ms":0,
    "delay_sec":0,
    "data":{
      "from":"cwseoslaunch",
      "to":"junglefaucet",
      "quantity":"7.2999 EOS",
      "memo":"Thanks for the free EOS!"
    },
}
cwsEOS.signTransfer(txObject, 0).then(result=>{
    console.log(`signing result: ${JSON.stringify(result)}`) 
})
```
