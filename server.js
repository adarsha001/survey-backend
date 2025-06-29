require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const surveyRoutes = require('./routes/surveyRoutes.js');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/surveys',surveyRoutes );
app.use('/auth', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));