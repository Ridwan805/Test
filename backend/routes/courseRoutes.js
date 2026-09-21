import express from 'express';
import Course from '../models/Course.js';

const router = express.Router();

// @route   GET /api/courses/ or /api/courses
// @desc    Get all published courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ is_published: true }).sort({ order: 1, title: 1 });
    res.json(courses);
  } catch (error) {
    console.error('Fetch Courses Error:', error);
    res.status(500).json({ detail: 'Server error retrieving courses' });
  }
});

// @route   GET /api/courses/:slug/ or /api/courses/:slug
// @desc    Get course detail by slug
router.get('/:slug', async (req, res) => {
  try {
    let slugParam = req.params.slug;
    if (slugParam.endsWith('/')) {
      slugParam = slugParam.slice(0, -1);
    }

    const course = await Course.findOne({ slug: slugParam, is_published: true });
    if (!course) {
      return res.status(404).json({ detail: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Fetch Course Detail Error:', error);
    res.status(500).json({ detail: 'Server error retrieving course details' });
  }
});

export default router;
