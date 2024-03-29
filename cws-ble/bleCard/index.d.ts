declare module 'cwsble' {
  interface req {
    'event': string
    status: string
    data: object
  }

  export function addRequest(req: req): void; 
  export function trigger(params: any): void; // TODO: remove any
  export function scan(): void;
  export function stopScan():void;
  export function connect(_peripheralId: string): void;
  export function disconnect():Promise<object>
  export function init(
    onPeripheralFound?: Function,
    onPeripheralDisconnected?: Function,
    onServicesReady?: Function,
    onBleError?: Function,
    eventListener?: Function,
    onRequireServicesReady?: Function
  ):Promise<object>;
  export function cancelRequest():void;
}
