const BitGoJS = require('bitgo')
const smartFee = require('smart-fee-js')
/**
 * TODO: Set your SmartFee api key as an env variable or enter it below. 
 * You can request one by emailing hello@smartfee.live.
 */
const SMART_FEE_API_KEY = process.env.SMART_FEE_API_KEY || ''
const SMART_FEE_ENV = smartFee.environments.STAGING
// const SMART_FEE_ENV = smartFee.enviornments.PRODUCTION

/**
 * TODO: Set your BitGo wallet env variables or enter them below.
 */
const BITGO_ACCESS_TOKEN = process.env.BITGO_ACCESS_TOKEN || ''
const WALLET_ID = process.env.BITGO_WALLET_ID || ''
const BITGO_WALLET_PASSWORD = process.env.WALLET_PASSWORD || ''

/**
 * TODO: Add your batched withdrawal recipients to the list below.
 * Or you can leave the list empty for testing.
 */
const recipients = [{ address: 'tb1qwu9kscuqa39kj8jquwhuzcqttjtd43aqfxpjfyt6f2jw4ed2za8qmxp936', amount: 10000 }]
//const recipients = []

async function createTransaction() {
    // Initialize your BitGo wallet.
    const bitgo = new BitGoJS.BitGo({ env: 'test', accessToken: BITGO_ACCESS_TOKEN });
    const wallet = await bitgo.coin('tbtc').wallets().get({ id: WALLET_ID })

    // Initialize your Smart Fee options.
    const smartFeeOptions = {
      apiKey: SMART_FEE_API_KEY, // Required
      // TODO: set a label for the address on your BitGo wallet to which Smart Fee will return the leftover funds.
      returnAddressLabel: 'Smart fee return address', // Optional
      // TODO: Set the same targetWalletUnspents here that you set for your BitGo builds, otherwise you can leave this empty.
      targetWalletUnspents: 100 // Optional
    }
    // Use Smart Fee to generate the BitGo send parameters. This will attempt to create a transaction to your 
    // recipients with no change output, and one output to Smart Fee to be used for fee bumping. It will only
    // create change outputs if you have targetWalletUnspents set and it's a good time to split change.
    const sendParams = await smartFee.generateBitGoSendParams(wallet, recipients, smartFeeOptions, SMART_FEE_ENV)
    
    // Send the transaction via BitGo.
    sendParams.walletPassphrase = BITGO_WALLET_PASSWORD
    const result = await wallet.sendMany(sendParams)
    console.dir(result)
}

createTransaction()