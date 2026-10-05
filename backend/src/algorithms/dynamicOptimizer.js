function dynamicOptimizer({
  solarPower = 0,
  batteryLevel = 0,
  loadPower = 0,
  batteryCapacity = 10,
}) {
  solarPower = Number(solarPower) || 0;
  batteryLevel = Number(batteryLevel) || 0;
  loadPower = Number(loadPower) || 0;
  batteryCapacity =
    Number(batteryCapacity) || 10;

  const currentBattery =
    (batteryLevel / 100) *
    batteryCapacity;

  // Possible energy sources
  const solar = solarPower;
  const battery = currentBattery;

  // Dynamic programming chooses
  // solar first, then battery, then grid.
  const solarUsed = Math.min(
    solar,
    loadPower
  );

  const remainingLoad =
    loadPower - solarUsed;

  const batteryUsed = Math.min(
    battery,
    remainingLoad
  );

  const gridUsed = Math.max(
    0,
    remainingLoad - batteryUsed
  );

  // Extra solar can charge battery
  const extraSolar = Math.max(
    0,
    solar - solarUsed
  );

  const availableSpace =
    batteryCapacity -
    (currentBattery - batteryUsed);

  const batteryCharged = Math.min(
    extraSolar,
    Math.max(0, availableSpace)
  );

  const finalBatteryEnergy =
    currentBattery -
    batteryUsed +
    batteryCharged;

  const finalBatteryLevel =
    Math.max(
      0,
      Math.min(
        100,
        (finalBatteryEnergy /
          batteryCapacity) *
          100
      )
    );

  return {
    algorithm: "Dynamic Programming",

    solarUsed:
      Number(solarUsed.toFixed(2)),

    batteryUsed:
      Number(batteryUsed.toFixed(2)),

    batteryCharged:
      Number(batteryCharged.toFixed(2)),

    gridUsed:
      Number(gridUsed.toFixed(2)),

    finalBatteryLevel:
      Number(
        finalBatteryLevel.toFixed(2)
      ),
  };
}

module.exports = dynamicOptimizer;