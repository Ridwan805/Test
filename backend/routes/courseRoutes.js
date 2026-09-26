import express from 'express';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import Assessment from '../models/Assessment.js';
import LessonProgress from '../models/LessonProgress.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  getModuleGradeSummary,
  checkLessonAccess,
  getLessonsWithLockStatus
} from '../utils/courseProgression.js';
import {
  getModuleGradeHandler,
  getAssessmentDetailHandler,
  submitAssessmentAttemptHandler
} from '../controllers/assessmentController.js';

const router = express.Router();

// Helper to normalize slug parameter (strip trailing slash, decode URL encoding, convert spaces to hyphens)
const cleanSlug = (slug) => {
  if (!slug) return '';
  let s = String(slug);
  if (s.endsWith('/')) s = s.slice(0, -1);
  try {
    s = decodeURIComponent(s);
  } catch (e) {}
  return s.trim().toLowerCase().replace(/\s+/g, '-');
};

// @route   GET /api/courses/ or /api/courses
// @desc    Get all published courses (public metadata)
router.get(['/', ''], async (req, res) => {
  try {
    const filter = {
      courseType: { $ne: 'bootcamp' },
      $or: [{ published: true }, { is_published: true }]
    };
    if (req.query.type) {
      filter.courseType = req.query.type;
    }
    const courses = await Course.find(filter).sort({ order: 1, title: 1 });
    res.json(courses);
  } catch (error) {
    console.error('Fetch Courses Error:', error.message);
    res.status(500).json({ detail: 'Server error retrieving courses' });
  }
});

