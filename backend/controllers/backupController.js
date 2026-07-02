const BackupLog = require('../models/BackupLog');
const backupService = require('../services/backupService');
const Bill = require('../models/Bill');
const StockTransaction = require('../models/StockTransaction');
const mongoose = require('mongoose');

exports.getBackups = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    let query = {};
    
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    
    const logs = await BackupLog.find(query).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching backups', error: error.message });
  }
};

exports.manualBackup = async (req, res) => {
  try {
    const backupLog = await backupService.createBackup('Manual');
    res.status(200).json({ message: 'Backup created successfully', backupLog });
  } catch (error) {
    res.status(500).json({ message: 'Backup failed', error: error.message });
  }
};

exports.downloadBackup = async (req, res) => {
  try {
    const { id } = req.params; // this is the google drive fileId
    const zipPath = await backupService.downloadBackup(id);
    
    res.download(zipPath, `backup-${id}.zip`, (err) => {
      if (err) console.error('Download error:', err);
      // fs.unlinkSync is handled by res.download? No, res.download doesn't auto delete. 
      // Need a way to delete after download.
      const fs = require('fs');
      fs.unlink(zipPath, (e) => {
        if(e) console.error('Cleanup error:', e);
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Download failed', error: error.message });
  }
};

exports.restorePreview = async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ message: 'fileId required' });
    
    const records = await backupService.restoreToTemp(fileId);
    res.status(200).json({ 
      message: 'Restore preview ready', 
      billsCount: records.bills.length, 
      stocksCount: records.stocks.length,
      records 
    });
  } catch (error) {
    res.status(500).json({ message: 'Restore preview failed', error: error.message });
  }
};

exports.restoreConfirm = async (req, res) => {
  try {
    const { recordIds, stockIds, resolutionMode } = req.body; 
    // resolutionMode can be 'Skip', 'Replace', 'Create Copy'
    if (!Array.isArray(recordIds) || !Array.isArray(stockIds)) {
      return res.status(400).json({ message: 'recordIds and stockIds arrays required' });
    }
    
    const db = mongoose.connection.db;
    const restoreCollection = db.collection('billing_restore');
    const restoreStockCollection = db.collection('stock_restore');
    
    const objectIds = recordIds.map(id => new mongoose.Types.ObjectId(id));
    const recordsToRestore = await restoreCollection.find({ _id: { $in: objectIds } }).toArray();
    
    const sObjectIds = stockIds.map(id => new mongoose.Types.ObjectId(id));
    const stocksToRestore = await restoreStockCollection.find({ _id: { $in: sObjectIds } }).toArray();
    
    let restoredCount = 0;
    let skippedCount = 0;
    let stocksRestored = 0;
    let stocksSkipped = 0;

    for (const record of recordsToRestore) {
      const existing = await Bill.findOne({ billNumber: record.billNumber });
      
      if (existing) {
        if (resolutionMode === 'Skip') {
          skippedCount++;
          continue;
        } else if (resolutionMode === 'Replace') {
          await Bill.findOneAndReplace({ billNumber: record.billNumber }, record);
          restoredCount++;
        } else if (resolutionMode === 'Create Copy') {
          const newRecord = { ...record };
          delete newRecord._id;
          newRecord.billNumber = `${record.billNumber}-COPY-${Date.now()}`;
          await Bill.create(newRecord);
          restoredCount++;
        }
      } else {
        await Bill.create(record);
        restoredCount++;
      }
    }
    
    for (const stock of stocksToRestore) {
      const existing = await StockTransaction.findById(stock._id);
      if (existing) {
        if (resolutionMode === 'Skip' || resolutionMode === 'Create Copy') {
          stocksSkipped++; // Creating copy of stock transaction doesn't make sense usually, just skip
          continue; 
        } else if (resolutionMode === 'Replace') {
          await StockTransaction.findByIdAndUpdate(stock._id, stock);
          stocksRestored++;
        }
      } else {
        await StockTransaction.create(stock);
        stocksRestored++;
      }
    }
    
    res.status(200).json({ message: 'Restore complete', restoredCount, skippedCount, stocksRestored, stocksSkipped });
  } catch (error) {
    console.error('Restore confirm failed', error);
    res.status(500).json({ message: 'Restore failed', error: error.message });
  }
};

exports.deleteBackup = async (req, res) => {
  try {
    const { id } = req.params;
    const backup = await BackupLog.findById(id);
    if (!backup) return res.status(404).json({ message: 'Backup not found' });
    
    await backupService.deleteBackup(id, backup.fileId);
    res.status(200).json({ message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};
