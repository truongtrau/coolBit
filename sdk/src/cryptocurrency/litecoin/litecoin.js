import * as Helper from '../../helper'
const COINTYPE = require('../../config/coinType.js');
import BTC from '../bitcoin/bitcoin'

export default class LTC extends BTC{
  constructor(){
    super()
    this.coinType = COINTYPE.LTC.type
    this.network = COINTYPE.LTC.network.new
    this.PARAMS = COINTYPE.LTC.PARAMS
  }

  /**
   * Check SE Version and get available network
   */
  async init(){
    const isNew = await Helper.Other.isAvailable('A3');
    if (isNew) {
      this.network = COINTYPE.LTC.network.new; // Support address M prefix
    } else {
      this.network = COINTYPE.LTC.network.old;
    }
  };
}

