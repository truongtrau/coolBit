# XRP

Ripple Interface

```javascript
let cwsXRP = new cws.XRP()
```

## Methods

* **getPublicKey**(addressIndex: number): Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>
* **signTransaction**(payload: string, addressIndex: string) : Promise\<string>
* Parameters:
  * payload (string)
  * addressIndex (string)
* Returns
  * Promise \<string> : signed Ripple transaction ready to be broadcast

## Examples

```javascript
const payload = "535458001200002280000000240000001F2E00000000201B02BE032E6140000000002A927068400000000000000C7321027F033C29DE4BC02096492DA93E00D55D2851F74DC0B5AB58C9B83B3E8067B4AF8114A2725F5D0AA3D5492771155186F42A9B4D1A2C7C83141294A54F44FC00AE692EAD9A1235C4DFC41AFCFE"
const addressIndex = 0
cwsXRP.signTransaction(payload, addressIndex).then(fullTx=>{
    console.log(fullTx)
})
```