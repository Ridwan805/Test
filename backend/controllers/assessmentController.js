import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Assessment from '../models/Assessment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import { getModuleGradeSummary, checkLessonAccess } from '../utils/courseProgression.js';

export { getModuleGradeSummary, checkLessonAccess };

// Helper to normalize slug parameter
const cleanSlug = (slug) => (slug && slug.endsWith('/') ? slug.slice(0, -1) : slug);



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

    if (rawType.includes('module-3') || req.query.module === '3' || req.query.moduleNumber === '3') {
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

    res.json({
      assessment,
      attempts,
      bestScore,
      bestPercentage,
      totalAttempts: attempts.length
    });
  } catch (error) {
    console.error('Get Assessment Detail Error:', error);
    res.status(500).json({ detail: 'Error fetching assessment details' });
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

    // Create and save attempt
    const attempt = await AssessmentAttempt.create({
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
      submittedAt: new Date()
    });

    // Recompute overall Grade for this module
    const associatedModule = await Module.findById(assessment.moduleId);
    const associatedModNum = associatedModule ? associatedModule.moduleNumber : targetModuleNumber;
    const moduleGradeSummary = await getModuleGradeSummary(req.user._id, course._id, associatedModNum);

    res.status(201).json({
      message: 'Assessment attempt submitted and graded successfully',
      attempt,
      moduleGradeSummary
    });
  } catch (error) {
    console.error('Submit Assessment Error:', error);
    res.status(500).json({ detail: 'Error submitting assessment attempt' });
  }
}
