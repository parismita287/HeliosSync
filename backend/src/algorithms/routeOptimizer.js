function optimizeRoute(routes, batteryLevel) {
  const BATTERY_CAPACITY = 10;

  const currentBattery =
    (Number(batteryLevel) / 100) *
    BATTERY_CAPACITY;

  if (!Array.isArray(routes) || routes.length === 0) {
    return {
      success: false,
      message: "No routes available.",
    };
  }

  const validRoutes = routes
    .map((route) => {
      const distance =
        Number(route.distance) || 0;

      const energyRequired =
        Number(route.energyRequired) || 0;

      const batteryAfter =
        currentBattery - energyRequired;

      return {
        name: route.name || "Unnamed Route",
        distance,
        energyRequired,
        batteryAfter: Number(
          batteryAfter.toFixed(2)
        ),
      };
    })
    .filter(
      (route) =>
        route.energyRequired <= currentBattery
    );

  if (validRoutes.length === 0) {
    return {
      success: false,
      message:
        "No route can be completed with the current battery level.",
      batteryAvailable: Number(
        currentBattery.toFixed(2)
      ),
    };
  }

  // Choose the route requiring the least energy.
  // If energy is equal, choose the shorter route.
  validRoutes.sort((a, b) => {
    if (
      a.energyRequired !==
      b.energyRequired
    ) {
      return (
        a.energyRequired -
        b.energyRequired
      );
    }

    return a.distance - b.distance;
  });

  const recommendedRoute =
    validRoutes[0];

  return {
    success: true,

    batteryCapacity:
      BATTERY_CAPACITY,

    batteryAvailable: Number(
      currentBattery.toFixed(2)
    ),

    recommendedRoute,

    routes: validRoutes,
  };
}

module.exports = {
  optimizeRoute,
};