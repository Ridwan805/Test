import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

const bootcampSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  tagline: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: '6 Weeks'
  },
  format: {
    type: String,
    default: 'Cohort-Based Intensive'
  },
  level: {
    type: String,
    default: 'Beginner to Intermediate'
  },
  order: {
    type: Number,
    default: 0
  },
  is_published: {
    type: Boolean,
    default: true
  },
  modules: [moduleSchema]
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

const Bootcamp = mongoose.model('Bootcamp', bootcampSchema);
export default Bootcamp;
