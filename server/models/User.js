const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superadmin'],
        default: 'user',
    },
    subscription: {
        status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'inactive' },
        plan: { type: String, enum: ['monthly', 'lifetime'], default: 'monthly' },
        startDate: { type: Date },
        expiresAt: { type: Date }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationCode: String,
    verificationCodeExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date
});

const User = mongoose.model('User', userSchema);

module.exports = User;
