# LTC

Litcoin Interface. Need to call `init` after class contruction after next version.

```javascript
let cwsLTC = new cws.LTC()
cws.LTC.init() => {
    console.log(`Init Success.`)
}
```

## Methods

* **getPublicKey**(addressIndex: number): Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>
* **signP2WPKH**(intputs, outputs, changeAddressIndex) :Promise \<string>
* **signP2PKH**(inputs, outputs, changeAddressIndex) :Promise \<string>

## Example

```javascript
let cwsLTC = new cws.LTC()
var inputs = [
  {
       "txId":"b29b2dec823b2ddd5cf75b9b600771de6ea266eb778e250480180be799a2e51b",
        "vout":1,
        "value":788223,
        "redeemScript":"00144ed20ef6efb1c1925db64648c6bc569199de2161",
        "publicKey":"02c44a3acfbdff560e9be4641e5679d9ef0cca3264d2e337631f4de3ae34b20ba1",
        "addressIndex":1
    }
]
var outputs =[
    {
        "address":"MRDnBvKZ44NPVmXFmwTQigvcoaSDucgSD6",
        "value":729000
    },
    {
        "value":38244,
        "address":"ME4ETCJuPZpJcWCMbtHBPAAZ5SykhboHYU"
    }
]
var changeAddressIndex = 1

cwsLTC.init().then(()=>{
  cwsLTC.signP2WPKH(inputs, outputs, changeAddressIndex).then(fullTx=>{
    console.log(fullTx)
})
```