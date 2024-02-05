import 'module-alias/register'

import * as cron from 'node-cron'
import reminders from '@/data/reminders'
import neynar from '@/helpers/neynar'
import env from '@/helpers/env'

// Straighten the back
for (const [cronTime, text] of reminders) {
  cron.schedule(cronTime, async () => {
    try {
      await neynar.v2.publishCast(env.NEYNAR_UUID, text)
      console.log(cronTime, text)
    } catch (error) {
      console.error(error instanceof Error ? error.message : error)
    }
  })
  console.log('Scheduled:', cronTime, text)
}
console.log('App started!')
