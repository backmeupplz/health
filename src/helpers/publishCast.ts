import {
  FarcasterNetwork,
  getInsecureHubRpcClient,
  HubAsyncResult,
  Message,
  NobleEd25519Signer,
  KEY_GATEWAY_ADDRESS,
  keyGatewayABI,
  ViemLocalEip712Signer,
  makeCastAdd,
  CastType,
} from '@farcaster/hub-nodejs'
import env from '@/helpers/env'
import { mnemonicToAccount, toAccount } from 'viem/accounts'
import { ed25519 } from '@noble/curves/ed25519'
import {
  createWalletClient,
  fromHex,
  http,
  publicActions,
  toHex,
  zeroAddress,
} from 'viem'
import {
  writeContract,
  simulateContract,
  waitForTransactionReceipt,
} from 'viem/actions'
import { optimism } from 'viem/chains'

const HUB_URL = '34.172.154.21:2283'
const FC_NETWORK = FarcasterNetwork.MAINNET
const FID = 8304
const account = mnemonicToAccount(env.MNEMONIC)
const hubClient = getInsecureHubRpcClient(HUB_URL)
const walletClient = createWalletClient({
  account,
  chain: optimism,
  transport: http(env.OP_PROVIDER_URL),
}).extend(publicActions)
const KeyContract = {
  abi: keyGatewayABI,
  address: KEY_GATEWAY_ADDRESS,
  chain: optimism,
}

async function getSigner() {
  if (env.SIGNER_PRIVATE_KEY !== zeroAddress) {
    const privateKeyBytes = fromHex(env.SIGNER_PRIVATE_KEY, 'bytes')
    const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes)
    console.log(
      `Using existing signer with public key: ${toHex(publicKeyBytes)}`
    )
    return privateKeyBytes
  }
  const privateKey = ed25519.utils.randomPrivateKey()
  const publicKey = toHex(ed25519.getPublicKey(privateKey))

  console.log(`Created new signer with private key: ${toHex(privateKey)}`)

  // To add a key, we need to sign the metadata with the fid of the app we're adding the key on behalf of
  // We'll use our own fid and custody address for simplicity. This can also be a separate App specific fid.
  const localAccount = toAccount(account)
  const eip712signer = new ViemLocalEip712Signer(localAccount)
  const metadata = await eip712signer.getSignedKeyRequestMetadata({
    requestFid: BigInt(FID),
    key: fromHex(publicKey, 'bytes'),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 60), // 1 hour from now
  })

  const metadataHex = toHex(metadata.unwrapOr(new Uint8Array()))

  const { request: signerAddRequest } = await simulateContract(walletClient, {
    ...KeyContract,
    functionName: 'add',
    args: [1, publicKey, 1, metadataHex], // keyType, publicKey, metadataType, metadata
  })

  const signerAddTxHash = await writeContract(walletClient, signerAddRequest)
  console.log(`Waiting for signer add tx to confirm: ${signerAddTxHash}`)
  await waitForTransactionReceipt(walletClient, { hash: signerAddTxHash })
  console.log(`Registered new signer with public key: ${publicKey}`)
  console.log('Sleeping 30 seconds to allow hubs to pick up the signer tx')
  await new Promise((resolve) => setTimeout(resolve, 30000))
  return privateKey
}

const submitMessage = async (resultPromise: HubAsyncResult<Message>) => {
  const result = await resultPromise
  if (result.isErr()) {
    throw new Error(`Error creating message: ${result.error}`)
  }
  const messageSubmitResult = await hubClient.submitMessage(result.value)
  if (messageSubmitResult.isErr()) {
    throw new Error(
      `Error submitting message to hub: ${messageSubmitResult.error}`
    )
  }
}

export default async function publishCast(text: string) {
  console.log('Attempting to publish cast:', text)
  const signer = new NobleEd25519Signer(await getSigner())
  const dataOptions = {
    fid: FID,
    network: FC_NETWORK,
  }
  console.log('Got signer, publishing cast')
  return submitMessage(
    makeCastAdd(
      {
        text,
        embedsDeprecated: [],
        mentions: [],
        mentionsPositions: [],
        embeds: [],
        type: CastType.CAST,
      },
      dataOptions,
      signer
    )
  )
}