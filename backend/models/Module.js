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

moduleSchema.index({ courseId: 1, moduleNumber: 1 }, { unique: true });

const Module = mongoose.model('Module', moduleSchema);
export default Module;
