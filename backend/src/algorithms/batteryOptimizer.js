// ============================================
// HeliosSync Battery Optimization Engine
// Greedy + Dynamic Programming
// ============================================


// ============================================
// GREEDY ALGORITHM
// ============================================
// Goal:
// 1. Use solar power to satisfy the load.
// 2. Use extra solar power to charge battery.
// 3. If solar is insufficient, use battery.
// 4. If battery is insufficient, use grid.
// ============================================

function greedyOptimization(input = {}) {

    // ----------------------------------------
    // Accept multiple possible field names
    // ----------------------------------------

    const solarPower =
        Number(
            input.solarPower ??
            input.solarGeneration ??
            input.solar ??
            0
        ) || 0;

    const batteryLevel =
        Number(
            input.batteryLevel ??
            input.battery ??
            input.batteryPercentage ??
            0
        ) || 0;

    const loadPower =
        Number(
            input.loadPower ??
            input.loadConsumption ??
            input.load ??
            0
        ) || 0;

    const batteryCapacity =
        Number(
            input.batteryCapacity ??
            10
        ) || 10;


    // ----------------------------------------
    // Calculate current battery energy
    // ----------------------------------------

    let batteryEnergy =
        (batteryLevel / 100) *
        batteryCapacity;


    let solarUsed = 0;
    let batteryUsed = 0;
    let batteryCharged = 0;
    let gridUsed = 0;


    // ========================================
    // CASE 1:
    // Solar is enough for the load
    // ========================================

    if (solarPower >= loadPower) {

        // Solar directly powers the load
        solarUsed = loadPower;

        // Remaining solar
        const extraSolar =
            solarPower - loadPower;

        // Available battery space
        const availableBatterySpace =
            Math.max(
                0,
                batteryCapacity - batteryEnergy
            );

        // Charge battery
        batteryCharged =
            Math.min(
                extraSolar,
                availableBatterySpace
            );

        // Update battery
        batteryEnergy += batteryCharged;
    }


    // ========================================
    // CASE 2:
    // Solar is insufficient
    // ========================================

    else {

        // Use all available solar
        solarUsed = solarPower;

        // Remaining load
        const remainingLoad =
            loadPower - solarPower;

        // Use battery
        batteryUsed =
            Math.min(
                remainingLoad,
                batteryEnergy
            );

        // Update battery
        batteryEnergy -= batteryUsed;

        // Remaining requirement comes from grid
        gridUsed =
            Math.max(
                0,
                remainingLoad - batteryUsed
            );
    }


    // ========================================
    // Final Battery Level
    // ========================================

    const finalBatteryLevel =
        batteryCapacity > 0
            ? (batteryEnergy / batteryCapacity) * 100
            : 0;


    // ========================================
    // Return Result
    // ========================================

    return {

        algorithm: "Greedy",

        solarUsed:
            Number(
                solarUsed.toFixed(2)
            ),

        batteryUsed:
            Number(
                batteryUsed.toFixed(2)
            ),

        batteryCharged:
            Number(
                batteryCharged.toFixed(2)
            ),

        gridUsed:
            Number(
                gridUsed.toFixed(2)
            ),

        finalBatteryLevel:
            Number(
                Math.max(
                    0,
                    Math.min(
                        100,
                        finalBatteryLevel
                    )
                ).toFixed(2)
            )
    };
}


// ============================================
// DYNAMIC PROGRAMMING ALGORITHM
// ============================================
// This version evaluates possible battery states
// and minimizes grid usage while respecting
// battery capacity.
// ============================================

