# SDK Wallet Interface

```
status: DRAFT
```

## Import

```javascript=
import cws from 'cws-sdk' 
const {code} = cws.init()
```

The `Wallet Interface` handles **setting up the master Private key**, **recovering wallet from a Seed** and **updating balances** shown on CoolWalletS.

## Create new wallet  

Generating a brand new wallet with the CoolWalletS is a two-steps process:  
1) `generateRootSeed` and  
2) `checksumSeed` 

### generateRootSeed

```javascript
/**
 * Use CoolWalletS to create root seed for HD Wallet
 * @param {Number} strength
 * @returns {Promise}
 */
const generateRootSeed = async ()
```

* Parameter
    * `strength` (Number): Seed length, same as number of words in mnemonic generation. 

Once the root seed has been generated, the CoolWalletS will display the matching mnemonic word indices on the screen, you **MUST write them all down**: you will have to **calculate the sum** in the following step for verification/checksum purpose.  
(press the card button to iterate through all the numbers)

### checksumSeed

```javascript
/**
 * Verify Root Seed by sending CheckSum to CoolWalletS 
 * @param {String} checksum
 * @returns {Promise}
 */
const checksumSeed = async (checksum)
```
* Parameter:
    * `checkSum` (String): The sum of all the numbers shown on CoolWalletS screen from generateRootSeed.

You must call this function after `generateRootSeed` to complete the wallet creation. 

## Recover Wallet

Restores/Sets the wallet seed, either by using the mnemonic recovery phrase or the generated hex-seed. Done by calling the `setRootSeed` function.

### setRootSeed

```javascript

/**
 * Set root key for CoolWalletS SE. Invoked when creating wallet with App or wallet recovery
 * @param {String} seed hexString of mnemonic seed or mnemonic phrase
 * @param {Boolean} fromMnemonic set to true if you put mnemonic as input
 * @returns {Promise<{status:String, message:String}>}
 */
const setRootSeed = async(seed, fromMnemonic=false)
```

* Parameters
    * `seed` (String): hex-string of root seed or mnemonic phrase (each word seperated with space)
    * `fromMnemonic`: set to `true` if you're passing in mnemonic phrase.

### Example

```javascript
var mnemonic = "this is your bip 39 mnemonic phrase chicken pizza coke joker ... try it";
cws.Wallet.setRootSeed(mnemonic, true)
```

## Other Methods

### updateBalance

```javascript
/**
 * Update Balances to CoolWalletS
 * @param {Array<{balance:String, coinType:String}>} allCoinBalance 
 * @returns {Promise}
 */
const updateBalance = async (allCoinBalance)
```

* With the current CoolWalletS hardware, you can only show the balances of the following 4 cryptocurrencies: BTC, LTC, ETH, XRP.
* Parameters:
    * `allCoinBalance` {<Array<Object>} when you call this function, you **MUST provide balances of all the 4 cryptocurrencies in the following format**: `{coinType: <string>, balance: <string>}`
        * `coinType`(String): `00` for BTC, `02` for Litecoin, `3C` for ETH, `90` for XRP.
        * `balance`(String): balance, including `.`.

### Example

```javascript
cws.Wallet.updateBalance(
    [
      {'balance':'92999.99', 'coinType':'02'},  // LTC
      {'balance':'34980', 'coinType':'90'},   // XRP
      {'balance':'72944.0', 'coinType':'00'}, // BTC
      {'balance':'122.2', 'coinType':'3C'},   // ETH
    ]).then(() => {
    console.log('update balance!')
})
```
