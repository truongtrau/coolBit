/* Copyright (C) Chelpis Co., Ltd. - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Steven Fong <contact@chelpis.com>, June 2018
 */
/*
 * Make sure app have permission to bluetooth
 */
import {
  PermissionsAndroid,
  Platform,
} from 'react-native'
import BleManager from 'react-native-ble-manager'

const checkBLEPermission = async () => {
  let isBLEPermitted = true
  if (Platform.OS === 'android') {
    try {
      await BleManager.enableBluetooth()
    } catch (error) {
      throw (Error('Please turn on your bluetooth'))
    }
  }
  if (Platform.OS === 'android' && Platform.Version >= 23) {
    const {
      ACCESS_COARSE_LOCATION,
    } = PermissionsAndroid.PERMISSIONS
    isBLEPermitted = await PermissionsAndroid.check(ACCESS_COARSE_LOCATION)
    if (!isBLEPermitted) {
      const bleRequestPermission = await PermissionsAndroid.request(ACCESS_COARSE_LOCATION)
      if (bleRequestPermission !== 'granted') {
        isBLEPermitted = false
        throw (Error('Permission denied by user'))
      }
    }
  }
  return isBLEPermitted
}

export default checkBLEPermission
