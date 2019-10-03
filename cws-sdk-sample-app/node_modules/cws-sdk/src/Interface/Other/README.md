# SDK Other Interface

```
status: DRAFT
```

## Import

```javascript
import cws from 'cws-sdk' 
const {code} = cws.init()
```

The `Other` interface should be used when you want to:

1. Connect a new device to CoolWalletS
2. Get CoolWalletS Information
3. Cancel commands or power off

### Definition: Device

In the following documentation, `device` refers to a unique **App Instance**. Creating multiple apps (with `cws-sdk`) on the same mobile device will have the  CoolWalletS recognize them as **different devices**.

## Methods related to Card Pairing

### RegisterDevice

>register your current device to the connected CoolWalletS.
>

```javascript
/**
 * Register currenct device to CoolWalletS.
 * @param {String} password 
 * @param {String} device_name 
 * @returns {Promise}
 */
registerDevice = async (password, device_name)
```

* Registration must be done before you do anything else.
The first device registers to the wallet must set a pairing password, all other device must provide this password to pair to your CoolWalletS.
* You can register up to 3 devices to a single CoolWalletS. If you already paired 3 devices but want to add a new device, you must use a paired device to call `removePairedDevice` first.



#### Example
```
cws.Other.registerDevice('12345678', 'myIphone8')
```

### getPairingPassword

```javascript
/**
 * Get Pairing Password for other device to connect CoolWalletS.
 * @return {Promise<String>} password
 */
getPairPassword = async () 
```

* Use this function from a registered device to obtain a pairing password (can then be used to pair/register unregistered devices).

#### Example

```javascript
cws.Other.getPairingPassword().then(password=>{
    console.log(`Password: ${password}`)
})
```


### getPairedDevices
> Get Paired device list with detail information

```javascript
/**
 * Get Paired device list
 * @returns {Promise< Array<{appId:String, deviceName:String, isCurrent:Boolean}> >}
 */
getPairedDevices = async ()
```

#### Returns

* Array of {appId, deviceName, isCurrent} objects:
    * `appId`: The unique app id of the paired device
    * `deviceName`: Name of the device
    * `isCurrent` : true if this is the current device

#### Example

```javascript=
cws.Other.getPairedDevices().then(devices=>{
    for(var device of devices){
      if(device.isCurrent){
        console.log(`Current Device: ${device.deviceName}`)
      }else{
        console.log(`Other Device: ${device.deviceName}`)
      }
    }
})

```

### removePairedDevice

> Remove the device with associated appId from cws memory 

```javascript
/**
 * Remove paired device from CoolWalletS
 * @param {String} appId The target appid of device you want to remove
 * @returns {Promise}
 */
removePairedDevice = async (appId)
```

* You can get `appId`'s of paired devices by calling `getPairedDevices`.
* *note*: Current device cannot be removed.

#### Example
```javascript
cws.Other.removePairedDevice('e532d84433c45ff960d971e76a1675038d1761d5')
```



### renamePairedDevice

```javascript
/**
 * Rename current device name.
 * @param {String} newDeviceName 
 * @returns {Promise}
 */
renamePairedDevice = async (newDeviceName)
```

#### Example

```javascript
cws.Other.renamePairedDevice('David Villa')
```

### resetCard

```javascript
/**
 * Reset current connected CoolWalletS.
 * @returns {Promise}
 */
resetCard = async ()
```

* This operation will reset everything on the CoolWalletS, including **master seed** and **registered devices**.  
* *note*: You **must** re-register your device again after resetting the CoolWalletS, or you won't be able to use it.

## Methods about card Settings

---

### toggleShowAddress

```javascript
/**
 * Setting of whether you want CoolWalletS to display destination address during transactions.
 * @param {Boolean} isFullDetail set true if you want to display destination address
 * @returns {Promise}
 */
toggleShowAddress = async (isFullDetail)
```

* Use this function with  isFullDetail=`true` to show the full transaction target address on CoolWalletS's screen during transactions.

### toggleLockCard

```javascript
/**
 * Setting about whether you allow other devices to pair your CoolWalletS.
 * @param {Boolean} freezePair Set true if you want to freeze(lock) your CoolWalletS
 * @returns {Promise}
 */
toggleLockCard = async (freezePair)
```

* Freeze card: Setting freezePair to `true` will prevent your CoolWalletS from registering/pairing more devices.

## Methods about flow control

### cancelCommand

```javascript
/**
 * Cancel APDU command.
 * @returns {Promise}
 */
cancelCommand = async () 
```

* cancel previous commands.

### powerOffSE

```javascript
/**
 * Switch CoolWalletS SE power off for power saving
 * @returns {Promise}
 */
powerOffSE = async() 
```

* Power off SE for power saving.

## Firmware Update

### checkFirmwareUpdate

```javascript
/**
 * check if MCU or SE update is available
 * @returns {Promise< {updateMCU: Boolean, updateSE: Boolean} >}
 */
checkFirmwareUpdate = async()
```

* If one of the returned boolean is `true`, you should start the following `firmwareUpgrade` function.

### firmwareUpdate

```javascript
/**
 * start firmware update process
 * @param {String} cardId CWS serial number. ex: CWS058916
 * @param {Boolean} updateSE update SE or not.
 * @param {Boolean} updateMCU update MCU or not.
 */
firmwareUpdate = async(cardId, updateSE, updateMCU) => {
```

* The value of the `updateSE` and `updateMCU` parameters should be exactly what you get from `checkFirmwareUpdate`.
* You should remind your clients to connect CWS to the charger before starting the upgrade process.
* SE update will takes around 10 minutes. After the SE upgrade, the screen will show `UPGRADE AGAIN`, you should restart the card manully by pressing the button.
* MCU update will takes around 5 minutes. After successfully upgrade MCU firmware, **the card will restart** and get back to the default balance display. You must use `cws.connect` to handle bluetooth connection again.

#### Example

```javascript
cws.Other.checkFirmwareUpdate().then(result=>{
  console.log(`check update result: ${JSON.stringify(result)}`)
  if(result.updateSE || result.updateMCU){
    cws.Other.getCardId().then((cardId)=>{
      cardId = cardId.split(' ')[1] // CWS058916
      cws.Other.firmwareUpdate(cardId, result.updateSE, result.updateMCU)
    })
  }  
})
```

## Other informations

### getCardInfo

```javascript
/**
 * Get detail card information.
 * @returns {Promise<{
     * "pairStatus":boolean,
     * "freezeStatus":boolean,
     * "walletStatus":boolean,
     * "pairRemainTimes":Number,
     * "accountDigest":String,
     * "showFullAddress":boolean,
     * "isCardRecognized":boolean,
     * "SEVersion":Number,
     * "MCUVersion":String
     * }>}
 */
getCardInfo = async ()
```

* Get the detail information of the connected CoolWalletS.