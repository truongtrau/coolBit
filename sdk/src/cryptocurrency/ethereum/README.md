# ETH

Ethereum Interface

```javascript
var eth = new cws.ETH()
```

## Version Requirement

| Method | SE version required | Display|
| -------- | -------- |-|
| signTransaction | -     | amount |
| signTransaction (ERC20 Transfer) | 70     | name -> amount |
| signTransaction (all Smart Contract calls)|  84   | SMART -> amount |
| signMessage | 81     | MESSAGE |
| signTypedData | 84     | EIP712 |

## Methods

### **getPublicKey**

> (addressIndex: number): Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>

* Parameters:
  * addressIndex(number): address index in BIP44 pointing to the target public key.

* Returns:
  * Promise<{publicKey: string, parentChainCode:string, parentPublickey:string}>
  * publicKey: the target public key
  * parentChainCode, parentPublickey: the chain code and public key of the parent node for futher derives.
* Example

```javascript
eth.getPublicKey(0)
```

### **signTransaction**

> (payload: string, addressIndex: string, publicKey: string) : Promise\<string>

* Description: Sign ETH Transactions.
* Parameters:
  * payload (string)
  * addressIndex (string)
  * publicKey (string): **Required** for now for speed optimization, may become optional in the future.
* Returns
  * Promise\<string> : signed ETH transaction ready to be broadcast

* Example

```javascript
eth.signTransaction("eb81f884b2d05e00825208940644de2a0cf3f11ef6ad89c264585406ea346a96870107c0e2fc200080018080", 0, "033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293")
```

### **registerToken**

>(contractAddress: string, symbol: string, decimals: number) : Promise<>

If you want to sign an non-built-in ERC20 token transfer transaction, you may have to use this method to **register** this token first.

* Parameters
  * contractAddress (string): token address with 0x prefix
  * symbol(string): the token symbol that will show up on the screen of CoolWalletS.
  * decimals(number)
* Returns
  * Promise<>
* Example

```javascript
eth.registerToken("0xb8c77482e45f1f44de1745f52c74426c631bdd52", "BNB", 18).then(()=>{
    eth.signTransactoion("f86981c884b2d05e0082930a94b8c77482e45f1f44de1745f52c74426c631bdd5280b844a9059cbb0000000000000000000000000644de2a0cf3f11ef6ad89c264585406ea346a96000000000000000000000000000000000000000000000000016345785d8a0000018080", 0, "033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293").then(fullTx => {console.log(fullTx)})
})
```

### **signMessage**

> (message: string, addressIndex: number, publicKey: string, needHash: bool)

* Parameters
  * message (string): Hex or utf-8 string message to sign.
  * needHash (bool): whether we need to hash your message or not.
* Returns
  * Promise\<String>
* Example

```javascript
const message = "Signing this message proves to JOYSO you are in control of your account without giving JOYSO access to any sensitive information. Message ID: d234981209829"
const publicKey = "033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293"

eth.signMessage(message, 0, publicKey, true).then(signedMessage => {
    console.log(`signing result: ${signedMessage}`)
})
```

### **signTypedData**

> (typedData: Object, addressIndex: number, publicKey: string)

* Paramters:
  * typedData(object): typedData defined in [EIP712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
* Returns
  * Promise\<String>
* Example

```javascript

let typedData = {
    'types': {
      'EIP712Domain': [
        {'name':'name', 'type':'string'},
        {'name':'version', 'type':'string'},
        {'name':'verifyingContract','type':'address'}
      ],
      'Order': [
        {'name':'makerAddress','type':'address'},
        {'name':'takerAddress','type':'address'},
        {'name':'feeRecipientAddress','type':'address'},
        {'name':'senderAddress','type':'address'},
        {'name':'makerAssetAmount','type':'uint256'},
        {'name':'takerAssetAmount','type':'uint256'},
        {'name':'makerFee','type':'uint256'},
        {'name':'takerFee','type':'uint256'},
        {'name':'expirationTimeSeconds','type':'uint256'},
        {'name':'salt','type':'uint256'},
        {'name':'makerAssetData','type':'bytes'},
        {'name':'takerAssetData','type':'bytes'}
      ]
    },
    'primaryType': "Order",
    'domain': {
      'name':"0x Protocol",
      'version':"2",
      'verifyingContract':"0x4f833a24e1f95d70f028921e27040ca56e09ab0b"
    },
    'message': {
      'exchangeAddress':"0x4f833a24e1f95d70f028921e27040ca56e09ab0b",
      'makerAddress':"0xbaf99ed5b5663329fa417953007afcc60f06f781",
      'takerAddress':"0x0000000000000000000000000000000000000000",
      'feeRecipientAddress':"0xb2f8613e310e5431eb4f2e22f5c85af407d5c1c5",
      'senderAddress':"0x0000000000000000000000000000000000000000",
      'makerAssetAmount':"1000",
      'takerAssetAmount':"1000000000000000",
      'makerFee':"0",
      'takerFee':"0",
      'expirationTimeSeconds':"1548756198",
      'salt':"42295408130128217920283818580051387835866232829869867740259227908728808149560",
      'makerAssetData':"0xf47261b0000000000000000000000000dde12a12a6f67156e0da672be05c374e1b0a3e57",
      'takerAssetData':"0xf47261b0000000000000000000000000b8c77482e45f1f44de1745f52c74426c631bdd52"
    }
};
  
  eth.signTypedData(typedData ,0,"033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293").then(signedHash => {
    console.log(`signedHash: ${signedHash}`)
  })
```
