import {AsyncStorage} from 'react-native';
import { COINTYPE } from '../../config/index.js';
import * as Helper from '../../helper'
import * as APDU from '../../apdu'
import bip39 from 'bip39'
import Promise from 'bluebird'

const SRC_PATH = 'cws-sdk/src/nterface/Wallet/index.js'

/**
 * Use CoolWalletS to create root seed for HD Wallet
 * @param {Number} strength
 * @returns {Promise}
 */
export const generateRootSeed = async (strength) => {
  try {
    let strength_hex = parseInt(strength).toString(16);
    if (strength_hex.length % 2 > 0) strength_hex = '0' + strength_hex;

    const command = 'CREATE_WALLET';
    const signature = await Helper.Other.generalAuthorization(command, strength_hex);
    await APDU.Wallet.createWallet(strength_hex + signature);
  } catch (e) {
    Helper.Other.toSystemError(e, "Wallet Creation Error", "00030", SRC_PATH, 'generateRootSeed')
  }
};

/**
 * Verify Root Seed by sending CheckSum to CoolWalletS (execute after generateRootSeed)
 * @param {String} checksum
 * @returns {Promise}
 */
export const checksumSeed = async (checksum) => {
  try {
    let hex_checksum = parseInt(checksum).toString(16);
    for (let i = hex_checksum.length; i < 8; i++) hex_checksum = '0' + hex_checksum;
    await APDU.Wallet.finishBackup(hex_checksum);
  } catch (e) {
    Helper.Other.toSystemError(e, "Wallet Creation Error", "00030", SRC_PATH, 'checksumSeed')
  }
};

/**
 * Set root key for CoolWalletS SE. Invoked when creating wallet with App or wallet recovery
 * @param {String} seed hexString of mnemonic seed or mnemonic phrase
 * @param {Boolean} fromMnemonic set to true if you put mnemonic as input
 * @returns {Promise}
 */
export const setRootSeed = async(seed, fromMnemonic=false) => {
  try{
    if(fromMnemonic){
      seed = bip39.mnemonicToSeedHex(seed)
      console.log(`Convert mnemonic to rootseed: ${seed}`)
    }
    let SEPubKey = await AsyncStorage.getItem('SEPubKey');
    const encryptedSeed = Helper.Sign.ECIESenc(SEPubKey, seed);
    const command = "SET_SEED";
    const signature = await Helper.Other.generalAuthorization(command, encryptedSeed);
    const signedSeed = encryptedSeed + signature;
    await APDU.Wallet.setSeed(signedSeed);
  }catch(e){
    Helper.Other.toSystemError(e, "Wallet Recovery Error", "00030", SRC_PATH, 'setRootSeed')
  }
  
};

/**
 * Update Balances to CoolWalletS
 * @param {Array<{balance:String, coinType:String}>} allCoinBalance 
 * @returns {Promise}
 */
export const updateBalance = async (allCoinBalance) => {
  try {
    const defaultBalance = "0.0"
    const coinTypes = [
      COINTYPE.BTC.type,
      COINTYPE.ETH.type,
      COINTYPE.LTC.type,
      COINTYPE.XRP.type,
    ];
    
    const allBalances = await Promise.map(coinTypes, async (coinType) => {
      const coinBalance = await Promise.filter(allCoinBalance, (b) => {
        return b.coinType == coinType;
      });
      if (coinBalance.length > 1) throw `Duplicated coinType ${coinType} in update array.`;

      const balance = coinBalance.length > 0 ? Helper.Other.formatBalance(coinBalance[0].balance, defaultBalance) : defaultBalance;
      const splitBalance = balance.split('.');
      const preNum = Helper.Other.fitZero(splitBalance[0], 8, '0', true);
      const postNum = Helper.Other.fitZero(splitBalance[1], 8, '0', false);
      const fullBalance = preNum + postNum;
      const coinTypeAndBalance = coinType + fullBalance;
      return coinTypeAndBalance;
    });

    const concatBalance = allBalances.join('');
    const command = "UPDATE_BALANCE";
    const signature = await Helper.Other.generalAuthorization(command, concatBalance);

    const data = concatBalance + signature;
    await APDU.Other.updateBalance(data);
    await APDU.Other.closePower();
  } catch (e) {
    Helper.Other.toSystemError(e, "UpdateBalance Error", "00000", SRC_PATH, 'updateBalance')
  }
};


