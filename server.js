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
const allowedOrigins = [
  'http://localhost:5173',
  'https://surveyvoice.vercel.app',
  'https://surveyvoice-git-main-adarshas-projects-1107657e.vercel.app',
  'https://surveyvoice-asi80jmrf-adarshas-projects-1107657e.vercel.app'
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // if you're using cookies or auth headers
}));
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
app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));