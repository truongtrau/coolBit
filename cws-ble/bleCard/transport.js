/* Copyright (C) Chelpis Co., Ltd. - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Steven Fong <contact@chelpis.com>, June 2018
 */
/*
 * Handle BLE Transport behavior
 */
import BleManager from 'react-native-ble-manager'
import {
  RETRY_MAX_TIMES,
  RETRY_INTERIVAL_MS,
  PACKET_DATA_SIZE,
  serviceUUID,
  cmdCharacteristicUUID,
  dataCharacteristicUUID,
  resultCharacteristicUUID,
  BLE_READ_TIMEOUT_MS,
  POLLING_INTERVAL_MS,
  statusCharacteristicUUID
} from './constants'
import {
  byteArrayToHex,
  hexToByteArray
} from './convert'

const MAX_POLLING_COUNT = 300

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const sendCommand = async (peripheralId, command) => {
  const bytesCommand = hexToByteArray(command)
  return BleManager.write(
    peripheralId,
    serviceUUID,
    cmdCharacteristicUUID,
    bytesCommand
  )
}

const _sendData = async (peripheralId, data, index = 0) => {
  try {
    if (data.length === 0) {
      return
    }
    const isFinalPart = (index + 1) * PACKET_DATA_SIZE > data.length
    const eachData = data.slice(index * PACKET_DATA_SIZE, (index + 1) * PACKET_DATA_SIZE)
    const eachPacket = [
      index + 1,
      eachData.length,
      ...eachData
    ]

    // console.log('sending data...')
    // console.log(eachPacket)
    await BleManager.write(
      peripheralId,
      serviceUUID,
      dataCharacteristicUUID,
      eachPacket
    )
    if (!isFinalPart) {
      return _sendData(peripheralId, data, index + 1)
    }
  } catch (error) {
    console.log(error)
    throw error
  }
}

export const sendData = async (peripheralId, hexData) => {
  return _sendData(peripheralId, hexToByteArray(hexData))
}

const bleManagerRead = (peripheralId, serviceUUID, resultCharacteristicUUID) => new Promise(async (resolve, reject) => {
  const timeoutId = setTimeout(() => {
    reject(Error('BleManager.read timeout'))
  }, BLE_READ_TIMEOUT_MS)
  try {
    const result = await BleManager.read(peripheralId, serviceUUID, resultCharacteristicUUID)
    clearTimeout(timeoutId)
    resolve(result)
  } catch (error) {
    reject(error)
  }
})

const fetchResultFromCard = async (peripheralId, prev = '', nextPackageSN = 1, retryTimes = 0) => {
  try {
    const resultDataRaw = await bleManagerRead(peripheralId, serviceUUID, resultCharacteristicUUID)
    const resultData = byteArrayToHex(resultDataRaw)
    // console.log(`do fetchResultFromCard retryTimes: ${retryTimes}`)
    // console.log('fetch: ' + resultData)
    if (resultData === 'fc') {
      return prev
    } else {
      const currentPackageSN = parseInt(resultData.slice(0, 2), 16)
      if (nextPackageSN !== currentPackageSN) {
        throw Error('Package serial number is not matched')
      }
      // TODO: check package serial number and data size
      return fetchResultFromCard(peripheralId, prev + resultData.slice(4), nextPackageSN + 1)
    }
  } catch (error) {
    if (retryTimes < RETRY_MAX_TIMES) {
      await timeout(RETRY_INTERIVAL_MS)
      console.log('do retry')
      return fetchResultFromCard(peripheralId, prev, nextPackageSN, retryTimes + 1)
    }
    console.log(error)
    throw error
  }
}

// handle result async

let resultDefer = null
let pollingTimeoutId
let isFetchingResult = false
let peripheralId

export const handleStatusCharacteristicChange = async ({ value: [status] }) => {
  if (isFetchingResult) {
    // already handled
    return
  }
  // Convert bytes array to string
  console.log(`status: ${status}`)
  if (status === 0) {
    isFetchingResult = true
    clearTimeout(pollingTimeoutId)
    // value could be 0x0, 0x81, 0xff
    try {
      const resultFromCard = await fetchResultFromCard(peripheralId)
      const result = {
        status: resultFromCard.slice(-4),
        outputData: resultFromCard.slice(0, -4),
      }
      resultDefer.resolve(result)
    } catch (error) {
      resultDefer.reject(error)
    }
    resultDefer = null
  }
}

const pollingStatusCharacteristic = async (pollingCount = 0) => {
  console.log(`polling ${pollingCount}....`)
  clearTimeout(pollingTimeoutId)
  if (pollingCount > MAX_POLLING_COUNT) {
    resultDefer.reject(Error(`Exceed polling count ${pollingCount}`))
    return
  }
  try {
    const value = await BleManager.read(peripheralId, serviceUUID, statusCharacteristicUUID)
    await handleStatusCharacteristicChange({ value })
  } catch (error) {
    console.log(error)
  }
  if (!isFetchingResult) {
    pollingTimeoutId = setTimeout(() => {
      pollingStatusCharacteristic(pollingCount + 1)
    }, POLLING_INTERVAL_MS)
  }
}

const startPollingStatusCharacteristic = () => {
  isFetchingResult = false
  pollingStatusCharacteristic()
}

export const stopPollingStatusCharacteristic = (reason) => {
  console.log('stop polling')
  clearTimeout(pollingTimeoutId)
  if (resultDefer && typeof resultDefer.reject === 'function') {
    resultDefer.reject(Error(reason))
  } else {
    console.log('resultDefer undefined or resultDefer.reject not a function');
  }
}

export const waitStatusDoneAndFetchResultFromCard = (_peripheralId) => new Promise((resolve, reject) => {
  peripheralId = _peripheralId
  startPollingStatusCharacteristic()
  resultDefer = {
    resolve,
    reject
  }
})
