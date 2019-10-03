# ZEN

Horizen Interface

```javascript
new cws.ZEN()
```

## Methods

* **getPublicKey**(addressIndex: number): Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>
* **signTransaction**(input: Array\<Input>, outputs: Array<Output>, AddressIndex: number, blockHeight: number, blockHash: string)
  * Parameters:
    * blockHeight (number)
    * blockHash (string)

## Examples

```javascript
let cwsZEN = new cws.ZEN();
const inputs = [
  {"txid":"f5174459f50bf3eaa6a390cc04834cf22c835a59ebfed954d5a9c24464a5f69c","vout":0,"value":100000,"scriptPubKey":"76a914e1b874d42f42b738c795eda860179bb387ff343c88ac2047af9fcab6bf0bba7e2e5775b64b61146325e42bed3d7191df60170e0000000003656307b4","publicKey":"0316e2515e82198dbf1d8171b918be2fe1de780124b1ddee6da20d41a83dddfc8f","addressIndex":1},
  {"txid":"26e657659e0a03b7c591aaa905902b73280b0b7c15ed80be8e5b1cf19bb983dc","vout":0,"value":245600,"scriptPubKey":"76a914e1b874d42f42b738c795eda860179bb387ff343c88ac20e6c1cd8090596430952ab8e9df1601265591e75d44f518607712140a00000000032a6107b4","publicKey":"0316e2515e82198dbf1d8171b918be2fe1de780124b1ddee6da20d41a83dddfc8f","addressIndex":1},
  {"txid":"fca4a2b493d4c7e8a656dffb5b10211391657c28a09d7c0a181e290b371235d1","vout":0,"value":24842687,"scriptPubKey":"76a914e1b874d42f42b738c795eda860179bb387ff343c88ac20b2cea0f1b8f88c3d36b043b8765233086cb7febf7db78498f68b02190000000003166107b4","publicKey":"0316e2515e82198dbf1d8171b918be2fe1de780124b1ddee6da20d41a83dddfc8f","addressIndex":1}
 ];
const outputs = [{"address":"zng3FVUSacVe8BSb4w7Qm6gY7WEDE27HfqH","satoshis":1000000},{"address":"znmfQzqgMY4jtd2LtkAQXpnL8v5oAAKexRW","satoshis":24178287}] 
const blockHeight = 485494
const blockHash = "000000000f2c502aea9448cb6951b93637c30e3ccf2df2d955e9b9d74fa3bf96"
const changeAddressIndex = 1

cwsZEN.signTransaction(inputs, outputs, changeAddressIndex, blockHeight, blockHash).then(fullTx => {
  console.log(fullTx)
})
```