const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
app.use(cors());
const API_BASE_URL = 'http://localhost:5000/api';

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Routes Integration
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/articles', require('./routes/articleRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/subscribe', require('./routes/subscriptionRoutes'));
app.use('/api/payouts', require('./routes/payoutRoutes'));

// Health-check Endpoint
app.get('/api/health', (req, res) => res.json({ status: 'API is running successfully' }));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
















// Fetch all published articles from backend
async function loadPublishedArticles() {
  try {
    const response = await fetch(`${API_BASE_URL}/articles?status=published`);
    const articles = await response.json();
    TWStore.articles = articles;
    TWStore.notifyListeners(); // Triggers UI re-render
  } catch (error) {
    console.error('Error fetching articles:', error);
  }
}

// Authenticate user via backend
async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (response.ok) {
      TWStore.currentUser = data.user;
      localStorage.setItem('token', data.token); // Store Auth Token
      TWStore.notifyListeners();
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}














// Inside your backend Express login route (/api/login)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  // ... your authentication logic here ...

  // IMPORTANT: Make sure response includes data.user.role!
  return res.status(200).json({
    token: "your-jwt-token-here",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role // Must return "admin" or "author"
    }
  });
});