declare module 'cws-sdk' {
    export function init():{code: string, err_msg:string}
    export function scan(): void
    export function connect(_peripheralId: string): void
    export function setCallBack(
        onPeripheralFound?: Function,
        onPeripheralDisconnected?: Function,
        onServicesReady?: Function,
        onBleError?: Function,
        eventListener?: Function,
        onRequireServicesReady?: Function
    ):Promise<object>

    export module Wallet{
        function generateRootSeed(strength: number):Promise<void>
        function checksumSeed(checksum: string):Promise<void>
        function setRootSeed(seed: string, fromMnemonic:boolean):Promise<void>
        function updateBalance(allCoinBalance: Array<{balance: string, coinType: string}>):Promise<void>
        function getSupportedCoin(returnId: boolean):Promise<Array<string>>
        function getCoinId(coinCodes: Array<string>):Array<string>
    }
    
    export module Other{
        function getCardInfo():Promise<{pairStatus: boolean,freezeStatus: boolean,walletStatus: boolean,pairRemainTimes: number,accountDigest: string,showFullAddress: boolean,isCardRecognized: boolean,SEVersion: number,MCUVersion: string}>
        function registerDevice(password:string, device_name:string):Promise<void>
        function getPairingPassword():Promise<string>
        function getPairedDevices():Promise<Array<{appId: string, deviceName: string, isCurrent: boolean}>>
        function removePairedDevice(appId:string):Promise<void>
        function renamePairedDevice(newDeviceName:string):Promise<void>
        function resetCard():Promise<void>
        function toggleShowAddress(isFullDetail: boolean):Promise<void>
        function toggleLockCard(freezePair: boolean):Promise<void>
        function cancelCommand():Promise<void>
        function powerOffSE():Promise<void>
        function setCardId(cardId: string):Promise<string>
        function getCardId():Promise<string>
        function getSEVersion(getHex:boolean):Promise<string|number>
        function getMCUVersion(getHex:boolean):Promise<string|number>
        function checkFirmwareUpdate():Promise<{updateMCU: boolean, updateSE: boolean}>
        function firmwareUpdate(cardId: string, updateSE:boolean, updateMCU:boolean):Promise<void>
    }

    export class Coin{
        constructor()
        getPublicKey(addressIndex: number):Promise<{publicKey: string, parentPublicKey: string, parentChainCode: string}>
    }

    export class BTC extends Coin{
        constructor(isOmni?: boolean)        
        signP2WPKH(inputs: Array<input>, outputs: Array<output>, changeAddressIndex: number):Promise<string>
        signP2PKH(inputs: Array<input>, outputs: Array<output>, changeAddressIndex: number):Promise<string>
    }

    export class LTC extends Coin{
        init():Promise<void>
        signP2WPKH(inputs: Array<input>, outputs: Array<output>, changeAddressIndex: number):Promise<string>
        signP2PKH(inputs: Array<input>, outputs: Array<output>, changeAddressIndex: number):Promise<string>
    }

    export class BCH extends Coin{
        signP2PKH(inputs: Array<input>, outputs: Array<output>, changeAddressIndex: number):Promise<string>
    }

    export class XRP extends Coin{
        signTransaction(payload: string, addressIndex: number):Promise<string>
    }

    export class ZEN extends Coin{
        signTransaction(inputs: Array<{txId: string, vout: number, value: number, scriptPubKey: string, publicKey: string, addressIndex: number}>, outputs: Array<{address: string, satoshis: number}>, changeAddressIndex: number, blockHeight: number, blockHash: string): Promise<string>
    }

    export class ETH extends Coin{
        registerToken(contractAddress: string, symbol: string, decimals: number):Promise<void>
        signTransaction(payload: string, addressIndex: number, publicKey?: string): Promise<string>
        signMessage(message: string, addressIndex: number, publicKey?: string, isHashRequired?:boolean):Promise<string>
        signTypedData(typedData: object, addressIndex: number, publicKey?: string):Promise<string>
    }

    export class ICX extends Coin{
        signTransaction(rawTx:ICXObject, addressIndex:number, publicKey?:string):Promise<string>
    }

    export class EOS extends Coin{
        constructor(chain_id?: string)
        signTransfer(txObject:EOSObject, addressIndex:number, publicKey?:string):Promise<Array<string>>
    }

    export class BNB extends Coin{
        signTransfer(signObj: BinanceObject, addressIndex: number, returnTx: boolean, publicKey?:string): Promise<string | WalletConnectSignatrue>
        makeOrder(signObj: BinanceObject, addressIndex: number, publicKey?:string): Promise< WalletConnectSignatrue>
        cancelOrder(signObj: BinanceObject, addressIndex: number, publicKey?:string): Promise< WalletConnectSignatrue>
    }

    export interface input{
        txId: string
        vout: number
        value: number
        publicKey: string
        addressIndex: number
        redeemScript?: string
    }

    export interface output{
        address: string
        value: number
    }
    
    export interface ICXObject {
        to: string,
        from : string,
        stepLimit: string,
        nid: string,
        version: string,
        timestamp: string,
        value: string
    }

    export interface EOSObject {
        expiration: number,
        ref_block_num: number,
        ref_block_prefix: number,
        max_net_usage_words: number,
        max_cpu_usage_ms: number,
        delay_sec: number,
        context_free_actions:[],
        data: {
            from: string,
            to: string,
            quantity: string,
            memo: string
        }
    }

    export interface WalletConnectSignatrue {
        wcPublicKey: string,
        wcSignature: string
    }

    export interface BinanceObject {
        account_number: number,
        chain_id: string,
        data: any,
        memo: string,
        msgs: Array<Object>,
        sequence: string,
        source: string 
    }
}