import express from 'express';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
import {
  getAdminOverview,
  getAdminCourses,
  updateAdminCourse,
  getAdminBootcamps,
  getAdminBootcampDetail,
  updateAdminModule,
  getAdminStudents,
  getAdminStudentDetail,
  getAdminAttempts,
  getAdminGrades,
  getAdminCourseAnalytics,
  getAdminBootcampAnalytics,
  getAdminInvoices,
  getAdminBootcampAssessments,
  getAdminAssessmentTemplate,
  updateAdminAssessmentTemplate,
  getAdminModuleLessons,
  getAdminLessonDetail,
  createAdminLesson,
  updateAdminLesson,
  deleteAdminLesson,
  reorderAdminLessons,
  getAdminCourseModules,
  createAdminCourseModule,
  getAdminCourseModuleDetail,
  updateAdminCourseModule,
  deleteOrArchiveAdminCourseModule,
  reorderAdminCourseModules,
  duplicateAdminCourseModule,
  deleteAdminStudent,
  toggleAdminStudentStatus
} from '../controllers/adminController.js';

const router = express.Router();

// Enforce both JWT authentication and Admin/Staff role on all /api/admin routes
router.use(protect);
router.use(requireAdmin);

// Dashboard Overview
router.get('/overview', getAdminOverview);
router.get('/dashboard', getAdminOverview);

// Separate Courses Management
router.get('/courses', getAdminCourses);
router.put('/courses/:id', updateAdminCourse);

// Course Modules & Academic Curriculum Management
router.get('/courses/:courseId/modules', getAdminCourseModules);
router.post('/courses/:courseId/modules', createAdminCourseModule);
router.get('/courses/:courseId/modules/:moduleId', getAdminCourseModuleDetail);
router.put('/courses/:courseId/modules/:moduleId', updateAdminCourseModule);
router.patch('/courses/:courseId/modules/:moduleId', updateAdminCourseModule);
router.delete('/courses/:courseId/modules/:moduleId', deleteOrArchiveAdminCourseModule);
router.put('/courses/:courseId/modules-reorder', reorderAdminCourseModules);
router.patch('/courses/:courseId/modules-reorder', reorderAdminCourseModules);
router.post('/courses/:courseId/modules/:moduleId/duplicate', duplicateAdminCourseModule);

// Separate Bootcamps Management
router.get('/bootcamps', getAdminBootcamps);
router.get('/bootcamps/:slug', getAdminBootcampDetail);
router.put('/modules/:id', updateAdminModule);

// Student Management
router.get('/students', getAdminStudents);
router.get('/students/:id', getAdminStudentDetail);
router.delete('/students/:id', deleteAdminStudent);
router.put('/students/:id/status', toggleAdminStudentStatus);
router.patch('/students/:id/status', toggleAdminStudentStatus);

// Assessment Attempts & Grades
router.get('/attempts', getAdminAttempts);
router.get('/bootcamps/:slug/attempts', getAdminAttempts);
router.get('/grades', getAdminGrades);
router.get('/bootcamps/:slug/grades', getAdminGrades);

// Separate Analytics
router.get('/analytics/courses', getAdminCourseAnalytics);
router.get('/analytics/bootcamps', getAdminBootcampAnalytics);

// Business Invoices
router.get('/invoices', getAdminInvoices);

// Assessment Notebook Templates Authoring Manager
router.get('/bootcamps/:bootcampId/assessments', getAdminBootcampAssessments);
router.get('/assessments/:id', getAdminAssessmentTemplate);
router.put('/assessments/:id', updateAdminAssessmentTemplate);

// Lesson Management & Visual Content Block Builder
router.get('/modules/:moduleId/lessons', getAdminModuleLessons);
router.get('/lessons/:id', getAdminLessonDetail);
router.post('/modules/:moduleId/lessons', createAdminLesson);
router.put('/lessons/:id', updateAdminLesson);
router.delete('/lessons/:id', deleteAdminLesson);
router.put('/modules/:moduleId/lessons/reorder', reorderAdminLessons);

export default router;
