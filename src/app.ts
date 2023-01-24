import 'module-alias/register'

import * as cron from 'node-cron'
import client from '@/helpers/client'
import reminders from '@/data/reminders'

// Straighten the back
for (const [cronTime, text] of reminders) {
  cron.schedule(cronTime, async () => {
    try {
      await client.publishCast(text)
      console.log(cronTime, text)
    } catch (error) {
      console.error(error instanceof Error ? error.message : error)
    }
  })
  console.log('Scheduled:', cronTime, text)
}
console.log('App started!')
