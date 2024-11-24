import { address, appendTransactionMessageInstructions, createKeyPairSignerFromBytes, createSolanaRpc, createSolanaRpcSubscriptions, createTransactionMessage, getComputeUnitEstimateForTransactionMessageFactory, getProgramDerivedAddress, getSignatureFromTransaction, IInstruction, mainnet, pipe, prependTransactionMessageInstruction, sendAndConfirmTransactionFactory, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners, getAddressEncoder, SolanaError } from "@solana/web3.js"
import { getBurnCheckedInstruction, getCloseAccountInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { getSetComputeUnitLimitInstruction } from "@solana-program/compute-budget"
import { getMetadataAccountDataSerializer, MetadataAccountData } from '@metaplex-foundation/mpl-token-metadata'
import bs58 from "bs58"
import fs from "fs"
import readlineSync from "readline-sync"

const term = require('terminal-kit').terminal

const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com")
const rpcSubscriptions = createSolanaRpcSubscriptions(mainnet("wss://api.mainnet-beta.solana.com"))

async function getUserPrivateKey(): Promise<string> {
    term.cyan('Do you want to paste your raw private key or load from a file?\n')

    const items = [
        'Paste it',
        'Read from file'
    ]

    const index = await new Promise<number>((resolve) => {
        term.singleColumnMenu(items, function (_: any, response: { selectedIndex: number }) {
            resolve(response.selectedIndex)
        })
    })
    term.grabInput(false)

    if (index === 0) {
        const privateKey = readlineSync.question('\nEnter your private key: ', { hideEchoBack: true, })
        console.log()
        return privateKey
    } else {
        term.cyan('\nChoose a file: ')

        const filePath = await new Promise<string>((resolve) => {
            term.fileInput({ baseDir: '../' }, function (error: any, input: string) {
                if (error) {
                    term.red.bold("\nAn error occurs: " + error + "\n")
                }
                else {
                    resolve(input)
                }
            }
            )
        })
        term.grabInput(false)
        console.log("\n")

        const keypairBytes = JSON.parse(fs.readFileSync(filePath).toString())
        return bs58.encode(Buffer.from(keypairBytes))
    }
}

async function fetchTokenPrice(mint: string): Promise<number | undefined> {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        method: 'GET',
        headers: {},
    })
    const data = await response.json()
    if (data.pairs) {
        const pair = data.pairs.find((p: any) => p.chainId === 'solana')
        if (pair) {
            return pair.priceUsd
        }
    }
    return;
}

async function getTokenMetadata(mint: string): Promise<MetadataAccountData | undefined> {
    const METAPLEX_METADATA_PROGRAM_ID = address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    const mintAddress = address(mint)

    const [metadataPda] = await getProgramDerivedAddress({
        programAddress: METAPLEX_METADATA_PROGRAM_ID,
        seeds: [Buffer.from('metadata'), getAddressEncoder().encode(METAPLEX_METADATA_PROGRAM_ID), getAddressEncoder().encode(mintAddress)]
    })

    const accountInfo = await rpc.getAccountInfo(metadataPda, { encoding: "base64" }).send()
    if (accountInfo.value === null) {
        return
    }

    const metadataBuffer = Buffer.from(accountInfo.value.data[0], "base64")

    const [metadataAccountData] = getMetadataAccountDataSerializer().deserialize(metadataBuffer, 0)

    return metadataAccountData
}

async function generateQuestion(balance: number, tokenMint: string, tokenSymbol: string | undefined, tokenPrice: number | undefined): Promise<string> {
    let question = "\nDo you want to "
    if (balance > 0) {
        question += "burn and close "
    } else {
        question += "close "
    }
    question += `the account from token ${tokenMint} with `
    if (tokenSymbol) {
        question += `${balance} ${tokenSymbol}`
        if (tokenPrice && balance > 0) {
            question += ` ($${(tokenPrice * balance).toFixed(2)})`
        }
    } else {
        question += `${balance} tokens`
    }
    question += "? [Y/n] "
    return question
}

