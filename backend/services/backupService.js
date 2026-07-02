const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const cron = require('node-cron');
const archiver = require('archiver');
const unzipper = require('unzipper');
const BackupLog = require('../models/BackupLog');
const Bill = require('../models/Bill');
const StockTransaction = require('../models/StockTransaction');
const googleAuthService = require('./googleAuthService');

const createBackup = async (type = 'Auto') => {
  let backupLog = new BackupLog({
    backupName: 'Generating...',
    fileId: 'pending',
    sizeBytes: 0,
    backupType: type,
    status: 'Failed' 
  });
  
  try {
    const bills = await Bill.find({}).lean();
    const stockTransactions = await StockTransaction.find({}).lean();
    
    const date = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const YYYY = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const DD = pad(date.getDate());
    
    const fileName = `billing-backup-${YYYY}-${MM}-${DD}.zip`;
    
    // Check if a backup for today already exists
    const existingBackup = await BackupLog.findOne({ backupName: fileName });
    if (existingBackup) {
      if (existingBackup.fileId && existingBackup.fileId !== 'pending') {
        try {
          const drive = await googleAuthService.getDriveClient();
          await drive.files.delete({ fileId: existingBackup.fileId });
        } catch (e) {
          console.warn('Failed to delete old backup from drive', e.message);
        }
      }
      await BackupLog.findByIdAndDelete(existingBackup._id);
    }
    
    const billsFileName = `bills.json`;
    const stockFileName = `stock-transactions.json`;
    
    backupLog.backupName = fileName;
    
    const backupDir = path.join(os.tmpdir(), 'godown-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const zipPath = path.join(backupDir, fileName);
    
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.append(JSON.stringify(bills, null, 2), { name: billsFileName });
      archive.append(JSON.stringify(stockTransactions, null, 2), { name: stockFileName });
      archive.finalize();
    });

    const fileStats = fs.statSync(zipPath);
    backupLog.sizeBytes = fileStats.size;

    const drive = await googleAuthService.getDriveClient();
    const folderId = await googleAuthService.getOrCreateFolder(drive);
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };
    
    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(zipPath)
    };
    
    const uploadRes = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });
    
    backupLog.fileId = uploadRes.data.id;
    backupLog.status = 'Success';
    await backupLog.save();

    fs.unlinkSync(zipPath);
    
    return backupLog;
    
  } catch (error) {
    console.error('Backup creation failed:', error);
    await backupLog.save();
    throw error;
  }
};

const downloadBackup = async (fileId) => {
  try {
    const drive = await googleAuthService.getDriveClient();
    const tempDir = path.join(os.tmpdir(), 'godown-temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const destPath = path.join(tempDir, `${fileId}.zip`);
    
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    return new Promise((resolve, reject) => {
      const dest = fs.createWriteStream(destPath);
      res.data.pipe(dest);
      dest.on('close', () => resolve(destPath));
      dest.on('error', err => reject(err));
      res.data.on('error', err => reject(err));
    });
  } catch (error) {
    throw error;
  }
};

const restoreToTemp = async (fileId) => {
  try {
    const drive = await googleAuthService.getDriveClient();
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

    let billsData = [];
    let stockData = [];

    await new Promise((resolve, reject) => {
      res.data
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          if (fileName === 'bills.json' || fileName === 'stock-transactions.json') {
            const chunks = [];
            entry.on('data', chunk => chunks.push(chunk));
            entry.on('end', () => {
              const content = Buffer.concat(chunks).toString('utf-8');
              if (content.trim()) {
                try {
                  if (fileName === 'bills.json') billsData = JSON.parse(content);
                  if (fileName === 'stock-transactions.json') stockData = JSON.parse(content);
                } catch (e) {
                  console.error('JSON parse error:', e);
                }
              }
            });
            entry.on('error', reject);
          } else {
            entry.autodrain();
          }
        })
        .on('close', resolve)
        .on('error', reject);
      
      res.data.on('error', reject);
    });
    
    const db = mongoose.connection.db;
    const restoreCollection = db.collection('billing_restore');
    const restoreStockCollection = db.collection('stock_restore');
    
    await restoreCollection.deleteMany({});
    await restoreStockCollection.deleteMany({});
    
    const formattedBills = billsData.map(doc => {
      if (doc._id) doc._id = new mongoose.Types.ObjectId(doc._id);
      if (doc.adminId) doc.adminId = new mongoose.Types.ObjectId(doc.adminId);
      if (doc.items) {
        doc.items = doc.items.map(item => {
          if (item._id) item._id = new mongoose.Types.ObjectId(item._id);
          if (item.brand) item.brand = new mongoose.Types.ObjectId(item.brand);
          return item;
        });
      }
      if (doc.date) doc.date = new Date(doc.date);
      if (doc.createdAt) doc.createdAt = new Date(doc.createdAt);
      if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt);
      return doc;
    });

    const formattedStocks = stockData.map(doc => {
      if (doc._id) doc._id = new mongoose.Types.ObjectId(doc._id);
      if (doc.brand) doc.brand = new mongoose.Types.ObjectId(doc.brand);
      if (doc.referenceId) doc.referenceId = new mongoose.Types.ObjectId(doc.referenceId);
      if (doc.admin) doc.admin = new mongoose.Types.ObjectId(doc.admin);
      if (doc.createdAt) doc.createdAt = new Date(doc.createdAt);
      if (doc.updatedAt) doc.updatedAt = new Date(doc.updatedAt);
      return doc;
    });

    if (formattedBills.length > 0) await restoreCollection.insertMany(formattedBills);
    if (formattedStocks.length > 0) await restoreStockCollection.insertMany(formattedStocks);
    
    return { bills: formattedBills, stocks: formattedStocks };
  } catch (error) {
    console.error('Error during temp restore:', error);
    throw error;
  }
};

const executeCron = () => {
  const cronExpression = process.env.BACKUP_CRON || '0 2 * * *';
  cron.schedule(cronExpression, async () => {
    console.log(`[Cron] Running scheduled backup at ${new Date().toISOString()}`);
    try {
      await createBackup('Auto');
      console.log('[Cron] Backup completed successfully');
    } catch (error) {
      console.error('[Cron] Auto backup failed:', error);
    }
  });
  console.log(`[Cron] Backup scheduler started with pattern: ${cronExpression}`);
};

const deleteBackup = async (dbId, driveFileId) => {
  try {
    if (driveFileId && driveFileId !== 'pending') {
      try {
        const drive = await googleAuthService.getDriveClient();
        await drive.files.delete({ fileId: driveFileId });
      } catch (driveErr) {
        console.warn('Drive deletion failed (might already be deleted)', driveErr.message);
      }
    }
    await BackupLog.findByIdAndDelete(dbId);
  } catch (error) {
    console.error('Delete backup failed', error);
    throw error;
  }
};

module.exports = {
  createBackup,
  downloadBackup,
  restoreToTemp,
  executeCron,
  deleteBackup
};
