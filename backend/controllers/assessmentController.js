import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Assessment from '../models/Assessment.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';

// Helper to normalize slug parameter
const cleanSlug = (slug) => (slug && slug.endsWith('/') ? slug.slice(0, -1) : slug);

/**
 * Calculates current grade summary and progression status for a given module
 */
export async function getModuleGradeSummary(userId, courseId, moduleNumber = 2) {
  const moduleDoc = await Module.findOne({ courseId, moduleNumber });
  if (!moduleDoc) {
    return {
      moduleNumber,
      moduleGrade: 0,
      passed: false,
      requiredGrade: 80,
      module3Unlocked: false,
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

  // Best valid Homework score and percentage
  let bestHwScore = 0;
  let bestHwPercent = 0;
  for (const a of hwAttempts) {
    if (a.earnedPoints > bestHwScore) {
      bestHwScore = a.earnedPoints;
      bestHwPercent = a.percentage;
    }
  }

  // Best valid Quiz score and percentage
  let bestQuizScore = 0;
  let bestQuizPercent = 0;
  for (const a of quizAttempts) {
    if (a.earnedPoints > bestQuizScore) {
      bestQuizScore = a.earnedPoints;
      bestQuizPercent = a.percentage;
    }
  }

  // Weightings: Homework 40%, Quiz 60%
  const hwWeight = hwAssessment?.weight ?? 0.40;
  const quizWeight = quizAssessment?.weight ?? 0.60;

  // Grade formula: best HW % * 0.40 + best Quiz % * 0.60
  const calculatedGrade = (bestHwPercent * hwWeight) + (bestQuizPercent * quizWeight);
  const moduleGrade = Math.round(calculatedGrade * 10) / 10; // 1 decimal precision
  const passed = moduleGrade >= 80;

  return {
    moduleId: moduleDoc._id,
    moduleNumber,
    moduleGrade,
    passed,
    requiredGrade: 80,
    module3Unlocked: passed,
    homework: {
      assessmentId: hwAssessment?._id,
      title: hwAssessment?.title || 'Module 2 Official Graded Homework',
      maxPoints: hwAssessment?.maxPoints || 40,
      weight: hwWeight,
      bestScore: bestHwScore,
      bestPercentage: bestHwPercent,
      attemptsCount: hwAttempts.length,
      attempts: hwAttempts
    },
    quiz: {
      assessmentId: quizAssessment?._id,
      title: quizAssessment?.title || 'Module 2 Official Final Coding Quiz',
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
 */
export async function getAssessmentDetailHandler(req, res) {
  try {
    const courseSlug = cleanSlug(req.params.slug);
    const type = req.params.type.toLowerCase(); // 'homework' or 'quiz'

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const assessment = await Assessment.findOne({
      courseId: course._id,
      type,
      published: true
    });

    if (!assessment) {
      return res.status(404).json({ detail: `Assessment of type '${type}' not found` });
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
    const type = req.params.type.toLowerCase(); // 'homework' or 'quiz'
    const { questionResults = [], submittedCode = {} } = req.body;

    const course = await Course.findOne({
      slug: courseSlug,
      $or: [{ published: true }, { is_published: true }]
    });

    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    const assessment = await Assessment.findOne({
      courseId: course._id,
      type,
      published: true
    });

    if (!assessment) {
      return res.status(404).json({ detail: `Assessment of type '${type}' not found` });
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

    const maxPoints = assessment.maxPoints || (type === 'homework' ? 40 : 20);
    const clampedTotal = Math.min(Math.max(totalEarned, 0), maxPoints);
    const percentage = Math.round((clampedTotal / maxPoints) * 1000) / 10; // 1 decimal place

    // Create and save attempt
    const attempt = await AssessmentAttempt.create({
      userId: req.user._id,
      courseId: course._id,
      moduleId: assessment.moduleId,
      assessmentId: assessment._id,
      assessmentType: type,
      attemptNumber,
      earnedPoints: clampedTotal,
      maxPoints,
      percentage,
      questionResults: scoredQuestions,
      submittedCode,
      submittedAt: new Date()
    });

    // Recompute overall Module 2 Grade
    const moduleGradeSummary = await getModuleGradeSummary(req.user._id, course._id, 2);

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
