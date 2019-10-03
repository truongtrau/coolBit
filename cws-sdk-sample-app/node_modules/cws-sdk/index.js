import './global'
import { AsyncStorage } from 'react-native';
import { keyChainModifyFlow } from './src/helper/keyChainUtil';
import { Wallet, Other } from './src/Interface'
import { BTC, LTC, BCH, ETH, XRP, ZEN, EOS, ICX, BNB } from './src/cryptocurrency/'


import { initBLE, scan, connect, setCallBack } from 'cwsble'

const init = async () => {
	try {
		const SEPubKey = '043d268ced2427d805fddca0747f0c5c40863b7a5bbddf2d76cfa033ba020c8d7bdcbbe558c1fbdef90ac5e48a4a3bfa79123ab13134d015d7f9d3e1c230958a2c'
		await AsyncStorage.setItem('SEPubKey', SEPubKey);
		const regenerated = await keyChainModifyFlow();
		await initBLE()
		if(regenerated) console.log('[sdk] Re-generate keys when initialize. May need to start with registering device.')
		return { code: '0000' }
	} catch (error) {
		console.log(error);
		return { code: '9999', err_msg: 'cws-sdk init fail.' };
	}
}

export default{
	// init and functions from cwsble
	init,
	scan,
	connect,
	setCallBack,
	// interfaces
    Wallet,
	Other,
	// cryptocurrecny instances
    BTC,
	LTC,
	BCH,
	ETH,
	XRP,
	ZEN,
	EOS,
	ICX,
	BNB
}
