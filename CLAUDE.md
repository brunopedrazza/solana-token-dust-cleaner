# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` - Runs the main dust cleaning script using tsx
- `npm install` - Install dependencies

## Architecture

This is a Solana token dust cleaner utility that helps users close empty or low-value token accounts to reclaim rent. The project is a single TypeScript script that:

1. **User Input**: Prompts user for private key (either pasted or from file)
2. **Token Account Discovery**: Fetches all token accounts owned by the user
3. **Price & Metadata Fetching**: Gets token prices from DexScreener API and metadata from Metaplex
4. **Interactive Confirmation**: Asks user to confirm closing each account, showing token symbol, balance, and USD value
5. **Transaction Building**: Creates burn and close instructions for confirmed accounts
6. **Execution**: Sends a single transaction to burn tokens and close accounts, reclaiming rent

## Key Dependencies

- `@solana/web3.js` v2.0.0 - New Solana web3 library for transaction handling
- `@solana-program/token` - Token program instructions (burn, close)
- `@metaplex-foundation/mpl-token-metadata` - Token metadata fetching
- `terminal-kit` - Interactive terminal UI
- `readline-sync` - User input handling

## Code Organization

- `src/script.ts` - Single main script containing all functionality
- Uses TypeScript with strict mode enabled
- Targets ES2016 with CommonJS modules

## Key Functions

- `getUserPrivateKey()` - Interactive private key input (src/script.ts:14)
- `fetchTokenPrice()` - Gets token prices from DexScreener (src/script.ts:55)
- `getTokenMetadata()` - Fetches Metaplex metadata (src/script.ts:70)
- `confirmBurnAndClose()` - User confirmation with price warnings (src/script.ts:111)
- Main execution flow in IIFE (src/script.ts:129)