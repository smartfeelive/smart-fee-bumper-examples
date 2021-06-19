const BitGoJS = require('bitgo')
const fetch = require('node-fetch')

/**
 * TODO: Enter your SmartFee api key below.
 */
const SMART_FEE_API_KEY = process.env.SMART_FEE_API_KEY || ''

/**
 * TODO: Enter your BitGo wallet info below.
 */
const BITGO_ACCESS_TOKEN = process.env.BITGO_ACCESS_TOKEN || ''
const WALLET_ID = process.env.BITGO_WALLET_ID || ''
const BITGO_WALLET_PASSWORD = process.env.WALLET_PASSWORD || ''

/**
 * TODO: Add your batched withdrawal recipients to the list below.
 * Or you can leave it empty for testing.
 */
const recipients = []

async function createTransaction() {
    const bitgo = new BitGoJS.BitGo({ env: 'test', accessToken: BITGO_ACCESS_TOKEN });
    const wallet = await bitgo.coin('tbtc').wallets().get({ id: WALLET_ID })

    // First generate a new native segwit address on your BitGo wallet.
    const label = 'SmartFee Return Address'
    const newAddress = await wallet.createAddress({ chain: 20, label })
    console.log(`Generated bitgo address: ${newAddress.address} with label '${label}'`)
    // Post this address to SmartFee. SmartFee will return the leftover funds from fee-bumping to the 
    // most recent address you post so it is recommended to post a new address before each use.
    await fetch(`https://api-staging.smartfee.live/bumper/return_address`, {
        headers: { 
          'x-api-key': SMART_FEE_API_KEY,
          'content-type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
          return_address: newAddress.address
        })
    })

    // Now request an address from SmartFee. You will send funds here to fund the fee-bumping.
    // This can be re-used, but it is recommended to request a new address before each use.
    const response = await fetch(`https://api-staging.smartfee.live/bumper/address`, {
        headers: { 
          'X-API-KEY': SMART_FEE_API_KEY,
          'accept': 'application/json'
        },
        method: 'POST'
    })
    const smartFeeAddress = (await response.json()).address
    console.log(`Generated SmartFee address: ${smartFeeAddress}`)
    
    // Get the current fee rate from Smart Fee. Both Testnet and Mainnet use Mainnet fee information
    // because Testnet's fee market is non-existent so is bad for testing.
    const smartFeeResponse = await fetch(`https://api-staging.smartfee.live/bumper/fee`, {
        headers: {
            'X-API-KEY': SMART_FEE_API_KEY,
            'accept': 'application/json'
        }
    })
    const satsPerKb = (await smartFeeResponse.json()).current_sats_per_kb
    console.log(`SmartFee is reporting the current next block min-fee-rate to be ${satsPerKb} sats/kb`)

    // Append an output to your recipients sending some funds to the SmartFee address.
    // The last recipient is to SmartFee. Be sure to send enough so that SmartFee can use it for fee bumping.
    console.log(`Adding a SmartFee output to your recipients:`)
    const smartFeeOutput = { address: smartFeeAddress, amount: 100000 }
    console.dir(smartFeeOutput)
    recipients.push(smartFeeOutput)

    // Send a BitGo transaction with a custom fee rate:
    const sendParams = {
        feeRate: satsPerKb,
        recipients,
        walletPassphrase: BITGO_WALLET_PASSWORD,
        // Be sure to set these two parameters below as well. Spending unconfirmed change can mess with SmartFee's
        // algorithm. Make sure your wallet has a sufficient distribution of utxos to be able to handle this if you
        // have high volume.
        minConfirms: 1,
        enforceMinConfirmsForChange: true
    }
    const result = await wallet.sendMany(sendParams)
    console.log(`\n\nSigned and sending transaction with txid ${result.txid} at fee rate ${satsPerKb} sats/kb`)
    console.log(`SmartFee append replaceable CPFP transactions to this transaction so it confirms in the next block.`)
    console.log(`SmartFee will bump the transaction any time its net fee rate falls below the current min-fee-rate of the next block.`)
    console.log(`You can view the current min-fee-rate with the following command:\n\n`)
    console.log(`curl https://api.smartfee.live/bumper/fee`)
}

createTransaction()