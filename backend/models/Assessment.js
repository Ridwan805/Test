import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
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
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  type: {
    type: String,
    enum: ['homework', 'quiz'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  maxPoints: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true // 0.40 for homework, 0.60 for quiz
  },
  notebookPath: {
    type: String,
    required: true
  },
  published: {
    type: Boolean,
    default: true
  },
  timeLimitMinutes: {
    type: Number,
    default: 30
  },
  timer: {
    enabled: { type: Boolean, default: true },
    durationMinutes: { type: Number, default: 30 },
    warningMinutes: { type: Number, default: 5 },
    autoSubmit: { type: Boolean, default: true },
    allowPause: { type: Boolean, default: false },
    showTimer: { type: Boolean, default: true }
  },
  questions: [
    {
      id: { type: String, required: true },
      title: { type: String, required: true },
      instructions: { type: String, default: '' },
      type: { type: String, default: 'coding' },
      maxPoints: { type: Number, required: true },
      targetVariables: [{ type: String }],
      order: { type: Number, default: 1 },
      starterCode: { type: String, default: '' },
      hiddenTests: { type: String, default: '' },
      publicTests: { type: String, default: '' },
      referenceSolution: { type: String, default: '' },
      studentCanEdit: { type: Boolean, default: true },
      studentCanDelete: { type: Boolean, default: false }
    }
  ]
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

assessmentSchema.index({ courseId: 1, moduleId: 1, type: 1 }, { unique: true });

const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;