async function confirmBurnAndClose(balance: number, tokenMint: string): Promise<boolean> {
    const tokenPrice = await fetchTokenPrice(tokenMint)
    const tokenMetadata = await getTokenMetadata(tokenMint)
    const shouldClose = readlineSync.question(await generateQuestion(balance, tokenMint, tokenMetadata?.symbol, tokenPrice))
    if (shouldClose && shouldClose.toLowerCase() !== 'y' && shouldClose.toLowerCase() !== 'Y') {
        return false
    }
    const balanceInUsd = tokenPrice ? tokenPrice * balance : 0
    if (balanceInUsd > 1) {
        const confirmHighBalance = readlineSync.question(`Are you sure you want to close the account with a balance of $${balanceInUsd.toFixed(2)}? [Y/n] `)
        if (confirmHighBalance && confirmHighBalance.toLowerCase() !== 'y' && confirmHighBalance.toLowerCase() !== 'Y') {
            return false
        }
    }
    return true
}


(async () => {
    try {
        process.on('SIGINT', () => {
            console.log("\nProcess interrupted. Exiting...")
            term.processExit(0)
        });

        const privateKeyBase58 = await getUserPrivateKey()
        const ownerSigner = await createKeyPairSignerFromBytes(bs58.decode(privateKeyBase58))
        const ownerAddress = ownerSigner.address

        term.cyan(`Cleaning token dust from ${ownerAddress}\n`)

        const getComputeUnitEstimateForTransactionMessage = getComputeUnitEstimateForTransactionMessageFactory({ rpc })

        const tokenAccountsResponse = await rpc.getTokenAccountsByOwner(ownerAddress, { programId: TOKEN_PROGRAM_ADDRESS }, { encoding: "jsonParsed" }).send()

        let lamportsToReceiveBack = BigInt(0)
        let accountsToClose = 0
        let instructions: IInstruction[] = []
        await Promise.all(tokenAccountsResponse.value.map(async tokenAccount => {
            const mint = tokenAccount.account.data.parsed.info.mint
            const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount
            const balance = tokenAmount.uiAmount as number
            const confirmation = await confirmBurnAndClose(balance, mint)
            if (!confirmation) {
                return
            }
            accountsToClose++
            lamportsToReceiveBack = lamportsToReceiveBack + BigInt(tokenAccount.account.lamports)
            term.green(`Closing account ${tokenAccount.pubkey}\n`)

            if (balance > 0) {
                instructions.push(getBurnCheckedInstruction({
                    account: tokenAccount.pubkey,
                    mint: mint,
                    authority: ownerSigner,
                    amount: BigInt(tokenAmount.amount),
                    decimals: tokenAmount.decimals
                }))
            }
            instructions.push(getCloseAccountInstruction({
                account: tokenAccount.pubkey,
                destination: ownerAddress,
                owner: ownerSigner
            }))
        }));

        if (accountsToClose === 0) {
            term.red("\nNo accounts to close")
            term.processExit(0)
            return
        }

        term.cyan(`\nAccounts to close: ${accountsToClose}\n`)
        term.cyan(`Rent to claim: ${(Number(lamportsToReceiveBack) / 10 ** 9).toFixed(4)} SOL\n`)

        const lastConfirmation = readlineSync.question(`\nAre you sure you want to close ${accountsToClose} token accounts? [Y/n] `)
        if (lastConfirmation && lastConfirmation.toLowerCase() !== 'y' && lastConfirmation.toLowerCase() !== 'Y') {
            term.processExit(0)
            return
        }

        console.log("\n")
        await term.spinner()
        term(" Sending transaction to the network...\n")

        const latestBlockhash = await rpc.getLatestBlockhash({ commitment: "finalized" }).send()
        let transactionMessage = pipe(createTransactionMessage({ version: "legacy" }),
            tx => appendTransactionMessageInstructions(instructions, tx),
            tx => setTransactionMessageFeePayer(ownerAddress, tx),
            tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash.value, tx)
        )

        const computeUnitsEstimate = await getComputeUnitEstimateForTransactionMessage(transactionMessage)

        transactionMessage = prependTransactionMessageInstruction(
            getSetComputeUnitLimitInstruction({ units: computeUnitsEstimate }), transactionMessage
        )

        const signedTransaction = await signTransactionMessageWithSigners(transactionMessage)

        const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })
        await sendAndConfirmTransaction(signedTransaction, { commitment: "confirmed", skipPreflight: false, preflightCommitment: "finalized" })
        const signature = getSignatureFromTransaction(signedTransaction)

        term.green(`\nTransaction sent with success: ${signature}\n`)
        term(`\nhttps://solscan.io/tx/${signature}`)
    } catch (error) {
        if (error instanceof SolanaError) {
            term.red(`\nAn error occurred: ${error.message}`)
        } else {
            throw error
        }
    }

    term.processExit(0)
})();