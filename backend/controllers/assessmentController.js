import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Assessment from '../models/Assessment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import { getModuleGradeSummary, checkLessonAccess } from '../utils/courseProgression.js';

export { getModuleGradeSummary, checkLessonAccess };

// Helper to normalize slug parameter
const cleanSlug = (slug) => {
  if (!slug) return '';
  let s = String(slug);
  if (s.endsWith('/')) s = s.slice(0, -1);
  try {
    s = decodeURIComponent(s);
  } catch (e) {}
  return s.trim().toLowerCase().replace(/\s+/g, '-');
};



/**
 * Controller: GET /api/courses/:slug/modules/:moduleNumber/grade
 */
export async function getModuleGradeHandler(req, res) {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const moduleNumber = parseInt(req.params.moduleNumber, 10);

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const summary = await getModuleGradeSummary(req.user._id, course._id, moduleNumber);
    res.json(summary);
  } catch (error) {
    console.error('Get Module Grade Error:', error);
    res.status(500).json({ detail: 'Error calculating module grade' });
  }
}

/**
 * Controller: GET /api/courses/:slug/assessments/:type
 * Supports type = 'homework' | 'quiz' | slug (e.g. 'module-3-homework')
 * Query params: ?module=3 or ?moduleNumber=3
 */
export async function getAssessmentDetailHandler(req, res) {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const rawType = req.params.type.toLowerCase();

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Determine target moduleNumber and assessment type
    let targetModuleNumber = 2; // default
    let assessmentType = 'homework';

    if (rawType.includes('module-4') || req.query.module === '4' || req.query.moduleNumber === '4') {
      targetModuleNumber = 4;
    } else if (rawType.includes('module-3') || req.query.module === '3' || req.query.moduleNumber === '3') {
      targetModuleNumber = 3;
    } else if (rawType.includes('module-2') || req.query.module === '2' || req.query.moduleNumber === '2') {
      targetModuleNumber = 2;
    } else if (req.query.module) {
      targetModuleNumber = parseInt(req.query.module, 10);
    } else if (req.query.moduleNumber) {
      targetModuleNumber = parseInt(req.query.moduleNumber, 10);
    }

    if (rawType.includes('quiz')) {
      assessmentType = 'quiz';
    } else if (rawType.includes('homework')) {
      assessmentType = 'homework';
    } else {
      assessmentType = rawType;
    }

    // Find target module
    const moduleDoc = await Module.findOne({ courseId: course._id, moduleNumber: targetModuleNumber });
    let assessment = null;

    if (moduleDoc) {
      assessment = await Assessment.findOne({
        courseId: course._id,
        moduleId: moduleDoc._id,
        type: assessmentType,
        published: true
      });
    }

    // Fallback: try by slug or direct type
    if (!assessment) {
      assessment = await Assessment.findOne({
        courseId: course._id,
        $or: [{ slug: rawType }, { type: assessmentType }],
        published: true
      });
    }

    if (!assessment) {
      return res.status(404).json({ detail: `Assessment '${rawType}' not found` });
    }

    // Check lesson/assessment access starting from Module 2
    if (targetModuleNumber >= 2 && !req.user.is_staff) {
      const accessCheck = await checkLessonAccess(
        req.user._id,
        course._id,
        targetModuleNumber,
        assessment.slug || assessmentType,
        req.user.is_staff
      );
      if (!accessCheck.accessible) {
        return res.status(403).json(accessCheck);
      }
    }

    // Fetch user's previous attempts for this assessment
    const attempts = await AssessmentAttempt.find({
      userId: req.user._id,
      assessmentId: assessment._id
    }).sort({ attemptNumber: -1 });

    const bestScore = attempts.reduce((max, a) => Math.max(max, a.earnedPoints), 0);
    const bestPercentage = attempts.reduce((max, a) => Math.max(max, a.percentage), 0);

    // Securely shape response: Non-staff students must never receive hidden tests or reference solutions
    const isStaff = Boolean(req.user?.is_staff);
    let shapedAssessment = assessment.toObject ? assessment.toObject() : { ...assessment };

    if (!isStaff && shapedAssessment.questions) {
      shapedAssessment.questions = shapedAssessment.questions.map((q) => {
        const { hiddenTests, referenceSolution, ...safeQ } = q;
        return safeQ;
      });
    }

    // Check for active server-authoritative quiz session
    let activeQuizSession = null;
    if (assessmentType === 'quiz') {
      const inProgressAttempt = await AssessmentAttempt.findOne({
        userId: req.user._id,
        assessmentId: assessment._id,
        status: 'in_progress'
      }).sort({ createdAt: -1 });

      if (inProgressAttempt && inProgressAttempt.expiresAt) {
        const now = Date.now();
        const remainingSeconds = Math.max(0, Math.floor((inProgressAttempt.expiresAt.getTime() - now) / 1000));
        activeQuizSession = {
          startedAt: inProgressAttempt.startedAt,
          expiresAt: inProgressAttempt.expiresAt,
          remainingSeconds,
          expired: remainingSeconds <= 0,
          durationMinutes: assessment.timer?.durationMinutes || assessment.timeLimitMinutes || 30,
          warningMinutes: assessment.timer?.warningMinutes || 5,
          autoSubmit: assessment.timer?.autoSubmit !== false
        };
      }
    }

    res.json({
      assessment: shapedAssessment,
      attempts: attempts.filter((a) => a.status !== 'in_progress'),
      activeQuizSession,
      bestScore,
      bestPercentage,
      totalAttempts: attempts.filter((a) => a.status !== 'in_progress').length
    });
  } catch (error) {
    console.error('Get Assessment Detail Error:', error);
    res.status(500).json({ detail: 'Error fetching assessment details' });
  }
}

