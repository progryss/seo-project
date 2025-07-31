const User = require('../models/users/userModels.js')
const bcrypt = require('bcryptjs');

// Initialize admin user
const initAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: 'progryss@gmail.com' });

    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Progryss@13579', salt);

      await User.create({
        email: 'progryss@gmail.com',
        password: hashedPassword
      });

      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

module.exports = initAdminUser;
