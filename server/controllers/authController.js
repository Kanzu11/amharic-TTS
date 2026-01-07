const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { verificationEmail, resetPasswordEmail } = require('../utils/emailTemplates');
const Payment = require('../models/Payment'); // Ensure Payment model is imported

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Force Super Admin role for specific email
            if (user.email === 'superadmin@example.com' && user.role !== 'superadmin') {
                user.role = 'superadmin';
                user.isVerified = true; // Auto verify superadmin
                await user.save();
            }

            if (!user.isVerified && user.role !== 'superadmin') { // Allow superadmin to bypass if somehow not verified
                // Option: Return error? Or just let them in but limited?
                // User request says "Verify email", implying mandatory verification.
                // But let's check if we want to block login.
                return res.status(401).json({ message: 'Please verify your email address' });
            }

            res.json({
                _id: user._id,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            email,
            password: hashedPassword,
            role: 'admin',
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                email: user.email,
                role: user.role,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: email === 'superadmin@example.com' ? 'superadmin' : 'user',
            isVerified: false
        });

        // Generate 6-digit OTP
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = verificationCode;
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes
        await user.save();

        const message = `Your verification code is ${verificationCode}`;
        const html = verificationEmail(verificationCode);

        try {
            await sendEmail({
                email: user.email,
                subject: 'Verify Your Email - Amharic TTS',
                message,
                html
            });
        } catch (error) {
            console.error("Verification email failed", error);
        }

        if (user) {
            res.status(201).json({
                _id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                token: generateToken(user._id),
                message: 'Registered successfully. Please check your email for verification code.'
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUserRole = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.role = req.body.role || user.role;
            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                email: updatedUser.email,
                role: updatedUser.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            await user.deleteOne();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            const pendingPayment = await Payment.findOne({ user: user._id, status: 'pending' });

            res.json({
                _id: user._id,
                email: user.email,
                role: user.role,
                name: user.name,
                subscription: user.subscription,
                isVerified: user.isVerified,
                createdAt: user.createdAt,
                hasPendingPayment: !!pendingPayment
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error("Profile Error", error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyEmail = async (req, res) => {
    // Expecting: { email, code } in body, OR just code if we use the token from state?
    // Better to just require email + code for stateless/security, OR code + currently logged in user (if they can login without verifying)
    // Registration returns token even if not verified. So we can use req.user (protected route) or pass email.
    // Let's support an unauthenticated endpoint where they send email + code (safe enough)
    // actually, let's look at route. It was: router.get('/verifyemail/:token', verifyEmail);
    // We need to change route to POST /verifyemail with body { email, code }

    // BUT! Frontend AuthModal will have the email in state.
    // Let's stick to body.

    const { email, code } = req.body;

    try {
        const user = await User.findOne({
            email,
            verificationCode: code,
            verificationCodeExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpire = undefined;
        await user.save();

        res.status(200).json({
            message: 'Email verified successfully',
            token: generateToken(user._id), // Fresh token just in case
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                isVerified: true,
                isSubscribed: user.role === 'admin' || user.role === 'superadmin' || (user.subscription?.status === 'active')
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes
        await user.save();

        const message = `You requested a password reset. Your OTP is: ${resetToken}`;
        const html = `
            <h1>Reset Password</h1>
            <p>Your password reset code is:</p>
            <h2 style="color: #4f46e5; letter-spacing: 5px;">${resetToken}</h2>
            <p>This code expires in 10 minutes.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Reset Password Code',
                message,
                html
            });

            res.status(200).json({ message: 'Email sent' });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    // New logic: expect email, otp, password
    const { email, otp, password } = req.body;

    try {
        const user = await User.findOne({
            email,
            resetPasswordToken: otp,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        user.password = password; // Will be hashed by pre-save hook
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.resendVerification = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = verificationCode;
        user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const message = `Your new verification code is ${verificationCode}`;
        const html = verificationEmail(verificationCode);

        await sendEmail({
            email: user.email,
            subject: 'New Verification Code',
            message,
            html
        });

        res.status(200).json({ message: 'Verification code resent' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.revokeSubscription = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.subscription = {
            status: 'inactive',
            plan: 'monthly', // reset to default or keep previous? Resetting to avoid confusion
            startDate: undefined,
            expiresAt: undefined
        };

        await user.save();

        res.status(200).json({ message: 'Subscription revoked', subscription: user.subscription });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
