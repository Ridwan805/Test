import express from 'express';
import Bootcamp from '../models/Bootcamp.js';

const router = express.Router();

// @route   GET /api/bootcamps/ or /api/bootcamps
// @desc    Get all published bootcamps from dedicated bootcamps collection
router.get(['/', ''], async (req, res) => {
  try {
    const bootcamps = await Bootcamp.find({ is_published: true }).sort({ order: 1, createdAt: 1 });
    res.json(bootcamps);
  } catch (error) {
    console.error('Fetch Bootcamps Error:', error);
    res.status(500).json({ detail: 'Server error retrieving bootcamps' });
  }
});

// @route   GET /api/bootcamps/:slug
// @desc    Get single bootcamp by slug from dedicated bootcamps collection
router.get('/:slug', async (req, res) => {
  try {
    let slugParam = req.params.slug;
    if (slugParam.endsWith('/')) {
      slugParam = slugParam.slice(0, -1);
    }

    const bootcamp = await Bootcamp.findOne({
      slug: slugParam,
      is_published: true
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
