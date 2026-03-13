import { rabbitMq } from './app/utils/rabbitmq';
import { Server } from 'http';
import app from './app';
import config from './app/config';
import { errorlogger, logger } from './app/shared/logger';
import connectDB from './app/utils/db';

import { initializeSocketIO} from './app/utils/socket';
import { startCronJobs } from './app/utils/cronJobs';
const connectRabbitMQ = rabbitMq.connect




async function bootstrap() {
  try {
    await connectDB();
    const server: Server = app.listen(config.port, async () => {
      console.log(`app is listening on port ${config.port}`);
      logger.info(`Server running on port ${config.port}`);

      // Start the cron jobs
      startCronJobs();

      try {
        await connectRabbitMQ('amqp://localhost');
        logger.info('Connected to RabbitMQ');

        await rabbitMq.handleNotifications();
      } catch (rabbitMQError) {
        logger.error('Failed to connect to RabbitMQ:', rabbitMQError);
      }
    });

    // Graceful shutdown handlers
    const exitHandler = async () => {
      if (server) {
        server.close(() => {
          logger.info('Server closed');
        });
      }
      try {
        await rabbitMq.closeRabbitMQ();
        logger.info('RabbitMQ connection closed');
      } catch (closeError) {
        logger.error('Error closing RabbitMQ connection:', closeError);
      }
      process.exit(1);
    };

    const unexpectedErrorHandler = async (error: unknown) => {
      errorlogger.error(error);
      await exitHandler();
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Closing server.');
      await exitHandler();
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Closing server.');
      await exitHandler();
    });

    const io = initializeSocketIO(server);

  } catch (startupError) {
    logger.error('Failed to bootstrap the application:', startupError);
    process.exit(1);
  }
}

bootstrap();
