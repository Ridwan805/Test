import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  lessonNumber: {
    type: Number,
    required: true
  },
  order: {
    type: Number,
    default: 1
  },
  estimatedMinutes: {
    type: Number,
    default: 10
  },
  content: [
    {
      type: {
        type: String,
        required: true,
        enum: [
          'heading',
          'paragraph',
          'list',
          'code',
          'output',
          'note',
          'warning',
          'example',
          'image',
          'video',
          'link',
          'cards',
          'jupyter',
          'table',
          'comparison',
          'checkpoint',
          'equation',
          'definition',
          'derivation',
          'summary'
        ]
      },
      level: { type: Number, default: 2 },
      text: { type: String, default: '' },
      language: { type: String, default: 'python' },
      headers: [{ type: String }],
      rows: [[{ type: String }]],
      code: { type: String, default: '' },
      starterCode: { type: String, default: '' },
      instructions: { type: String, default: '' },
      height: { type: Number, default: 450 },
      mode: { type: String, default: 'repl' },
      notebookPath: { type: String, default: '' },
      readOnly: { type: Boolean, default: false },
      output: { type: String, default: '' },
      items: [{ type: String }],
      title: { type: String, default: '' },
      url: { type: String, default: '' },
      formula: { type: String, default: '' },
      label: { type: String, default: '' },
      explanation: { type: String, default: '' },
      term: { type: String, default: '' },
      definition: { type: String, default: '' },
      steps: [{ type: String }],
      caption: { type: String, default: '' },
      cards: [
        {
          title: String,
          description: String,
          tag: String,
          icon: String
        }
      ],
      meta: { type: mongoose.Schema.Types.Mixed }
    }
  ],
  published: {
    type: Boolean,
    default: true
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

lessonSchema.index({ courseId: 1, slug: 1 }, { unique: true });
lessonSchema.index({ moduleId: 1, order: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);
export default Lesson;
