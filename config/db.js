const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected successfully');

    mongoose.connection.on('connected', () => {
      console.log(`🔍 Connected to DB: ${mongoose.connection.name}`);
    });

    // List all collections
    mongoose.connection.db.listCollections().toArray((err, collections) => {
      if (err) console.error(err);
      else console.log('📂 Collections:', collections.map(c => c.name));
    });

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
