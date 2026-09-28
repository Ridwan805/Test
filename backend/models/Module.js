import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  moduleNumber: {
    type: Number,
    required: true
  },
  order: {
    type: Number,
    default: 1
  },
  description: {
    type: String,
    default: ''
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  estimatedMinutes: {
    type: Number,
    default: 0
  },
  thumbnail: {
    type: String,
    default: ''
  },
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

// Synchronize status and published boolean
moduleSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.published = this.status === 'published';
  } else if (this.isModified('published')) {
    this.status = this.published ? 'published' : 'draft';
  }
  next();
});

moduleSchema.index({ courseId: 1, moduleNumber: 1 });
moduleSchema.index({ courseId: 1, order: 1 });

const Module = mongoose.model('Module', moduleSchema);
export default Module;
