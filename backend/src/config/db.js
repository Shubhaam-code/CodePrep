const mongoose = require('mongoose');

/**
 * Establishes connection to MongoDB using setting from MONGODB_URI environment variable.
 */
const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI;
    if (!connUri) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    await mongoose.connect(connUri);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database Connection Error:', error.message);
    process.exit(1);
  }
};

// Handle connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error(`MongoDB error: ${err}`);
});

module.exports = connectDB;
