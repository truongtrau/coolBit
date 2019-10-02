/* Copyright (C) Chelpis Co., Ltd. - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Steven Fong <contact@chelpis.com>, June 2018
 */
/*
 * Handle request flow and ble controller
 */
import {
  NativeModules,
  NativeEventEmitter,
} from 'react-native'
import BleManager from 'react-native-ble-manager'
import {
  TASK_TIMEOUT_MS,
  serviceUUID,
  statusCharacteristicUUID,
  SCAN_TIME_S,
  SCAN_DELAY_MS,
} from './constants'

import {
  sendCommand,
  sendData,
  handleStatusCharacteristicChange,
  waitStatusDoneAndFetchResultFromCard,
  stopPollingStatusCharacteristic
} from './transport'
import checkBLEPermission from './checkPermission'

const BleManagerModule = NativeModules.BleManager
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule)

let queue = []
let currentTask
let isServicesReady = false
let isExecuting = false
let executeTimeoutId
let peripheralId
let eventListener = () => {}
let onServicesReady = () => {}
let onRequireServicesReady = () => {}
let onBleError = () => {}
let onPeripheralFound = () => {}
let onPeripheralDisconnected = () => {}

let isBleManagerDiscoverPeripheralTriggered = false
const onBleManagerDiscoverPeripheral = async (args) => {
  if (isBleManagerDiscoverPeripheralTriggered) {
    return
  }
  // isBleManagerDiscoverPeripheralTriggered = true
  // BleManager.stopScan()
  let _peripheralId = args.id
  let _peripheralName = args.name
  isBleManagerDiscoverPeripheralTriggered = true
  await sleep(SCAN_DELAY_MS);
  isBleManagerDiscoverPeripheralTriggered = false
  onPeripheralFound(_peripheralId, _peripheralName)

  // await BleManager.connect(peripheralId)
  // await BleManager.retrieveServices(peripheralId)
  // await BleManager.startNotification(peripheralId, serviceUUID, statusCharacteristicUUID)

  // isServicesReady = true
  // onServicesReady(queue)
  // next()
}

const onBleManagerDisconnectPeripheral = () => {
  isServicesReady = false
  isExecuting = false
  isBleManagerDiscoverPeripheralTriggered = false
  stopPollingStatusCharacteristic('Card is disconnected')
  onPeripheralDisconnected(peripheralId);
}

export const trigger = (params) => {
  // console.log('trigger')
  // console.log(params)
  eventListener(params)
}

export const scan = () => {
  BleManager.scan([serviceUUID], SCAN_TIME_S, true)
}

export const connect = async (_peripheralId) => {
  stopScan();
  await BleManager.connect(_peripheralId)
  await BleManager.retrieveServices(_peripheralId)
  await BleManager.startNotification(_peripheralId, serviceUUID, statusCharacteristicUUID)
  peripheralId = _peripheralId
  isServicesReady = true
  onServicesReady(queue)
  next()
}

export const stopScan = () => (
  BleManager.stopScan()
)

export const disconnect = () => {
  console.log(`disconnecting device: ${peripheralId}...`)
  const result = BleManager.disconnect(peripheralId)
  console.log('disconnected')
  return result
}

// task flow

export const addRequest = (req) => new Promise(async (resolve, reject) => {
  // console.log(`addRequest isServicesReady:${isServicesReady} isExecuting:${isExecuting}`)
  // console.log(JSON.stringify(req.data))
  if (!isServicesReady) {
    // clear previous request
    queue = []
  }
  queue.push({
    req,
    resolve,
    reject: (error) => {
      onBleError(error)
      reject(error)
    },
  })
  console.log('queue after push: ' + JSON.stringify(queue));

  try {
    if (!isServicesReady) {
      onRequireServicesReady()
    } else if (!isExecuting) {
      next()
    }
  } catch (error) {
    console.log(error)
  }
})

const next = async () => {
  console.log(`next queue.length: ${queue.length}`)
  if (queue.length > 0) {
    try {
      isExecuting = true
      const task = queue.shift()
      await execute(task)
    } catch (error) {
      console.log(error)
    }
    isExecuting = false
    next()
  }
}

export const execute = async (task) => {
  // console.log('executing task')
  // console.log(task)
  const {
    // event, // BLE_CMD
    // status, // success
    data: {
      command,
      packets
    }
  } = task.req
  currentTask = task
  executeTimeoutId = setTimeout(() => {
    const errorTimeout = Error('Execute request timeout')
    task.reject(errorTimeout)
    throw Error(errorTimeout)
  }, TASK_TIMEOUT_MS)
  try {
    await sendCommand(peripheralId, command)
    await sendData(peripheralId, packets)
    const result = await waitStatusDoneAndFetchResultFromCard(peripheralId)
    clearTimeout(executeTimeoutId)
    task.resolve(result)
  } catch (error) {
    clearTimeout(executeTimeoutId)
    task.reject(error)
    throw error
  }
}

export const cancelRequest = () => {
  const errorUserCancel = Error('User cancel it')
  if (!isServicesReady && queue.length > 0) {
    queue[queue.length - 1].reject(errorUserCancel)
  } else if (currentTask && currentTask.reject) {
    currentTask.reject(errorUserCancel)
  }
  queue = []
  console.log('queue has been clear : ' + queue)
}

export const init = async ({
  onPeripheralFound: _onPeripheralFound = onPeripheralFound,
  onPeripheralDisconnected: _onPeripheralDisconnected = onPeripheralDisconnected,
  onServicesReady: _onServicesReady = onServicesReady,
  onBleError: _onBleError = onBleError,
  eventListener: _eventListener = eventListener,
  onRequireServicesReady: _onRequireServicesReady = onRequireServicesReady,
}) => {
  onPeripheralFound = _onPeripheralFound
  onPeripheralDisconnected = _onPeripheralDisconnected
  onServicesReady = _onServicesReady
  onBleError = _onBleError
  eventListener = _eventListener
  onRequireServicesReady = _onRequireServicesReady
  try {
    await checkBLEPermission()
    console.log('BleManager start...');
    await BleManager.start()
    bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      onBleManagerDiscoverPeripheral
    )
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleStatusCharacteristicChange
    )
    bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      onBleManagerDisconnectPeripheral
    )
    console.log('BleManager scan...');
    await sleep(1000); // Need wait or scan will failed
    scan();
    return {
      bleManagerEmitter
    }
  } catch (error) {
    console.log(error)
    onBleError(error)
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  addRequest,
  trigger,
  scan,
  stopScan,
  connect,
  disconnect,
  init,
  cancelRequest
}
