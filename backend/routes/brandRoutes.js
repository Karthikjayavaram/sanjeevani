const express = require('express');
const router = express.Router();
const { 
  getBrands, getBrandById, createBrand, updateBrand, deleteBrand, stockIn, getTransactions 
} = require('../controllers/brandController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getBrands)
  .post(protect, createBrand);

router.route('/:id')
  .get(protect, getBrandById)
  .put(protect, updateBrand)
  .delete(protect, deleteBrand);

router.post('/:id/stock-in', protect, stockIn);
router.get('/:id/transactions', protect, getTransactions);

module.exports = router;