/**
 * Controller: POST /api/courses/:slug/assessments/:type/start
 * Server-authoritative start of timed quiz session
 */
export async function startAssessmentQuizHandler(req, res) {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const rawType = req.params.type.toLowerCase();
    const targetModuleNumber = parseInt(req.query.module || req.body.moduleNumber || '2', 10);

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });
    if (!course) return res.status(404).json({ detail: 'Course not found' });

    const moduleDoc = await Module.findOne({ courseId: course._id, moduleNumber: targetModuleNumber });
    if (!moduleDoc) return res.status(404).json({ detail: 'Module not found' });

    const assessment = await Assessment.findOne({
      courseId: course._id,
      moduleId: moduleDoc._id,
      type: 'quiz'
    });
    if (!assessment) return res.status(404).json({ detail: 'Quiz assessment not found' });

    // Check lesson/quiz access starting from Module 2
    if (targetModuleNumber >= 2 && !req.user.is_staff) {
      const accessCheck = await checkLessonAccess(
        req.user._id,
        course._id,
        targetModuleNumber,
        assessment.slug || 'quiz',
        req.user.is_staff
      );
      if (!accessCheck.accessible) {
        return res.status(403).json(accessCheck);
      }
    }

    // Check for existing active in-progress attempt
    let attempt = await AssessmentAttempt.findOne({
      userId: req.user._id,
      assessmentId: assessment._id,
      status: 'in_progress'
    }).sort({ createdAt: -1 });

    const durationMinutes = assessment.timer?.durationMinutes || assessment.timeLimitMinutes || 30;

    if (!attempt) {
      const prevCount = await AssessmentAttempt.countDocuments({
        userId: req.user._id,
        assessmentId: assessment._id,
        status: 'completed'
      });

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

      attempt = new AssessmentAttempt({
        userId: req.user._id,
        courseId: course._id,
        moduleId: moduleDoc._id,
        assessmentId: assessment._id,
        assessmentType: 'quiz',
        attemptNumber: prevCount + 1,
        status: 'in_progress',
        startedAt,
        expiresAt,
        maxPoints: assessment.maxPoints,
        earnedPoints: 0,
        percentage: 0
      });
      await attempt.save();
    }

    const now = Date.now();
    const remainingSeconds = Math.max(0, Math.floor((attempt.expiresAt.getTime() - now) / 1000));

    res.json({
      success: true,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      remainingSeconds,
      durationMinutes,
      warningMinutes: assessment.timer?.warningMinutes || 5,
      autoSubmit: assessment.timer?.autoSubmit !== false,
      allowPause: false,
      showTimer: true
    });
  } catch (error) {
    console.error('Start Assessment Quiz Error:', error);
    res.status(500).json({ detail: 'Failed to start quiz session' });
  }
}

