// =============================================
// HeliosSync
// Dynamic Programming Energy Optimizer
// =============================================
//
// Purpose:
// Optimize energy distribution between:
// 1. Solar energy
// 2. Battery energy
// 3. Grid energy
//
// The optimizer uses Dynamic Programming with
// discretized energy states.
//
// It also accepts both naming conventions:
//
// solarPower       OR solarGeneration
// loadPower        OR loadConsumption
//
// =============================================


function dynamicOptimizer({
    solarPower,
    solarGeneration,

    batteryLevel,

    loadPower,
    loadConsumption,

    batteryCapacity = 10,
}) {

    // =============================================
    // NORMALIZE INPUT VALUES
    // =============================================

    const solar = Number(
        solarPower ??
        solarGeneration ??
        0
    ) || 0;


    const load = Number(
        loadPower ??
        loadConsumption ??
        0
    ) || 0;


    const batteryPercentage =
        Number(
            batteryLevel
        ) || 0;


    const capacity =
        Number(
            batteryCapacity
        ) || 10;


    // =============================================
    // CURRENT BATTERY ENERGY
    // =============================================

    const currentBattery =
        (
            batteryPercentage /
            100
        ) *
        capacity;


    // =============================================
    // EDGE CASE
    // =============================================

    if (load <= 0) {

        const availableSpace =
            Math.max(
                0,
                capacity -
                currentBattery
            );


        const batteryCharged =
            Math.min(
                solar,
                availableSpace
            );


        const finalBatteryEnergy =
            currentBattery +
            batteryCharged;


        const finalBatteryLevel =
            (
                finalBatteryEnergy /
                capacity
            ) *
            100;


        return {

            algorithm:
                "Dynamic Programming",

            solarUsed:
                0,

            batteryUsed:
                0,

            batteryCharged:
                Number(
                    batteryCharged.toFixed(2)
                ),

            gridUsed:
                0,

            finalBatteryLevel:
                Number(
                    Math.min(
                        100,
                        finalBatteryLevel
                    ).toFixed(2)
                ),

        };

    }


    // =============================================
    // DYNAMIC PROGRAMMING SETTINGS
    // =============================================
    //
    // We divide energy into 0.1 kWh units.
    //
    // Example:
    //
    // 3.2 kWh = 32 units
    //
    // This makes the DP state manageable.
    //
    // =============================================

    const STEP = 0.1;


    const toUnits = (value) => {

        return Math.max(
            0,
            Math.round(
                value / STEP
            )
        );

    };


    const fromUnits = (units) => {

        return (
            units * STEP
        );

    };


    const solarUnits =
        toUnits(
            solar
        );


    const loadUnits =
        toUnits(
            load
        );


    const batteryUnits =
        toUnits(
            currentBattery
        );


    const capacityUnits =
        toUnits(
            capacity
        );


    // =============================================
    // DP STATE
    // =============================================
    //
    // State:
    //
    // dp[loadUsed][batteryRemaining]
    //
    // Each state stores the minimum cost solution.
    //
    // Cost priority:
    //
    // 1. Minimize grid usage
    // 2. Minimize battery usage
    // 3. Maximize battery remaining
    //
    // This represents a practical solar-energy
    // management strategy.
    //
    // =============================================


    const dp = Array.from(
        {
            length:
                loadUnits + 1
        },
        () =>
            Array.from(
                {
                    length:
                        capacityUnits + 1
                },
                () => null
            )
    );


    // =============================================
    // INITIAL STATE
    // =============================================

    dp[0][batteryUnits] = {

        gridUnits:
            0,

        batteryUsedUnits:
            0,

        solarUsedUnits:
            0,

        batteryChargedUnits:
            0,

        batteryRemainingUnits:
            batteryUnits,

        previous:
            null,

        action:
            null,

    };


    // =============================================
    // STATE COMPARISON
    // =============================================

    function isBetter(
        candidate,
        existing
    ) {

        if (!existing) {

            return true;

        }


        // Priority 1:
        // Less grid usage

        if (
            candidate.gridUnits !==
            existing.gridUnits
        ) {

            return (
                candidate.gridUnits <
                existing.gridUnits
            );

        }


        // Priority 2:
        // Less battery usage

        if (
            candidate.batteryUsedUnits !==
            existing.batteryUsedUnits
        ) {

            return (
                candidate.batteryUsedUnits <
                existing.batteryUsedUnits
            );

        }


        // Priority 3:
        // More battery remaining

        return (
            candidate.batteryRemainingUnits >
            existing.batteryRemainingUnits
        );

    }


    // =============================================
    // DYNAMIC PROGRAMMING
    // =============================================

    for (
        let loadUsed = 0;
        loadUsed <= loadUnits;
        loadUsed++
    ) {

        for (
            let batteryRemaining = 0;
            batteryRemaining <= capacityUnits;
            batteryRemaining++
        ) {

            const currentState =
                dp[
                    loadUsed
                ][
                    batteryRemaining
                ];


            if (!currentState) {

                continue;

            }


            const remainingLoad =
                loadUnits -
                loadUsed;


            if (
                remainingLoad <= 0
            ) {

                continue;

            }


            // =====================================
            // OPTION 1: USE SOLAR
            // =====================================

            const solarAvailable =
                Math.min(
                    solarUnits,
                    remainingLoad
                );


            if (
                solarAvailable > 0
            ) {

                const nextLoad =
                    loadUsed +
                    solarAvailable;


                const candidate = {

                    gridUnits:
                        currentState.gridUnits,

                    batteryUsedUnits:
                        currentState
                            .batteryUsedUnits,

                    solarUsedUnits:
                        currentState
                            .solarUsedUnits +
                        solarAvailable,

                    batteryChargedUnits:
                        currentState
                            .batteryChargedUnits,

                    batteryRemainingUnits:
                        batteryRemaining,

                    previous: {
                        loadUsed,
                        batteryRemaining,
                    },

                    action: {

                        type:
                            "solar",

                        units:
                            solarAvailable,

                    },

                };


                if (
                    isBetter(
                        candidate,
                        dp[
                            nextLoad
                        ][
                            batteryRemaining
                        ]
                    )
                ) {

                    dp[
                        nextLoad
                    ][
                        batteryRemaining
                    ] =
                        candidate;

                }

            }


            // =====================================
            // OPTION 2: USE BATTERY
            // =====================================

            const batteryAvailable =
                Math.min(
                    batteryRemaining,
                    remainingLoad
                );


            if (
                batteryAvailable > 0
            ) {

                const nextLoad =
                    loadUsed +
                    batteryAvailable;


                const nextBattery =
                    batteryRemaining -
                    batteryAvailable;


                const candidate = {

                    gridUnits:
                        currentState.gridUnits,

                    batteryUsedUnits:
                        currentState
                            .batteryUsedUnits +
                        batteryAvailable,

                    solarUsedUnits:
                        currentState
                            .solarUsedUnits,

                    batteryChargedUnits:
                        currentState
                            .batteryChargedUnits,

                    batteryRemainingUnits:
                        nextBattery,

                    previous: {
                        loadUsed,
                        batteryRemaining,
                    },

                    action: {

                        type:
                            "battery",

                        units:
                            batteryAvailable,

                    },

                };


                if (
                    isBetter(
                        candidate,
                        dp[
                            nextLoad
                        ][
                            nextBattery
                        ]
                    )
                ) {

                    dp[
                        nextLoad
                    ][
                        nextBattery
                    ] =
                        candidate;

                }

            }


            // =====================================
            // OPTION 3: USE GRID
            // =====================================

            const gridAvailable =
                remainingLoad;


            if (
                gridAvailable > 0
            ) {

                const nextLoad =
                    loadUsed +
                    gridAvailable;


                const candidate = {

                    gridUnits:
                        currentState.gridUnits +
                        gridAvailable,

                    batteryUsedUnits:
                        currentState
                            .batteryUsedUnits,

                    solarUsedUnits:
                        currentState
                            .solarUsedUnits,

                    batteryChargedUnits:
                        currentState
                            .batteryChargedUnits,

                    batteryRemainingUnits:
                        batteryRemaining,

                    previous: {
                        loadUsed,
                        batteryRemaining,
                    },

                    action: {

                        type:
                            "grid",

                        units:
                            gridAvailable,

                    },

                };


                if (
                    isBetter(
                        candidate,
                        dp[
                            nextLoad
                        ][
                            batteryRemaining
                        ]
                    )
                ) {

                    dp[
                        nextLoad
                    ][
                        batteryRemaining
                    ] =
                        candidate;

                }

            }

        }

    }


    // =============================================
    // FIND BEST FINAL STATE
    // =============================================

    let bestState =
        null;


    let bestBatteryUnits =
        0;


    for (
        let battery = 0;
        battery <= capacityUnits;
        battery++
    ) {

        const state =
            dp[
                loadUnits
            ][
                battery
            ];


        if (!state) {

            continue;

        }


        if (
            isBetter(
                state,
                bestState
            )
        ) {

            bestState =
                state;

            bestBatteryUnits =
                battery;

        }

    }


    // =============================================
    // FALLBACK
    // =============================================

    if (!bestState) {

        const solarUsed =
            Math.min(
                solar,
                load
            );


        const remainingLoad =
            load -
            solarUsed;


        const batteryUsed =
            Math.min(
                currentBattery,
                remainingLoad
            );


        const gridUsed =
            Math.max(
                0,
                remainingLoad -
                batteryUsed
            );


        const extraSolar =
            Math.max(
                0,
                solar -
                solarUsed
            );


        const availableSpace =
            Math.max(
                0,
                capacity -
                (
                    currentBattery -
                    batteryUsed
                )
            );


        const batteryCharged =
            Math.min(
                extraSolar,
                availableSpace
            );


        const finalBatteryEnergy =
            currentBattery -
            batteryUsed +
            batteryCharged;


        return {

            algorithm:
                "Dynamic Programming",

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
                    (
                        (
                            finalBatteryEnergy /
                            capacity
                        ) *
                        100
                    ).toFixed(2)
                ),

        };

    }


    // =============================================
    // CALCULATE ENERGY VALUES
    // =============================================

    const solarUsed =
        fromUnits(
            bestState.solarUsedUnits
        );


    const batteryUsed =
        fromUnits(
            bestState.batteryUsedUnits
        );


    const gridUsed =
        fromUnits(
            bestState.gridUnits
        );


    // =============================================
    // EXTRA SOLAR
    // =============================================

    const extraSolar =
        Math.max(
            0,
            solar -
            solarUsed
        );


    const batteryAfterUse =
        Math.max(
            0,
            currentBattery -
            batteryUsed
        );


    const availableBatterySpace =
        Math.max(
            0,
            capacity -
            batteryAfterUse
        );


    const batteryCharged =
        Math.min(
            extraSolar,
            availableBatterySpace
        );


    const finalBatteryEnergy =
        Math.min(
            capacity,
            batteryAfterUse +
            batteryCharged
        );


    const finalBatteryLevel =
        (
            finalBatteryEnergy /
            capacity
        ) *
        100;


    // =============================================
    // RETURN RESULT
    // =============================================

    return {

        algorithm:
            "Dynamic Programming",

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
            ),

    };

}


// =============================================
// EXPORT
// =============================================

module.exports =
    dynamicOptimizer;