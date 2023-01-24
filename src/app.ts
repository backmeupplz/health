import 'module-alias/register'

import * as cron from 'node-cron'
import client from '@/helpers/client'

// Straighten the back
cron.schedule('0 * * * *', async () => {
  try {
    await client.publishCast('Watch your posture! Straighten your back!')
    console.log('Cast published')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
  }
})
