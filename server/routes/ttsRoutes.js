const express = require('express');
const router = express.Router();
const ttsController = require('../controllers/ttsController');
const { protect } = require('../middleware/authMiddleware');

// Public or Protected? User didn't specify strict auth for TTS, but usually it's public for guests too.
// App logic allows guests, so we won't strictly protect it yet, OR we make it optional.
// App.tsx logic: userId: currentUser?.id || 'guest'
// So we keep it public for now, but backend can enforce limits later.

router.post('/generate', ttsController.generateSpeech);

module.exports = router;
