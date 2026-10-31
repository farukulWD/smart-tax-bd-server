import cron from 'node-cron';
import { Tax } from '../module/Tax/tax.model';
import { paymentService } from '../module/payments/payment.service';
import { logger, errorlogger } from '../shared/logger';

export const startCronJobs = () => {
  // Every 10 minutes: settle EPS payments whose user never reached the return
  // URL (closed the tab after paying, lost connection, ...).
  cron.schedule('*/10 * * * *', async () => {
    try {
      const { checked, completed } =
        await paymentService.reconcileOpenPayments();
      if (checked) {
        logger.info(
          `Reconciled ${checked} open EPS payments, ${completed} completed.`,
        );
      }
    } catch (error) {
      errorlogger.error('Error in cron job reconciling EPS payments:', error);
    }
  });

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