/**
 * Get last used keyId from CoolWalletS. 
 * @returns {Promise<{Array<String>}>}
 */
export const getLastKeyId = async () => {
  try {
    let P1 = "00";
    const CardSEVersion = await Helper.Other.getSEVersion()
    if (parseInt(CardSEVersion,10) > 58) {
      const supportedCoin = await Helper.Other.getSupportedCoin();
      P1 = Helper.Other.fitZero(supportedCoin.length.toString(10), 2, "0", true);
    }

    const lastKeyId = await APDU.Other.getLastKeyId(P1);
    await APDU.Other.closePower();

    const allCoin = lastKeyId.outputData.match(/.{6}/g);

    const result = await Promise.map(allCoin, (c) => {
      const coinType = c.slice(0, 2);
      const addressLastIndex = c.slice(2);
      const defaultChangeIndex = '00';
      const defaultAccountIndex = '00';

      return coinType + defaultAccountIndex + defaultChangeIndex + addressLastIndex;
    });
    return result;
  } catch (e) {
    Helper.Other.toSystemError(e, "getLastKeyId Error", "000000", SRC_PATH)
  }
};

/**
 * Update last used keyId to CoolWalletS (*)
 * @param {Array<String>} arrOfKeyId 
 * @returns {Promise}
 */
export const updateKeyId = async (arrOfKeyId) => {
  try {
    const supportedCoin = await Helper.Other.getSupportedCoin();
    let indexIdData = await Promise.map(supportedCoin, (coin) => {
      const { type } = COINTYPE[coin];
      const k = arrOfKeyId.find((keyId) => {
        return keyId.slice(0, 2) == type;
      });
      if (!k) {
        const defaultAddressIndex = '0000';
        return type + defaultAddressIndex;
      }
      const lastAddressIndex = k.slice(6);
      return type + lastAddressIndex;
    });
    indexIdData = indexIdData.join('');

    const command = 'UPDATE_KEYID';

    let P1 = "00";
    const CardSEVersion = await Helper.Other.getSEVersion()
    if (parseInt(CardSEVersion,10) > 58) {
      P1 = Helper.Other.fitZero(supportedCoin.length.toString(10), 2, "0", true);
    }else{
      indexIdData += '0'.repeat(24 - indexIdData.length);
    }
    console.log(`indexIdData:${indexIdData}`);
    const signature = await Helper.Other.generalAuthorization(command, indexIdData, P1);
    const data = indexIdData + signature;
    await APDU.Other.updateKeyId(data, P1);
    await APDU.Other.closePower();
  } catch (e) {
    Helper.Other.toSystemError(e, "updateKeyId Error", "000000", SRC_PATH)
  }
};

/**
 * Get Supported Coins
 * @param {bool} returnId true if you want to retun id (BTC), otherwise coin code(00).
 * @returns {Promise<Array<String>>}
 */
export const getSupportedCoin = async (returnId) => {
  try {
     const arrCoinId = await Helper.Other.getSupportedCoin()
     if(returnId){
      return arrCoinId
     }
     const result = Helper.Other.getCoinCode(arrCoinId)
     return result
  } catch (e) {
    Helper.Other.toSystemError(e, "SDK getSupportedCoin Error", "00000", SRC_PATH, 'getSupportedCoin')
  }
};

/**
 * Convert Coin Codes to Coin ID
 * @param {Array<String>} coinCodes Array of Coincodes. ex: ['00', '3C']
 * @returns {Array<String>} 
 */
export const getCoinId = (coinCodes) => {
  return Helper.Other.getCoinId(coinCodes)
};

