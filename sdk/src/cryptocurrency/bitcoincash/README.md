
# BCH 

Bitcoin Cash(ABC) Interface

```javascript
new cws.BCH()
```

## Methods

* **getPublicKey**(addressIndex: number): Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>
* **signP2PKH**(intputs, outputs, changeAddressIndex)

## Examples

```javascript
let cwsBCH = new cws.BCH();
var inputs = [
    {
    "txId":"b82ab92ae42a4cc42eb2289a8e5ef0bc58eafdb8a641f97f36e5d607d15dc2cf",
    "vout":0,
    "value":5000,
    "publicKey":"02100dbe85cedc0651421a9d0117e363227850fffdfc9396f15989cfab26f698dc",
    "addressIndex":0},

    {
    "txId":"78facbe7d5a9f883316cb72561d10e37940be0be7d56a2bed83d2dad6b44f03f",
    "vout":0,
    "value":1111, 
    "publicKey":"02100dbe85cedc0651421a9d0117e363227850fffdfc9396f15989cfab26f698dc",
    "addressIndex":0},

    {
    "txId":"eff97af172f1598672f568cd7280e1b65b7d2218e7e91009c0f9f547c0802902",
    "vout":1,
    "value":2601474,
    "publicKey":"02100dbe85cedc0651421a9d0117e363227850fffdfc9396f15989cfab26f698dc",
    "addressIndex":0}
]
var outputs= [
    {
        "address":"qqde3t9j6830nvvl9ed39wracwjrjye64c5vzuss6f",
        "value":729000
    },
    {
        "address":"qq8netlnqkfcdmgvs2chsgaglhjgcclwlcdt76k75c",
        "value":1876371
    }
]
var changeAddressIndex = 0

cwsBCH.signP2PKH(inputs, outputs, changeAddressIndex).then(fullTx=>{
    console.log(fullTx)
})
```