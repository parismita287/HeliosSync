// ============================================
// HeliosSync Input Validation Middleware
// ============================================


// ============================================
// Helper: Check Numeric Value
// ============================================

const isValidNumber = (value) => {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );

};


// ============================================
// Sensor Data Validation
// ============================================

const validateSensorData = (
    req,
    res,
    next
) => {

    try {

        const {
            solarPower,
            batteryLevel,
            temperature,
            panelAngle,
            voltage,
            current,
            loadPower
        } = req.body;


        // =====================================
        // Required fields
        // =====================================

        const requiredFields = {

            solarPower,

            batteryLevel,

            temperature,

            panelAngle,

            voltage,

            current,

            loadPower

        };


        // =====================================
        // Check missing fields
        // =====================================

        for (
            const [field, value]
            of Object.entries(
                requiredFields
            )
        ) {

            if (
                value === undefined ||
                value === null
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        `Missing sensor field: ${field}`

                });

            }

        }


        // =====================================
        // Check numeric fields
        // =====================================

        for (
            const [field, value]
            of Object.entries(
                requiredFields
            )
        ) {

            if (
                !isValidNumber(value)
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        `Invalid numeric value for: ${field}`

                });

            }

        }


        // =====================================
        // Battery range
        // =====================================

        if (
            batteryLevel < 0 ||
            batteryLevel > 100
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Battery level must be between 0 and 100."

            });

        }


        // =====================================
        // Solar power
        // =====================================

        if (
            solarPower < 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Solar power cannot be negative."

            });

        }


        // =====================================
        // Temperature
        // =====================================

        if (
            temperature < -50 ||
            temperature > 100
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Temperature must be between -50°C and 100°C."

            });

        }


        // =====================================
        // Panel angle
        // =====================================

        if (
            panelAngle < 0 ||
            panelAngle > 180
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Panel angle must be between 0° and 180°."

            });

        }


        // =====================================
        // Voltage
        // =====================================

        if (
            voltage < 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Voltage cannot be negative."

            });

        }


        // =====================================
        // Current
        // =====================================

        if (
            current < 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Current cannot be negative."

            });

        }


        // =====================================
        // Load Power
        // =====================================

        if (
            loadPower < 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Load power cannot be negative."

            });

        }


        // =====================================
        // Validation successful
        // =====================================

        next();

    } catch (error) {

        console.error(
            "Sensor validation error:",
            error.message
        );


        return res.status(400).json({

            success:
                false,

            message:
                "Invalid sensor data."

        });

    }

};


// ============================================
// Optimization Validation
// ============================================

const validateOptimizationData = (
    req,
    res,
    next
) => {

    try {

        const {
            solarGeneration,
            solarPower,
            loadConsumption,
            loadPower,
            batteryLevel
        } = req.body;


        // =====================================
        // Accept supported field names
        // =====================================

        const solar =
            solarGeneration ??
            solarPower;


        const load =
            loadConsumption ??
            loadPower;


        // =====================================
        // Check solar value
        // =====================================

        if (
            solar === undefined ||
            !isValidNumber(
                Number(solar)
            )
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "A valid solar generation value is required."

            });

        }


        // =====================================
        // Check load value
        // =====================================

        if (
            load === undefined ||
            !isValidNumber(
                Number(load)
            )
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "A valid load consumption value is required."

            });

        }


        // =====================================
        // Check battery
        // =====================================

        if (
            batteryLevel === undefined ||
            !isValidNumber(
                Number(batteryLevel)
            )
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "A valid battery level is required."

            });

        }


        // =====================================
        // Numeric range validation
        // =====================================

        if (
            Number(solar) < 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Solar generation cannot be negative."

            });

        }


        if (
            Number(load) < 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Load consumption cannot be negative."

            });

        }


        if (
            Number(batteryLevel) < 0 ||
            Number(batteryLevel) > 100
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Battery level must be between 0 and 100."

            });

        }


        // =====================================
        // Continue
        // =====================================

        next();

    } catch (error) {

        console.error(
            "Optimization validation error:",
            error.message
        );


        return res.status(400).json({

            success:
                false,

            message:
                "Invalid optimization input."

        });

    }

};


// ============================================
// Export
// ============================================

module.exports = {

    validateSensorData,

    validateOptimizationData

};