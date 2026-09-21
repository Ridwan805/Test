import dotenv from 'dotenv';
dotenv.config();

import connectDB from './config/db.js';
import User from './models/User.js';
import Course from './models/Course.js';

const seedData = async () => {
  await connectDB();

  console.log('[Seed] Clearing existing Users and Courses...');
  await User.deleteMany({});
  await Course.deleteMany({});

  console.log('[Seed] Creating default superuser / admin user...');
  const adminUser = await User.create({
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@aintuitionacademy.com',
    password: 'adminpassword123',
    is_staff: true,
    is_active: true
  });
  console.log(`[Seed] Created admin: ${adminUser.email}`);

  console.log('[Seed] Creating initial courses...');
  const courses = [
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
  ];

  await Course.insertMany(courses);
  console.log(`[Seed] Successfully inserted ${courses.length} courses with modules!`);

  console.log('[Seed] Database seeding completed successfully.');
};

seedData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
