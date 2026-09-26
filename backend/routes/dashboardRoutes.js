import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getStudentDashboard } from '../controllers/dashboardController.js';

const router = express.Router();

// @route   GET /api/dashboard/student
// @desc    Get consolidated live progress and learning metrics for authenticated student
router.get('/student', protect, getStudentDashboard);

// Support base /api/dashboard/ as well
router.get(['/', ''], protect, getStudentDashboard);

export default router;
