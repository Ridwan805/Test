import express from 'express';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to normalize slug parameter (strip trailing slash if present)
const cleanSlug = (slug) => (slug && slug.endsWith('/') ? slug.slice(0, -1) : slug);

// @route   GET /api/courses/ or /api/courses
// @desc    Get all published courses (public metadata)
router.get(['/', ''], async (req, res) => {
  try {
    const filter = {
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

    const curriculum = modules.map((m) => {
      const mObj = m.toJSON();
      mObj.lessons = lessons
        .filter((l) => String(l.moduleId) === String(m._id))
        .map((l) => ({
          ...l.toJSON(),
          completed: progressMap.get(String(l._id)) || false
        }));
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
      totalLessons: lessons.length,
      completedLessons: completedCount,
      progressPercentage
    });
  } catch (error) {
    console.error('Fetch Modules Error:', error.message);
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

    const moduleDoc = await Module.findOne({ courseId: course._id, moduleNumber, published: true });
    if (!moduleDoc) {
      return res.status(404).json({ detail: `Module ${moduleNumber} not found` });
    }

    const lessons = await Lesson.find(
      { moduleId: moduleDoc._id, published: true },
      { title: 1, slug: 1, lessonNumber: 1, order: 1, estimatedMinutes: 1, moduleId: 1 }
    ).sort({ order: 1 });

    const userProgress = await LessonProgress.find({
      userId: req.user._id,
      moduleId: moduleDoc._id
    });

    const progressMap = new Map();
    userProgress.forEach((p) => {
      progressMap.set(String(p.lessonId), p.completed);
    });

    const lessonsWithProgress = lessons.map((l) => ({
      ...l.toJSON(),
      completed: progressMap.get(String(l._id)) || false
    }));

    res.json({
      module: moduleDoc,
      lessons: lessonsWithProgress
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

    const lesson = await Lesson.findOne({
      courseId: course._id,
      slug: lessonSlug,
      published: true
    });

    if (!lesson) {
      return res.status(404).json({ detail: 'Lesson not found' });
    }

    const moduleDoc = await Module.findById(lesson.moduleId);

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

    const currentIndex = allModuleLessons.findIndex((l) => String(l._id) === String(lesson._id));
    const previousLesson = currentIndex > 0 ? allModuleLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allModuleLessons.length - 1 ? allModuleLessons[currentIndex + 1] : null;

    // Track user access in LessonProgress
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

    const isCompleted = progressMap.get(String(lesson._id)) || false;

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
        previous: previousLesson
          ? { title: previousLesson.title, slug: previousLesson.slug, lessonNumber: previousLesson.lessonNumber }
          : null,
        next: nextLesson
          ? { title: nextLesson.title, slug: nextLesson.slug, lessonNumber: nextLesson.lessonNumber }
          : null
      },
      sidebarLessons: allModuleLessons.map((l) => ({
        id: l._id,
        title: l.title,
        slug: l.slug,
        lessonNumber: l.lessonNumber,
        estimatedMinutes: l.estimatedMinutes,
        completed: progressMap.get(String(l._id)) || false,
        isCurrent: String(l._id) === String(lesson._id)
      }))
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

export default router;
