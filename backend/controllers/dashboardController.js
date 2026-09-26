import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import Assessment from '../models/Assessment.js';
import { getModuleGradeSummary } from './assessmentController.js';

/**
 * Helper to compute relative time string (e.g. "2 hours ago", "1 day ago")
 */
function getRelativeTime(date) {
  if (!date) return 'Recently';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Helper to generate user initials (e.g. "John Doe" -> "JD", "Tithi" -> "TI")
 */
function getInitials(firstName, lastName, email) {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName && firstName.length >= 2) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'SC';
}

/**
 * Controller: GET /api/dashboard/student
 * Consolidated authenticated student dashboard data
 */
export async function getStudentDashboard(req, res) {
  try {
    const userId = req.user._id;

    // 1. User Profile Data
    const firstName = req.user.first_name || req.user.email.split('@')[0];
    const lastName = req.user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const initials = getInitials(firstName, lastName, req.user.email);
    const joinedAt = req.user.date_joined || req.user.createdAt || new Date();

    // 2. Fetch User Lesson Progress & Assessment Attempts
    const [allProgress, allAttempts] = await Promise.all([
      LessonProgress.find({ userId }).sort({ lastAccessedAt: -1 }),
      AssessmentAttempt.find({ userId }).sort({ submittedAt: -1 })
    ]);

    // 3. Find Primary Active Course
    // Check which course user accessed most recently, otherwise default to 'intro-to-python'
    let activeCourseId = null;
    if (allProgress.length > 0) {
      activeCourseId = allProgress[0].courseId;
    }

    const allCourses = await Course.find({
      $or: [{ published: true }, { is_published: true }]
    }).sort({ order: 1 });

    let activeCourse = null;
    if (activeCourseId) {
      activeCourse = allCourses.find((c) => String(c._id) === String(activeCourseId));
    }
    if (!activeCourse) {
      activeCourse = allCourses.find((c) => c.slug === 'intro-to-python') || allCourses[0];
    }

    if (!activeCourse) {
      // Empty system state
      return res.json({
        user: { name: fullName, firstName, lastName, email: req.user.email, initials, joinedAt },
        currentLearning: null,
        progress: { currentModulePercentage: 0, overallCoursePercentage: 0, completedLessons: 0, totalLessons: 0 },
        currentModulePerformance: null,
        completedItems: [],
        activeCourses: [],
        recentActivity: [],
        achievements: []
      });
    }

    // 4. Load Modules and Lessons for Active Course
    const [modules, lessons] = await Promise.all([
      Module.find({ courseId: activeCourse._id, published: true }).sort({ moduleNumber: 1, order: 1 }),
      Lesson.find({ courseId: activeCourse._id, published: true }).sort({ lessonNumber: 1, order: 1 })
    ]);

    // Fast lookup for lesson progress
    const progressMap = new Map();
    allProgress
      .filter((p) => String(p.courseId) === String(activeCourse._id))
      .forEach((p) => {
        progressMap.set(String(p.lessonId), p);
      });

    // 5. Evaluate Module Grades and Unlock Statuses
    // Module 1: Introductory, no pass mark
    // Module 2: Requires >= 80% to unlock Module 3
    // Module 3: Requires >= 80% to unlock Module 4
    const moduleGradeSummaries = {};
    for (const mod of modules) {
      if (mod.moduleNumber >= 2) {
        moduleGradeSummaries[mod.moduleNumber] = await getModuleGradeSummary(userId, activeCourse._id, mod.moduleNumber);
      }
    }

    const isStaff = Boolean(req.user.is_staff);
    const mod2Passed = moduleGradeSummaries[2]?.passed || isStaff;
    const mod3Passed = moduleGradeSummaries[3]?.passed || isStaff;

    const moduleStatusList = modules.map((m) => {
      const modLessons = lessons.filter((l) => String(l.moduleId) === String(m._id));
      const completedModLessons = modLessons.filter((l) => progressMap.get(String(l._id))?.completed);
      const isLessonsComplete = modLessons.length > 0 && completedModLessons.length === modLessons.length;

      let isLocked = false;
      let isCompleted = false;

      if (m.moduleNumber === 1) {
        isLocked = false;
        isCompleted = isLessonsComplete;
      } else if (m.moduleNumber === 2) {
        isLocked = false;
        isCompleted = moduleGradeSummaries[2]?.passed || false;
      } else if (m.moduleNumber === 3) {
        isLocked = !mod2Passed;
        isCompleted = moduleGradeSummaries[3]?.passed || false;
      } else if (m.moduleNumber >= 4) {
        isLocked = !mod3Passed;
        isCompleted = false;
      }

      const pct = modLessons.length > 0 ? Math.round((completedModLessons.length / modLessons.length) * 100) : 0;

      return {
        module: m,
        moduleNumber: m.moduleNumber,
        title: m.title,
        description: m.description,
        isLocked,
        isCompleted,
        lessons: modLessons,
        completedCount: completedModLessons.length,
        totalCount: modLessons.length,
        percentage: pct,
        gradeSummary: moduleGradeSummaries[m.moduleNumber] || null
      };
    });

    // 6. Determine "Currently Doing" Item
    // Find active module: first unlocked module that is not yet completed
    let activeModStatus = moduleStatusList.find((m) => !m.isLocked && !m.isCompleted);
    if (!activeModStatus) {
      // If all unlocked modules are completed, take the highest unlocked module
      const unlockedMods = moduleStatusList.filter((m) => !m.isLocked);
      activeModStatus = unlockedMods[unlockedMods.length - 1] || moduleStatusList[0];
    }

    let currentLessonItem = null;
    let continueUrl = `/learn/${activeCourse.slug}`;

    if (activeModStatus) {
      // Find first uncompleted lesson in this module
      const uncompletedLesson = activeModStatus.lessons.find((l) => !progressMap.get(String(l._id))?.completed);
      if (uncompletedLesson) {
        currentLessonItem = uncompletedLesson;
        continueUrl = `/learn/${activeCourse.slug}/module/${activeModStatus.moduleNumber}/lesson/${uncompletedLesson.slug}`;
      } else if (activeModStatus.moduleNumber >= 2) {
        // Lessons are done, direct to homework or quiz if assessment remains
        const gradeSum = activeModStatus.gradeSummary;
        if (!gradeSum || gradeSum.homework.attemptsCount === 0) {
          continueUrl = `/learn/${activeCourse.slug}/module/${activeModStatus.moduleNumber}/lesson/module-${activeModStatus.moduleNumber}-homework`;
          currentLessonItem = {
            title: `Module ${activeModStatus.moduleNumber} Official Graded Homework`,
            lessonNumber: 'HW',
            slug: `module-${activeModStatus.moduleNumber}-homework`
          };
        } else if (!gradeSum || gradeSum.quiz.attemptsCount === 0) {
          continueUrl = `/learn/${activeCourse.slug}/module/${activeModStatus.moduleNumber}/lesson/module-${activeModStatus.moduleNumber}-coding-quiz`;
          currentLessonItem = {
            title: `Module ${activeModStatus.moduleNumber} Official Final Coding Quiz`,
            lessonNumber: 'Quiz',
            slug: `module-${activeModStatus.moduleNumber}-coding-quiz`
          };
        } else {
          currentLessonItem = activeModStatus.lessons[activeModStatus.lessons.length - 1] || null;
          continueUrl = `/learn/${activeCourse.slug}/module/${activeModStatus.moduleNumber}`;
        }
      } else {
        currentLessonItem = activeModStatus.lessons[activeModStatus.lessons.length - 1] || null;
        continueUrl = `/learn/${activeCourse.slug}/module/${activeModStatus.moduleNumber}`;
      }
    }

    // 7. Overall Course & Bootcamp Progress Calculation
    const courseLessons = lessons;
    const completedCourseLessons = courseLessons.filter((l) => progressMap.get(String(l._id))?.completed);
    const overallCoursePercentage = courseLessons.length > 0
      ? Math.round((completedCourseLessons.length / courseLessons.length) * 100)
      : 0;

    const currentModulePercentage = activeModStatus ? activeModStatus.percentage : 0;

    // 8. Completed Items (Courses & Modules)
    const completedItems = [];
    moduleStatusList.forEach((ms) => {
      if (ms.isCompleted) {
        // Find completion date
        let completionDate = null;
        if (ms.moduleNumber === 1) {
          const lastCompleted = allProgress
            .filter((p) => String(p.moduleId) === String(ms.module._id) && p.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
          completionDate = lastCompleted ? lastCompleted.completedAt : new Date();
        } else {
          const lastAttempt = allAttempts
            .filter((a) => String(a.moduleId) === String(ms.module._id))
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
          completionDate = lastAttempt ? lastAttempt.submittedAt : new Date();
        }

        completedItems.push({
          id: `mod-${ms.moduleNumber}`,
          title: `Module ${ms.moduleNumber} — ${ms.title}`,
          subtitle: ms.description || 'Curriculum successfully mastered and passed.',
          completionDate: completionDate ? new Date(completionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Completed',
          status: 'Completed',
          moduleNumber: ms.moduleNumber,
          courseTitle: activeCourse.title,
          url: `/learn/${activeCourse.slug}/module/${ms.moduleNumber}`
        });
      }
    });

    // 9. Current Module Assessment Performance
    let currentModulePerformance = null;
    const gradedMod = activeModStatus && activeModStatus.moduleNumber >= 2
      ? activeModStatus
      : (moduleStatusList.find((m) => m.moduleNumber === 2 && !m.isLocked) || null);

    if (gradedMod && gradedMod.gradeSummary) {
      const gs = gradedMod.gradeSummary;
      let statusLabel = 'In Progress';
      if (gs.passed) {
        statusLabel = 'Passed';
      } else if (gs.homework.attemptsCount > 0 || gs.quiz.attemptsCount > 0) {
        statusLabel = gs.moduleGrade >= 80 ? 'On Track to Pass' : `Current: ${gs.moduleGrade}% (Need 80%)`;
      }

      currentModulePerformance = {
        moduleNumber: gradedMod.moduleNumber,
        moduleTitle: gradedMod.title,
        lessonsCompleted: gradedMod.completedCount,
        totalLessons: gradedMod.totalCount,
        homeworkBestScore: gs.homework.bestScore,
        homeworkMaxPoints: gs.homework.maxPoints,
        homeworkPercentage: gs.homework.bestPercentage,
        homeworkAttempts: gs.homework.attemptsCount,
        quizBestScore: gs.quiz.bestScore,
        quizMaxPoints: gs.quiz.maxPoints,
        quizPercentage: gs.quiz.bestPercentage,
        quizAttempts: gs.quiz.attemptsCount,
        moduleGrade: gs.moduleGrade,
        passingGrade: gs.requiredGrade,
        passed: gs.passed,
        status: statusLabel,
        homeworkUrl: `/learn/${activeCourse.slug}/module/${gradedMod.moduleNumber}/lesson/module-${gradedMod.moduleNumber}-homework`,
        quizUrl: `/learn/${activeCourse.slug}/module/${gradedMod.moduleNumber}/lesson/module-${gradedMod.moduleNumber}-coding-quiz`
      };
    }

    // 10. Active Courses Overview
    const activeCourses = [
      {
        id: activeCourse._id,
        title: activeCourse.title,
        tagline: activeCourse.tagline,
        slug: activeCourse.slug,
        courseType: activeCourse.courseType || 'bootcamp',
        currentModule: activeModStatus ? `Module ${activeModStatus.moduleNumber} — ${activeModStatus.title}` : 'Getting Started',
        currentModuleNumber: activeModStatus?.moduleNumber || 1,
        progressPercentage: overallCoursePercentage,
        completedLessons: completedCourseLessons.length,
        totalLessons: courseLessons.length,
        targetUrl: continueUrl,
        modules: moduleStatusList.map((m) => ({
          moduleNumber: m.moduleNumber,
          title: m.title,
          isLocked: m.isLocked,
          isCompleted: m.isCompleted,
          percentage: m.percentage,
          completedCount: m.completedCount,
          totalCount: m.totalCount
        }))
      }
    ];

    // 11. Recent Activity Feed (Derived from real LessonProgress & AssessmentAttempt events)
    const rawEvents = [];

    // Add assessment attempts
    for (const att of allAttempts.slice(0, 10)) {
      const modDoc = modules.find((m) => String(m._id) === String(att.moduleId));
      const modNum = modDoc ? modDoc.moduleNumber : '';
      const typeLabel = att.assessmentType === 'homework' ? 'Homework' : 'Coding Quiz';
      rawEvents.push({
        id: `att-${att._id}`,
        title: `Submitted Module ${modNum} ${typeLabel}`,
        detail: `Score: ${att.earnedPoints} / ${att.maxPoints} (${att.percentage}%)`,
        date: att.submittedAt,
        type: 'assessment',
        url: `/learn/${activeCourse.slug}/module/${modNum}/lesson/module-${modNum}-${att.assessmentType === 'homework' ? 'homework' : 'coding-quiz'}`
      });
    }

    // Add completed & accessed lessons
    for (const prog of allProgress.slice(0, 10)) {
      const lDoc = lessons.find((l) => String(l._id) === String(prog.lessonId));
      if (lDoc) {
        const modDoc = modules.find((m) => String(m._id) === String(lDoc.moduleId));
        const modNum = modDoc ? modDoc.moduleNumber : '';
        const isComp = prog.completed;
        rawEvents.push({
          id: `prog-${prog._id}`,
          title: isComp ? `Completed Lesson ${lDoc.lessonNumber} — ${lDoc.title}` : `Studied Lesson ${lDoc.lessonNumber} — ${lDoc.title}`,
          detail: `Module ${modNum}`,
          date: isComp ? prog.completedAt || prog.lastAccessedAt : prog.lastAccessedAt,
          type: isComp ? 'lesson_complete' : 'lesson_view',
          url: `/learn/${activeCourse.slug}/module/${modNum}/lesson/${lDoc.slug}`
        });
      }
    }

    // Sort newest first and format relative time
    rawEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = rawEvents.slice(0, 6).map((evt) => ({
      ...evt,
      timeAgo: getRelativeTime(evt.date)
    }));

    // 12. Lightweight Achievements (Live driven by module progression)
    const achievements = [
      {
        id: 'first-steps',
        title: 'First Steps',
        description: 'Complete Module 1 of Introduction to Python',
        badge: '🌱',
        unlocked: moduleStatusList[0]?.isCompleted || false
      },
      {
        id: 'python-fundamentals',
        title: 'Python Fundamentals',
        description: 'Pass Module 2 with at least 80% combined grade',
        badge: '⚙️',
        unlocked: moduleStatusList[1]?.isCompleted || false
      },
      {
        id: 'loop-learner',
        title: 'Loop Learner',
        description: 'Pass Module 3 (Control Flow & Loops) with 80%+',
        badge: '🔁',
        unlocked: moduleStatusList[2]?.isCompleted || false
      },
      {
        id: 'function-builder',
        title: 'Function Builder',
        description: 'Unlock and master Module 4 Data Structures & Functions',
        badge: '🚀',
        unlocked: moduleStatusList[3]?.isCompleted || false
      }
    ];

    // Return final structured payload
    res.json({
      user: {
        name: fullName,
        firstName,
        lastName,
        email: req.user.email,
        initials,
        joinedAt
      },
      currentLearning: activeModStatus ? {
        courseTitle: activeCourse.title,
        courseSlug: activeCourse.slug,
        moduleNumber: activeModStatus.moduleNumber,
        moduleTitle: activeModStatus.title,
        lessonNumber: currentLessonItem ? currentLessonItem.lessonNumber : 1,
        lessonTitle: currentLessonItem ? currentLessonItem.title : activeModStatus.title,
        continueUrl
      } : null,
      progress: {
        currentModuleNumber: activeModStatus?.moduleNumber || 1,
        currentModulePercentage,
        currentModuleCompleted: activeModStatus ? activeModStatus.completedCount : 0,
        currentModuleTotal: activeModStatus ? activeModStatus.totalCount : 0,
        overallCoursePercentage,
        completedLessons: completedCourseLessons.length,
        totalLessons: courseLessons.length
      },
      currentModulePerformance,
      completedItems,
      activeCourses,
      recentActivity,
      achievements
    });
  } catch (error) {
    console.error('Student Dashboard Controller Error:', error);
    res.status(500).json({ detail: 'Failed to retrieve student dashboard data.' });
  }
}
