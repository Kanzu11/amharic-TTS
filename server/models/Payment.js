const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // For now, maybe optional if we allow guest payments initially, but ideally required. Let's keep optional for flexibility during migration.
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'ETB',
    },
    paymentMethod: {
        type: String,
        enum: ['telebirr', 'cbe'],
        default: 'telebirr',
    },
    transactionId: {
        type: String,
        required: false,
    },
    proofImage: {
        type: String, // Cloudinary URL
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    telegramMessageId: {
        type: String, // To potentially edit/reply in channel
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