/**
 * Controller: POST /api/courses/:slug/assessments/:type/submit
 */
export async function submitAssessmentAttemptHandler(req, res) {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const rawType = req.params.type.toLowerCase();
    const { questionResults = [], submittedCode = {}, moduleNumber } = req.body;

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    // Determine target moduleNumber and assessment type
    let targetModuleNumber = 2;
    if (moduleNumber) {
      targetModuleNumber = parseInt(moduleNumber, 10);
    } else if (rawType.includes('module-4') || req.query.module === '4' || req.query.moduleNumber === '4') {
      targetModuleNumber = 4;
    } else if (rawType.includes('module-3') || req.query.module === '3' || req.query.moduleNumber === '3') {
      targetModuleNumber = 3;
    } else if (rawType.includes('module-2') || req.query.module === '2' || req.query.moduleNumber === '2') {
      targetModuleNumber = 2;
    }

    let assessmentType = 'homework';
    if (rawType.includes('quiz')) {
      assessmentType = 'quiz';
    } else if (rawType.includes('homework')) {
      assessmentType = 'homework';
    } else {
      assessmentType = rawType;
    }

    const moduleDoc = await Module.findOne({ courseId: course._id, moduleNumber: targetModuleNumber });
    let assessment = null;

    if (moduleDoc) {
      assessment = await Assessment.findOne({
        courseId: course._id,
        moduleId: moduleDoc._id,
        type: assessmentType,
        published: true
      });
    }

    if (!assessment) {
      assessment = await Assessment.findOne({
        courseId: course._id,
        $or: [{ slug: rawType }, { type: assessmentType }],
        published: true
      });
    }

    if (!assessment) {
      return res.status(404).json({ detail: `Assessment '${rawType}' not found` });
    }

    // Determine next attempt number
    const count = await AssessmentAttempt.countDocuments({
      userId: req.user._id,
      assessmentId: assessment._id
    });
    const attemptNumber = count + 1;

    // Validate and score question results against assessment questions
    let totalEarned = 0;
    const scoredQuestions = assessment.questions.map((q) => {
      const submitted = questionResults.find((qr) => qr.questionId === q.id) || {};
      const earned = Math.min(Math.max(Number(submitted.earnedPoints) || 0, 0), q.maxPoints);
      totalEarned += earned;

      return {
        questionId: q.id,
        title: q.title,
        earnedPoints: earned,
        maxPoints: q.maxPoints,
        passed: earned === q.maxPoints,
        checks: Array.isArray(submitted.checks) ? submitted.checks : []
      };
    });

    const maxPoints = assessment.maxPoints || (assessmentType === 'homework' ? 40 : 20);
    const clampedTotal = Math.min(Math.max(totalEarned, 0), maxPoints);
    const percentage = Math.round((clampedTotal / maxPoints) * 1000) / 10; // 1 decimal place

    // Check for active in-progress attempt to evaluate server-side expiry
    let activeAttempt = await AssessmentAttempt.findOne({
      userId: req.user._id,
      assessmentId: assessment._id,
      status: 'in_progress'
    }).sort({ createdAt: -1 });

    let finalSubmissionReason = req.body.submissionReason || 'manual';
    if (activeAttempt && activeAttempt.expiresAt) {
      if (Date.now() > activeAttempt.expiresAt.getTime() + 15000) {
        finalSubmissionReason = 'time_expired';
      }
    }

    let attempt;
    if (activeAttempt) {
      activeAttempt.earnedPoints = clampedTotal;
      activeAttempt.maxPoints = maxPoints;
      activeAttempt.percentage = percentage;
      activeAttempt.questionResults = scoredQuestions;
      activeAttempt.submittedCode = submittedCode;
      activeAttempt.submissionReason = finalSubmissionReason;
      activeAttempt.status = 'completed';
      activeAttempt.submittedAt = new Date();
      attempt = await activeAttempt.save();
    } else {
      attempt = await AssessmentAttempt.create({
        userId: req.user._id,
        courseId: course._id,
        moduleId: assessment.moduleId,
        assessmentId: assessment._id,
        assessmentType: assessmentType,
        attemptNumber,
        earnedPoints: clampedTotal,
        maxPoints,
        percentage,
        questionResults: scoredQuestions,
        submittedCode,
        submissionReason: finalSubmissionReason,
        status: 'completed',
        submittedAt: new Date()
      });
    }

    // Recompute overall Grade for this module
    const associatedModule = await Module.findById(assessment.moduleId);
    const associatedModNum = associatedModule ? associatedModule.moduleNumber : targetModuleNumber;
    const moduleGradeSummary = await getModuleGradeSummary(req.user._id, course._id, associatedModNum);

    res.status(201).json({
      message: 'Assessment attempt submitted and graded successfully',
      attempt,
      moduleGradeSummary,
      submissionReason: finalSubmissionReason
    });
  } catch (error) {
    console.error('Submit Assessment Error:', error);
    res.status(500).json({ detail: 'Error submitting assessment attempt' });
  }
}

