const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seo-project';

async function checkUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully');
    
    // Get the User model schema from the database
    const User = mongoose.model('User', new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true }
    }));
    
    // Find all users
    const users = await User.find({});
    
    console.log('Total users found:', users.length);
    console.log('Users:', users.map(user => ({ id: user._id, email: user.email })));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

checkUsers(); 