# CoolWalletS Javascript SDK

> React Native sdk for CoolWalletS




```
version:    0.1.2
status:     draft

copyright:  coolbitX
```

## Run in React-Native Project

1. Put the following in your `package.json` and run `npm install`.

```json
"cws-sdk": "git+https://gitlab.com/coolbitx/coolwalletS/sdk.git"
```

2. You need to manually link the following `react-native` modules:

```shell
react-native link react-native-randombytes
react-native link react-native-ble-manager
react-native link react-native-keychainsss
```

3. And run `rn-nodeify` again to make sure everything is working as expected.

```shell
./node_modules/.bin/rn-nodeify --install --hack
```

4. `rn-nodeify` will create a **shim.js** file in your project root directory. The first line in `index.js`/ `index.ios.js` / `index.android.js` should be to import it.

```javascript
// index.js

// Add this line
import './shim.js'
// Old stuff
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);

```

## Example Usage

### 0. Import and initialize

```javascript
import cws from 'cws-sdk'
```

You need to call the `init()` function every time you start your App, you would probably want to do it in `componentDidMount()` step.

```javascript
async componentDidMount () {
    // Call it once, will get 0000 for successful init
    const {code} = await cws.init()

    // Set your own callback functions
    const { bleManagerEmitter } = await cws.setCallBack({
      eventListener: params => {
        console.log(`eventListener : ${JSON.stringify(params)}`)
      },
      onBleError: error => {
        console.log(error)
      },
      onRequireServicesReady: () => {
        console.log('Scanning...') 
        cws.scan() // we recommand you to follow our flow here
      },
      onServicesReady: async queue => {
        console.log('Card is ready')
      },
      onPeripheralFound: (id, name) => {
        console.log(`Found Peripheral ${id}, ${name}`)
        /**
         * Implement how to save the id for later connection.
         **/
      }
    })
  }
```

* You can call `setCallBack()` to customize your callback functions.
* Implement how you want to deal with peripherals `onPeripheralFound`.
* The returned `bleManagerEmitter` is a `NativeEventEmitter` object. You can use `addListener` on it.
* Once you get the target peripheral, use `cws.connect()` to connect your device to the CoolWalletS.

```javascript 
cws.connect('A2ECC934-A445-FBA3-2100-50225A31656B')
```

### 1. Register Device

You first MUST register your device with the CoolWalletS before you can properly communicate with the card.

```javascript
// register device to card (password, device_name)
cws.Other.registerDevice('12345678', 'myIphone8')

// you may later rename your device with
cws.Other.renamePairedDevice('CoolWalletS ROCKS')
```

Once an initial device has been paired with the CoolWalletS, all other devices will need a pairing password to connect to this CoolWalletS. You can also prevent additional pairings with:

```javascript
cws.Other.toggleLockCard(true)
```

More details about pairing, locking, getting information from CoolWalletS could be found [here](https://gitlab.com/coolbitx/coolwalletS/sdk/tree/master/src/Interface/Other).

### 2. Create Wallet or Recover Wallet

```javascript
// Option 1: Create New Wallet Via Card:

// generate root seed
cws.Wallet.generateRootSeed(12)

// calculate sum of all seed displayed on screen (=sum), then verify it with checkSumSeed function
cws.Wallet.checksumSeed(sum)


// Option 2: Recover Wallet

// recover with mnemonic. If you want to recover with rootseed, set the second parameter(mnemonic_flag) as false.
cws.Wallet.setRootSeed("this is your bip 39 mnemonic phrase", true).then(() => {
    console.log(`Set seed success!`)
})

```

We will enable **advanced recovery** soon. With advanced recovery, the App has no idea what information is sent to the card, which eliminate the possibility of malicious app to record users' master seed phrases.

More information about the `Wallet` interface could be found [here](https://gitlab.com/coolbitx/coolwalletS/sdk/tree/master/src/Interface/Wallet)

### 3. You're good to go!

Try signing your first transaction with CoolWalletS!

```javascript

let cwsETH = cws.ETH()

let addressIndex = 0;
cwsETH.getPublicKey(addressIndex).then(result => {
    const publicKey = result.publicKey
    cwsETH.signTransaction(payload, addressIndex, publicKey).then(fullTx=>{
        console.log('Signed with CoolWalletS:' + fullTx)
    })
})
```

Note: You MUST call `getPublicKey` before you make your first `signTransaction` call.

For more details regarding transactions and signing, go to [this page](https://gitlab.com/coolbitx/coolwalletS/sdk/tree/master/src/cryptocurrency)!
