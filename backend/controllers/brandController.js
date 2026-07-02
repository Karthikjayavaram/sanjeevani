const Brand = require('../models/Brand');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

exports.getBrands = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = { $text: { $search: search } };
    }
    const brands = await Brand.find(query).sort({ lastUpdated: -1 }).lean();
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({ message: 'Brand deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Stock In
exports.stockIn = async (req, res) => {
  try {
    const { quantity, companyName } = req.body;
    const rawAdminId = req.user.id;
    // isValid() incorrectly accepts 12-char strings; use strict 24-char hex check
    const isValidObjectId = rawAdminId && /^[a-f\d]{24}$/i.test(rawAdminId);
    const adminId = isValidObjectId ? rawAdminId : null;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const previousStock = brand.currentStock;
    brand.currentStock += Number(quantity);
    brand.lastUpdated = new Date();
    await brand.save();

    const transaction = await StockTransaction.create({
      brand: brand._id,
      type: 'IN',
      quantity,
      previousStock,
      currentStock: brand.currentStock,
      companyName: companyName || null,
      admin: adminId,
    });

    res.json({ message: 'Stock updated', brand, transaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await StockTransaction.find({ brand: req.params.id })
      .populate('admin', 'name')
      .populate('referenceId')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
