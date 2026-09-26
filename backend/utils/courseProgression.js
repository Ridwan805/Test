import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import LessonProgress from '../models/LessonProgress.js';
import Assessment from '../models/Assessment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';

/**
 * Calculates authoritative Module Grade summary (Homework 40% + Quiz 60%)
 */
export async function getModuleGradeSummary(userId, courseId, moduleNumber = 2) {
  const modNum = parseInt(moduleNumber, 10) || 2;
  const moduleDoc = await Module.findOne({ courseId, moduleNumber: modNum });
  if (!moduleDoc) {
    return {
      moduleNumber: modNum,
      moduleGrade: 0,
      passed: false,
      requiredGrade: 80,
      module3Unlocked: false,
      module4Unlocked: false,
      homework: { maxPoints: 40, bestScore: 0, bestPercentage: 0, attemptsCount: 0, attempts: [] },
      quiz: { maxPoints: 20, bestScore: 0, bestPercentage: 0, attemptsCount: 0, attempts: [] }
    };
  }

  const assessments = await Assessment.find({ courseId, moduleId: moduleDoc._id, published: true });
  const hwAssessment = assessments.find((a) => a.type === 'homework');
  const quizAssessment = assessments.find((a) => a.type === 'quiz');

  const attempts = await AssessmentAttempt.find({
    userId,
    courseId,
    moduleId: moduleDoc._id
  }).sort({ submittedAt: -1 });

  const hwAttempts = attempts.filter((a) => a.assessmentType === 'homework');
  const quizAttempts = attempts.filter((a) => a.assessmentType === 'quiz');

  let bestHwScore = 0;
  let bestHwPercent = 0;
  for (const a of hwAttempts) {
    if (a.earnedPoints > bestHwScore) {
      bestHwScore = a.earnedPoints;
      bestHwPercent = a.percentage;
    }
  }

  let bestQuizScore = 0;
  let bestQuizPercent = 0;
  for (const a of quizAttempts) {
    if (a.earnedPoints > bestQuizScore) {
      bestQuizScore = a.earnedPoints;
      bestQuizPercent = a.percentage;
    }
  }

  const hwWeight = hwAssessment?.weight ?? 0.40;
  const quizWeight = quizAssessment?.weight ?? 0.60;

  const calculatedGrade = (bestHwPercent * hwWeight) + (bestQuizPercent * quizWeight);
  const moduleGrade = Math.round(calculatedGrade * 10) / 10;
  const passed = moduleGrade >= 80;

  return {
    moduleId: moduleDoc._id,
    moduleNumber: modNum,
    moduleGrade,
    passed,
    requiredGrade: 80,
    module3Unlocked: modNum === 2 ? passed : true,
    module4Unlocked: modNum === 3 ? passed : false,
    homework: {
      assessmentId: hwAssessment?._id,
      title: hwAssessment?.title || `Module ${modNum} Official Graded Homework`,
      maxPoints: hwAssessment?.maxPoints || 40,
      weight: hwWeight,
      bestScore: bestHwScore,
      bestPercentage: bestHwPercent,
      attemptsCount: hwAttempts.length,
      attempts: hwAttempts
    },
    quiz: {
      assessmentId: quizAssessment?._id,
      title: quizAssessment?.title || `Module ${modNum} Final Coding Quiz`,
      maxPoints: quizAssessment?.maxPoints || 20,
      weight: quizWeight,
      bestScore: bestQuizScore,
      bestPercentage: bestQuizPercent,
      attemptsCount: quizAttempts.length,
      attempts: quizAttempts
    }
  };
}

/**
 * Checks if a user is permitted to access a specific lesson or assessment.
 * Starting from Module 2:
 * 1. Module must be unlocked (Module 3 requires Mod 2 passed >= 80%, Mod 4 requires Mod 3 passed >= 80%).
 * 2. To proceed to the next lesson, the previous lesson must be completed.
 * 3. If there is a Homework, until the Homework is completed with >= 80% passing grade,
 *    subsequent lessons (Lessons 9, 10, etc.) and the Coding Quiz remain locked.
 */
