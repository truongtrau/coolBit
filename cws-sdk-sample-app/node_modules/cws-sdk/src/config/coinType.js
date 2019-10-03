module.exports = {
  "IS_BITCOIN_BASED_STRUCTURE": ['00','91','02','79','c8'],
  "BTC": {
    "type": "00",
    "PARAMS":{
      "P2WPKH":{
        "READTYPE": '01',
        "P2": "00",
        "DISPLAY_P1" : "01",
        "HASHTYPE" : 0x01,
        "REDEEMTYPE": "01"
      },
      "P2PKH":{
        "READTYPE": "00",
        "P2": "00",
        "DISPLAY_P1" :  "01",
        "HASHTYPE" : 0x01,
        "REDEEMTYPE": "00"
      },
    },
    "unit": 100000000,  //satoshi
    "minFee": 18, //satoshi
    "network": {
      "production": { // main net
        "chain": "bitcoin",
        'pubKeyHash': '00',
        'scriptHash': '05'
      },
      "dev": { // testnet
        "chain": "testnet",
        'pubKeyHash': '6f',
        'scriptHash': 'c4'
      }
    }
  },
  "ETH": {
    "type": "3C",
    "unit": 1000000000000000000,  // Wei 18 zero
    "network": {
      "production": { // main net
        "chainId": "01"
      },
      "development": { // ropsten net
        "chainId": "03"
      }
    }
  },
  "LTC": {
    "type": "02",
    "PARAMS":{
      "P2WPKH":{
        "READTYPE": '02',
        "P2": "00",
        "DISPLAY_P1" : "06",
        "HASHTYPE" : 0x01,
        "REDEEMTYPE": "01"
      },
      "P2PKH":{
        "READTYPE": "00",
        "P2": "00",
        "DISPLAY_P1" :  "06",
        "HASHTYPE" : 0x80,
        "REDEEMTYPE": "00"
      },
    },
    "unit": 100000000,
    "network": {
      "chain": "litecoin",
      "old":{
        "messagePrefix": "\x19Litecoin Signed Message:\n",
        "bip32": {
          "public": 0x019da462,
          "private": 0x019d9cfe
        },
        "pubKeyHash": 0x30, // L
        "scriptHash": 0x05, // old '3' prefix
        "wif": 0xb0
      },
      "new":{
        "messagePrefix": "\x19Litecoin Signed Message:\n",
        "bip32": {
          "public": 0x019da462,
          "private": 0x019d9cfe
        },
        "pubKeyHash": 0x30, // L
        "scriptHash": 0x32, // M
        "wif": 0xb0
      }
    }
  },
  "BCH": {
    "type": "91",
    "PARAMS":{
      "P2PKH":{
        "READTYPE": "91",
        "P2": "00",
        "DISPLAY_P1" :  "05",
        "REDEEMTYPE": "00",
        "HASHTYPE" : 0x41
      },
    },
    "isNew": true,
    "unit": 100000000,  //satoshi
    "network": {
      "production": {
        "chain": "livenet",
      },
      "dev": {
        "chain": "testnet",
      }
    }
  },
  "XRP": {
    "type": "90",
    "unit": 1000000,  // 6 zero
  },
  "ZEN": {
    "PARAMS":{
      "READTYPE": '79',
      "P2": "00",
      "DISPLAY_P1" : "08",
    },
    "type": "79",
    "unit": 100000000,  //satoshi
    "network": {
      "production": { // main net
        'pubKeyHash': '2089',
        'scriptHash': '2096'
      },
      "dev": { // testnet
        'pubKeyHash': '2098',
        'scriptHash': '2092'
      }
    }
  },
  "EOS":{
    "PARAMS":{
      "READTYPE": 'f6',
    },
    "type": "c2",   // coinType
    "chain_id": 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // mainnet
    "chain_id_testnet": 'e70aaab8997e1dfce58fbfac80cbbb8fecec7b99cf982a9444273cbc64c41473'
  },
  "ICX": {
    "type": "4A",
    "unit": 1000000000000000000,  // Loop 18 zero
    "version": 3
  },
  "OMNI": {
    "PARAMS":{
      "P2WPKH":{
        "READTYPE": 'c8',
        "P2": "00",
        "DISPLAY_P1" : "0A",
        "HASHTYPE" : 0x01,
        "REDEEMTYPE": "01"
      },
      "P2PKH":{
        "READTYPE": "c8",
        "P2": "00",
        "DISPLAY_P1" :  "0A",
        "HASHTYPE" : 0x01,
        "REDEEMTYPE": "00"
      },
      
    },
    "type": "c8",
    "propertyId": '31',
    "dustAmount": '0.00000546',
    "P1": '0A',
    "P2": "00",
    "minFee": 18, //satoshi
  },
  "BNB": {
    "type": 'CA',
    "P2": "00", // ChainType
    "unit": 100000000,  //satoshi
    "prefix": "bnb",
    "READTYPE":{
      "TRANSFER": 'CA',
      "ORDER": 'CB',
      "CANCEL": 'CC',
    }
  },
  "TRVC":{
    "type":'00',
    "PARAMS":{
      "P2PKH":{
        "READTYPE": "00",
        "P2": "00",
        "DISPLAY_P1" :  "0b",
        "HASHTYPE" : 0x01,
        "REDEEMTYPE": "00"
      },
    },
    "network":{
      "trvc": {
        "bip32": {
          "public": 0x0488b21e,
          "private": 0x0488ade4
        },
        "wif": 0x80,
        "scriptHash": 0x12,
        "pubKeyHash": 0x41,
      },
    },
  },
  "TRIVEASSET": {
    "type":'00', // 
    "PARAMS":{
      "P2PKH":{
        "READTYPE": "00",
        "P2": "00",
        "DISPLAY_P1" :  "0b",
        "HASHTYPE" : 0x01,
        "REDEEMTYPE": "00"
      },
    },
    "P1": '0A',
    "P2": "00",
  },
  "DEVELOP": {
    "type": "ff"
  }
};

