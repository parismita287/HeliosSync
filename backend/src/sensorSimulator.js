require("dotenv").config();

const http = require("http");


// =====================================
// HeliosSync IoT Sensor Simulator
// =====================================

const SERVER_HOST =
    "localhost";

const SERVER_PORT =
    5000;

const DEVICE_KEY =
    process.env.HELIOS_DEVICE_KEY;


let batteryLevel =
    70;

let panelAngle =
    30;


// =====================================
// Validate Device Configuration
// =====================================

if (!DEVICE_KEY) {

    console.error(
        "❌ HELIOS_DEVICE_KEY is missing from backend/.env"
    );

    process.exit(1);

}


// =====================================
// Generate random number
// =====================================

function random(
    min,
    max
) {

    return (
        Math.random() *
        (max - min)
    ) + min;

}


// =====================================
// Generate Solar Sensor Data
// =====================================

function generateSensorData() {

    const solarPower =
        Number(
            random(
                2,
                6
            ).toFixed(2)
        );


    const temperature =
        Number(
            random(
                25,
                40
            ).toFixed(1)
        );


    panelAngle =
        Number(
            Math.min(
                90,
                Math.max(
                    0,
                    panelAngle +
                    random(
                        -5,
                        5
                    )
                )
            ).toFixed(1)
        );


    const voltage =
        Number(
            random(
                22,
                26
            ).toFixed(2)
        );


    const current =
        Number(
            random(
                5,
                10
            ).toFixed(2)
        );


    const loadPower =
        Number(
            random(
                1,
                4
            ).toFixed(2)
        );


    // =================================
    // Update Battery
    // =================================

    const batteryChange =
        (
            solarPower -
            loadPower
        ) * 0.5;


    batteryLevel +=
        batteryChange;


    batteryLevel =
        Math.min(
            100,
            Math.max(
                0,
                batteryLevel
            )
        );


    return {

        solarPower,

        batteryLevel:
            Number(
                batteryLevel.toFixed(2)
            ),

        temperature,

        panelAngle,

        voltage,

        current,

        loadPower

    };

}


// =====================================
// Send Sensor Data To Backend
// =====================================

function sendSensorData(
    data
) {

    const jsonData =
        JSON.stringify(
            data
        );


    const options = {

        hostname:
            SERVER_HOST,

        port:
            SERVER_PORT,

        path:
            "/api/sensors",

        method:
            "POST",

        headers: {

            "Content-Type":
                "application/json",

            "Content-Length":
                Buffer.byteLength(
                    jsonData
                ),

            "X-Device-Key":
                DEVICE_KEY

        }

    };


    const request =
        http.request(
            options,
            (response) => {

                let responseData =
                    "";


                response.on(
                    "data",
                    (chunk) => {

                        responseData +=
                            chunk;

                    }
                );


                response.on(
                    "end",
                    () => {

                        console.log(
                            "--------------------------------"
                        );

                        console.log(
                            "New Solar Sensor Reading"
                        );

                        console.log(
                            "--------------------------------"
                        );


                        console.log(
                            "Solar Power :",
                            data.solarPower,
                            "kW"
                        );


                        console.log(
                            "Battery     :",
                            data.batteryLevel,
                            "%"
                        );


                        console.log(
                            "Temperature :",
                            data.temperature,
                            "°C"
                        );


                        console.log(
                            "Panel Angle :",
                            data.panelAngle,
                            "°"
                        );


                        console.log(
                            "Voltage     :",
                            data.voltage,
                            "V"
                        );


                        console.log(
                            "Current     :",
                            data.current,
                            "A"
                        );


                        console.log(
                            "Load Power  :",
                            data.loadPower,
                            "kW"
                        );


                        console.log(
                            "Device Auth :",
                            response.statusCode ===
                            201
                                ? "✅ Valid"
                                : "❌ Rejected"
                        );


                        console.log(
                            "Server Status:",
                            response.statusCode
                        );


                        if (
                            response.statusCode !==
                            201
                        ) {

                            console.log(
                                "Server Response:",
                                responseData
                            );

                        }


                        console.log(
                            "--------------------------------"
                        );

                    }
                );

            }
        );


    request.on(
        "error",
        (error) => {

            console.error(
                "Could not connect to HeliosSync backend."
            );


            console.error(
                error.message
            );

        }
    );


    request.write(
        jsonData
    );


    request.end();

}


// =====================================
// Start Simulator
// =====================================

console.log(
    "================================="
);

console.log(
    "HeliosSync IoT Simulator Started"
);

console.log(
    "================================="
);

console.log(
    "🔐 Device authentication enabled"
);

console.log(
    "Sending sensor data every 5 seconds..."
);

console.log("");


function simulate() {

    const sensorData =
        generateSensorData();


    sendSensorData(
        sensorData
    );

}


simulate();


setInterval(
    simulate,
    5000
);