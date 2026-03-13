import cron from 'node-cron';
import { Tax } from '../module/Tax/tax.model';
import { logger, errorlogger } from '../shared/logger';

export const startCronJobs = () => {
  // Run every 12 AM (Midnight) Bangladesh Time
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        logger.info('Running cron job to delete draft taxes at 12 AM BD time');
        
        // Find and delete Tax data where status is 'draft'
        const result = await Tax.deleteMany({ status: 'draft' });
        
        logger.info(`Deleted ${result.deletedCount} draft tax records.`);
      } catch (error) {
        errorlogger.error('Error in cron job deleting draft taxes:', error);
      }
    },
    {
      timezone: 'Asia/Dhaka',
    }
  );
};
