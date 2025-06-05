# Solana Token Dust Cleaner

A command-line utility to clean up "dust" tokens from your Solana wallet. This tool helps you burn unwanted tokens and close token accounts to reclaim rent (SOL) and declutter your wallet.

## What is Token Dust?

Token dust refers to small amounts of tokens that accumulate in your Solana wallet over time from various interactions, airdrops, failed transactions, or trading activities. Each token account requires rent (approximately 0.00203928 SOL), and these small balances can add up while cluttering your wallet.

## Features

- 🧹 **Clean Wallet**: Automatically detect and close unused token accounts
- 💰 **Reclaim Rent**: Get back the SOL locked in token account rent
- 🔒 **Safe Operation**: Interactive confirmation for each token before processing
- 💲 **Price Awareness**: Shows USD value of tokens using DexScreener API
- 🔥 **Smart Burning**: Burns token balances before closing accounts when necessary
- 📁 **Flexible Key Input**: Support for both raw private key and file-based keypairs
- ⚡ **Efficient Transactions**: Batches multiple operations into a single transaction

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Solana wallet with some SOL for transaction fees

## Installation

1. Clone the repository:
```bash
git clone https://github.com/brunopedrazza/solana-token-dust-cleaner.git
cd solana-token-dust-cleaner
```

2. Install dependencies:
```bash
npm install
```

## Usage

Run the dust cleaner:

```bash
npm start
```

The tool will guide you through the process:

1. **Choose Private Key Method**: 
   - Paste your private key directly (hidden input)
   - Load from a keypair file (JSON format)

2. **Review Token Accounts**: 
   - The tool scans your wallet for token accounts
   - For each token, it shows:
     - Token mint address
     - Token symbol (if available)
     - Balance amount
     - USD value (if available)

3. **Confirm Actions**: 
   - You'll be asked to confirm each token account closure
   - Extra confirmation for tokens worth more than $1 USD

4. **Batch Transaction**: 
   - All confirmed operations are batched into a single transaction
   - Final confirmation before sending to the network

## What Happens During Cleaning

For each token account you choose to clean:

1. **Burn Tokens** (if balance > 0): Destroys any remaining token balance
2. **Close Account**: Closes the token account and returns rent to your wallet
3. **Reclaim Rent**: ~0.00203928 SOL per account returned to your wallet

## Security Features

- 🔐 **Local Execution**: Your private key never leaves your machine
- ✅ **Interactive Confirmation**: Manual approval required for each action
- 💡 **Value Protection**: Extra confirmation for tokens with significant value
- 🛡️ **Error Handling**: Safe error handling for network issues

## Example Output

```
Cleaning token dust from [Your Wallet Address]

Do you want to close the account from token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v with 0.001 USDC ($0.00)? [Y/n] y
Do you want to close the account from token So11111111111111111111111111111111111111112 with 0 SOL? [Y/n] y

Accounts to close: 2
Rent to claim: 0.0041 SOL

Are you sure you want to close 2 token accounts? [Y/n] y

Transaction sent with success: [Transaction Signature]
https://solscan.io/tx/[Transaction Signature]
```

## Technical Details

### Dependencies

- **@solana/web3.js**: Core Solana blockchain interaction
- **@solana-program/token**: SPL Token program interactions
- **@metaplex-foundation/mpl-token-metadata**: Token metadata retrieval
- **terminal-kit**: Interactive terminal interface
- **readline-sync**: Secure input handling

### Network

- **RPC Endpoint**: https://api.mainnet-beta.solana.com
- **WebSocket**: wss://api.mainnet-beta.solana.com
- **Price Data**: DexScreener API

## Safety Considerations

⚠️ **Important Warnings**:

- Always test with small amounts first
- Double-check token values before confirming
- Keep a backup of your private key
- Ensure you want to permanently destroy token balances
- Some tokens might have future value despite current low prices

## Troubleshooting

### Common Issues

**"Insufficient SOL for transaction fees"**
- Ensure your wallet has enough SOL to cover transaction fees (~0.0001-0.001 SOL)

**"Account not found"**
- Token account might already be closed or the mint address is invalid

**"Transaction failed"**
- Network congestion or RPC issues; try again later

### Getting Help

If you encounter issues:
1. Check your internet connection
2. Verify your private key format
3. Ensure sufficient SOL balance for fees
4. Try again during lower network congestion

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is provided as-is. Users are responsible for:
- Verifying transactions before confirmation
- Understanding the implications of burning tokens
- Securing their private keys
- Any losses that may occur from using this tool

Use at your own risk. Always test with small amounts first.

## Author

Created by [Bruno Pedrazza](https://github.com/brunopedrazza)

---

**⚡ Clean up your Solana wallet and reclaim your rent today!**