const crypto = require("crypto");


// ============================================
// HeliosSync IoT Device Authentication
// ============================================
//
// This middleware authenticates IoT devices
// using the X-Device-Key request header.
//
// Example:
//
// X-Device-Key:
// heliossync-device-key-2026-secure
//
// The expected key is stored in:
//
// HELIOS_DEVICE_KEY
//
// inside backend/.env
//
// ============================================


const deviceAuth = (
    req,
    res,
    next
) => {

    try {

        // ==========================================
        // Get device key from request
        // ==========================================

        const providedKey =
            req.headers["x-device-key"];


        // ==========================================
        // Get configured server key
        // ==========================================

        const configuredKey =
            process.env.HELIOS_DEVICE_KEY;


        // ==========================================
        // Check server configuration
        // ==========================================

        if (!configuredKey) {

            console.error(
                "❌ HELIOS_DEVICE_KEY is not configured."
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "IoT device authentication is not configured."

            });

        }


        // ==========================================
        // Check whether device sent a key
        // ==========================================

        if (!providedKey) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "IoT device authentication required."

            });

        }


        // ==========================================
        // Convert keys to Buffers
        // ==========================================

        const providedBuffer =
            Buffer.from(
                String(providedKey)
            );


        const configuredBuffer =
            Buffer.from(
                String(configuredKey)
            );


        // ==========================================
        // timingSafeEqual requires buffers
        // of the same length.
        // ==========================================

        if (
            providedBuffer.length !==
            configuredBuffer.length
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Invalid IoT device key."

            });

        }


        // ==========================================
        // Secure key comparison
        // ==========================================
        //
        // timingSafeEqual helps prevent timing
        // based comparison attacks.
        //
        // ==========================================

        const isValid =
            crypto.timingSafeEqual(
                providedBuffer,
                configuredBuffer
            );


        // ==========================================
        // Invalid device key
        // ==========================================

        if (!isValid) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Invalid IoT device key."

            });

        }


        // ==========================================
        // Device authenticated successfully
        // ==========================================

        req.device = {

            authenticated:
                true,

            type:
                "IoT Sensor Simulator"

        };


        // ==========================================
        // Continue to route
        // ==========================================

        next();

    } catch (error) {

        console.error(
            "❌ Device authentication error:",
            error.message
        );


        return res.status(401).json({

            success:
                false,

            message:
                "IoT device authentication failed."

        });

    }

};


// ============================================
// Export Middleware
// ============================================

module.exports =
    deviceAuth;