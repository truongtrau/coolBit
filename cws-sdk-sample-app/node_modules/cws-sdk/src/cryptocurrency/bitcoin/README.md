# BTC

BTC Interface, sign Bitcoin and **Omni Layer** Transactions.

```javascript
new cws.BTC()
```

## Methods

### getPublicKey

* Same as **getPublicKey** in [ETH](https://gitlab.com/coolbitx/coolwalletS/sdk/tree/master/src/cryptocurrency/ethereum).

### **signP2WPKH**

> sign Pay-to-**Witness**-Public-Key-Hash

* Parameters:
  * inputs(Array\<Input>): Array of [utxo input](#data-object).  
  * outputs(Array\<Output>): Array of [utxo output](#data-object). **You must provide exactly 2 outputs in the following order** if you're contructung a BTC transaction: {Target Output}, {Change Output}
  * If you're signing an **Omni Layer Transaction**, see more detail on the [Omni Section](#Signing-Omni-Layer-Transaction).
  * changeAddressIndex(number): the **address index** in BIP44 pointing to the change address.
* Returns
  * Promise</string>: the signed transaction ready to be broadcast.

### signP2PKH

> sign Pay-to-Public-Key-Hash

* Similar to signP2WPKH

## Examples

```javascript
import cws from 'cws-sdk'
let cwsBTC = new cws.BTC()
var inputs = [{
      "txId":"3735fd3e4618295e62f74d2cd4c9d34a20c2f4f5ad97ee206e1c79c4f01be5ca",
      "vout":2,
      "value":97184,
      "redeemScript":"00148a99a17ee968fb47e3a446a24a49bed1f872808b",
      "publicKey":"026747a52363a3531046f5c789cb6b1d1917164e8d77b833eb63b89060bb1d04c8",
      "addressIndex":2
    }]
var outputs=[
        { // first output: target output
            "address":"3KvJ1uHPShhEAWyqsBEzhfXyeh1TXKAd7D",
            "value":10000
        },
        { // second output: change output
            "value":80710,
            "address":"3NwVRNJegGwJdgYbAZs35CYttLYz2rE7bg"
        }]
var changeAddressIndex = 2

cwsBTC.signP2WPKH(inputs, outputs, changeAddressIndex).then(Tx=>{
    console.log(Tx)
})
```

## Signing Omni Layer Transaction

> SE Version Requirement: 84

You can use CWS to sign Omni layer transaction after upgrading SE to 84 higher. 

### Supported Omni Property

Property ID | # | Name | SE Version|
-|-|-|-|
`0000001f`|31|**USDT**|84|

To sign an Omni Transaction, you must provide **one more output** in the output array (between target output and change output) in the following format:

```javascript
{
    address: <ScriptBuffer>,
    value: number
}
```

the `ScriptBuffer` must be type of `Buffer`. A valid omni script consist of following components:

* `6a14`: `OP_RETURN` & `ScriptLen`
* `6f6d6e69`: ASCII of 'omni'
* `00000000`: Simple send
* `0000001f`: (propertyId) USDT
* `000000007bdbc380`: hex of amount to send in Satoshi, in this example 20.78 USDT

You can refer to the following example of constructing a `ScriptBuffer`.

```javascript

let omniData = '6a146f6d6e69000000000000001f000000007bdbc380';
omniOutput ={
    address: Buffer.from(omniData,'hex'),
    value: 0
}
```

#### Complete USDT Transaction Example

```javascript
import cws from 'cws-sdk'
let cwsOmni = new cws.BTC(true) // set isOmni = true

let omniData = '6a146f6d6e69000000000000001f000000007bdbc380'

var inputs = [{
        "txId":"3735fd3e4618295e62f74d2cd4c9d34a20c2f4f5ad97ee206e1c79c4f01be5ca",
        "vout":2,
        "value":97184,
        "redeemScript":"00148a99a17ee968fb47e3a446a24a49bed1f872808b",
        "publicKey":"026747a52363a3531046f5c789cb6b1d1917164e8d77b833eb63b89060bb1d04c8",
        "addressIndex":2
    }]
var outputs=[
      { // first output: target address with dust amount
          "address":"3KvJ1uHPShhEAWyqsBEzhfXyeh1TXKAd7D",
          "value":5460
      },
      { // Second output: Omni Script
          "address": Buffer.from(omniData, 'hex')
          "value":0
      },
      { // Last output: change output
          "value":90710,
          "address":"3NwVRNJegGwJdgYbAZs35CYttLYz2rE7bg"
      }
    ]
var changeAddressIndex = 2

cwsOmni.signP2WPKH(inputs, outputs, changeAddressIndex).then(Tx=>{
    console.log(Tx)
})
```


## Data Object

### Input

```javascript
{
    txId: string,
    vout: number,  
    value: number,
    addressIndex: number,
    publicKey: string,
    redeemScript: string, (optional - required when signing P2WPKH)
}
```

`vout`: the index of unspent output in the tx.

### Output

```javascript
{
    address: string,
    value: number
}
```