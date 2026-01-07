const { GoogleGenAI } = require('@google/genai');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Queue System Configuration ---
const requestQueue = [];
let isProcessing = false;
let lastRequestTime = 0;
const RATE_LIMIT_DELAY = 10000; // Increased to 10 Seconds to be extra safe

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    while (requestQueue.length > 0) {
        const currentItem = requestQueue[0];
        const { req, res, text, voice, tone } = currentItem;

        try {
            // --- ENFORCE GLOBAL DELAY ---
            const now = Date.now();
            const timeSinceLast = now - lastRequestTime;

            if (timeSinceLast < RATE_LIMIT_DELAY) {
                const waitTime = RATE_LIMIT_DELAY - timeSinceLast;
                console.log(`Global Rate Limit: Waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            console.log(`Processing TTS request. Queue length: ${requestQueue.length}`);

            const prompt = `Expressive Amharic Narration. Persona: ${voice || 'Zephyr'}, Tone: ${tone || 'Storyteller'}. Message: "${text}"`;

            const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: voice || "Zephyr"
                            }
                        }
                    },
                },
            });

            lastRequestTime = Date.now(); // Update timestamp on success call

            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!audioData) {
                throw new Error("No audio data received from Gemini API");
            }

            // Send success response
            res.json({ audio: audioData });

        } catch (error) {
            console.error("TTS Queue Processing Error:", error);
            if (!res.headersSent) {
                if (error.status === 429) {
                    // Even with our delay, Google said no. Updating timestamp to force a wait for next try too.
                    lastRequestTime = Date.now();
                    res.status(429).json({ message: "System Busy: Rate limit hit. Please wait a moment." });
                } else {
                    res.status(500).json({ message: error.message || "Failed to generate speech" });
                }
            }
        } finally {
            requestQueue.shift(); // Remove handled item
        }
    }

    isProcessing = false;
};

exports.generateSpeech = async (req, res) => {
    try {
        const { text, voice, tone } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Text is required" });
        }

        // Add to queue
        requestQueue.push({ req, res, text, voice, tone });
        console.log(`Request added to queue. Position: ${requestQueue.length}`);

        // Trigger processor if not running
        processQueue();

        // Note: Response is sent inside processQueue

    } catch (error) {
        console.error("TTS Controller Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
