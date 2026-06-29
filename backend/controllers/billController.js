const Bill = require('../models/Bill');
const Brand = require('../models/Brand');
const StockTransaction = require('../models/StockTransaction');

exports.createBill = async (req, res) => {
  try {
    const { billNumber, millName, partyName, items } = req.body;
    const adminId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    let totalQuantity = 0;

    // Create the bill first
    const bill = new Bill({
      billNumber,
      millName,
      partyName,
      items,
      totalQuantity: 0,
      adminId
    });

    const stockTransactions = [];

    for (let item of items) {
      const brand = await Brand.findById(item.brand);
      if (!brand) {
        throw new Error(`Brand not found: ${item.brand}`);
      }
      
      if (brand.currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${brand.name}`);
      }

      const previousStock = brand.currentStock;
      brand.currentStock -= item.quantity;
      brand.lastUpdated = new Date();
      await brand.save();

      totalQuantity += item.quantity;

      stockTransactions.push({
        brand: brand._id,
        type: 'OUT',
        quantity: item.quantity,
        previousStock,
        currentStock: brand.currentStock,
        referenceId: bill._id,
        admin: adminId,
      });
    }

    bill.totalQuantity = totalQuantity;
    await bill.save();
    
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

    const adminId = req.user.id;
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
    const adminId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // 1. Revert existing stock from old items
    for (let oldItem of bill.items) {
      const brand = await Brand.findById(oldItem.brand);
      if (brand) {
        brand.currentStock += oldItem.quantity;
        await brand.save();
      }
    }

    // 2. Apply new stock and track transactions
    let totalQuantity = 0;
    const stockTransactions = [];

    for (let newItem of items) {
      const brand = await Brand.findById(newItem.brand);
      if (!brand) throw new Error(`Brand not found: ${newItem.brand}`);

      if (brand.currentStock < newItem.quantity) {
        throw new Error(`Insufficient stock for ${brand.name} after recalculation`);
      }

      const previousStock = brand.currentStock;
      brand.currentStock -= newItem.quantity;
      brand.lastUpdated = new Date();
      await brand.save();

      totalQuantity += newItem.quantity;

      stockTransactions.push({
        brand: brand._id,
        type: 'OUT',
        quantity: newItem.quantity,
        previousStock,
        currentStock: brand.currentStock,
        referenceId: bill._id,
        admin: adminId,
      });
    }

    bill.millName = millName;
    bill.partyName = partyName;
    bill.items = items;
    bill.totalQuantity = totalQuantity;
    await bill.save();

    await StockTransaction.insertMany(stockTransactions);

    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
