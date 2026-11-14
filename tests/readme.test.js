import { readFileSync } from 'node:fs'

import { describe, expect, jest, test } from '@jest/globals'

import MoonPayProtocol from '../index.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const { name } = JSON.parse(read('../package.json'))
const README_IMPORT = `import MoonPayProtocol from '${name}'\n`

// The README example that imports the package, run as an async function body so top-level await works.
const quickStart = [...read('../README.md').matchAll(/```javascript\n([\s\S]*?)```/g)]
  .map(([, code]) => code)
  .find((code) => code.startsWith(README_IMPORT))

const AsyncFunction = (async () => {}).constructor

const MOCK_CURRENCIES = [
  { type: 'crypto', code: 'eth', name: 'Ethereum', decimals: 18, precision: 5, metadata: { networkCode: 'ethereum' } },
  { type: 'fiat', code: 'usd', name: 'US Dollar', decimals: 2, precision: 2 }
]
const MOCK_BUY_QUOTE = { baseCurrencyAmount: 100, quoteCurrencyAmount: 0.03, feeAmount: 3.99, extraFeeAmount: 0, networkFeeAmount: 0.5, quoteCurrencyPrice: 3000 }
const MOCK_SELL_QUOTE = { baseCurrencyAmount: 0.05, quoteCurrencyAmount: 147.5, feeAmount: 2.5, extraFeeAmount: 0, baseCurrencyPrice: 3000 }

const respond = (body) => ({ ok: true, json: async () => body })

const mockFetch = jest.fn(async (url, init) => {
  if (url.startsWith('https://your-backend.example.com/')) {
    return respond({ signedUrl: `${JSON.parse(init.body).urlForSignature}&signature=mock` })
  }
  if (url.includes('/buy_quote?')) return respond(MOCK_BUY_QUOTE)
  if (url.includes('/sell_quote?')) return respond(MOCK_SELL_QUOTE)
  if (url.includes('/v3/currencies?')) return respond(MOCK_CURRENCIES)
  throw new Error(`Unexpected request: ${url}`)
})

// Every MoonPay request the example made, quotes by URL and widgets by the URL sent for signing.
const moonPayRequests = () => mockFetch.mock.calls
  .map(([url, init]) => new URL(init.body ? JSON.parse(init.body).urlForSignature : url))
  .filter((url) => url.pathname !== '/v3/currencies')
  .map((url) => [url.host + url.pathname, Object.fromEntries(url.searchParams)])

describe('README', () => {
  test('should import the package by its published name', () => {
    expect(quickStart).toBeDefined()
  })

  test('quick start should send $100.00 and 0.05 ETH to MoonPay', async () => {
    global.fetch = mockFetch
    const console = { log: jest.fn() }

    const run = new AsyncFunction('MoonPayProtocol', 'console', `${quickStart.slice(README_IMPORT.length)}
      return { buyQuote, buyUrl, sellQuote, sellUrl }`)
    const { buyQuote, buyUrl, sellQuote, sellUrl } = await run(MoonPayProtocol, console)

    expect(moonPayRequests()).toEqual([
      ['api.moonpay.com/v3/currencies/eth/buy_quote', expect.objectContaining({ baseCurrencyAmount: '100.00' })],
      ['buy-sandbox.moonpay.com/', expect.objectContaining({ baseCurrencyAmount: '100.00', walletAddress: '0xabc' })],
      ['api.moonpay.com/v3/currencies/eth/sell_quote', expect.objectContaining({ baseCurrencyAmount: '0.05000' })],
      ['sell-sandbox.moonpay.com/', expect.objectContaining({ baseCurrencyAmount: '0.05000', refundWalletAddress: '0xabc' })]
    ])

    expect(buyQuote).toMatchObject({ cryptoAmount: 30_000_000_000_000_000n, fiatAmount: 10_000n, fee: 449n })
    expect(sellQuote).toMatchObject({ cryptoAmount: 50_000_000_000_000_000n, fiatAmount: 14_750n, fee: 250n })
    expect(buyUrl).toMatch(/&signature=mock$/)
    expect(sellUrl).toMatch(/&signature=mock$/)
  })
})
