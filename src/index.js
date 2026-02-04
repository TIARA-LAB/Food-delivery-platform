import app from './app.js';
import { config } from './config/index.js';
import { logInfo, logError } from './utils/logger.js';

let server;

const startServer = async () => {
  try {
    const PORT = config.port || process.env.PORT || 3000;

    server = app.listen(PORT, () => {
      logInfo(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });

  } catch (error) {
    logError('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = () => {
  logInfo('Server shutting down gracefully...');
  if (server) {
    server.close(() => {
      logInfo('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Event listeners
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', error);
  shutdown();
});
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Promise Rejection:', reason);
  shutdown();
});

startServer();
