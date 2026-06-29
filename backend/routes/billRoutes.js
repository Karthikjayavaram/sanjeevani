const express = require('express');
const router = express.Router();
const { createBill, getBills, getBillById, updateBill, cancelBill } = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createBill)
  .get(protect, getBills);

router.route('/:id')
  .get(protect, getBillById)
  .put(protect, updateBill)
  .delete(protect, cancelBill);

module.exports = router;
