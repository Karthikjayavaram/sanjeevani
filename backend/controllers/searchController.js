const Brand = require('../models/Brand');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ brands: [], bills: [] });
    }

    const regexQuery = new RegExp(q, 'i');
    
    const brands = await Brand.find({
      $or: [
        { name: regexQuery },
        { variant: regexQuery }
      ]
    }).limit(10);

    // Dashboard search now exclusively searches brands as requested
    res.json({ brands, bills: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
