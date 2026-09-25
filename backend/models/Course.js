import mongoose from 'mongoose';

const moduleSubSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

const courseSchema = new mongoose.Schema({
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
  courseType: {
    type: String,
    enum: ['course', 'bootcamp'],
    default: 'course'
  },
  accessType: {
    type: String,
    enum: ['public', 'authenticated'],
    default: 'authenticated'
  },
  price: {
    type: Number,
    default: 0
  },
  level: {
    type: String,
    default: 'Beginner'
  },
  thumbnail: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  published: {
    type: Boolean,
    default: true
  },
  is_published: {
    type: Boolean,
    default: true
  },
  modules: [moduleSubSchema]
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

// Sync published and is_published
courseSchema.pre('save', function (next) {
  if (this.isModified('published') && !this.isModified('is_published')) {
    this.is_published = this.published;
  } else if (this.isModified('is_published') && !this.isModified('published')) {
    this.published = this.is_published;
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);
export default Course;
