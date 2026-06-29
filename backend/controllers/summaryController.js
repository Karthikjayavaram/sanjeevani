const StockTransaction = require('../models/StockTransaction');
const Brand = require('../models/Brand');
const Bill = require('../models/Bill');

exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter = {
        createdAt: {
          $gte: today
        }
      };
    }

    const incomingTransactions = await StockTransaction.aggregate([
      { $match: { ...dateFilter, type: 'IN' } },
      { $group: { _id: '$brand', totalQuantity: { $sum: '$quantity' } } }
    ]);

    const outgoingTransactions = await StockTransaction.aggregate([
      { $match: { ...dateFilter, type: 'OUT' } },
      { $group: { _id: '$brand', totalQuantity: { $sum: '$quantity' } } }
    ]);

    const totalIncoming = incomingTransactions.reduce((acc, curr) => acc + curr.totalQuantity, 0);
    const totalOutgoing = outgoingTransactions.reduce((acc, curr) => acc + curr.totalQuantity, 0);

    const brands = await Brand.find({}, 'name variant currentStock');
    const currentAvailableStock = brands.reduce((acc, brand) => acc + brand.currentStock, 0);

    // populate brand info for transactions
    await Brand.populate(incomingTransactions, { path: '_id', select: 'name variant' });
    await Brand.populate(outgoingTransactions, { path: '_id', select: 'name variant' });

    const allTransactions = await StockTransaction.find(dateFilter)
      .populate('brand', 'name variant image')
      .populate('admin', 'name')
      .populate('referenceId')
      .sort({ createdAt: -1 });

    res.json({
      totalIncoming,
      totalOutgoing,
      currentAvailableStock,
      incomingTransactions,
      outgoingTransactions,
      allTransactions
    });

  } catch (error) {
    console.error('Summary API Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const incomingTransactions = await StockTransaction.aggregate([
      { $match: { createdAt: { $gte: today }, type: 'IN' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const outgoingTransactions = await StockTransaction.aggregate([
      { $match: { createdAt: { $gte: today }, type: 'OUT' } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const totalIncoming = incomingTransactions.length > 0 ? incomingTransactions[0].total : 0;
    const totalOutgoing = outgoingTransactions.length > 0 ? outgoingTransactions[0].total : 0;

    const brands = await Brand.find({}, 'currentStock minStockAlert');
    const currentAvailableStock = brands.reduce((acc, brand) => acc + brand.currentStock, 0);
    const lowStockCount = brands.filter(b => b.currentStock <= b.minStockAlert).length;

    const recentBills = await Bill.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.brand', 'name variant')
      .populate('adminId', 'name');

    res.json({
      totalIncoming,
      totalOutgoing,
      currentAvailableStock,
      lowStockCount,
      recentBills
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