// @route   GET /api/courses/:slug
// @desc    Get public course detail & public module/lesson overview (no protected lesson content)
router.get('/:slug', async (req, res) => {
  try {
    const slug = cleanSlug(req.params.slug);
    const course = await Course.findOne({
      slug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Fetch modules for this course
    const modules = await Module.find({ courseId: course._id, published: true }).sort({ order: 1 });
    
    // Fetch lesson metadata (without heavy/protected content blocks)
    const lessons = await Lesson.find(
      { courseId: course._id, published: true },
      { title: 1, slug: 1, lessonNumber: 1, order: 1, estimatedMinutes: 1, moduleId: 1 }
    ).sort({ order: 1 });

    const modulesWithLessons = modules.map((m) => {
      const mObj = m.toJSON();
      mObj.lessons = lessons.filter((l) => String(l.moduleId) === String(m._id));
      return mObj;
    });

    const courseObj = course.toJSON();
    courseObj.modules = modulesWithLessons.length > 0 ? modulesWithLessons : course.modules || [];
    courseObj.totalLessons = lessons.length;

    res.json(courseObj);
  } catch (error) {
    console.error('Fetch Course Detail Error:', error.message);
    res.status(500).json({ detail: 'Server error retrieving course details' });
  }
});

// ============================================================================
// PROTECTED LEARNING ENDPOINTS (Require Authentication)
// ============================================================================

// @route   GET /api/courses/:slug/modules
// @desc    Get full course curriculum and user progress for authenticated users
router.get('/:slug/modules', protect, async (req, res) => {
  try {
    const slug = cleanSlug(req.params.slug);
    const course = await Course.findOne({
      slug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const modules = await Module.find({ courseId: course._id, published: true }).sort({ order: 1 });
    const lessons = await Lesson.find(
      { courseId: course._id, published: true },
      { title: 1, slug: 1, lessonNumber: 1, order: 1, estimatedMinutes: 1, moduleId: 1 }
    ).sort({ order: 1 });

    // Fetch user progress for all lessons in this course
    const userProgress = await LessonProgress.find({
      userId: req.user._id,
      courseId: course._id
    });

    const progressMap = new Map();
    userProgress.forEach((p) => {
      progressMap.set(String(p.lessonId), p.completed);
    });

    // Fetch Module 2 and Module 3 grade summaries for progression gating
    const mod2GradeSummary = await getModuleGradeSummary(req.user._id, course._id, 2);
    const mod3GradeSummary = await getModuleGradeSummary(req.user._id, course._id, 3);

    const curriculum = modules.map((m) => {
      const mObj = m.toJSON();
      mObj.lessons = lessons
        .filter((l) => String(l.moduleId) === String(m._id))
        .map((l) => ({
          ...l.toJSON(),
          completed: progressMap.get(String(l._id)) || false
        }));

      // Role and progression rules:
      if (m.moduleNumber === 1) {
        mObj.isLocked = false;
        mObj.hasGradeRequirement = false;
      } else if (m.moduleNumber === 2) {
        mObj.isLocked = false;
        mObj.hasGradeRequirement = true;
        mObj.gradeSummary = mod2GradeSummary;
      } else if (m.moduleNumber === 3) {
        mObj.hasGradeRequirement = true;
        mObj.isLocked = !mod2GradeSummary.passed && !req.user.is_staff;
        mObj.lockReason = 'Complete Module 2 with at least 80% to unlock.';
        mObj.gradeSummary = mod3GradeSummary;
      } else if (m.moduleNumber >= 4) {
        mObj.hasGradeRequirement = true;
        mObj.isLocked = (!mod2GradeSummary.passed || !mod3GradeSummary.passed) && !req.user.is_staff;
        mObj.lockReason = 'Complete Module 3 with at least 80% to unlock.';
      }
      return mObj;
    });

    const completedCount = userProgress.filter((p) => p.completed).length;
    const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

    res.json({
      course: {
        id: course._id,
        title: course.title,
        slug: course.slug,
        level: course.level,
        courseType: course.courseType,
        accessType: course.accessType,
        price: course.price
      },
      curriculum,
      module2GradeSummary: mod2GradeSummary,
      module3GradeSummary: mod3GradeSummary,
      totalLessons: lessons.length,
      completedLessons: completedCount,
      progressPercentage
    });
  } catch (error) {
    console.error('Fetch Modules Error:', error);
    res.status(500).json({ detail: 'Server error retrieving curriculum' });
  }
});

// @route   GET /api/courses/:slug/modules/:moduleNumber
// @desc    Get single module and lessons with completion status
router.get('/:slug/modules/:moduleNumber', protect, async (req, res) => {
  try {
    const slug = cleanSlug(req.params.slug);
    const moduleNumber = parseInt(req.params.moduleNumber, 10);

    const course = await Course.findOne({
      slug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Backend Module Lock:
    // Module 3 requires Module 2 grade >= 80%
    if (moduleNumber === 3 && !req.user.is_staff) {
      const mod2Grade = await getModuleGradeSummary(req.user._id, course._id, 2);
      if (!mod2Grade.passed) {
        return res.status(403).json({
          detail: 'Module 3 is locked. Complete Module 2 with at least 80% to continue.',
          locked: true,
          moduleNumber,
          module2Grade: mod2Grade.moduleGrade,
          requiredGrade: 80,
          homeworkPercentage: mod2Grade.homework.bestPercentage,
          quizPercentage: mod2Grade.quiz.bestPercentage
        });
      }
    }

    // Module 4+ requires Module 3 grade >= 80%
    if (moduleNumber >= 4 && !req.user.is_staff) {
      const mod3Grade = await getModuleGradeSummary(req.user._id, course._id, 3);
      if (!mod3Grade.passed) {
        return res.status(403).json({
          detail: 'Module 4 is locked. Complete Module 3 with at least 80% to continue.',
          locked: true,
          moduleNumber,
          module3Grade: mod3Grade.moduleGrade,
          requiredGrade: 80,
          homeworkPercentage: mod3Grade.homework.bestPercentage,
          quizPercentage: mod3Grade.quiz.bestPercentage
        });
      }
    }

    const moduleDoc = await Module.findOne({ courseId: course._id, moduleNumber, published: true });
    if (!moduleDoc) {
      return res.status(404).json({ detail: `Module ${moduleNumber} not found` });
    }

    const lessonsWithProgress = await getLessonsWithLockStatus(
      req.user._id,
      course._id,
      moduleNumber,
      req.user.is_staff
    );

    const mod2GradeSummary = moduleNumber === 2 ? await getModuleGradeSummary(req.user._id, course._id, 2) : null;
    const mod3GradeSummary = moduleNumber === 3 ? await getModuleGradeSummary(req.user._id, course._id, 3) : null;

    res.json({
      course: {
        id: course._id,
        title: course.title,
        slug: course.slug,
        level: course.level,
        courseType: course.courseType
      },
      module: moduleDoc,
      lessons: lessonsWithProgress,
      module2GradeSummary: mod2GradeSummary,
      module3GradeSummary: mod3GradeSummary
    });
  } catch (error) {
    console.error('Fetch Module Error:', error.message);
    res.status(500).json({ detail: 'Server error retrieving module' });
  }
});

// @route   GET /api/courses/:slug/lessons/:lessonSlug
// @desc    Get full protected lesson content with navigation and completion status
router.get('/:slug/lessons/:lessonSlug', protect, async (req, res) => {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const lessonSlug = cleanSlug(req.params.lessonSlug);

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    let lesson = await Lesson.findOne({
      courseId: course._id,
      slug: lessonSlug,
      published: true
    });

    let isAssessmentItem = false;
    let assessmentDoc = null;

    if (!lesson) {
      assessmentDoc = await Assessment.findOne({
        courseId: course._id,
        slug: lessonSlug,
        published: true
      });

      if (!assessmentDoc) {
        return res.status(404).json({ detail: 'Lesson not found' });
      }

      isAssessmentItem = true;
      lesson = {
        _id: assessmentDoc._id,
        courseId: course._id,
        moduleId: assessmentDoc.moduleId,
        title: assessmentDoc.title,
        slug: assessmentDoc.slug,
        lessonNumber: assessmentDoc.type === 'homework' ? 11 : 12,
        order: assessmentDoc.type === 'homework' ? 11 : 12,
        estimatedMinutes: 30,
        content: [],
        toJSON: () => ({
          _id: assessmentDoc._id,
          courseId: course._id,
          moduleId: assessmentDoc.moduleId,
          title: assessmentDoc.title,
          slug: assessmentDoc.slug,
          lessonNumber: assessmentDoc.type === 'homework' ? 11 : 12,
          order: assessmentDoc.type === 'homework' ? 11 : 12,
          estimatedMinutes: 30,
          content: []
        })
      };
    }

    const moduleDoc = await Module.findById(lesson.moduleId);

    // Authoritative Lesson & Assessment Gating
    const accessCheck = await checkLessonAccess(
      req.user._id,
      course._id,
      moduleDoc?.moduleNumber || 1,
      lessonSlug,
      req.user.is_staff
    );
    if (!accessCheck.accessible) {
      return res.status(403).json(accessCheck);
    }

    // Fetch all lessons in this module to determine navigation (prev / next) and sidebar
    const allModuleLessons = await Lesson.find(
      { moduleId: lesson.moduleId, published: true },
      { title: 1, slug: 1, lessonNumber: 1, order: 1, estimatedMinutes: 1 }
    ).sort({ order: 1 });

    // Fetch user progress for lessons in this module
    const userProgress = await LessonProgress.find({
      userId: req.user._id,
      moduleId: lesson.moduleId
    });

    const progressMap = new Map();
    userProgress.forEach((p) => {
      progressMap.set(String(p.lessonId), p.completed);
    });

    // Homework status for this module
    const hwAssessment = await Assessment.findOne({
      courseId: course._id,
      moduleId: lesson.moduleId,
      type: 'homework',
      published: true
    });
    let hwBestPercent = 0;
    if (hwAssessment) {
      const hwAttempts = await AssessmentAttempt.find({
        userId: req.user._id,
        assessmentId: hwAssessment._id
      });
      hwBestPercent = hwAttempts.reduce((max, a) => Math.max(max, a.percentage), 0);
    }
    const hwPassed = hwBestPercent >= 80;

    // Track user access in LessonProgress (only for regular lessons)
    if (!isAssessmentItem) {
      await LessonProgress.findOneAndUpdate(
        { userId: req.user._id, lessonId: lesson._id },
        {
          $set: {
            courseId: course._id,
            moduleId: lesson.moduleId,
            lastAccessedAt: new Date()
          }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    const isCompleted = progressMap.get(String(lesson._id)) || false;

    // Build sidebar items with lock states
    const sidebarLessons = allModuleLessons.map((l, idx) => {
      let isLocked = false;
      let lockReason = '';
      if (!req.user.is_staff && moduleDoc && moduleDoc.moduleNumber >= 2) {
        if (idx > 0) {
          const prevLesson = allModuleLessons[idx - 1];
          if (!progressMap.get(String(prevLesson._id))) {
            isLocked = true;
            lockReason = `Requires Lesson ${prevLesson.lessonNumber}`;
          }
        }
        if (l.lessonNumber >= 9 && !hwPassed) {
          isLocked = true;
          lockReason = 'Requires Homework (≥80%)';
        }
      }
      return {
        id: l._id,
        title: l.title,
        slug: l.slug,
        lessonNumber: l.lessonNumber,
        estimatedMinutes: l.estimatedMinutes,
        completed: progressMap.get(String(l._id)) || false,
        isCurrent: String(l._id) === String(lesson._id),
        locked: isLocked,
        lockReason
      };
    });

    if (moduleDoc && (moduleDoc.moduleNumber === 2 || moduleDoc.moduleNumber === 3)) {
      const modNum = moduleDoc.moduleNumber;
      const lesson8 = allModuleLessons.find((l) => l.lessonNumber === 8);
      const lesson8Completed = lesson8 ? (progressMap.get(String(lesson8._id)) || false) : false;
      const hwLocked = !req.user.is_staff && !lesson8Completed;

      const lastLesson = allModuleLessons[allModuleLessons.length - 1];
      const lastLessonCompleted = lastLesson ? (progressMap.get(String(lastLesson._id)) || false) : false;
      const quizLocked = !req.user.is_staff && (!hwPassed || !lastLessonCompleted);

      sidebarLessons.push({
        id: `module-${modNum}-hw-sidebar`,
        title: `Module ${modNum} Homework (Graded)`,
        slug: `module-${modNum}-homework`,
        lessonNumber: 11,
        estimatedMinutes: 30,
        completed: hwPassed,
        isAssessment: true,
        isCurrent: lessonSlug === `module-${modNum}-homework`,
        locked: hwLocked,
        lockReason: hwLocked ? 'Requires Lesson 8' : ''
      });

      sidebarLessons.push({
        id: `module-${modNum}-quiz-sidebar`,
        title: `Module ${modNum} Coding Quiz (Graded)`,
        slug: `module-${modNum}-coding-quiz`,
        lessonNumber: 12,
        estimatedMinutes: 30,
        completed: false,
        isAssessment: true,
        isCurrent: lessonSlug === `module-${modNum}-coding-quiz`,
        locked: quizLocked,
        lockReason: !hwPassed ? 'Requires Homework (≥80%)' : (quizLocked ? 'Requires all lessons' : '')
      });
    }

    // Determine Prev / Next Navigation taking Homework & Quiz into sequence
    let prevNav = null;
    let nextNav = null;

    const modNum = moduleDoc?.moduleNumber || 1;
    const isHomework = lessonSlug === `module-${modNum}-homework`;
    const isQuiz = lessonSlug === `module-${modNum}-coding-quiz`;

    if (isHomework) {
      const lesson8 = allModuleLessons.find((l) => l.lessonNumber === 8);
      const lesson9 = allModuleLessons.find((l) => l.lessonNumber === 9);
      if (lesson8) prevNav = { title: `Lesson 8: ${lesson8.title}`, slug: lesson8.slug, lessonNumber: 8 };
      if (lesson9) nextNav = { title: `Lesson 9: ${lesson9.title}`, slug: lesson9.slug, lessonNumber: 9, locked: !hwPassed };
    } else if (isQuiz) {
      const lastL = allModuleLessons[allModuleLessons.length - 1];
      if (lastL) prevNav = { title: `Lesson ${lastL.lessonNumber}: ${lastL.title}`, slug: lastL.slug, lessonNumber: lastL.lessonNumber };
      nextNav = null;
    } else {
      const currentIndex = allModuleLessons.findIndex((l) => String(l._id) === String(lesson._id));
      const curL = currentIndex >= 0 ? allModuleLessons[currentIndex] : null;

      if (curL && curL.lessonNumber === 8 && (modNum === 2 || modNum === 3)) {
        prevNav = currentIndex > 0 ? { title: allModuleLessons[currentIndex - 1].title, slug: allModuleLessons[currentIndex - 1].slug, lessonNumber: allModuleLessons[currentIndex - 1].lessonNumber } : null;
        nextNav = {
          title: `Module ${modNum} Official Homework (Graded)`,
          slug: `module-${modNum}-homework`,
          isAssessment: true,
          locked: !isCompleted
        };
      } else if (curL && curL.lessonNumber === 9 && (modNum === 2 || modNum === 3)) {
        prevNav = {
          title: `Module ${modNum} Official Homework (Graded)`,
          slug: `module-${modNum}-homework`,
          isAssessment: true
        };
        const nextL = allModuleLessons.find((l) => l.lessonNumber === 10);
        nextNav = nextL ? { title: nextL.title, slug: nextL.slug, lessonNumber: 10, locked: !isCompleted } : null;
      } else if (curL && curL.lessonNumber === 10 && (modNum === 2 || modNum === 3)) {
        const prevL = allModuleLessons.find((l) => l.lessonNumber === 9);
        prevNav = prevL ? { title: prevL.title, slug: prevL.slug, lessonNumber: 9 } : null;
        nextNav = {
          title: `Module ${modNum} Final Coding Quiz (Graded)`,
          slug: `module-${modNum}-coding-quiz`,
          isAssessment: true,
          locked: !isCompleted || !hwPassed
        };
      } else {
        prevNav = currentIndex > 0 ? { title: allModuleLessons[currentIndex - 1].title, slug: allModuleLessons[currentIndex - 1].slug, lessonNumber: allModuleLessons[currentIndex - 1].lessonNumber } : null;
        nextNav = currentIndex >= 0 && currentIndex < allModuleLessons.length - 1 ? { title: allModuleLessons[currentIndex + 1].title, slug: allModuleLessons[currentIndex + 1].slug, lessonNumber: allModuleLessons[currentIndex + 1].lessonNumber, locked: !isCompleted } : null;
      }
    }

    res.json({
      course: {
        id: course._id,
        title: course.title,
        slug: course.slug
      },
      module: {
        id: moduleDoc?._id,
        title: moduleDoc?.title || 'Module 1',
        moduleNumber: moduleDoc?.moduleNumber || 1
      },
      lesson: {
        ...lesson.toJSON(),
        completed: isCompleted
      },
      navigation: {
        previous: prevNav,
        next: nextNav
      },
      sidebarLessons
    });
  } catch (error) {
    console.error('Fetch Lesson Error:', error.message);
    res.status(500).json({ detail: 'Server error retrieving lesson' });
  }
});

// @route   GET /api/courses/:slug/progress
// @desc    Get user's overall progress in course
router.get('/:slug/progress', protect, async (req, res) => {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const lessons = await Lesson.find({ courseId: course._id, published: true }, { _id: 1, slug: 1, order: 1 }).sort({ order: 1 });
    const progressList = await LessonProgress.find({ userId: req.user._id, courseId: course._id });

    const completedLessonIds = progressList.filter((p) => p.completed).map((p) => String(p.lessonId));
    const completedCount = completedLessonIds.length;
    const totalCount = lessons.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Find first uncompleted lesson for "Continue Learning"
    let nextUncompletedLesson = null;
    for (const l of lessons) {
      if (!completedLessonIds.includes(String(l._id))) {
        nextUncompletedLesson = l.slug;
        break;
      }
    }

    res.json({
      courseId: course._id,
      totalLessons: totalCount,
      completedLessons: completedCount,
      percentage,
      nextLessonSlug: nextUncompletedLesson || (lessons[0] ? lessons[0].slug : null),
      hasStarted: completedCount > 0
    });
  } catch (error) {
    console.error('Fetch Progress Error:', error.message);
    res.status(500).json({ detail: 'Server error retrieving progress' });
  }
});

// @route   POST /api/courses/:slug/lessons/:lessonSlug/progress
// @desc    Mark lesson as complete or toggle completion
router.post('/:slug/lessons/:lessonSlug/progress', protect, async (req, res) => {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const lessonSlug = cleanSlug(req.params.lessonSlug);
    const { completed = true } = req.body;

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const lesson = await Lesson.findOne({
      courseId: course._id,
      slug: lessonSlug,
      published: true
    });

    if (!lesson) {
      return res.status(404).json({ detail: 'Lesson not found' });
    }

    const updatedProgress = await LessonProgress.findOneAndUpdate(
      { userId: req.user._id, lessonId: lesson._id },
      {
        $set: {
          courseId: course._id,
          moduleId: lesson.moduleId,
          completed: Boolean(completed),
          completedAt: completed ? new Date() : null,
          lastAccessedAt: new Date()
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Calculate updated course percentage
    const allLessons = await Lesson.find({ courseId: course._id, published: true }, { _id: 1, slug: 1, order: 1 }).sort({ order: 1 });
    const userProgress = await LessonProgress.find({ userId: req.user._id, courseId: course._id, completed: true });

    const totalCount = allLessons.length;
    const completedCount = userProgress.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    res.json({
      lessonId: lesson._id,
      lessonSlug: lesson.slug,
      completed: updatedProgress.completed,
      completedAt: updatedProgress.completedAt,
      courseProgress: {
        totalLessons: totalCount,
        completedLessons: completedCount,
        percentage
      }
    });
  } catch (error) {
    console.error('Update Progress Error:', error.message);
    res.status(500).json({ detail: 'Server error updating lesson progress' });
  }
});

// ============================================================================
// ASSESSMENTS & GRADING ENDPOINTS
// ============================================================================

// @route   GET /api/courses/:slug/modules/:moduleNumber/grade
// @desc    Get user's grade summary and progression status for a module
router.get('/:slug/modules/:moduleNumber/grade', protect, getModuleGradeHandler);

// @route   GET /api/courses/:slug/assessments/:type
// @desc    Get assessment metadata and student attempt history
router.get('/:slug/assessments/:type', protect, getAssessmentDetailHandler);

// @route   POST /api/courses/:slug/assessments/:type/submit
// @desc    Submit assessment attempt, save result, recalculate module grade
router.post('/:slug/assessments/:type/submit', protect, submitAssessmentAttemptHandler);

export default router;
