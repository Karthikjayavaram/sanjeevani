const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Brand = require('./models/Brand');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sanjeevani:adminsanjeevani@cluster0.0aotxcz.mongodb.net/rice_godown?retryWrites=true&w=majority&appName=Cluster0';

const sampleImages = [
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1621317666270-b18c02c63d55?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1596162954151-cdcb92b1cb5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1534887340087-733d06eb705e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
];

const riceNames = [
  'Basmati Premium', 'Sona Masoori', 'Jasmine Rice', 'Brown Rice', 'Red Matta',
  'Ponni Boiled', 'Jeera Samba', 'Kolam', 'Gobindobhog', 'BPT 5204',
  'Kurnool Sona', 'HMT Rice', 'Idli Rice', 'Indrayani', 'Wada Kolam'
];

const suppliers = ['Kisan Mills', 'Agro Foods', 'Royal Rice Traders', 'Sri Sai Industries', 'Bharat Grains'];

const generateDummyData = () => {
  const data = [];
  for (let i = 1; i <= 40; i++) {
    const name = riceNames[Math.floor(Math.random() * riceNames.length)] + ` (Batch ${i})`;
    data.push({
      name,
      variant: [26, 30, 50, 10][Math.floor(Math.random() * 4)] + ' KG',
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      storageLocation: `Godown ${['A', 'B', 'C'][Math.floor(Math.random() * 3)]}, Row ${Math.floor(Math.random() * 10) + 1}`,
      minStockAlert: 50,
      currentStock: Math.floor(Math.random() * 500) + 10,
      image: sampleImages[Math.floor(Math.random() * sampleImages.length)]
    });
  }
  return data;
};

const seedDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    console.log('Clearing old dummy brands (keeping some if needed, but lets just insert)');
    // Uncomment to clear first: await Brand.deleteMany({});
    
    const dummyData = generateDummyData();
    console.log(`Inserting ${dummyData.length} brands...`);
    
    await Brand.insertMany(dummyData);
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedDB();
