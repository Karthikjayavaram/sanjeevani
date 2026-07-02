const Bill = require('../models/Bill');
const Brand = require('../models/Brand');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

exports.createBill = async (req, res) => {
  try {
    const { billNumber, millName, partyName, items } = req.body;
    const rawAdminId = req.user.id;
    // isValid() incorrectly accepts 12-char strings; use strict 24-char hex check
    const isValidObjectId = rawAdminId && /^[a-f\d]{24}$/i.test(rawAdminId);
    const adminId = isValidObjectId ? rawAdminId : null;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    // Phase 1: Validation and Fetch
    const brandsMap = new Map();
    const getBrand = async (id) => {
      if (!brandsMap.has(id.toString())) {
        const brand = await Brand.findById(id);
        if (!brand) throw new Error(`Brand not found: ${id}`);
        brandsMap.set(id.toString(), { doc: brand, projectedStock: brand.currentStock });
      }
      return brandsMap.get(id.toString());
    };

    let totalQuantity = 0;
    const stockTransactions = [];
    const billId = new mongoose.Types.ObjectId();

    for (let item of items) {
      const bData = await getBrand(item.brand);
      const qty = Number(item.quantity);
      
      if (bData.projectedStock < qty) {
        throw new Error(`Insufficient stock for ${bData.doc.name}`);
      }

      const previousStock = bData.projectedStock;
      bData.projectedStock -= qty;
      totalQuantity += qty;

      stockTransactions.push({
        brand: bData.doc._id,
        type: 'OUT',
        quantity: qty,
        previousStock,
        currentStock: bData.projectedStock,
        referenceId: billId,
        admin: adminId,
      });
    }

    // Phase 2: DB Writes
    const bill = new Bill({
      _id: billId,
      billNumber,
      millName,
      partyName,
      items,
      totalQuantity,
      adminId
    });
    
    await bill.save();

    for (let bData of brandsMap.values()) {
      bData.doc.currentStock = bData.projectedStock;
      bData.doc.lastUpdated = new Date();
      await bData.doc.save();
    }

    await StockTransaction.insertMany(stockTransactions);

    // io access if needed
    const io = req.app.get('io');
    if (io) io.emit('bill_created', { billNumber });

    res.status(201).json(bill);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Bill number already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.getBills = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      const regexQuery = new RegExp(search, 'i');
      let orClauses = [
        { billNumber: regexQuery },
        { partyName: regexQuery },
        { millName: regexQuery }
      ];

      // Parse date for search
      const parsedDate = new Date(search);
      if (!isNaN(parsedDate.getTime()) && search.length > 4) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);

        orClauses.push({
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        });
      }

      query = { $or: orClauses };
    }

    const bills = await Bill.find(query)
      .populate('items.brand', 'name variant image')
      .populate('adminId', 'name')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('items.brand', 'name variant image')
      .populate('adminId', 'name');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const rawAdminId = req.user.id;
    const isValidObjectId = rawAdminId && /^[a-f\d]{24}$/i.test(rawAdminId);
    const adminId = isValidObjectId ? rawAdminId : null;
    const stockTransactions = [];

    // Restore stock
    for (let item of bill.items) {
      const brand = await Brand.findById(item.brand);
      if (brand) {
        const previousStock = brand.currentStock;
        brand.currentStock += item.quantity;
        brand.lastUpdated = new Date();
        await brand.save();

        stockTransactions.push({
          brand: brand._id,
          type: 'IN',
          quantity: item.quantity,
          previousStock,
          currentStock: brand.currentStock,
          referenceId: bill._id,
          admin: adminId,
        });
      }
    }

    await StockTransaction.insertMany(stockTransactions);
    await Bill.findByIdAndDelete(req.params.id);

    res.json({ message: 'Bill cancelled and stock restored' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const { millName, partyName, items } = req.body;
    const rawAdminId = req.user.id;
    const isValidObjectId = rawAdminId && /^[a-f\d]{24}$/i.test(rawAdminId);
    const adminId = isValidObjectId ? rawAdminId : null;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // 1. Fetch ALL brands involved (old and new)
    const brandsMap = new Map();
    const getBrand = async (id) => {
      if (!brandsMap.has(id.toString())) {
        const brand = await Brand.findById(id);
        if (!brand) throw new Error(`Brand not found: ${id}`);
        brandsMap.set(id.toString(), { doc: brand, projectedStock: brand.currentStock });
      }
      return brandsMap.get(id.toString());
    };

    // 2. Revert old stock in memory
    for (let oldItem of bill.items) {
      const brandId = oldItem.brand._id || oldItem.brand;
      const bData = await getBrand(brandId);
      bData.projectedStock += Number(oldItem.quantity);
    }

    // 3. Apply new stock and validate in memory
    let totalQuantity = 0;
    const stockTransactions = [];

    for (let newItem of items) {
      const brandId = newItem.brand._id || newItem.brand;
      const bData = await getBrand(brandId);
      const qty = Number(newItem.quantity);

      if (bData.projectedStock < qty) {
        throw new Error(`Insufficient stock for ${bData.doc.name} after recalculation`);
      }

      const previousStock = bData.projectedStock;
      bData.projectedStock -= qty;
      totalQuantity += qty;

      stockTransactions.push({
        brand: bData.doc._id,
        type: 'OUT',
        quantity: qty,
        previousStock,
        currentStock: bData.projectedStock,
        referenceId: bill._id,
        admin: adminId,
      });
    }

    // 4. Execution phase (All validated!)
    await StockTransaction.deleteMany({ referenceId: bill._id });

    for (let bData of brandsMap.values()) {
      bData.doc.currentStock = bData.projectedStock;
      bData.doc.lastUpdated = new Date();
      await bData.doc.save();
    }

    bill.millName = millName;
    bill.partyName = partyName;
    bill.items = items;
    bill.totalQuantity = totalQuantity;
    await bill.save();

    await StockTransaction.insertMany(stockTransactions);

    const io = req.app.get('io');
    if (io) io.emit('bill_updated', { billNumber: bill.billNumber });

    res.json(bill);
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ error: error.message });
  }
};