export async function checkLessonAccess(userId, courseId, moduleNumber, lessonSlug, isStaff = false) {
  if (isStaff) {
    return { accessible: true };
  }

  const modNum = parseInt(moduleNumber, 10) || 1;

  // Module 1 is introductory without gating
  if (modNum < 2) {
    return { accessible: true };
  }

  // 1. Check Module-level Lock
  if (modNum === 3) {
    const mod2Summary = await getModuleGradeSummary(userId, courseId, 2);
    if (!mod2Summary.passed) {
      return {
        accessible: false,
        reason: 'module_locked',
        detail: 'Module 3 is locked. Complete Module 2 with at least 80% to continue.',
        moduleNumber: 3,
        requiredGrade: 80,
        currentGrade: mod2Summary.moduleGrade,
        requiredModule: 2
      };
    }
  } else if (modNum >= 4) {
    const prevModSummary = await getModuleGradeSummary(userId, courseId, modNum - 1);
    if (!prevModSummary.passed) {
      return {
        accessible: false,
        reason: 'module_locked',
        detail: `Module ${modNum} is locked. Complete Module ${modNum - 1} with at least 80% to continue.`,
        moduleNumber: modNum,
        requiredGrade: 80,
        currentGrade: prevModSummary.moduleGrade,
        requiredModule: modNum - 1
      };
    }
  }

  const moduleDoc = await Module.findOne({ courseId, moduleNumber: modNum });
  if (!moduleDoc) {
    return { accessible: true };
  }

  // Fetch all lessons for this module
  const lessons = await Lesson.find(
    { moduleId: moduleDoc._id, published: true },
    { _id: 1, title: 1, slug: 1, lessonNumber: 1, order: 1 }
  ).sort({ order: 1 });

  // Fetch student progress
  const userProgress = await LessonProgress.find({
    userId,
    moduleId: moduleDoc._id
  });
  const completedMap = new Map();
  userProgress.forEach((p) => {
    completedMap.set(String(p.lessonId), p.completed);
  });

  // Fetch Homework status
  const hwAssessment = await Assessment.findOne({
    courseId,
    moduleId: moduleDoc._id,
    type: 'homework',
    published: true
  });

  let hwBestPercent = 0;
  if (hwAssessment) {
    const hwAttempts = await AssessmentAttempt.find({
      userId,
      assessmentId: hwAssessment._id
    });
    hwBestPercent = hwAttempts.reduce((max, a) => Math.max(max, a.percentage), 0);
  }
  const hwPassed = hwBestPercent >= 80;

  const cleanSlug = String(lessonSlug || '').toLowerCase();
  const isHomework = cleanSlug.includes('homework');
  const isQuiz = cleanSlug.includes('quiz');

  // CASE A: User is attempting to access Homework
  if (isHomework) {
    // In Module 2 & 3 curriculum, Homework is placed directly after Lesson 8
    const prevLesson = lessons.find((l) => l.lessonNumber === 8) || (lessons.length > 0 ? lessons[0] : null);
    if (prevLesson && !completedMap.get(String(prevLesson._id))) {
      return {
        accessible: false,
        reason: 'previous_lesson_incomplete',
        detail: `Please complete Lesson ${prevLesson.lessonNumber} (${prevLesson.title}) before starting the Homework.`,
        requiredLesson: {
          slug: prevLesson.slug,
          title: prevLesson.title,
          lessonNumber: prevLesson.lessonNumber
        }
      };
    }
    return { accessible: true };
  }

  // CASE B: User is attempting to access Coding Quiz
  if (isQuiz) {
    // 1. Coding Quiz strictly requires Homework to be passed with >= 80%
    if (!hwPassed) {
      return {
        accessible: false,
        reason: 'homework_required',
        detail: `To take the Coding Quiz, you must first complete the Module ${modNum} Homework with at least an 80% passing grade (Current: ${hwBestPercent}%).`,
        requiredHomework: {
          slug: hwAssessment?.slug || `module-${modNum}-homework`,
          title: hwAssessment?.title || `Module ${modNum} Homework`,
          bestPercentage: hwBestPercent,
          requiredPercentage: 80
        }
      };
    }

    // 2. Coding Quiz requires all lessons in the module to be completed
    const lastLesson = lessons[lessons.length - 1];
    if (lastLesson && !completedMap.get(String(lastLesson._id))) {
      return {
        accessible: false,
        reason: 'previous_lesson_incomplete',
        detail: `Please complete all module lessons up to Lesson ${lastLesson.lessonNumber} (${lastLesson.title}) before taking the Coding Quiz.`,
        requiredLesson: {
          slug: lastLesson.slug,
          title: lastLesson.title,
          lessonNumber: lastLesson.lessonNumber
        }
      };
    }
    return { accessible: true };
  }

  // CASE C: User is attempting to access a standard lesson
  const currentIdx = lessons.findIndex((l) => l.slug === cleanSlug);
  if (currentIdx === -1) {
    return { accessible: true };
  }

  const currentLesson = lessons[currentIdx];

  // Lesson 1 is always accessible if module is unlocked
  if (currentIdx === 0) {
    return { accessible: true };
  }

  // 1. Check immediately previous lesson
  const prevLesson = lessons[currentIdx - 1];
  if (!completedMap.get(String(prevLesson._id))) {
    return {
      accessible: false,
      reason: 'previous_lesson_incomplete',
      detail: `To proceed to Lesson ${currentLesson.lessonNumber}, you must first complete Lesson ${prevLesson.lessonNumber}: ${prevLesson.title}.`,
      requiredLesson: {
        slug: prevLesson.slug,
        title: prevLesson.title,
        lessonNumber: prevLesson.lessonNumber
      }
    };
  }

  // 2. If lesson comes AFTER Homework (Lesson 9+), Homework must be completed with >= 80%
  if (currentLesson.lessonNumber >= 9) {
    if (!hwPassed) {
      return {
        accessible: false,
        reason: 'homework_required',
        detail: `To access Lesson ${currentLesson.lessonNumber}, you must first complete the Module ${modNum} Homework with at least an 80% passing grade (Current: ${hwBestPercent}%).`,
        requiredHomework: {
          slug: hwAssessment?.slug || `module-${modNum}-homework`,
          title: hwAssessment?.title || `Module ${modNum} Homework`,
          bestPercentage: hwBestPercent,
          requiredPercentage: 80
        }
      };
    }
  }

  return { accessible: true };
}

