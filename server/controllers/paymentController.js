const Payment = require('../models/Payment');
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');
const { Telegraf } = require('telegraf');
const fs = require('fs');

// Initialize Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@texttospeechet';

exports.submitPayment = async (req, res) => {
    let file = req.file;
    try {
        const { amount, transactionId, paymentMethod } = req.body;

        // Ensure user is authenticated
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userId = req.user._id;

        if (!file) {
            return res.status(400).json({ message: 'Proof image is required' });
        }

        // Prepare caption
        const caption = `
🆕 *New Payment Request*
👤 User: ${req.user.email}
💰 Amount: ${amount} ETB
💳 Method: ${paymentMethod}
🆔 Transaction ID: \`${transactionId || 'N/A'}\`
📅 Date: ${new Date().toLocaleString()}
    `;

        let proofImageUrl = '';
        let telegramMessageId = undefined;

        // 1. Upload to Cloudinary First
        try {
            const cloudinaryResult = await cloudinary.uploader.upload(file.path, { folder: 'payments' });
            proofImageUrl = cloudinaryResult.secure_url;
        } catch (cloudErr) {
            console.error('Cloudinary upload failed:', cloudErr);
            // Fallback placeholder if entirely failed later, but we try Telegram next
        }

        // 2. Send to Telegram (Prioritize URL, fallback to local file)
        try {
            if (proofImageUrl) {
                // Send using URL (Faster & Reliable)
                const tgResult = await bot.telegram.sendPhoto(CHANNEL_ID, proofImageUrl, { caption, parse_mode: 'Markdown' });
                telegramMessageId = tgResult.message_id;
            } else {
                // Cloudinary failed, send local file
                const tgResult = await bot.telegram.sendPhoto(CHANNEL_ID, { source: file.path }, { caption, parse_mode: 'Markdown' });
                telegramMessageId = tgResult.message_id;
                // If this worked, set a placeholder for the DB
                proofImageUrl = 'https://placehold.co/400x600?text=Check+Telegram+Channel';
            }
        } catch (tgError) {
            console.error('Telegram send failed:', tgError);
        }

        // 3. Validation: Did at least one work?
        if (!proofImageUrl && !telegramMessageId) {
            throw new Error('Both upload methods failed');
        }

        // Create Payment Record
        const payment = await Payment.create({
            user: userId,
            amount: Number(amount),
            transactionId: transactionId || undefined,
            paymentMethod,
            proofImage: proofImageUrl || 'https://placehold.co/400x600?text=Error',
            status: 'pending',
            telegramMessageId
        });

        res.status(201).json({ success: true, payment });

    } catch (error) {
        console.error('Payment submission error:', error);
        res.status(500).json({ message: 'Server error processing payment: ' + error.message });
    } finally {
        // Always clean up local file
        if (file && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) { }
        }
    }
};

exports.getPendingPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalPayments = await Payment.countDocuments({ status: 'pending' });
        const payments = await Payment.find({ status: 'pending' })
            .populate('user', 'email name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            payments,
            totalPages: Math.ceil(totalPayments / limit),
            currentPage: page,
            totalPayments
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payments' });
    }
};

exports.getUserPayments = async (req, res) => {
    try {
        const userId = req.user._id;
        const payments = await Payment.find({ user: userId }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payment history' });
    }
};

exports.approvePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.status = 'approved';
        await payment.save();

        // ---------------------------------------------------
        // ACTIVATE SUBSCRIPTION
        // ---------------------------------------------------
        if (payment.user) {
            const user = await User.findById(payment.user);
            if (user) {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

                user.subscription = {
                    status: 'active',
                    plan: 'monthly',
                    startDate: now,
                    expiresAt: expiresAt
                };
                await user.save();
                console.log(`User ${user.email} subscription activated until ${expiresAt}`);
            }
        }

        // Notify via Telegram
        try {
            if (payment.telegramMessageId) {
                // If using a public channel username, this works. If private, use ID.
                // We prefer the ID from env if available to avoid "chat not found".
                const targetChat = process.env.TELEGRAM_CHANNEL_ID || CHANNEL_ID;
                await bot.telegram.sendMessage(targetChat, `✅ Payment Approved! User subscription active.`, {
                    reply_to_message_id: payment.telegramMessageId
                });
            }
        } catch (tgError) {
            console.error('Telegram notification failed:', tgError);
        }

        res.json(payment);
    } catch (error) {
        console.error('Approval error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.status = 'rejected';
        await payment.save();

        res.json(payment);
    } catch (error) {
        console.error('Rejection error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getProcessedPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalPayments = await Payment.countDocuments({ status: { $ne: 'pending' } });
        const payments = await Payment.find({ status: { $ne: 'pending' } })
            .populate('user', 'email name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            payments,
            totalPages: Math.ceil(totalPayments / limit),
            currentPage: page,
            totalPayments
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history' });
    }
};
