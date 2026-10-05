// ============================================
// HeliosSync Graph Route Optimization
// Dijkstra's Shortest Path Algorithm
// ============================================
//
// Goal:
// Find the route that requires the minimum
// energy from a starting location to a
// destination.
//
// Each location is a graph node.
// Each connection is an edge.
// Edge weight = energy required.
//
// ============================================


// ============================================
// FIND MINIMUM DISTANCE NODE
// ============================================

function getMinimumDistanceNode(
    distances,
    visited
) {

    let minimumDistance =
        Infinity;

    let minimumNode = null;


    for (const node of Object.keys(distances)) {

        if (
            !visited.has(node) &&
            distances[node] < minimumDistance
        ) {

            minimumDistance =
                distances[node];

            minimumNode = node;

        }

    }


    return minimumNode;
}


// ============================================
// DIJKSTRA GRAPH ALGORITHM
// ============================================

function graphRouteOptimization({
    nodes = [],
    edges = [],
    start,
    destination,
    batteryLevel = 100,
    batteryCapacity = 10
}) {

    // ----------------------------------------
    // Validate input
    // ----------------------------------------

    if (!Array.isArray(nodes) || nodes.length === 0) {

        throw new Error(
            "Graph must contain at least one node."
        );

    }


    if (!Array.isArray(edges)) {

        throw new Error(
            "Graph edges must be an array."
        );

    }


    if (!start || !destination) {

        throw new Error(
            "Start and destination are required."
        );

    }


    if (!nodes.includes(start)) {

        throw new Error(
            `Start node "${start}" does not exist.`
        );

    }


    if (!nodes.includes(destination)) {

        throw new Error(
            `Destination node "${destination}" does not exist.`
        );

    }


    // ----------------------------------------
    // Create graph
    // ----------------------------------------

    const graph = {};


    nodes.forEach((node) => {

        graph[node] = [];

    });


    // ----------------------------------------
    // Add edges
    // ----------------------------------------

    edges.forEach((edge) => {

        const from = edge.from;

        const to = edge.to;

        const energy =
            Number(edge.energy) || 0;

        const distance =
            Number(edge.distance) || 0;


        if (
            !graph[from] ||
            !graph[to]
        ) {

            return;

        }


        if (energy < 0) {

            return;

        }


        // Undirected graph
        graph[from].push({

            node: to,

            energy,

            distance

        });


        graph[to].push({

            node: from,

            energy,

            distance

        });

    });


    // ----------------------------------------
    // Initialize Dijkstra
    // ----------------------------------------

    const distances = {};

    const previous = {};

    const visited = new Set();


    nodes.forEach((node) => {

        distances[node] =
            Infinity;

        previous[node] =
            null;

    });


    distances[start] = 0;


    // ========================================
    // Dijkstra
    // ========================================

    for (
        let i = 0;
        i < nodes.length;
        i++
    ) {

        const current =
            getMinimumDistanceNode(
                distances,
                visited
            );


        if (current === null) {

            break;

        }


        visited.add(current);


        // Destination reached
        if (
            current === destination
        ) {

            break;

        }


        for (
            const neighbor
            of graph[current]
        ) {

            if (
                visited.has(
                    neighbor.node
                )
            ) {

                continue;

            }


            const newDistance =
                distances[current] +
                neighbor.energy;


            if (
                newDistance <
                distances[neighbor.node]
            ) {

                distances[neighbor.node] =
                    newDistance;

                previous[neighbor.node] =
                    current;

            }

        }

    }


    // ========================================
    // No route found
    // ========================================

    if (
        distances[destination] ===
        Infinity
    ) {

        return {

            success: false,

            message:
                "No route exists between the selected locations.",

            start,

            destination

        };

    }


    // ========================================
    // Reconstruct path
    // ========================================

    const path = [];

    let current =
        destination;


    while (current !== null) {

        path.unshift(current);

        current =
            previous[current];

    }


    // ========================================
    // Calculate route information
    // ========================================

    let totalEnergy = 0;

    let totalDistance = 0;

    const routeDetails = [];


    for (
        let i = 0;
        i < path.length - 1;
        i++
    ) {

        const from =
            path[i];

        const to =
            path[i + 1];


        const connection =
            graph[from].find(
                (edge) =>
                    edge.node === to
            );


        if (connection) {

            totalEnergy +=
                connection.energy;

            totalDistance +=
                connection.distance;


            routeDetails.push({

                from,

                to,

                energy:
                    connection.energy,

                distance:
                    connection.distance

            });

        }

    }


    // ========================================
    // Battery calculation
    // ========================================

    const safeBatteryLevel =
        Math.max(
            0,
            Math.min(
                100,
                Number(batteryLevel) || 0
            )
        );


    const safeBatteryCapacity =
        Number(batteryCapacity) > 0
            ? Number(batteryCapacity)
            : 10;


    const availableBattery =
        (
            safeBatteryLevel /
            100
        ) *
        safeBatteryCapacity;


    const batteryAfterRoute =
        availableBattery -
        totalEnergy;


    const batteryAfterPercentage =
        Math.max(
            0,
            Math.min(
                100,
                (
                    batteryAfterRoute /
                    safeBatteryCapacity
                ) *
                100
            )
        );


    const canCompleteRoute =
        totalEnergy <=
        availableBattery;


    // ========================================
    // Final result
    // ========================================

    return {

        success: true,

        algorithm:
            "Dijkstra Shortest Path",

        start,

        destination,

        path,

        routeDetails,

        totalEnergy:
            Number(
                totalEnergy.toFixed(2)
            ),

        totalDistance:
            Number(
                totalDistance.toFixed(2)
            ),

        batteryAvailable:
            Number(
                availableBattery.toFixed(2)
            ),

        batteryAfterRoute:
            Number(
                Math.max(
                    0,
                    batteryAfterRoute
                ).toFixed(2)
            ),

        batteryAfterPercentage:
            Number(
                batteryAfterPercentage.toFixed(2)
            ),

        canCompleteRoute

    };

}


// ============================================
// EXPORT
// ============================================

module.exports = {

    graphRouteOptimization

};