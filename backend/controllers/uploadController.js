const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'mock',
  api_key: process.env.CLOUDINARY_API_KEY || 'mock',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mock'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'godown_brands',
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp']
  }
});

const upload = multer({ storage: storage });

exports.uploadImage = [
  upload.single('image'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }
      res.json({ url: req.file.path });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
];
