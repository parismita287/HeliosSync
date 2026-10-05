const mongoose = require("mongoose");

const sensorDataSchema = new mongoose.Schema(
    {
        solarPower: {
            type: Number,
            required: true
        },

        batteryLevel: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },

        temperature: {
            type: Number,
            required: true
        },

        panelAngle: {
            type: Number,
            required: true,
            min: 0,
            max: 90
        },

        voltage: {
            type: Number,
            required: true
        },

        current: {
            type: Number,
            required: true
        },

        loadPower: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true,
        collection: "sensorData"
    }
);

const SensorData = mongoose.model("SensorData", sensorDataSchema);

module.exports = SensorData;