/**
 * Controller: PUT /api/courses/:slug/assessments/:type/timer
 * Body: { timeLimitMinutes, moduleNumber }
 * Restricted to staff / admin users
 */
export async function updateAssessmentTimerHandler(req, res) {
  try {
    if (!req.user || !req.user.is_staff) {
      return res.status(403).json({ detail: 'Admin privileges required' });
    }

    const courseSlug = cleanSlug(req.params.slug);
    const rawType = req.params.type.toLowerCase();
    const {
      timeLimitMinutes,
      moduleNumber,
      enabled,
      warningMinutes,
      autoSubmit,
      allowPause,
      showTimer
    } = req.body;

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    let targetModuleNumber = 2;
    if (moduleNumber) {
      targetModuleNumber = parseInt(moduleNumber, 10);
    } else if (rawType.includes('module-4') || req.query.module === '4') {
      targetModuleNumber = 4;
    } else if (rawType.includes('module-3') || req.query.module === '3') {
      targetModuleNumber = 3;
    } else if (rawType.includes('module-2') || req.query.module === '2') {
      targetModuleNumber = 2;
    }

    const assessmentType = rawType.includes('homework') ? 'homework' : 'quiz';

    const moduleDoc = await Module.findOne({ courseId: course._id, moduleNumber: targetModuleNumber });
    let assessment = null;

    if (moduleDoc) {
      assessment = await Assessment.findOne({
        courseId: course._id,
        moduleId: moduleDoc._id,
        type: assessmentType
      });
    }

    if (!assessment) {
      assessment = await Assessment.findOne({
        courseId: course._id,
        $or: [{ slug: rawType }, { type: assessmentType }]
      });
    }

    if (!assessment) {
      return res.status(404).json({ detail: 'Assessment not found' });
    }

    const newMinutes = Math.max(0, parseInt(timeLimitMinutes !== undefined ? timeLimitMinutes : assessment.timeLimitMinutes, 10) || 0);
    assessment.timeLimitMinutes = newMinutes;

    if (!assessment.timer) {
      assessment.timer = {
        enabled: true,
        durationMinutes: newMinutes,
        warningMinutes: 5,
        autoSubmit: true,
        allowPause: false,
        showTimer: true
      };
    }

    if (enabled !== undefined) assessment.timer.enabled = Boolean(enabled);
    if (newMinutes !== undefined) assessment.timer.durationMinutes = newMinutes;
    if (warningMinutes !== undefined) assessment.timer.warningMinutes = Number(warningMinutes);
    if (autoSubmit !== undefined) assessment.timer.autoSubmit = Boolean(autoSubmit);
    if (allowPause !== undefined) assessment.timer.allowPause = Boolean(allowPause);
    if (showTimer !== undefined) assessment.timer.showTimer = Boolean(showTimer);

    await assessment.save();

    res.json({
      success: true,
      message: `Timer set to ${newMinutes} minutes for ${assessment.title}`,
      timeLimitMinutes: newMinutes,
      timer: assessment.timer,
      assessment
    });
  } catch (error) {
    console.error('Update Assessment Timer Error:', error);
    res.status(500).json({ detail: 'Failed to update assessment timer' });
  }
}

