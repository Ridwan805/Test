import express from 'express';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';

const router = express.Router();

// @route   GET /api/bootcamps/ or /api/bootcamps
// @desc    Get all published bootcamps with lesson & module counts
router.get(['/', ''], async (req, res) => {
  try {
    const bootcamps = await Course.find({
      courseType: 'bootcamp',
      $or: [{ published: true }, { is_published: true }]
    }).sort({ order: 1, createdAt: 1 });

    const results = await Promise.all(
      bootcamps.map(async (b) => {
        const bObj = b.toJSON();
        const lessonCount = await Lesson.countDocuments({ courseId: b._id, published: true });
        const moduleCount = await Module.countDocuments({ courseId: b._id, published: true });
        bObj.totalLessons = lessonCount || (b.modules ? b.modules.length : 5);
        bObj.totalModules = moduleCount || (b.modules ? b.modules.length : 1);
        return bObj;
      })
    );

    res.json(results);
  } catch (error) {
    console.error('Fetch Bootcamps Error:', error);
    res.status(500).json({ detail: 'Server error retrieving bootcamps' });
  }
});

// @route   GET /api/bootcamps/:slug
// @desc    Get single bootcamp by slug
router.get('/:slug', async (req, res) => {
  try {
    let slugParam = req.params.slug;
    if (slugParam.endsWith('/')) {
      slugParam = slugParam.slice(0, -1);
    }

    const bootcamp = await Course.findOne({
      slug: slugParam,
      courseType: 'bootcamp',
      $or: [{ published: true }, { is_published: true }]
    });

    if (!bootcamp) {
      return res.status(404).json({ detail: 'Bootcamp not found' });
    }

    res.json(bootcamp);
  } catch (error) {
    console.error('Fetch Bootcamp Detail Error:', error);
    res.status(500).json({ detail: 'Server error retrieving bootcamp details' });
  }
});

export default router;
