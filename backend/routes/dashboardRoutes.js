import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getStudentDashboard, getAdminDashboard } from '../controllers/dashboardController.js';

const router = express.Router();

// @route   GET /api/dashboard/admin
// @desc    Get executive metrics, assessments, and enrolled roster for staff
router.get('/admin', protect, getAdminDashboard);

// @route   GET /api/dashboard/student
// @desc    Get consolidated live progress and learning metrics for student
router.get('/student', protect, getStudentDashboard);

// Support base /api/dashboard/ as well with automatic role switching
router.get(['/', ''], protect, (req, res, next) => {
  if (req.user && req.user.is_staff) {
    return getAdminDashboard(req, res, next);
  }
  return getStudentDashboard(req, res, next);
});

export default router;