/**
 * Attaches lock status and reasons to each lesson in a module
 */
export async function getLessonsWithLockStatus(userId, courseId, moduleNumber, isStaff = false) {
  const modNum = parseInt(moduleNumber, 10) || 1;
  const moduleDoc = await Module.findOne({ courseId, moduleNumber: modNum });
  if (!moduleDoc) return [];

  const lessons = await Lesson.find(
    { moduleId: moduleDoc._id, published: true },
    { title: 1, slug: 1, lessonNumber: 1, order: 1, estimatedMinutes: 1, moduleId: 1 }
  ).sort({ order: 1 });

  const userProgress = await LessonProgress.find({
    userId,
    moduleId: moduleDoc._id
  });

  const progressMap = new Map();
  userProgress.forEach((p) => {
    progressMap.set(String(p.lessonId), p.completed);
  });

  // Homework check
  const hwAssessment = await Assessment.findOne({
    courseId,
    moduleId: moduleDoc._id,
    type: 'homework',
    published: true
  });
  let hwBestPercent = 0;
  if (hwAssessment) {
    const hwAttempts = await AssessmentAttempt.find({
      userId,
      assessmentId: hwAssessment._id
    });
    hwBestPercent = hwAttempts.reduce((max, a) => Math.max(max, a.percentage), 0);
  }
  const hwPassed = hwBestPercent >= 80;

  return lessons.map((l, idx) => {
    const isCompleted = progressMap.get(String(l._id)) || false;
    let isLocked = false;
    let lockReason = '';
    let requiredItem = null;

    if (!isStaff && modNum >= 2) {
      if (idx > 0) {
        const prevLesson = lessons[idx - 1];
        const prevCompleted = progressMap.get(String(prevLesson._id)) || false;
        if (!prevCompleted) {
          isLocked = true;
          lockReason = `Requires Lesson ${prevLesson.lessonNumber}`;
          requiredItem = { type: 'lesson', slug: prevLesson.slug, title: prevLesson.title, lessonNumber: prevLesson.lessonNumber };
        }
      }

      if (l.lessonNumber >= 9 && !hwPassed) {
        isLocked = true;
        lockReason = `Requires Homework (≥80%)`;
        requiredItem = { type: 'homework', slug: hwAssessment?.slug || `module-${modNum}-homework`, title: hwAssessment?.title || `Module ${modNum} Homework`, bestPercentage: hwBestPercent };
      }
    }

    return {
      ...l.toJSON(),
      completed: isCompleted,
      locked: isLocked,
      lockReason,
      requiredItem
    };
  });
}
