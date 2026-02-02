import dotenv from 'dotenv';
import app from './app.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});

// graceful shutdown
process.on('SIGTERM', () => {
 console.log('SIGTERM received. Shutting down...');
 process.exit(0);
});
