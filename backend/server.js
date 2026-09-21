import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import Course from './models/Course.js';
import User from './models/User.js';

dotenv.config();

// Auto-reloaded with updated environment configuration
const app = express();

// Connect Database
await connectDB();

// Auto-seed database if empty (e.g. using MongoMemoryServer)
try {
  const courseCount = await Course.countDocuments();
  if (courseCount === 0) {
    console.log('[Server Startup] Database is empty. Seeding initial data...');
    await User.create({
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@aintuitionacademy.com',
      password: 'adminpassword123',
      is_staff: true,
      is_active: true
    });
    
    await Course.insertMany([
      {
        title: 'Econometrics & Causal Inference',
        slug: 'econometrics-causal-inference',
        tagline: 'Master empirical research, regression models, and counterfactual reasoning.',
        description: 'An advanced foundational program in econometrics covering ordinary least squares, instrumental variables, panel data methods, and modern causal inference frameworks.',
        order: 1,
        is_published: true,
        modules: [
          { title: 'Module 1: Linear Regression & Identification', order: 1 },
          { title: 'Module 2: Instrumental Variables & Two-Stage Least Squares', order: 2 },
          { title: 'Module 3: Difference-in-Differences & Synthetic Controls', order: 3 },
          { title: 'Module 4: Regression Discontinuity Designs', order: 4 }
        ]
      },
      {
        title: 'Machine Learning for Financial Economics',
        slug: 'machine-learning-financial-economics',
        tagline: 'Predictive modeling, high-dimensional data, and quantitative strategies.',
        description: 'Bridging financial economic theory with modern machine learning algorithms. Learn regularized regression, random forests, neural networks, and asset pricing applications.',
        order: 2,
        is_published: true,
        modules: [
          { title: 'Module 1: Regularization & Lasso/Ridge in Finance', order: 1 },
          { title: 'Module 2: Tree-Based Methods & Random Forests', order: 2 },
          { title: 'Module 3: Neural Networks for Asset Pricing', order: 3 },
          { title: 'Module 4: Portfolio Optimization & Algorithmic Execution', order: 4 }
        ]
      },
      {
        title: 'Microeconomic Theory & Mechanism Design',
        slug: 'microeconomic-theory-mechanism-design',
        tagline: 'Consumer behavior, general equilibrium, game theory, and market design.',
        description: 'Rigorous mathematical modeling of economic behavior, strategic interactions, auction theory, and matching market mechanics.',
        order: 3,
        is_published: true,
        modules: [
          { title: 'Module 1: Consumer Preferences & Utility Maximization', order: 1 },
          { title: 'Module 2: Game Theory & Nash Equilibrium', order: 2 },
          { title: 'Module 3: Auction Design & Revenue Equivalence', order: 3 },
          { title: 'Module 4: Two-Sided Matching Markets', order: 4 }
        ]
      }
    ]);
    console.log('[Server Startup] Auto-seeding completed successfully.');
  }
} catch (seedErr) {
  console.error('[Server Startup Seed Warning]:', seedErr.message);
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes (handling both trailing slash and non-trailing slash for seamless API compatibility)
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);

// Root & API welcome endpoints
app.get(['/', '/api', '/api/'], (req, res) => {
  res.json({
    message: 'EcoIntuition Academy MERN REST API Server is active!',
    status: 'online',
    endpoints: {
      health: '/api/health',
      courses: '/api/courses/',
      auth_login: '/api/auth/login/',
      auth_register: '/api/auth/register/',
      auth_me: '/api/auth/me/'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'Node.js Express (MERN Stack)', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 EcoIntuition MERN Server running on port ${PORT}`);
  console.log(`📡 API Endpoints available at http://localhost:${PORT}/api/`);
  console.log(`=================================================`);
});
