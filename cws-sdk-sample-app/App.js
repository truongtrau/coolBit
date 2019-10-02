import React, { Component } from 'react'
import {
  StyleSheet,
  View,
  AsyncStorage,
  Text,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native'
import Modal from 'react-native-modal'
import { Button, TextInput } from 'react-native-paper'
import cws from 'cws-sdk'
// import { init, scan, connect } from 'cwsble'
import _ from 'lodash'
import { regExpLiteral } from '@babel/types';

export default class BLECommandTest extends Component {
  constructor(props) {
    super(props)
    this.state = {
      visible: false,
      device: [],
      checksum: null,
      balanceTotal: [],
      balance: [],
      wallet: [],
      account: [],
      rawData: []
    }
  }
  async componentDidMount() {
    const { code } = await cws.init()
    console.log(`cws-sdk init: Code-${code}`)
    const { bleManagerEmitter } = await cws.setCallBack({
      eventListener: params => {
        console.log('eventListener')
        console.log(JSON.stringify(params))
      },
      onBleError: error => {
        console.log(error)
      },
      onRequireServicesReady: () => {
        console.log('Scanning...')
        cws.scan()
      },
      onServicesReady: async queue => {
        console.log('Card is ready')
        this.setState({
          visible: false
        })
      },
      onPeripheralFound: (id, name) => {
        console.log(id)
        console.log(name)
        this.setState({
          device: _.uniqBy([...this.state.device, { id, name }], 'id')
        })
      }
    })
    bleManagerEmitter.addListener('BleManagerConnectPeripheral', args => {
      console.log('Connecting')
    })
    bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', () => {
      console.log('BleManagerDisconnectPeripheral')
    })
    bleManagerEmitter.addListener('BleManagerStopScan', () => {
      console.log('BleManagerStopScan')
    })
  }
  async scanCard() {
    this.setState({ visible: true })
  }

  async connectCard() {
    try {
      const value = await AsyncStorage.getItem('BLE_DEVICE')
      console.log('value: ')
      console.log(value)
      const name = await AsyncStorage.getItem('BLE_DEVICE_NAME')
      console.log(name)
      if (value !== null && value !== undefined) {
        // We have data!!
        console.log('Get Data')
        console.log(value)
        cws.connect(value)
        await cws.Other.setCardId(name)
        console.log('After setCardId')
        let id = await cws.Other.getCardId()
        console.log('truongtv connect')
        console.log(id)
        this.setState({ visible: false })
      }
    } catch (error) {
      console.log(error)
    }
  }

  renderContent() {
    const { device } = this.state
    return device.map(device => {
      return (
        <Text
          key={device.id}
          style={{ color: 'white', margin: 15 }}
          onPress={async () => {
            cws.connect(device.id)
            try {
              await AsyncStorage.setItem('BLE_DEVICE', device.id)
              await AsyncStorage.setItem('BLE_DEVICE_NAME', device.name)
            } catch (error) {
              console.log('set ble device error!!!!')
              console.log(error)
            }
          }}
        >
          {device.name}
        </Text>
      )
    })
  }
  render() {
    const { visible } = this.state
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Modal isVisible={visible}>
          <ScrollView style={{ flex: 1 }}>{this.renderContent()}</ScrollView>
        </Modal>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior='padding' enabled>
          <TextInput
            label='checksum'
            value={this.state.checksum}
            style={{ width: 300, backgroundColor: 'gray' }}
            underlineColor={'white'}
            onChangeText={checksum => this.setState({ checksum })}
          />
          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={async () => {
              this.scanCard()
            }}
          >
            Scan Card
          </Button>
          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={async () => {
              this.connectCard()
            }}
          >
            Connect Card
          </Button>
          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.getCardInfo().then(data => {
                cws.Other.getCardId().then(cardId => {
                  console.log(`saved cardId ${cardId}`)
                  cardId = cardId.split(' ')[1]
                  cws.Other.checkFirmwareUpdate().then(result => {
                    console.log(`check firmware UPDATE result: ${JSON.stringify(result)}`)
                    // if(result.updateSE || result.updateMCU){
                    //     cws.Other.firmwareUpdate(cardId, result.updateSE, result.updateMCU)
                    // }
                  })

                })

              })
            }}
          >
            Get Card Info
          </Button>
          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.resetCard()
            }}
          >Ả
            Reset HW Wallet
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.registerDevice('0009805200000000000000', 'iphone xr ')
            }}
          >
            Register Device
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Wallet.generateRootSeed(12)
            }}
          >
            Create Wallet
          </Button>
          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Wallet.checksumSeed(this.state.checksum)
            }}
          >
            Send Checksum
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Wallet.updateBalance([
                { 'balance': '92999.99', 'coinType': '02' },  // LTC
                { 'balance': '34980', 'coinType': '90' },   // XRP
                { 'balance': '72944.0', 'coinType': '00' }, // BTC
                { 'balance': '122.2', 'coinType': '3C' },   // ETH
              ]).then(response => {
                console.log('update balance')
                console.log(response)
              })
            }}
          >
            Update Balance
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
            console.log('set seeed')
              cws.Wallet.setRootSeed("32545 10369 89089 60913 29233 07585 75457 66673 34225 07153 42673 00817", true).then(() => {
                console.log(`Set seed success!`)

              })
            }}
          >
            set seed
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.getPairingPassword().then(password => {
                console.log(`Password: ${password}`)
              })
            }}
          >
            getPairPassword
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.renamePairedDevice('Leo Messi')
            }}
          >
            renamePairedDevice
          </Button>
          <View style={{ marginTop: 2 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.removePairedDevice("e532d84433c45ff960d971e76a1675038d1761d5").then(() => console.log(`Remove done`))
            }}
          > remove device!!
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.getPairedDevices().then(devices => {
                for (var device of devices) {
                  if (device.isCurrent) {
                    console.log(`Current Device: ${device.deviceName}`)
                  } else {
                    console.log(`Other Device: ${device.deviceName}`)
                  }
                }
              })
            }}
          >
            getPairedDevices
          </Button>


          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              let coin = new cws.ETH()
              coin.getPublicKey(1).then(result => {
                console.log('get public key truongtv')
                console.log(JSON.stringify(result))
              })
            }}
          > get publicKey
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
                console.log('test show address')
            let address=  cws.Other.toggleShowAddress(true).then(() => console.log(`setting complete`))
            console.log('after adresss')
            console.log(JSON.stringify( address))
            console.log('after adresss')
             
            }}
          > show address
          </Button>
          <Button
            style={{ marginTop: 2 }}
            mode='contained'
            onPress={() => {
              cws.Other.toggleShowAddress(false).then(() => console.log(`setting complete`))
            }}
          > Dont show address
          </Button>

          {/* <View style = {{margin:10}}/> */}



          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              let btc = new cws.BTC()
              var inputs = [
                {
                  "txId": "3735fd3e4618295e62f74d2cd4c9d34a20c2f4f5ad97ee206e1c79c4f01be5ca",
                  "vout": 2,
                  "value": 97184,
                  "redeemScript": "00148a99a17ee968fb47e3a446a24a49bed1f872808b",
                  "publicKey": "026747a52363a3531046f5c789cb6b1d1917164e8d77b833eb63b89060bb1d04c8",
                  "addressIndex": 2
                }]
              var outputs = [
                {
                  "address": "3KvJ1uHPShhEAWyqsBEzhfXyeh1TXKAd7D",
                  "value": 10000
                },
                {
                  "value": 80710,
                  "address": "3NwVRNJegGwJdgYbAZs35CYttLYz2rE7bg"
                }]
              var changeAddressIndex = 2
              btc.signP2WPKH(inputs, outputs, changeAddressIndex).then(fullTx => {
                console.log(fullTx)
              })

            }}
          > BTC
          </Button>

          <Button
            style={{ marginTop: 2 }}
            mode='contained'
            onPress={() => {
              let cwsLTC = new cws.LTC()

              var inputs = [
                {
                  "txId": "b29b2dec823b2ddd5cf75b9b600771de6ea266eb778e250480180be799a2e51b",
                  "vout": 1,
                  "value": 788223,
                  "redeemScript": "00144ed20ef6efb1c1925db64648c6bc569199de2161",
                  "publicKey": "02c44a3acfbdff560e9be4641e5679d9ef0cca3264d2e337631f4de3ae34b20ba1",
                  "addressIndex": 1
                }]
              var outputs = [
                { "address": "MRDnBvKZ44NPVmXFmwTQigvcoaSDucgSD6", "value": 729000 },
                { "value": 38244, "address": "ME4ETCJuPZpJcWCMbtHBPAAZ5SykhboHYU" }
              ]
              var changeAddressIndex = 1
              cwsLTC.init().then(() => {
                cwsLTC.signP2WPKH(inputs, outputs, changeAddressIndex).then(fullTx => {
                  console.log(fullTx)
                })

              })

            }}
          > LTC
          </Button>

          <Button
            style={{ marginTop: 2 }}
            mode='contained'
            onPress={() => {
              let cwsBCH = new cws.BCH();
              var inputs = [
                {
                  "txId": "b82ab92ae42a4cc42eb2289a8e5ef0bc58eafdb8a641f97f36e5d607d15dc2cf",
                  "vout": 0,
                  "value": 5000,
                  "publicKey": "02100dbe85cedc0651421a9d0117e363227850fffdfc9396f15989cfab26f698dc",
                  "addressIndex": 0
                },

                {
                  "txId": "78facbe7d5a9f883316cb72561d10e37940be0be7d56a2bed83d2dad6b44f03f",
                  "vout": 0,
                  "value": 1111,
                  "publicKey": "02100dbe85cedc0651421a9d0117e363227850fffdfc9396f15989cfab26f698dc",
                  "addressIndex": 0
                },

                {
                  "txId": "eff97af172f1598672f568cd7280e1b65b7d2218e7e91009c0f9f547c0802902",
                  "vout": 1,
                  "value": 2601474,
                  "publicKey": "02100dbe85cedc0651421a9d0117e363227850fffdfc9396f15989cfab26f698dc",
                  "addressIndex": 0
                }
              ]
              var outputs = [
                {
                  "address": "qqde3t9j6830nvvl9ed39wracwjrjye64c5vzuss6f",
                  "value": 729000
                },
                {
                  "address": "qq8netlnqkfcdmgvs2chsgaglhjgcclwlcdt76k75c",
                  "value": 1876371
                }
              ]
              var changeAddressIndex = 0
              cwsBCH.signP2PKH(inputs, outputs, changeAddressIndex).then(fullTx => {
                console.log(fullTx)
              })
            }}
          > BCH
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              let cwsETH = new cws.ETH();
              console.log('eth truongtv')
              const payload = "eb81f884b2d05e00825208940644de2a0cf3f11ef6ad89c264585406ea346a96870107c0e2fc200080018080";
              const publicKey = "033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293";
              const addressIndex = 0;              
              cwsETH.signTransaction(payload, addressIndex, publicKey).then(fullTx => {
                console.log(fullTx)
              })
            }}
          > ETH
          </Button>
          <Button n                                                                                                          
            style={{ marginTop: 2 }}
            mode='contained'
            onPress={() => {
              console.log('Test broadcast tx')
              let publicKey  = '020056a93bd5ccd14d035f78538b5d882ca163b27fc33b1cdd7d1de329cbee9cbe'              
              let addressTo  = '0xFD0325350FD1F69ef6E6d59Bbc2432880ce3b9b7'              
              let amout = 0.00002
              const addressIndex = 1
              //const payload = "e380843b9aca0001941f95dc1916da542d37c111c89a896ded65e8ebbd85174876e80080";                               
              //const payload = 'e380843b9aca000194bf26ce076ae8078a1e6d7186551d4570a4d703a485174876e80080'
              const payload = 'e880843b9aca0082520894bf26ce076ae8078a1e6d7186551d4570a4d703a485174876e80080018080'
              //e880843b9aca0082520894bf26ce076ae8078a1e6d7186551d4570a4d703a485174876e80080018080
              
              let cwsETH = new cws.ETH()
              console.log('truong start sign')
              // cwsETH.signTransaction(payload, addressIndex, publicKey).then(fullTx => {
              //       console.log('truong sign')
              //        console.log(fullTx)
              // })

              cwsETH.signTransaction(payload, addressIndex).then(fullTx => {
                console.log('truong signs')
                 console.log(fullTx)
          })

              //let #1 
              // let cwsETH = new cws.ETH();
              // cwsETH.registerToken("0xb8c77482e45f1f44de1745f52c74426c631bdd52", "BNB", 18).then(() => {
              //   const payload = "f86981c884b2d05e0082930a94b8c77482e45f1f44de1745f52c74426c631bdd5280b844a9059cbb0000000000000000000000000644de2a0cf3f11ef6ad89c264585406ea346a96000000000000000000000000000000000000000000000000016345785d8a0000018080";
              //   const publicKey = "033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293";
              //   const addressIndex = 0;
              //   cwsETH.signTransaction(payload, addressIndex, publicKey).then(fullTx => {
              //     console.log(fullTx)
              //   })
              // })
              //end # 1 


            }}
          > ERC20  transfer -> Test send eth 
          </Button>

          <Button
            style={{ marginTop: 2 }}
            mode='contained'
            onPress={() => {
              let cwsETH = new cws.ETH();
              cwsETH.signMessage("This is all we know", 0, "033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293", false).then(signedMessage => {
                console.log(`signing result: ${signedMessage}`)
              })

            }}
          > sign message
          </Button>
          <Button
            style={{ marginTop: 2 }}
            mode='contained'
            onPress={() => {
              let cwsETH = new cws.ETH();
              let typedData = {
                'types': {
                  'EIP712Domain': [
                    { 'name': 'name', 'type': 'string' },
                    { 'name': 'version', 'type': 'string' },
                    { 'name': 'verifyingContract', 'type': 'address' }
                  ],
                  'Order': [
                    { 'name': 'makerAddress', 'type': 'address' },
                    { 'name': 'takerAddress', 'type': 'address' },
                    { 'name': 'feeRecipientAddress', 'type': 'address' },
                    { 'name': 'senderAddress', 'type': 'address' },
                    { 'name': 'makerAssetAmount', 'type': 'uint256' },
                    { 'name': 'takerAssetAmount', 'type': 'uint256' },
                    { 'name': 'makerFee', 'type': 'uint256' },
                    { 'name': 'takerFee', 'type': 'uint256' },
                    { 'name': 'expirationTimeSeconds', 'type': 'uint256' },
                    { 'name': 'salt', 'type': 'uint256' },
                    { 'name': 'makerAssetData', 'type': 'bytes' },
                    { 'name': 'takerAssetData', 'type': 'bytes' }
                  ]
                },
                'primaryType': "Order",
                'domain': {
                  'name': "0x Protocol",
                  'version': "2",
                  'verifyingContract': "0x4f833a24e1f95d70f028921e27040ca56e09ab0b"
                },
                'message': {
                  'exchangeAddress': "0x4f833a24e1f95d70f028921e27040ca56e09ab0b",
                  'makerAddress': "0xbaf99ed5b5663329fa417953007afcc60f06f781",
                  'takerAddress': "0x0000000000000000000000000000000000000000",
                  'feeRecipientAddress': "0xb2f8613e310e5431eb4f2e22f5c85af407d5c1c5",
                  'senderAddress': "0x0000000000000000000000000000000000000000",
                  'makerAssetAmount': "1000",
                  'takerAssetAmount': "1000000000000000",
                  'makerFee': "0",
                  'takerFee': "0",
                  'expirationTimeSeconds': "1548756198",
                  'salt': "42295408130128217920283818580051387835866232829869867740259227908728808149560",
                  'makerAssetData': "0xf47261b0000000000000000000000000dde12a12a6f67156e0da672be05c374e1b0a3e57",
                  'takerAssetData': "0xf47261b0000000000000000000000000b8c77482e45f1f44de1745f52c74426c631bdd52"
                }
              };
              cwsETH.signTypedData(typedData, 0, "033a057e1f19ea73423bd75f4d391dd28145636081bf0c2674f89fd6d04738f293").then(signedHash => {
                console.log(`signedHash: ${signedHash}`)
              })

            }}
          > sign typed data
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              let cwsXRP = new cws.XRP();
              const payload = "535458001200002280000000240000001F2E00000000201B02BE032E6140000000002A927068400000000000000C7321027F033C29DE4BC02096492DA93E00D55D2851F74DC0B5AB58C9B83B3E8067B4AF8114A2725F5D0AA3D5492771155186F42A9B4D1A2C7C83141294A54F44FC00AE692EAD9A1235C4DFC41AFCFE"
              const addressIndex = 0;
              cwsXRP.signTransaction(payload, addressIndex).then(fullTx => {
                console.log(fullTx)
              })
            }}
          > XRP
          </Button>

          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              let cwsZEN = new cws.ZEN();
              const inputs = [
                { "txid": "f5174459f50bf3eaa6a390cc04834cf22c835a59ebfed954d5a9c24464a5f69c", "vout": 0, "value": 100000, "scriptPubKey": "76a914e1b874d42f42b738c795eda860179bb387ff343c88ac2047af9fcab6bf0bba7e2e5775b64b61146325e42bed3d7191df60170e0000000003656307b4", "publicKey": "0316e2515e82198dbf1d8171b918be2fe1de780124b1ddee6da20d41a83dddfc8f", "addressIndex": 1 },
                { "txid": "26e657659e0a03b7c591aaa905902b73280b0b7c15ed80be8e5b1cf19bb983dc", "vout": 0, "value": 245600, "scriptPubKey": "76a914e1b874d42f42b738c795eda860179bb387ff343c88ac20e6c1cd8090596430952ab8e9df1601265591e75d44f518607712140a00000000032a6107b4", "publicKey": "0316e2515e82198dbf1d8171b918be2fe1de780124b1ddee6da20d41a83dddfc8f", "addressIndex": 1 },
                { "txid": "fca4a2b493d4c7e8a656dffb5b10211391657c28a09d7c0a181e290b371235d1", "vout": 0, "value": 24842687, "scriptPubKey": "76a914e1b874d42f42b738c795eda860179bb387ff343c88ac20b2cea0f1b8f88c3d36b043b8765233086cb7febf7db78498f68b02190000000003166107b4", "publicKey": "0316e2515e82198dbf1d8171b918be2fe1de780124b1ddee6da20d41a83dddfc8f", "addressIndex": 1 }];
              const outputs = [{ "address": "zng3FVUSacVe8BSb4w7Qm6gY7WEDE27HfqH", "satoshis": 1000000 }, { "address": "znmfQzqgMY4jtd2LtkAQXpnL8v5oAAKexRW", "satoshis": 24178287 }]
              const blockHeight = 485494
              const blockHash = "000000000f2c502aea9448cb6951b93637c30e3ccf2df2d955e9b9d74fa3bf96"
              const changeAddressIndex = 1

              cwsZEN.signTransaction(inputs, outputs, changeAddressIndex, blockHeight, blockHash).then(fullTx => {
                console.log(fullTx)
              })
            }}
          > ZEN
          </Button>
          <View style={{ margin: 10 }} />
          <Button
            mode='contained'
            onPress={() => {
              cws.Other.powerOff().then(() => console.log('switched off'))

            }}
          > Off
          </Button>

          <View style={{ margin: 10 }} />
          {/* <Button
            mode='contained'
            onPress={()=>{
              
              
            }}
          > OKOK
          </Button> */}


        </KeyboardAvoidingView>
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white'
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  }
})
