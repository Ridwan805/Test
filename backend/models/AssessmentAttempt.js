import mongoose from 'mongoose';

const questionResultSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  earnedPoints: {
    type: Number,
    required: true,
    default: 0
  },
  maxPoints: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    default: false
  },
  checks: [
    {
      name: String,
      passed: Boolean,
      message: String
    }
  ]
}, { _id: false });

const assessmentAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: true,
    index: true
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
    index: true
  },
  assessmentType: {
    type: String,
    enum: ['homework', 'quiz'],
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    default: 1
  },
  earnedPoints: {
    type: Number,
    required: true,
    default: 0
  },
  maxPoints: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    default: 0
  },
  questionResults: [questionResultSchema],
  submittedCode: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  startedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  submissionReason: {
    type: String,
    enum: ['manual', 'time_expired'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed'],
    default: 'completed'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

assessmentAttemptSchema.index({ userId: 1, assessmentId: 1, attemptNumber: 1 });
assessmentAttemptSchema.index({ userId: 1, moduleId: 1, assessmentType: 1 });

const AssessmentAttempt = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
export default AssessmentAttempt;