function dynamicProgrammingOptimization(input = {}) {

    // ----------------------------------------
    // Normalize input
    // ----------------------------------------

    const solarPower =
        Number(
            input.solarPower ??
            input.solarGeneration ??
            input.solar ??
            0
        ) || 0;

    const batteryLevel =
        Number(
            input.batteryLevel ??
            input.battery ??
            input.batteryPercentage ??
            0
        ) || 0;

    const loadPower =
        Number(
            input.loadPower ??
            input.loadConsumption ??
            input.load ??
            0
        ) || 0;

    const batteryCapacity =
        Number(
            input.batteryCapacity ??
            10
        ) || 10;


    // ----------------------------------------
    // Initial battery energy
    // ----------------------------------------

    const initialBatteryEnergy =
        (batteryLevel / 100) *
        batteryCapacity;


    // ----------------------------------------
    // Convert energy to discrete units
    // ----------------------------------------

    const units = 100;

    const initialUnits =
        Math.round(
            initialBatteryEnergy * units
        );

    const batteryCapacityUnits =
        Math.round(
            batteryCapacity * units
        );

    const solarUnits =
        Math.round(
            solarPower * units
        );

    const loadUnits =
        Math.round(
            loadPower * units
        );


    // ----------------------------------------
    // DP table
    // ----------------------------------------

    const dp =
        new Array(
            batteryCapacityUnits + 1
        ).fill(Infinity);


    dp[initialUnits] = 0;


    // ========================================
    // Evaluate possible battery states
    // ========================================

    for (
        let battery = 0;
        battery <= batteryCapacityUnits;
        battery++
    ) {

        if (
            dp[battery] === Infinity
        ) {
            continue;
        }


        // ------------------------------------
        // OPTION 1:
        // Solar powers the load first
        // ------------------------------------

        const solarAfterLoad =
            Math.max(
                0,
                solarUnits - loadUnits
            );


        const chargedBattery =
            Math.min(
                battery + solarAfterLoad,
                batteryCapacityUnits
            );


        dp[chargedBattery] =
            Math.min(
                dp[chargedBattery],
                dp[battery]
            );


        // ------------------------------------
        // OPTION 2:
        // Battery helps the load
        // ------------------------------------

        const batteryForLoad =
            Math.min(
                battery,
                loadUnits
            );


        const remainingBattery =
            battery -
            batteryForLoad;


        const remainingLoad =
            Math.max(
                0,
                loadUnits -
                solarUnits -
                batteryForLoad
            );


        const gridEnergy =
            remainingLoad;


        dp[remainingBattery] =
            Math.min(
                dp[remainingBattery],
                dp[battery] +
                gridEnergy
            );
    }


    // ========================================
    // Find state with minimum grid usage
    // ========================================

    let bestBatteryUnits =
        initialUnits;

    let bestCost =
        Infinity;


    for (
        let battery = 0;
        battery <= batteryCapacityUnits;
        battery++
    ) {

        if (
            dp[battery] < bestCost
        ) {

            bestCost =
                dp[battery];

            bestBatteryUnits =
                battery;
        }
    }


    // ----------------------------------------
    // Final battery energy
    // ----------------------------------------

    const finalBatteryEnergy =
        bestBatteryUnits / units;


    const finalBatteryLevel =
        batteryCapacity > 0
            ? (
                finalBatteryEnergy /
                batteryCapacity
            ) * 100
            : 0;


    // ----------------------------------------
    // Battery energy change
    // ----------------------------------------

    const batteryEnergyChange =
        finalBatteryEnergy -
        initialBatteryEnergy;


    // ----------------------------------------
    // Return result
    // ----------------------------------------

    return {

        algorithm:
            "Dynamic Programming",

        initialBatteryLevel:
            Number(
                batteryLevel.toFixed(2)
            ),

        finalBatteryLevel:
            Number(
                Math.max(
                    0,
                    Math.min(
                        100,
                        finalBatteryLevel
                    )
                ).toFixed(2)
            ),

        batteryEnergyChange:
            Number(
                batteryEnergyChange.toFixed(2)
            ),

        estimatedGridUsage:
            Number(
                (bestCost / units).toFixed(2)
            )
    };
}


// ============================================
// EXPORT
// ============================================

module.exports = {

    greedyOptimization,

    dynamicProgrammingOptimization

};