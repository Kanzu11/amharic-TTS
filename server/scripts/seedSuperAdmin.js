const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'superadmin@example.com';
        const password = 'superadmin123';

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Super Admin already exists');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const superAdmin = new User({
            email,
            password: hashedPassword,
            role: 'superadmin',
        });

        await superAdmin.save();
        console.log('Super Admin created successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding super admin:', error);
        process.exit(1);
    }
};

seedSuperAdmin();
