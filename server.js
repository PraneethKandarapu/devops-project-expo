require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));

// Serve HTML pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rupeetrack';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(' MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(` RupeeTrack Server is running at: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(' MongoDB Connection Error: ', err.message);
  });