# @moonpay/wdk-protocol-fiat-moonpay

Note: This package is in beta. Please test in a dev setup first.

A MoonPay on-ramp and off-ramp module for WDK (Wallet Development Kit) by Tether. You can generate signed or unsigned URLs for the MoonPay widget, get quotes for buying and selling crypto, and read protocol-related data. This package can be used in both frontend and backend environments.

See the [module documentation](https://docs.wdk.tether.io/sdk/fiat-modules/fiat-moonpay/).

## 🔍 About WDK

This is part of WDK (Wallet Development Kit). WDK helps you build safe, non‑custody wallets. Read more at https://docs.wdk.tether.io/.

## 🌟 Features

- Generate signed or unsigned widget URL to buy Crypto (On-ramp)
- Generate signed or unsigned widget URL to sell Crypto (Off-ramp)
- Get quotes (buy and sell)
- Get supported currencies, countries
- Get buy/sell transaction details

## ⬇️ Installation

```bash
npm install @moonpay/wdk-protocol-fiat-moonpay
```

## 🚀 Quick Start

### Basic Usage

```javascript
import MoonPayProtocol from '@moonpay/wdk-protocol-fiat-moonpay'

const signUrl = async (urlForSignature) => {
  const response = await fetch('https://your-backend.example.com/moonpay/sign-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ urlForSignature })
  })

  if (!response.ok) {
    throw new Error(`Failed to sign MoonPay URL: ${response.status} ${response.statusText}`)
  }

  const { signedUrl } = await response.json()

  return signedUrl
}

// Initialize protocol
const moonpay = new MoonPayProtocol(undefined, {
  apiKey: 'YOUR_PUBLISHABLE_API_KEY',
  signUrl,
  environment: 'sandbox'
})

// Get a buy quote for $100.00
const buyQuote = await moonpay.quoteBuy({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  fiatAmount: 10_000n // $100.00, in cents
})

// buyQuote.cryptoAmount is a bigint in wei; buyQuote.fiatAmount and buyQuote.fee are bigints in cents
console.log('ETH for $100.00 (wei):', buyQuote.cryptoAmount)

// Generate a buy widget URL for $100.00
const { buyUrl } = await moonpay.buy({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  fiatAmount: 10_000n, // $100.00, in cents
  recipient: '0xabc'
})

console.log('Buy URL:', buyUrl)

// Get a sell quote for 0.05 ETH
const sellQuote = await moonpay.quoteSell({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  cryptoAmount: 50_000_000_000_000_000n // 0.05 ETH, in wei (ETH has 18 decimals)
})

console.log('USD for 0.05 ETH (cents):', sellQuote.fiatAmount)

// Generate a sell widget URL for 0.05 ETH
const { sellUrl } = await moonpay.sell({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  cryptoAmount: 50_000_000_000_000_000n, // 0.05 ETH, in wei
  refundAddress: '0xabc'
})
```

### Amounts

Every amount is an integer in the currency's smallest unit:

- `fiatAmount` is in the fiat currency's smallest unit, such as cents for USD. `10_000n` is $100.00, and `100n` is $1.00.
- `cryptoAmount` is in the crypto asset's base unit, such as wei for ETH. ETH has 18 decimals, so `50_000_000_000_000_000n` is 0.05 ETH.

Both accept a `bigint` or a `number`. Prefer `bigint`: wei amounts are usually above `Number.MAX_SAFE_INTEGER` (about 9 × 10^15), where a `number` can no longer hold every integer exactly. `getSupportedFiatCurrencies()` and `getSupportedCryptoAssets()` return each currency's `decimals`, which you need to convert a display amount into the smallest unit.

The module converts the amount to whole units for MoonPay and rounds it down to the number of decimal places MoonPay accepts for that currency (its `precision`). Anything below that is dropped. For example, a `number` such as `100.99` (cents) is sent as $1.00.

Quotes use the same units. `cryptoAmount`, `fiatAmount` and `fee` are `bigint`s, and `fee` is always in the fiat currency's smallest unit. `rate` is a string in whole units: `"3000.5"` means 1 ETH costs 3000.50 USD. `metadata` is MoonPay's response as is, so its amounts are plain numbers in whole units (`baseCurrencyAmount: 100` for $100).

## 📚 API Reference

### MoonPayProtocol

Main class for MoonPay integration.

#### Constructor

```javascript
new MoonPayProtocol(account, config)
```

Parameters:
- `account` (IWalletAccount | IWalletAccountReadOnly | undefined): The wallet account to use to interact with the protocol
- `config` (object): The protocol config
  - `apiKey` (string): Your publishable Moonpay API key.
  - `signUrl` (function, optional): Callback used to sign buy/sell URLs via a trusted provider (e.g., a backend service). If not provided, the protocol returns unsigned URLs.
  - `cacheTime` (number, optional): The duration in milliseconds to cache supported currencies.
  - `environment` ("production" | "sandbox", optional): The environment to use for MoonPay endpoints and widget URLs. Defaults to "production". Use "production" for live transactions and "sandbox" for testing with non-real funds.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `buy(options)` | Generates a widget URL to purchase crypto | `Promise<BuyResult>` |
| `sell(options)` | Generates a widget URL to sell crypto | `Promise<SellResult>` |
| `quoteBuy(options)` | Gets a quote for a crypto asset purchase | `Promise<MoonPayBuyQuote>` |
| `quoteSell(options)` | Gets a quote for a crypto asset sale | `Promise<MoonPaySellQuote>` |
| `getTransactionDetail(txId, direction)` | Retrieves the details of a transaction | `Promise<MoonPayTransactionDetail>` |
| `getSupportedCryptoAssets()` | Retrieves a list of supported crypto assets | `Promise<MoonPaySupportedCryptoAsset[]>` |
| `getSupportedFiatCurrencies()` | Retrieves a list of supported fiat currencies | `Promise<MoonPaySupportedFiatCurrency[]>` |
| `getSupportedCountries()` | Retrieves a list of supported countries | `Promise<MoonPaySupportedCountry[]>` |

#### `buy(options)`
Generates a widget URL to purchase crypto.

Options:
- `fiatCurrency` (string): The fiat currency code (e.g., 'usd').
- `cryptoAsset` (string): The crypto asset code (e.g., 'eth').
- `fiatAmount` (bigint | number, optional): The fiat amount to spend, in the currency's smallest unit (e.g., `10_000n` for $100.00).
- `cryptoAmount` (bigint | number, optional): The crypto amount to buy, in the asset's base unit (e.g., `10n ** 18n` for 1 ETH).
- `recipient` (string, optional): The wallet address to receive funds. If not provided, uses the account address.
- `config` (object, optional): Additional MoonPay widget parameters.

Pass exactly one of `fiatAmount` and `cryptoAmount`.

#### `sell(options)`
Generates a widget URL to sell crypto.

Options:
- `fiatCurrency` (string): The fiat currency code (e.g., 'usd').
- `cryptoAsset` (string): The crypto asset code (e.g., 'eth').
- `fiatAmount` (bigint | number, optional): The fiat amount to receive, in the currency's smallest unit (e.g., `10_000n` for $100.00).
- `cryptoAmount` (bigint | number, optional): The crypto amount to sell, in the asset's base unit (e.g., `10n ** 18n` for 1 ETH).
- `refundAddress` (string, optional): The wallet address for refunds. If not provided, uses the account address.
- `config` (object, optional): Additional MoonPay widget parameters.

Pass exactly one of `fiatAmount` and `cryptoAmount`.

#### `quoteBuy(options)`
Gets a quote for a crypto asset purchase.

Options:
- `fiatCurrency` (string): The fiat currency code.
- `cryptoAsset` (string): The crypto asset code.
- `fiatAmount` (bigint | number, optional): The fiat amount to spend, in the currency's smallest unit (e.g., `10_000n` for $100.00).
- `cryptoAmount` (bigint | number, optional): The crypto amount to buy, in the asset's base unit (e.g., `10n ** 18n` for 1 ETH).
- `config` (object, optional): Additional MoonPay quote parameters.

Pass exactly one of `fiatAmount` and `cryptoAmount`. The quote's amounts use the same units; see [Amounts](#amounts).

#### `quoteSell(options)`
Gets a quote for a crypto asset sale.

Options:
- `fiatCurrency` (string): The fiat currency code.
- `cryptoAsset` (string): The crypto asset code.
- `cryptoAmount` (bigint | number): The crypto amount to sell, in the asset's base unit (e.g., `10n ** 18n` for 1 ETH). Required.
- `config` (object, optional): Additional MoonPay quote parameters.

The quote's amounts use the same units; see [Amounts](#amounts).

#### `getTransactionDetail(txId, direction)`
Retrieves the details of a transaction.

Parameters:
- `txId` (string): The transaction ID.
- `direction` ('buy' | 'sell'): The direction of the transaction. Defaults to 'buy'.

#### `getSupportedCryptoAssets()`
Retrieves a list of supported crypto assets.

#### `getSupportedFiatCurrencies()`
Retrieves a list of supported fiat currencies.

#### `getSupportedCountries()`
Retrieves a list of supported countries.

## 📝 Notes

- Works with networks and currencies supported by MoonPay.
- Check MoonPay documentation for the full list of widget parameters, supported cryptocurrencies and regions.
- The package provides the baseline for MoonPay integration. To fully utilize the power of MoonPay widget, take a look at [MoonPay documentation](https://dev.moonpay.com/docs/ramps-sdk-buy-params) for the full list of parameters.
- The `apiKey` can be retrieved through [MoonPay dashboard](https://dashboard.moonpay.com/).
- It is highly recommended to test the entire buy/sell flow in the `sandbox` environment. Read more [here](https://dev.moonpay.com/docs/faq-sandbox-testing).

## 🔒 Security Considerations

- Keep your `secretKey` safe on your backend. Expose a backend signing API to clients, and have `signUrl` call that API to retrieve the signed MoonPay URL.

## 🛠️ Development

### Building

```bash
# Install dependencies
npm install

# Build TypeScript definitions
npm run build:types

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📜 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🆘 Support

For support, please open an issue on the GitHub repository.
