import * as dotenv from 'dotenv'
import { cleanEnv, str } from 'envalid'
import { cwd } from 'process'
import { resolve } from 'path'
import { zeroAddress } from 'viem'

dotenv.config({ path: resolve(cwd(), '.env') })

// eslint-disable-next-line node/no-process-env
export default cleanEnv(process.env, {
  MNEMONIC: str(),
  OP_PROVIDER_URL: str(),
  SIGNER_PRIVATE_KEY: str<`0x${string}`>({ default: zeroAddress }),
})
