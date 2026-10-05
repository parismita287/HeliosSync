import { useCallback, useEffect, useMemo, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://localhost:5000";

const BATTERY_CAPACITY_KWH = 10;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getNumber(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return 0;
}


function normalizeSensor(item = {}) {
  return {
    solarGeneration: getNumber(
      item.solarGeneration,
      item.solarPower,
      item.solar
    ),

    batteryLevel: getNumber(
      item.batteryLevel,
      item.batteryPercentage,
      item.battery
    ),

    loadConsumption: getNumber(
      item.loadConsumption,
      item.loadPower,
      item.load
    ),

    gridImport: getNumber(
      item.gridImport,
      item.gridUsage,
      item.grid
    ),

    temperature: getNumber(
      item.temperature
    ),

    panelAngle: getNumber(
      item.panelAngle
    ),

    voltage: getNumber(
      item.voltage
    ),

    current: getNumber(
      item.current
    ),

    timestamp:
      item.createdAt ||
      item.timestamp ||
      null,

    _id: item._id,
  };
}


function normalizeOptimization(payload = {}) {
  const result =
    payload?.result ??
    payload?.data ??
    payload;

  return {
    algorithm:
      result?.algorithm ||
      "Unknown",

    solarUsed: getNumber(
      result?.solarUsed,
      result?.solar_used
    ),

    batteryUsed: getNumber(
      result?.batteryUsed,
      result?.battery_used
    ),

    batteryCharged: getNumber(
      result?.batteryCharged,
      result?.battery_charged
    ),

    gridUsed: getNumber(
      result?.gridUsed,
      result?.grid_used
    ),

    finalBatteryLevel: getNumber(
      result?.finalBatteryLevel,
      result?.final_battery_level
    ),
  };
}


// =====================================================
// GENERIC POST REQUEST
// =====================================================

async function postJSON(url, body) {
  const token =
    localStorage.getItem("heliossync_token");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",

    headers,

    body: JSON.stringify(body),
  });

  const payload =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    payload?.success === false
  ) {
    throw new Error(
      payload?.message ||
        payload?.error ||
        `Request failed (${response.status})`
    );
  }

  return payload;
}


// =====================================================
// MAIN APP
// =====================================================

function App() {

  // ===================================================
  // AUTHENTICATION STATE
  // ===================================================

  const [authChecking, setAuthChecking] =
    useState(true);

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authMode, setAuthMode] =
    useState("login");

  const [authName, setAuthName] =
    useState("");

  const [authEmail, setAuthEmail] =
    useState("");

  const [authPassword, setAuthPassword] =
    useState("");

  const [authConfirmPassword, setAuthConfirmPassword] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(false);

  const [authError, setAuthError] =
    useState("");

  const [authMessage, setAuthMessage] =
    useState("");


  // ===================================================
  // SENSOR STATE
  // ===================================================

  const [sensorData, setSensorData] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [sensorError, setSensorError] =
    useState("");

  const [wsStatus, setWsStatus] =
    useState("Connecting...");

  const [systemServiceHealth, setSystemServiceHealth] =
    useState({
      database: "Checking...",
      redis: "Checking...",
      websocketClients: 0,
      authentication: "Checking...",
      apiSecurity: "Checking...",
      timestamp: null,
    });

  const [systemHealthLoading, setSystemHealthLoading] =
    useState(true);

  const [systemHealthError, setSystemHealthError] =
    useState("");


  // ===================================================
  // NAVIGATION
  // ===================================================

  const [activeTab, setActiveTab] =
    useState("dashboard");


  // ===================================================
  // OPTIMIZATION STATE
  // ===================================================

  const [greedyResult, setGreedyResult] =
    useState(null);

  const [dynamicResult, setDynamicResult] =
    useState(null);

  const [greedyLoading, setGreedyLoading] =
    useState(false);

  const [dynamicLoading, setDynamicLoading] =
    useState(false);

  const [optimizationError, setOptimizationError] =
    useState("");


  // ===================================================
  // ROUTE STATE
  // ===================================================

  const [routeResult, setRouteResult] =
    useState(null);

  const [routeLoading, setRouteLoading] =
    useState(false);

  const [routeError, setRouteError] =
    useState("");


  // ===================================================
  // GRAPH STATE
  // ===================================================

  const [graphResult, setGraphResult] =
    useState(null);

  const [graphLoading, setGraphLoading] =
    useState(false);

  const [graphError, setGraphError] =
    useState("");


  // ===================================================
  // AUTHENTICATION
  // ===================================================

  const getAuthToken = useCallback(() => {
    return localStorage.getItem("heliossync_token");
  }, []);


  const checkAuthentication =
    useCallback(async () => {

      const token =
        getAuthToken();

      if (!token) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

      try {

        const response =
          await fetch(
            `${API_BASE}/api/auth/me`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const payload =
          await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message ||
              "Authentication session is invalid."
          );
        }

        setCurrentUser(
          payload.user
        );

        setIsAuthenticated(true);
        setAuthError("");

      } catch (error) {

        console.error(
          "Authentication check failed:",
          error
        );

        localStorage.removeItem(
          "heliossync_token"
        );

        setCurrentUser(null);
        setIsAuthenticated(false);

      } finally {

        setAuthChecking(false);

      }

    }, [getAuthToken]);


  useEffect(() => {

    const timer =
      setTimeout(() => {
        checkAuthentication();
      }, 0);

    return () => {
      clearTimeout(timer);
    };

  }, [checkAuthentication]);


  const handleAuthSubmit =
    useCallback(async (event) => {

      event.preventDefault();

      setAuthError("");
      setAuthMessage("");

      const email =
        authEmail.trim().toLowerCase();

      const name =
        authName.trim();

      if (!email || !authPassword) {

        setAuthError(
          "Email and password are required."
        );

        return;

      }

      if (
        authMode === "register" &&
        !name
      ) {

        setAuthError(
          "Name is required."
        );

        return;

      }

      if (
        authMode === "register" &&
        authPassword.length < 6
      ) {

        setAuthError(
          "Password must contain at least 6 characters."
        );

        return;

      }

      if (
        authMode === "register" &&
        authPassword !== authConfirmPassword
      ) {

        setAuthError(
          "Passwords do not match."
        );

        return;

      }

      setAuthLoading(true);

      try {

        const endpoint =
          authMode === "login"
            ? "/api/auth/login"
            : "/api/auth/register";

        const body =
          authMode === "login"
            ? {
                email,
                password:
                  authPassword,
              }
            : {
                name,
                email,
                password:
                  authPassword,
              };

        const response =
          await fetch(
            `${API_BASE}${endpoint}`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(body),
            }
          );

        const payload =
          await response.json();

        if (
          !response.ok ||
          !payload?.success
        ) {

          throw new Error(
            payload?.message ||
              "Authentication failed."
          );

        }

        if (!payload.token) {

          throw new Error(
            "Authentication succeeded but no token was returned."
          );

        }

        localStorage.setItem(
          "heliossync_token",
          payload.token
        );

        setCurrentUser(
          payload.user
        );

        setIsAuthenticated(true);

        setAuthError("");

        setAuthMessage(
          authMode === "login"
            ? "Login successful."
            : "Account created successfully."
        );

        setAuthPassword("");
        setAuthConfirmPassword("");

      } catch (error) {

        console.error(
          "Authentication error:",
          error
        );

        setAuthError(
          error?.message ||
            "Authentication failed."
        );

      } finally {

        setAuthLoading(false);

      }

    }, [
      authMode,
      authName,
      authEmail,
      authPassword,
      authConfirmPassword,
    ]);


  const handleLogout =
    useCallback(async () => {

      const token =
        getAuthToken();

      try {

        if (token) {

          await fetch(
            `${API_BASE}/api/auth/logout`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        }

      } catch (error) {

        console.error(
          "Logout request error:",
          error
        );

      } finally {

        localStorage.removeItem(
          "heliossync_token"
        );

        setCurrentUser(null);

        setIsAuthenticated(false);

        setAuthMode("login");

        setAuthName("");
        setAuthEmail("");
        setAuthPassword("");
        setAuthConfirmPassword("");
        setAuthError("");
        setAuthMessage("");
        setActiveTab("dashboard");

      }

    }, [getAuthToken]);


  // ===================================================
  // FETCH SENSOR DATA
  // ===================================================

  const fetchSensors =
    useCallback(async () => {

      try {

        const token =
          localStorage.getItem(
            "heliossync_token"
          );

        const response =
          await fetch(
            `${API_BASE}/api/sensors`,
            {
              method: "GET",

              headers: token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {},
            }
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              `Sensor API error (${response.status})`
          );
        }

        const data =
          Array.isArray(payload)
            ? payload
            : payload?.data;

        if (!Array.isArray(data)) {
          throw new Error(
            "Invalid sensor response from backend"
          );
        }

        setSensorData(data);

        setSensorError("");

      } catch (error) {

        console.error(
          "Sensor fetch error:",
          error
        );

        setSensorError(
          error?.message ||
            "Unable to fetch sensor data"
        );

      } finally {

        setLoading(false);

      }

    }, []);


  // ===================================================
  // SYSTEM SERVICE HEALTH
  // ===================================================

  const fetchSystemServiceHealth =
    useCallback(async () => {

      try {

        const response =
          await fetch(
            `${API_BASE}/api/health`
          );

        const payload =
          await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message ||
              `Health API error (${response.status})`
          );
        }

        setSystemServiceHealth({
          database:
            payload.database ||
            "Unknown",

          redis:
            payload.redis ||
            "Unknown",

          websocketClients:
            Number(payload.websocketClients) ||
            0,

          authentication:
            payload.authentication ||
            "Unknown",

          apiSecurity:
            payload.apiSecurity ||
            "Unknown",

          timestamp:
            payload.timestamp ||
            null,
        });

        setSystemHealthError("");

      } catch (error) {

        console.error(
          "System health fetch error:",
          error
        );

        setSystemHealthError(
          error?.message ||
            "Unable to read backend health."
        );

      } finally {

        setSystemHealthLoading(false);

      }

    }, []);


  useEffect(() => {

    const initialHealthTimer =
      setTimeout(() => {
        fetchSystemServiceHealth();
      }, 0);

    const healthInterval =
      setInterval(
        fetchSystemServiceHealth,
        10000
      );

    return () => {
      clearTimeout(initialHealthTimer);
      clearInterval(healthInterval);
    };

  }, [fetchSystemServiceHealth]);


  // ===================================================
  // SENSOR POLLING
  // ===================================================

  useEffect(() => {

    // Start the first sensor fetch asynchronously so React's
    // effect lint rule does not flag a synchronous state update.
    const initialFetchTimer =
      setTimeout(() => {
        fetchSensors();
      }, 0);

    const interval =
      setInterval(
        fetchSensors,
        5000
      );

    return () => {
      clearTimeout(initialFetchTimer);
      clearInterval(interval);
    };

  }, [fetchSensors]);


  // ===================================================
  // WEBSOCKET
  // ===================================================

  useEffect(() => {

    let ws = null;

    let reconnectTimer = null;

    let stopped = false;


    function connectWebSocket() {

      if (stopped) {
        return;
      }

      setWsStatus(
        "Connecting..."
      );


      ws =
        new WebSocket(
          "ws://localhost:5000"
        );


      ws.onopen = () => {

        console.log(
          "HeliosSync WebSocket connected"
        );

        setWsStatus("Live");

      };


      ws.onmessage = (event) => {

        try {

          const message =
            JSON.parse(
              event.data
            );


          if (
            message.type !==
              "sensor_update" ||
            !message.data
          ) {
            return;
          }


          setSensorData(
            (currentData) => {

              const newSensor =
                message.data;

              const newId =
                newSensor._id;


              const filtered =
                newId
                  ? currentData.filter(
                      (item) =>
                        item._id !== newId
                    )
                  : currentData;


              return [
                newSensor,
                ...filtered,
              ].slice(0, 100);

            }
          );


          setSensorError("");

        } catch (error) {

          console.error(
            "WebSocket message error:",
            error
          );

        }

      };


      ws.onerror = (error) => {

        console.error(
          "WebSocket error:",
          error
        );

        setWsStatus(
          "Disconnected"
        );

      };


      ws.onclose = () => {

        if (stopped) {
          return;
        }


        setWsStatus(
          "Reconnecting..."
        );


        reconnectTimer =
          setTimeout(
            connectWebSocket,
            3000
          );

      };

    }


    connectWebSocket();


    return () => {

      stopped = true;

      clearTimeout(
        reconnectTimer
      );

      if (ws) {
        ws.close();
      }

    };

  }, []);


  // ===================================================
  // LATEST SENSOR
  // ===================================================

  const latestSensor =
    useMemo(() => {

      if (!sensorData.length) {

        return normalizeSensor({});

      }

      return normalizeSensor(
        sensorData[0]
      );

    }, [sensorData]);


  // ===================================================
  // CHART DATA
  // ===================================================

  const chartData =
    useMemo(() => {

      return [
        ...sensorData,
      ]
        .slice(0, 20)
        .reverse()
        .map(
          (item, index) => {

            const sensor =
              normalizeSensor(item);

            return {

              time:
                sensor.timestamp
                  ? new Date(
                      sensor.timestamp
                    ).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : `Point ${index + 1}`,

              solar:
                sensor.solarGeneration,

              load:
                sensor.loadConsumption,

              battery:
                sensor.batteryLevel,

              grid:
                sensor.gridImport,

            };

          }
        );

    }, [sensorData]);


  // ===================================================
  // GREEDY OPTIMIZATION
  // ===================================================

  const runGreedyOptimization =
    useCallback(async () => {

      setGreedyLoading(true);

      setOptimizationError("");

      try {

        const payload =
          await postJSON(
            `${API_BASE}/api/optimize/greedy`,
            {
              solarGeneration:
                latestSensor.solarGeneration,

              loadConsumption:
                latestSensor.loadConsumption,

              batteryLevel:
                latestSensor.batteryLevel,
            }
          );


        setGreedyResult(
          normalizeOptimization(
            payload
          )
        );

      } catch (error) {

        console.error(
          "Greedy optimization error:",
          error
        );

        setOptimizationError(
          error?.message ||
            "Greedy optimization failed"
        );

      } finally {

        setGreedyLoading(false);

      }

    }, [
      latestSensor.solarGeneration,
      latestSensor.loadConsumption,
      latestSensor.batteryLevel,
    ]);


  // ===================================================
  // DYNAMIC OPTIMIZATION
  // ===================================================

  const runDynamicOptimization =
    useCallback(async () => {

      setDynamicLoading(true);

      setOptimizationError("");

      try {

        const payload =
          await postJSON(
            `${API_BASE}/api/optimize/dynamic`,
            {
              solarGeneration:
                latestSensor.solarGeneration,

              loadConsumption:
                latestSensor.loadConsumption,

              batteryLevel:
                latestSensor.batteryLevel,
            }
          );


        setDynamicResult(
          normalizeOptimization(
            payload
          )
        );

      } catch (error) {

        console.error(
          "Dynamic optimization error:",
          error
        );

        setOptimizationError(
          error?.message ||
            "Dynamic optimization failed"
        );

      } finally {

        setDynamicLoading(false);

      }

    }, [
      latestSensor.solarGeneration,
      latestSensor.loadConsumption,
      latestSensor.batteryLevel,
    ]);


  // ===================================================
  // AUTOMATIC OPTIMIZATION
  // ===================================================

  useEffect(() => {

    if (!sensorData.length) {
      return;
    }


    let cancelled = false;


    const requestBody = {

      solarGeneration:
        latestSensor.solarGeneration,

      loadConsumption:
        latestSensor.loadConsumption,

      batteryLevel:
        latestSensor.batteryLevel,

    };


    async function runAutomaticOptimization() {

      try {

        const [
          greedyResponse,
          dynamicResponse,
        ] = await Promise.all([

          postJSON(
            `${API_BASE}/api/optimize/greedy`,
            requestBody
          ),

          postJSON(
            `${API_BASE}/api/optimize/dynamic`,
            requestBody
          ),

        ]);


        if (cancelled) {
          return;
        }


        setGreedyResult(
          normalizeOptimization(
            greedyResponse
          )
        );


        setDynamicResult(
          normalizeOptimization(
            dynamicResponse
          )
        );

      } catch (error) {

        if (!cancelled) {

          console.error(
            "Automatic optimization error:",
            error
          );

        }

      }

    }


    runAutomaticOptimization();


    return () => {

      cancelled = true;

    };

  }, [
    sensorData.length,
    latestSensor.solarGeneration,
    latestSensor.loadConsumption,
    latestSensor.batteryLevel,
  ]);


  // ===================================================
  // RECOMMENDATION
  // ===================================================

  const recommendation =
    useMemo(() => {

      if (
        !greedyResult &&
        !dynamicResult
      ) {
        return null;
      }


      if (
        greedyResult &&
        !dynamicResult
      ) {

        return {

          name: "Greedy",

          result:
            greedyResult,

          reason:
            "Only the Greedy optimization result is currently available.",

        };

      }


      if (
        !greedyResult &&
        dynamicResult
      ) {

        return {

          name: "Dynamic",

          result:
            dynamicResult,

          reason:
            "Only the Dynamic optimization result is currently available.",

        };

      }


      if (
        greedyResult.gridUsed <
        dynamicResult.gridUsed
      ) {

        return {

          name: "Greedy",

          result:
            greedyResult,

          reason:
            "Greedy uses less grid energy in this calculation.",

        };

      }


      if (
        dynamicResult.gridUsed <
        greedyResult.gridUsed
      ) {

        return {

          name: "Dynamic",

          result:
            dynamicResult,

          reason:
            "Dynamic uses less grid energy in this calculation.",

        };

      }


      if (
        greedyResult.finalBatteryLevel >
        dynamicResult.finalBatteryLevel
      ) {

        return {

          name: "Greedy",

          result:
            greedyResult,

          reason:
            "Both strategies use the same grid energy, while Greedy leaves a higher final battery level.",

        };

      }


      if (
        dynamicResult.finalBatteryLevel >
        greedyResult.finalBatteryLevel
      ) {

        return {

          name: "Dynamic",

          result:
            dynamicResult,

          reason:
            "Both strategies use the same grid energy, while Dynamic leaves a higher final battery level.",

        };

      }


      return {

        name: "Equal",

        result:
          greedyResult,

        reason:
          "Both optimization strategies produced the same primary energy outcome.",

      };

    }, [
      greedyResult,
      dynamicResult,
    ]);


  // ===================================================
  // COMPARISON DATA
  // ===================================================

  const comparisonData =
    useMemo(() => {

      if (
        !greedyResult ||
        !dynamicResult
      ) {
        return [];
      }


      return [

        {
          metric: "Solar Used",

          greedy:
            greedyResult.solarUsed,

          dynamic:
            dynamicResult.solarUsed,

          unit: "kWh",
        },

        {
          metric: "Battery Used",

          greedy:
            greedyResult.batteryUsed,

          dynamic:
            dynamicResult.batteryUsed,

          unit: "kWh",
        },

        {
          metric: "Battery Charged",

          greedy:
            greedyResult.batteryCharged,

          dynamic:
            dynamicResult.batteryCharged,

          unit: "kWh",
        },

        {
          metric: "Grid Used",

          greedy:
            greedyResult.gridUsed,

          dynamic:
            dynamicResult.gridUsed,

          unit: "kWh",
        },

        {
          metric: "Final Battery",

          greedy:
            greedyResult.finalBatteryLevel,

          dynamic:
            dynamicResult.finalBatteryLevel,

          unit: "%",
        },

      ];

    }, [
      greedyResult,
      dynamicResult,
    ]);


  // ===================================================
  // SYSTEM HEALTH & ALERTS
  // ===================================================

  const systemHealth = useMemo(() => {
    const battery = latestSensor.batteryLevel;
    const temperature = latestSensor.temperature;
    const solar = latestSensor.solarGeneration;
    const load = latestSensor.loadConsumption;
    const voltage = latestSensor.voltage;
    const current = latestSensor.current;

    const alerts = [];

    if (battery < 20) {
      alerts.push({
        type: "critical",
        title: "Low Battery",
        message: `Battery level is ${battery.toFixed(1)}%.`,
      });
    } else if (battery < 35) {
      alerts.push({
        type: "warning",
        title: "Battery Getting Low",
        message: `Battery level is ${battery.toFixed(1)}%.`,
      });
    }

    if (temperature > 38) {
      alerts.push({
        type: "warning",
        title: "High Temperature",
        message: `Panel temperature is ${temperature.toFixed(1)} °C.`,
      });
    }

    if (solar < load) {
      alerts.push({
        type: "info",
        title: "Energy Deficit",
        message: `Load exceeds solar generation by ${(load - solar).toFixed(2)} kW.`,
      });
    }

    if (voltage > 0 && (voltage < 21 || voltage > 27)) {
      alerts.push({
        type: "warning",
        title: "Voltage Outside Range",
        message: `Measured voltage is ${voltage.toFixed(2)} V.`,
      });
    }

    if (current > 10) {
      alerts.push({
        type: "warning",
        title: "High Current",
        message: `Measured current is ${current.toFixed(2)} A.`,
      });
    }

    const health =
      alerts.some((alert) => alert.type === "critical")
        ? "Critical"
        : alerts.some((alert) => alert.type === "warning")
          ? "Attention"
          : "Healthy";

    const solarCoverage =
      load > 0
        ? Math.min(100, (solar / load) * 100)
        : 100;

    return {
      health,
      alerts,
      solarCoverage,
    };
    }, [
    latestSensor,
  ]);



  // ===================================================
  // HISTORY & ANALYTICS
  // ===================================================

  const historyAnalytics = useMemo(() => {
    const readings = sensorData
      .map((item) => normalizeSensor(item))
      .filter((item) => item.timestamp);

    if (readings.length === 0) {
      return {
        readings: [],
        averageSolar: 0,
        averageLoad: 0,
        averageBattery: 0,
        averageTemperature: 0,
        peakSolar: 0,
        minimumBattery: 0,
        totalReadings: 0,
      };
    }

    const sum = (key) =>
      readings.reduce(
        (total, item) => total + (Number(item[key]) || 0),
        0
      );

    return {
      readings,
      averageSolar: sum("solarGeneration") / readings.length,
      averageLoad: sum("loadConsumption") / readings.length,
      averageBattery: sum("batteryLevel") / readings.length,
      averageTemperature: sum("temperature") / readings.length,
      peakSolar: Math.max(
        ...readings.map(
          (item) => Number(item.solarGeneration) || 0
        )
      ),
      minimumBattery: Math.min(
        ...readings.map(
          (item) => Number(item.batteryLevel) || 0
        )
      ),
      totalReadings: readings.length,
    };
  }, [sensorData]);

  const historyChartData = useMemo(() => {
    return historyAnalytics.readings
      .slice(0, 50)
      .reverse()
      .map((sensor) => ({
        time: new Date(sensor.timestamp).toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
        solar: Number(sensor.solarGeneration.toFixed(2)),
        load: Number(sensor.loadConsumption.toFixed(2)),
        battery: Number(sensor.batteryLevel.toFixed(1)),
        temperature: Number(sensor.temperature.toFixed(1)),
      }));
  }, [historyAnalytics.readings]);


  // ===================================================
  // ROUTE LOCATIONS
  // ===================================================

  const locations =
    useMemo(
      () => [

        {
          name: "Location A",

          distance: 5,

          energyRequired: 2,
        },

        {
          name: "Location B",

          distance: 3,

          energyRequired: 3,
        },

        {
          name: "Location C",

          distance: 2,

          energyRequired: 4,
        },

      ],
      []
    );


  // ===================================================
  // ROUTE PREVIEW
  // ===================================================

  const routePreview =
    useMemo(() => {

      let batteryEnergy =
        (
          latestSensor.batteryLevel /
          100
        ) *
        BATTERY_CAPACITY_KWH;


      return locations.map(
        (location) => {

          batteryEnergy =
            Math.max(
              0,
              batteryEnergy -
                location.energyRequired
            );


          return {

            ...location,

            remainingBattery:
              batteryEnergy,

            batteryPercentage:
              (
                batteryEnergy /
                BATTERY_CAPACITY_KWH
              ) *
              100,

          };

        }
      );

    }, [
      latestSensor.batteryLevel,
      locations,
    ]);


  // ===================================================
  // ROUTE OPTIMIZATION
  // ===================================================

  const runRouteOptimization =
    useCallback(async () => {

      setRouteLoading(true);

      setRouteError("");

      setRouteResult(null);


      try {

        const currentBattery =
          (
            latestSensor.batteryLevel /
            100
          ) *
          BATTERY_CAPACITY_KWH;


        const payload =
          await postJSON(
            `${API_BASE}/api/route/optimize`,
            {
              currentBattery,

              batteryCapacity:
                BATTERY_CAPACITY_KWH,

              locations,
            }
          );


        setRouteResult(
          payload
        );

      } catch (error) {

        console.error(
          "Route optimization error:",
          error
        );

        setRouteError(
          error?.message ||
            "Route optimization failed"
        );

      } finally {

        setRouteLoading(false);

      }

    }, [
      latestSensor.batteryLevel,
      locations,
    ]);


  // ===================================================
  // GRAPH NODES
  // ===================================================

  const graphNodes =
    useMemo(
      () => [

        "Solar Plant",

        "Location A",

        "Location B",

        "Location C",

      ],
      []
    );


  // ===================================================
  // GRAPH EDGES
  // ===================================================

  const graphEdges =
    useMemo(
      () => [

        {
          from: "Solar Plant",

          to: "Location A",

          energy: 2,

          distance: 5,
        },

        {
          from: "Solar Plant",

          to: "Location B",

          energy: 4,

          distance: 8,
        },

        {
          from: "Location A",

          to: "Location B",

          energy: 1,

          distance: 3,
        },

        {
          from: "Location A",

          to: "Location C",

          energy: 5,

          distance: 7,
        },

        {
          from: "Location B",

          to: "Location C",

          energy: 1,

          distance: 2,
        },

      ],
      []
    );


  // ===================================================
  // GRAPH VISUALIZATION
  // ===================================================

  const graphNodePositions = useMemo(
    () => ({
      "Solar Plant": { x: 90, y: 180 },
      "Location A": { x: 330, y: 70 },
      "Location B": { x: 330, y: 290 },
      "Location C": { x: 610, y: 180 },
    }),
    []
  );

  const graphPath = useMemo(
    () =>
      Array.isArray(graphResult?.path)
        ? graphResult.path
        : [],
    [graphResult]
  );

  const isGraphPathEdge = useCallback(
    (edge) => {
      for (let index = 0; index < graphPath.length - 1; index += 1) {
        const from = graphPath[index];
        const to = graphPath[index + 1];

        if (
          (edge.from === from && edge.to === to) ||
          (edge.from === to && edge.to === from)
        ) {
          return true;
        }
      }

      return false;
    },
    [graphPath]
  );


  // ===================================================
  // GRAPH OPTIMIZATION
  // ===================================================

  const runGraphOptimization =
    useCallback(async () => {

      setGraphLoading(true);

      setGraphError("");

      setGraphResult(null);


      try {

        const payload =
          await postJSON(
            `${API_BASE}/api/route/graph`,
            {

              nodes:
                graphNodes,

              edges:
                graphEdges,

              start:
                "Solar Plant",

              destination:
                "Location C",

              batteryLevel:
                latestSensor.batteryLevel,

              batteryCapacity:
                BATTERY_CAPACITY_KWH,

            }
          );


        setGraphResult(
          payload?.result ??
            payload
        );

      } catch (error) {

        console.error(
          "Graph optimization error:",
          error
        );

        setGraphError(
          error?.message ||
            "Graph optimization failed"
        );

      } finally {

        setGraphLoading(false);

      }

    }, [
      graphNodes,
      graphEdges,
      latestSensor.batteryLevel,
    ]);


  // ===================================================
  // DATA EXPORT & REPORTING
  // ===================================================

  const downloadFile = useCallback(
    (content, fileName, mimeType) => {
      const blob = new Blob(
        [content],
        {
          type: mimeType,
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    },
    []
  );


  const exportSensorDataCSV =
    useCallback(() => {

      const readings =
        historyAnalytics.readings;

      if (!readings.length) {

        window.alert(
          "No sensor data is available to export yet."
        );

        return;

      }

      const headers = [
        "Timestamp",
        "Solar Generation (kW)",
        "Load Consumption (kW)",
        "Battery Level (%)",
        "Temperature (C)",
        "Panel Angle (deg)",
        "Voltage (V)",
        "Current (A)",
      ];

      const escapeCSV = (value) => {

        const stringValue =
          String(value ?? "");

        return `"${stringValue.replaceAll(
          '"',
          '""'
        )}"`;

      };

      const rows =
        readings.map((sensor) => [
          sensor.timestamp,
          Number(
            sensor.solarGeneration
          ).toFixed(2),
          Number(
            sensor.loadConsumption
          ).toFixed(2),
          Number(
            sensor.batteryLevel
          ).toFixed(1),
          Number(
            sensor.temperature
          ).toFixed(1),
          Number(
            sensor.panelAngle
          ).toFixed(1),
          Number(
            sensor.voltage
          ).toFixed(2),
          Number(
            sensor.current
          ).toFixed(2),
        ]);

      const csv = [
        headers,
        ...rows,
      ]
        .map((row) =>
          row
            .map(escapeCSV)
            .join(",")
        )
        .join("\n");

      downloadFile(
        csv,
        "heliossync_sensor_history.csv",
        "text/csv;charset=utf-8;"
      );

    }, [
      historyAnalytics.readings,
      downloadFile,
    ]);


  const exportSensorDataJSON =
    useCallback(() => {

      const readings =
        historyAnalytics.readings;

      if (!readings.length) {

        window.alert(
          "No sensor data is available to export yet."
        );

        return;

      }

      const report = {

        project:
          "HeliosSync",

        reportType:
          "IoT Sensor History",

        generatedAt:
          new Date().toISOString(),

        summary: {

          totalReadings:
            historyAnalytics.totalReadings,

          averageSolarKW:
            Number(
              historyAnalytics.averageSolar.toFixed(2)
            ),

          averageLoadKW:
            Number(
              historyAnalytics.averageLoad.toFixed(2)
            ),

          averageBatteryPercent:
            Number(
              historyAnalytics.averageBattery.toFixed(1)
            ),

          averageTemperatureC:
            Number(
              historyAnalytics.averageTemperature.toFixed(1)
            ),

          peakSolarKW:
            Number(
              historyAnalytics.peakSolar.toFixed(2)
            ),

          minimumBatteryPercent:
            Number(
              historyAnalytics.minimumBattery.toFixed(1)
            ),

        },

        readings,

      };

      downloadFile(
        JSON.stringify(
          report,
          null,
          2
        ),
        "heliossync_sensor_report.json",
        "application/json;charset=utf-8;"
      );

    }, [
      historyAnalytics,
      downloadFile,
    ]);


  const printAnalyticsReport =
    useCallback(() => {

      window.print();

    }, []);


  // ===================================================
  // AUTHENTICATION SCREEN
  // ===================================================

  if (authChecking) {

    return (
      <div className="helios-glow" style={styles.authPage}><style>{`
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap");
* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; background: #050b16; }
body { font-family: "Manrope", sans-serif; overflow-x: hidden; }
button, input { font-family: inherit; }
.helios-glow { position: relative; overflow: hidden; }
.helios-glow::before { content: ""; position: absolute; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle, rgba(34,211,238,.16), transparent 68%); top: -180px; right: -120px; pointer-events: none; animation: heliosFloat 8s ease-in-out infinite; }
.helios-glow::after { content: ""; position: absolute; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(59,130,246,.12), transparent 68%); bottom: -180px; left: -120px; pointer-events: none; animation: heliosFloat 10s ease-in-out infinite reverse; }
@keyframes heliosFloat { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(20px,18px,0) scale(1.08); } }
@keyframes heliosPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,.35); } 50% { box-shadow: 0 0 0 9px rgba(34,211,238,0); } }
@keyframes heliosRise { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
@keyframes heliosShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.helios-app { position: relative; min-height: 100vh; isolation: isolate; overflow: hidden; }
.helios-app::before { content: ""; position: fixed; inset: 0; z-index: -3; pointer-events: none; background: radial-gradient(circle at 15% 20%, rgba(34,211,238,.12), transparent 26%), radial-gradient(circle at 82% 12%, rgba(59,130,246,.12), transparent 24%), radial-gradient(circle at 55% 85%, rgba(16,185,129,.07), transparent 28%), #050c16; animation: heliosBgShift 14s ease-in-out infinite alternate; }
.helios-app::after { content: ""; position: fixed; inset: -30%; z-index: -2; pointer-events: none; opacity: .28; background-image: linear-gradient(rgba(72,211,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(72,211,255,.10) 1px, transparent 1px); background-size: 56px 56px; transform: perspective(700px) rotateX(62deg) translateY(18%); transform-origin: center; animation: heliosGrid 18s linear infinite; mask-image: linear-gradient(to bottom, transparent 0%, black 28%, black 75%, transparent 100%); }
.helios-orb { position: fixed; border-radius: 50%; pointer-events: none; filter: blur(2px); z-index: -1; }
@keyframes heliosBgShift { 0% { filter: hue-rotate(0deg); transform: scale(1); } 50% { filter: hue-rotate(12deg); transform: scale(1.035); } 100% { filter: hue-rotate(-8deg); transform: scale(1); } }
@keyframes heliosGrid { from { background-position: 0 0, 0 0; } to { background-position: 0 56px, 56px 0; } }
@keyframes heliosDrift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(35px,-28px,0) scale(1.12); } }
@keyframes heliosGlowPulse { 0%,100% { opacity:.35; box-shadow: 0 0 25px rgba(34,211,238,.12); } 50% { opacity:.8; box-shadow: 0 0 70px rgba(34,211,238,.22); } }
.helios-app > * { position: relative; z-index: 1; }
.recharts-cartesian-axis-tick-value { fill: #8fb0c2 !important; font-family: "Manrope", sans-serif; font-size: 12px; }
.recharts-cartesian-axis-line, .recharts-cartesian-axis-tick-line { stroke: rgba(143,176,194,.22) !important; }
.recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: rgba(143,176,194,.12) !important; }
.recharts-legend-item-text { color: #b8d0df !important; }
.recharts-default-tooltip { background: rgba(5,18,31,.96) !important; border: 1px solid rgba(103,232,249,.18) !important; border-radius: 12px !important; box-shadow: 0 15px 40px rgba(0,0,0,.35) !important; }

.helios-card { animation: heliosRise .55s ease both; transition: transform .28s ease, border-color .28s ease, box-shadow .28s ease; }
.helios-card:hover { transform: translateY(-5px); border-color: rgba(34,211,238,.34) !important; box-shadow: 0 20px 50px rgba(0,0,0,.25), 0 0 30px rgba(34,211,238,.07) !important; }

.helios-card { animation: heliosRise .55s ease both; transition: transform .28s ease, border-color .28s ease, box-shadow .28s ease; }
.helios-card:hover { transform: translateY(-5px); border-color: rgba(34,211,238,.34) !important; box-shadow: 0 20px 50px rgba(0,0,0,.25), 0 0 30px rgba(34,211,238,.07) !important; }
.helios-energy { animation: heliosPulse 2.4s ease-in-out infinite; }
.helios-app h1, .helios-app h2, .helios-app h3, .helios-app strong { font-family: "Space Grotesk", "Manrope", sans-serif; letter-spacing: -0.025em; }
.helios-app p, .helios-app span, .helios-app button, .helios-app input, .helios-app td, .helios-app th { font-family: "Manrope", sans-serif; }

`}</style>
        <div style={styles.authLoadingCard}>
          <div style={styles.authLogoMark}>
            ☀
          </div>

          <h1 style={styles.authTitle}>
            HeliosSync
          </h1>

          <p style={styles.authSubtitle}>
            Checking your secure session...
          </p>

          <div style={styles.authSpinner}>
            Loading
          </div>
        </div>
      </div>
    );

  }


  if (!isAuthenticated) {

    return (
      <div style={styles.authPage}>

        <div style={styles.authPanel}>

          <div style={styles.authBrand}>

            <div style={styles.authLogoMark}>
              ☀
            </div>

            <div>
              <h1 style={styles.authBrandTitle}>
                HeliosSync
              </h1>

              <p style={styles.authBrandText}>
                Intelligent Renewable Energy Management
              </p>
            </div>

          </div>


          <div style={styles.authCard}>

            <div style={styles.authCardHeader}>

              <h2 style={styles.authTitle}>
                {authMode === "login"
                  ? "Welcome Back"
                  : "Create Account"}
              </h2>

              <p style={styles.authSubtitle}>
                {authMode === "login"
                  ? "Sign in to access your renewable energy dashboard."
                  : "Create your HeliosSync account to continue."}
              </p>

            </div>


            {authError && (
              <div style={styles.authError}>
                {authError}
              </div>
            )}


            {authMessage && (
              <div style={styles.authSuccess}>
                {authMessage}
              </div>
            )}


            <form
              onSubmit={handleAuthSubmit}
              style={styles.authForm}
            >

              {authMode === "register" && (
                <label style={styles.authLabel}>
                  Full Name

                  <input
                    type="text"
                    value={authName}
                    onChange={(event) =>
                      setAuthName(
                        event.target.value
                      )
                    }
                    placeholder="Enter your name"
                    style={styles.authInput}
                    autoComplete="name"
                  />
                </label>
              )}


              <label style={styles.authLabel}>
                Email Address

                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) =>
                    setAuthEmail(
                      event.target.value
                    )
                  }
                  placeholder="Enter your email"
                  style={styles.authInput}
                  autoComplete="email"
                />
              </label>


              <label style={styles.authLabel}>
                Password

                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) =>
                    setAuthPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  style={styles.authInput}
                  autoComplete={
                    authMode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                />
              </label>


              {authMode === "register" && (
                <label style={styles.authLabel}>
                  Confirm Password

                  <input
                    type="password"
                    value={authConfirmPassword}
                    onChange={(event) =>
                      setAuthConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Confirm your password"
                    style={styles.authInput}
                    autoComplete="new-password"
                  />
                </label>
              )}


              <button
                type="submit"
                style={styles.authSubmitButton}
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Sign In"
                    : "Create Account"}
              </button>

            </form>


            <div style={styles.authSwitch}>

              <span>
                {authMode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>

              <button
                type="button"
                style={styles.authSwitchButton}
                onClick={() => {

                  setAuthMode(
                    authMode === "login"
                      ? "register"
                      : "login"
                  );

                  setAuthError("");
                  setAuthMessage("");

                }}
              >
                {authMode === "login"
                  ? "Create Account"
                  : "Sign In"}
              </button>

            </div>

          </div>


          <p style={styles.authFooter}>
            HeliosSync • Secure Renewable Energy Platform
          </p>

        </div>

      </div>
    );

  }


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <div className="helios-glow" style={styles.app}><style>{`
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap");
* { box-sizing: border-box; }
html, body, #root { margin: 0; min-height: 100%; background: #050b16; }
body { font-family: "Manrope", sans-serif; overflow-x: hidden; }
button, input { font-family: inherit; }
.helios-glow { position: relative; overflow: hidden; }
.helios-glow::before { content: ""; position: absolute; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle, rgba(34,211,238,.16), transparent 68%); top: -180px; right: -120px; pointer-events: none; animation: heliosFloat 8s ease-in-out infinite; }
.helios-glow::after { content: ""; position: absolute; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(59,130,246,.12), transparent 68%); bottom: -180px; left: -120px; pointer-events: none; animation: heliosFloat 10s ease-in-out infinite reverse; }
@keyframes heliosFloat { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(20px,18px,0) scale(1.08); } }
@keyframes heliosPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,.35); } 50% { box-shadow: 0 0 0 9px rgba(34,211,238,0); } }
@keyframes heliosRise { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
@keyframes heliosShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.helios-app { position: relative; min-height: 100vh; isolation: isolate; overflow: hidden; }
.helios-app::before { content: ""; position: fixed; inset: 0; z-index: -3; pointer-events: none; background: radial-gradient(circle at 15% 20%, rgba(34,211,238,.12), transparent 26%), radial-gradient(circle at 82% 12%, rgba(59,130,246,.12), transparent 24%), radial-gradient(circle at 55% 85%, rgba(16,185,129,.07), transparent 28%), #050c16; animation: heliosBgShift 14s ease-in-out infinite alternate; }
.helios-app::after { content: ""; position: fixed; inset: -30%; z-index: -2; pointer-events: none; opacity: .28; background-image: linear-gradient(rgba(72,211,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(72,211,255,.10) 1px, transparent 1px); background-size: 56px 56px; transform: perspective(700px) rotateX(62deg) translateY(18%); transform-origin: center; animation: heliosGrid 18s linear infinite; mask-image: linear-gradient(to bottom, transparent 0%, black 28%, black 75%, transparent 100%); }
.helios-orb { position: fixed; border-radius: 50%; pointer-events: none; filter: blur(2px); z-index: -1; }
@keyframes heliosBgShift { 0% { filter: hue-rotate(0deg); transform: scale(1); } 50% { filter: hue-rotate(12deg); transform: scale(1.035); } 100% { filter: hue-rotate(-8deg); transform: scale(1); } }
@keyframes heliosGrid { from { background-position: 0 0, 0 0; } to { background-position: 0 56px, 56px 0; } }
@keyframes heliosDrift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(35px,-28px,0) scale(1.12); } }
@keyframes heliosGlowPulse { 0%,100% { opacity:.35; box-shadow: 0 0 25px rgba(34,211,238,.12); } 50% { opacity:.8; box-shadow: 0 0 70px rgba(34,211,238,.22); } }
.helios-app > * { position: relative; z-index: 1; }
.recharts-cartesian-axis-tick-value { fill: #8fb0c2 !important; font-family: "Manrope", sans-serif; font-size: 12px; }
.recharts-cartesian-axis-line, .recharts-cartesian-axis-tick-line { stroke: rgba(143,176,194,.22) !important; }
.recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: rgba(143,176,194,.12) !important; }
.recharts-legend-item-text { color: #b8d0df !important; }
.recharts-default-tooltip { background: rgba(5,18,31,.96) !important; border: 1px solid rgba(103,232,249,.18) !important; border-radius: 12px !important; box-shadow: 0 15px 40px rgba(0,0,0,.35) !important; }

.helios-card { animation: heliosRise .55s ease both; transition: transform .28s ease, border-color .28s ease, box-shadow .28s ease; }
.helios-card:hover { transform: translateY(-5px); border-color: rgba(34,211,238,.34) !important; box-shadow: 0 20px 50px rgba(0,0,0,.25), 0 0 30px rgba(34,211,238,.07) !important; }

.helios-card { animation: heliosRise .55s ease both; transition: transform .28s ease, border-color .28s ease, box-shadow .28s ease; }
.helios-card:hover { transform: translateY(-5px); border-color: rgba(34,211,238,.34) !important; box-shadow: 0 20px 50px rgba(0,0,0,.25), 0 0 30px rgba(34,211,238,.07) !important; }
.helios-energy { animation: heliosPulse 2.4s ease-in-out infinite; }
.helios-app h1, .helios-app h2, .helios-app h3, .helios-app strong { font-family: "Space Grotesk", "Manrope", sans-serif; letter-spacing: -0.025em; }
.helios-app p, .helios-app span, .helios-app button, .helios-app input, .helios-app td, .helios-app th { font-family: "Manrope", sans-serif; }

`}</style>
      <div className="helios-orb" style={{width: 280, height: 280, top: "8vh", right: "-70px", background: "radial-gradient(circle, rgba(34,211,238,.20), transparent 68%)", animation: "heliosDrift 11s ease-in-out infinite"}} />
      <div className="helios-orb" style={{width: 220, height: 220, bottom: "12vh", left: "-60px", background: "radial-gradient(circle, rgba(59,130,246,.18), transparent 68%)", animation: "heliosDrift 14s ease-in-out infinite reverse"}} />

      {/* ================================================
          HEADER
      ================================================= */}

      <header style={styles.header}>

        <div>

          <h1 style={styles.logo}>
            HeliosSync
          </h1>

          <p style={styles.subtitle}>
            Intelligent Renewable Energy Management
          </p>

        </div>


        <div style={styles.headerActions}>

          <div style={styles.userBadge}>

            <div style={styles.userAvatar}>
              {(currentUser?.name || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div style={styles.userInfo}>
              <strong>
                {currentUser?.name || "User"}
              </strong>

              <span style={{ fontSize: "11px", opacity: 0.65 }}>
                {currentUser?.email || ""}
              </span>
            </div>

          </div>


          <div style={styles.status}>

            <span
              style={{
                ...styles.statusDot,

                background:
                  wsStatus === "Live"
                    ? "#34d399"
                    : "#f59e0b",
              }}
            />

            {wsStatus === "Live"
              ? "Live System"
              : `WebSocket ${wsStatus}`}

          </div>


          <button
            type="button"
            style={styles.logoutButton}
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* ================================================
          NAVIGATION
      ================================================= */}

      <nav style={styles.nav}>

        <button
          style={
            activeTab === "dashboard"
              ? styles.activeNavButton
              : styles.navButton
          }

          onClick={() =>
            setActiveTab("dashboard")
          }
        >
          Dashboard
        </button>


        <button
          style={
            activeTab === "optimization"
              ? styles.activeNavButton
              : styles.navButton
          }

          onClick={() =>
            setActiveTab("optimization")
          }
        >
          Optimization
        </button>



        <button
          style={
            activeTab === "history"
              ? styles.activeNavButton
              : styles.navButton
          }
          onClick={() =>
            setActiveTab("history")
          }
        >
          History & Analytics
        </button>


        <button
          style={
            activeTab === "route"
              ? styles.activeNavButton
              : styles.navButton
          }

          onClick={() =>
            setActiveTab("route")
          }
        >
          Route Optimization
        </button>

      </nav>


      {/* ================================================
          MAIN
      ================================================= */}

      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
            }

            header,
            nav,
            button,
            .no-print {
              display: none !important;
            }

            main {
              width: 100% !important;
              max-width: none !important;
            }
          }
        `}
      </style>

      <main style={styles.main}>

        {sensorError && (
          <div style={styles.errorBox}>
            {sensorError}
          </div>
        )}


        {optimizationError && (
          <div style={styles.errorBox}>
            {optimizationError}
          </div>
        )}


        {routeError && (
          <div style={styles.errorBox}>
            {routeError}
          </div>
        )}


        {graphError && (
          <div style={styles.errorBox}>
            {graphError}
          </div>
        )}


        {loading &&
          !sensorData.length && (
            <div style={styles.loadingBox}>
              Loading sensor data...
            </div>
          )}


        {/* ==============================================
            DASHBOARD
        =============================================== */}

        {activeTab === "dashboard" && (

          <>

            <SectionHeader
              title="Energy Dashboard"
              text="Real-time monitoring of your renewable energy system."
            />


            <section
              style={styles.metricGrid}
            >

              <MetricCard
                label="Solar Generation"
                value={`${latestSensor.solarGeneration.toFixed(
                  2
                )} kW`}
              />


              <MetricCard
                label="Battery Level"
                value={`${latestSensor.batteryLevel.toFixed(
                  1
                )}%`}
              />


              <MetricCard
                label="Load Consumption"
                value={`${latestSensor.loadConsumption.toFixed(
                  2
                )} kW`}
              />


              <MetricCard
                label="Temperature"
                value={`${latestSensor.temperature.toFixed(
                  1
                )} °C`}
              />


              <MetricCard
                label="Panel Angle"
                value={`${latestSensor.panelAngle.toFixed(
                  1
                )}°`}
              />


              <MetricCard
                label="Voltage"
                value={`${latestSensor.voltage.toFixed(
                  2
                )} V`}
              />


              <MetricCard
                label="Current"
                value={`${latestSensor.current.toFixed(
                  2
                )} A`}
              />

            </section>


            {/* CHARTS */}

            <section
              style={styles.chartGrid}
            >

              <ChartCard
                title="Solar vs Load"
              >

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={chartData}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="time"
                    />

                    <YAxis />

                    <Tooltip />

                    <Legend />


                    <Line
                      type="monotone"
                      dataKey="solar"
                      name="Solar"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={false}
                    />


                    <Line
                      type="monotone"
                      dataKey="load"
                      name="Load"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={false}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </ChartCard>


              <ChartCard
                title="Battery & Grid"
              >

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={chartData}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="time"
                    />

                    <YAxis />

                    <Tooltip />

                    <Legend />


                    <Line
                      type="monotone"
                      dataKey="battery"
                      name="Battery %"
                      stroke="#34d399"
                      strokeWidth={3}
                      dot={false}
                    />


                    <Line
                      type="monotone"
                      dataKey="grid"
                      name="Grid"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={false}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </ChartCard>

            </section>


            {/* SYSTEM HEALTH */}

            <section
              style={
                styles.systemHealthCard
              }
            >
              <div
                style={
                  styles.rowBetween
                }
              >
                <div>
                  <span
                    style={
                      styles.blueLabel
                    }
                  >
                    SYSTEM HEALTH
                  </span>

                  <h2
                    style={
                      styles.cardHeading
                    }
                  >
                    Real-Time Energy Health
                  </h2>

                  <p
                    style={
                      styles.muted
                    }
                  >
                    Health indicators are calculated from the latest IoT sensor reading.
                  </p>
                </div>

                <span
                  style={{
                    ...styles.healthBadge,
                    ...(systemHealth.health === "Healthy"
                      ? styles.healthHealthy
                      : systemHealth.health === "Attention"
                        ? styles.healthAttention
                        : styles.healthCritical),
                  }}
                >
                  {systemHealth.health}
                </span>
              </div>

              <div
                style={
                  styles.healthGrid
                }
              >
                <div
                  style={
                    styles.healthMetric
                  }
                >
                  <span
                    style={
                      styles.metricLabel
                    }
                  >
                    Solar Coverage
                  </span>

                  <strong
                    style={
                      styles.healthMetricValue
                    }
                  >
                    {systemHealth.solarCoverage.toFixed(0)}%
                  </strong>

                  <div
                    style={
                      styles.healthProgressTrack
                    }
                  >
                    <div
                      style={{
                        ...styles.healthProgressBar,
                        width: `${systemHealth.solarCoverage}%`,
                      }}
                    />
                  </div>

                  <span
                    style={
                      styles.healthHint
                    }
                  >
                    Solar generation relative to current load
                  </span>
                </div>

                <div
                  style={
                    styles.healthMetric
                  }
                >
                  <span
                    style={
                      styles.metricLabel
                    }
                  >
                    Active Alerts
                  </span>

                  <strong
                    style={
                      styles.healthMetricValue
                    }
                  >
                    {systemHealth.alerts.length}
                  </strong>

                  <span
                    style={
                      styles.healthHint
                    }
                  >
                    Automatically checked from live sensor data
                  </span>
                </div>
              </div>


              {/* BACKEND SERVICE HEALTH */}

              <div
                style={
                  styles.serviceHealthSection
                }
              >
                <div
                  style={
                    styles.rowBetween
                  }
                >
                  <div>
                    <span
                      style={
                        styles.metricLabel
                      }
                    >
                      BACKEND INFRASTRUCTURE
                    </span>

                    <strong
                      style={
                        styles.serviceHealthTitle
                      }
                    >
                      Platform Services
                    </strong>
                  </div>

                  {systemHealthLoading && (
                    <span
                      style={
                        styles.serviceHealthChecking
                      }
                    >
                      Checking...
                    </span>
                  )}
                </div>

                <div
                  style={
                    styles.serviceHealthGrid
                  }
                >
                  {[
                    {
                      name: "MongoDB",
                      value:
                        systemServiceHealth.database,
                    },
                    {
                      name: "Redis",
                      value:
                        systemServiceHealth.redis,
                    },
                    {
                      name: "WebSocket",
                      value:
                        systemServiceHealth.websocketClients > 0
                          ? `Connected (${systemServiceHealth.websocketClients})`
                          : "Waiting for client",
                    },
                    {
                      name: "Authentication",
                      value:
                        systemServiceHealth.authentication,
                    },
                    {
                      name: "API Security",
                      value:
                        systemServiceHealth.apiSecurity,
                    },
                  ].map((service) => {
                    const normalizedValue =
                      String(service.value || "")
                        .toLowerCase();

                    const isHealthy =
                      normalizedValue.includes("connected") ||
                      normalizedValue.includes("enabled");

                    const isChecking =
                      normalizedValue.includes("checking");

                    return (
                      <div
                        key={service.name}
                        style={
                          styles.serviceHealthItem
                        }
                      >
                        <span
                          style={
                            styles.serviceHealthDot
                          }
                        >
                          {isChecking
                            ? "◌"
                            : isHealthy
                              ? "●"
                              : "●"}
                        </span>

                        <div>
                          <strong
                            style={
                              styles.serviceHealthName
                            }
                          >
                            {service.name}
                          </strong>

                          <span
                            style={
                              styles.serviceHealthValue
                            }
                          >
                            {service.value}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {systemHealthError ? (
                  <div
                    style={
                      styles.serviceHealthError
                    }
                  >
                    Backend health check failed: {systemHealthError}
                  </div>
                ) : (
                  <span
                    style={
                      styles.healthHint
                    }
                  >
                    Backend health is refreshed automatically every 10 seconds.
                  </span>
                )}
              </div>


              {systemHealth.alerts.length > 0 ? (
                <div
                  style={
                    styles.alertList
                  }
                >
                  {systemHealth.alerts.map(
                    (alert, index) => (
                      <div
                        key={`${alert.title}-${index}`}
                        style={{
                          ...styles.alertItem,
                          ...(alert.type === "critical"
                            ? styles.alertCritical
                            : alert.type === "warning"
                              ? styles.alertWarning
                              : styles.alertInfo),
                        }}
                      >
                        <strong>
                          {alert.title}
                        </strong>

                        <span>
                          {alert.message}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div
                  style={
                    styles.noAlertBox
                  }
                >
                  ✓ No active system alerts. All monitored values are within the configured operating checks.
                </div>
              )}
            </section>


            {/* RECOMMENDATION */}

            {recommendation && (

              <section
                style={
                  styles.recommendationCard
                }
              >

                <div
                  style={
                    styles.rowBetween
                  }
                >

                  <div>

                    <span
                      style={
                        styles.blueLabel
                      }
                    >
                      CURRENT ANALYSIS
                    </span>


                    <h2
                      style={
                        styles.cardHeading
                      }
                    >

                      {recommendation.name ===
                      "Equal"
                        ? "Both Strategies Are Equal"
                        : `${recommendation.name} Optimization Result`}

                    </h2>

                  </div>


                  <span
                    style={styles.badge}
                  >
                    {recommendation.name}
                  </span>

                </div>


                <p style={styles.muted}>
                  {recommendation.reason}
                </p>


                <div
                  style={
                    styles.smallMetricGrid
                  }
                >

                  <SmallMetric
                    label="Grid Used"
                    value={`${recommendation.result.gridUsed.toFixed(
                      2
                    )} kWh`}
                  />


                  <SmallMetric
                    label="Solar Used"
                    value={`${recommendation.result.solarUsed.toFixed(
                      2
                    )} kWh`}
                  />


                  <SmallMetric
                    label="Battery Used"
                    value={`${recommendation.result.batteryUsed.toFixed(
                      2
                    )} kWh`}
                  />


                  <SmallMetric
                    label="Final Battery"
                    value={`${recommendation.result.finalBatteryLevel.toFixed(
                      1
                    )}%`}
                  />

                </div>

              </section>

            )}

          </>

        )}


        {/* ==============================================
            OPTIMIZATION
        =============================================== */}

        {activeTab === "optimization" && (

          <>

            <SectionHeader
              title="Optimization Center"
              text="Compare Greedy and Dynamic Programming energy strategies."
            />


            {/* ==============================================
                AUTOMATIC REAL-TIME OPTIMIZATION
            =============================================== */}

            <section
              style={styles.card}
            >

              <div
                style={styles.rowBetween}
              >

                <div>

                  <span
                    style={styles.blueLabel}
                  >
                    REAL-TIME OPTIMIZATION
                  </span>

                  <h3
                    style={styles.cardHeading}
                  >
                    Automatic Greedy vs Dynamic Comparison
                  </h3>

                  <p
                    style={styles.muted}
                  >
                    Both algorithms are automatically recalculated whenever a new IoT sensor reading arrives.
                  </p>

                </div>

                <span
                  style={styles.badge}
                >
                  ● AUTO UPDATE
                </span>

              </div>


              <div
                style={styles.smallMetricGrid}
              >

                <SmallMetric
                  label="Solar Input"
                  value={`${latestSensor.solarGeneration.toFixed(2)} kW`}
                />

                <SmallMetric
                  label="Load Input"
                  value={`${latestSensor.loadConsumption.toFixed(2)} kW`}
                />

                <SmallMetric
                  label="Battery Input"
                  value={`${latestSensor.batteryLevel.toFixed(1)}%`}
                />

                <SmallMetric
                  label="Data Points"
                  value={`${sensorData.length}`}
                />

              </div>


              <div
                style={{
                  ...styles.comparisonStatusGrid,
                  marginTop: "18px",
                }}
              >

                <div
                  style={styles.comparisonStatusCard}
                >

                  <div
                    style={styles.comparisonStatusHeader}
                  >
                    <strong>Greedy</strong>
                    <span style={styles.statusDot} />
                  </div>

                  <p style={styles.muted}>
                    {greedyResult
                      ? `Grid ${greedyResult.gridUsed.toFixed(2)} kWh • Battery ${greedyResult.finalBatteryLevel.toFixed(1)}%`
                      : "Waiting for optimization result..."}
                  </p>

                </div>


                <div
                  style={styles.comparisonStatusCard}
                >

                  <div
                    style={styles.comparisonStatusHeader}
                  >
                    <strong>Dynamic Programming</strong>
                    <span style={styles.statusDot} />
                  </div>

                  <p style={styles.muted}>
                    {dynamicResult
                      ? `Grid ${dynamicResult.gridUsed.toFixed(2)} kWh • Battery ${dynamicResult.finalBatteryLevel.toFixed(1)}%`
                      : "Waiting for optimization result..."}
                  </p>

                </div>

              </div>


              <p
                style={{
                  ...styles.muted,
                  marginBottom: 0,
                  marginTop: "16px",
                }}
              >
                Latest sensor reading: {latestSensor.timestamp
                  ? new Date(latestSensor.timestamp).toLocaleString()
                  : "Waiting for sensor data"}
              </p>

            </section>


            <div
              style={styles.actionRow}
            >

              <button
                style={
                  styles.primaryButton
                }

                onClick={
                  runGreedyOptimization
                }

                disabled={
                  greedyLoading
                }
              >

                {greedyLoading
                  ? "Running Greedy..."
                  : "Run Greedy"}

              </button>


              <button
                style={
                  styles.primaryButton
                }

                onClick={
                  runDynamicOptimization
                }

                disabled={
                  dynamicLoading
                }
              >

                {dynamicLoading
                  ? "Running Dynamic..."
                  : "Run Dynamic"}

              </button>

            </div>


            <section
              style={
                styles.twoColumn
              }
            >

              <OptimizationCard
                title="Greedy Optimization"
                result={greedyResult}
              />


              <OptimizationCard
                title="Dynamic Programming"
                result={dynamicResult}
              />

            </section>


            {greedyResult &&
              dynamicResult && (

              <section
                style={styles.card}
              >

                <h3
                  style={
                    styles.cardHeading
                  }
                >
                  Strategy Comparison
                </h3>


                <p
                  style={styles.muted}
                >
                  Current results from both algorithms.
                </p>


                <div
                  style={
                    styles.tableWrapper
                  }
                >

                  <table
                    style={styles.table}
                  >

                    <thead>

                      <tr>

                        <th
                          style={styles.th}
                        >
                          Metric
                        </th>

                        <th
                          style={styles.th}
                        >
                          Greedy
                        </th>

                        <th
                          style={styles.th}
                        >
                          Dynamic
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {comparisonData.map(
                        (row) => (

                          <tr
                            key={
                              row.metric
                            }
                          >

                            <td
                              style={
                                styles.td
                              }
                            >
                              {row.metric}
                            </td>


                            <td
                              style={
                                styles.td
                              }
                            >
                              {row.greedy.toFixed(
                                2
                              )}{" "}
                              {row.unit}
                            </td>


                            <td
                              style={
                                styles.td
                              }
                            >
                              {row.dynamic.toFixed(
                                2
                              )}{" "}
                              {row.unit}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </section>

            )}

          </>

        )}



        {/* ==============================================
            HISTORY & ANALYTICS
        =============================================== */}

        {activeTab === "history" && (

          <>

            <SectionHeader
              title="History & Analytics"
              text="Analyze the sensor readings stored by the HeliosSync IoT system."
            />

            <section style={styles.analyticsSummaryGrid}>

              <div style={styles.analyticsCard}>
                <span style={styles.metricLabel}>Total Readings</span>
                <strong style={styles.analyticsValue}>
                  {historyAnalytics.totalReadings}
                </strong>
                <span style={styles.healthHint}>
                  Stored sensor observations
                </span>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.metricLabel}>Average Solar</span>
                <strong style={styles.analyticsValue}>
                  {historyAnalytics.averageSolar.toFixed(2)} kW
                </strong>
                <span style={styles.healthHint}>
                  Across available readings
                </span>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.metricLabel}>Average Load</span>
                <strong style={styles.analyticsValue}>
                  {historyAnalytics.averageLoad.toFixed(2)} kW
                </strong>
                <span style={styles.healthHint}>
                  Recorded consumption
                </span>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.metricLabel}>Average Battery</span>
                <strong style={styles.analyticsValue}>
                  {historyAnalytics.averageBattery.toFixed(1)}%
                </strong>
                <span style={styles.healthHint}>
                  Battery state of charge
                </span>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.metricLabel}>Peak Solar</span>
                <strong style={styles.analyticsValue}>
                  {historyAnalytics.peakSolar.toFixed(2)} kW
                </strong>
                <span style={styles.healthHint}>
                  Highest recorded generation
                </span>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.metricLabel}>Minimum Battery</span>
                <strong style={styles.analyticsValue}>
                  {historyAnalytics.minimumBattery.toFixed(1)}%
                </strong>
                <span style={styles.healthHint}>
                  Lowest recorded battery level
                </span>
              </div>

            </section>


            <section style={styles.chartGrid}>

              <ChartCard title="Historical Solar vs Load">

                <ResponsiveContainer width="100%" height="100%">

                  <LineChart data={historyChartData}>

                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="solar"
                      name="Solar kW"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="load"
                      name="Load kW"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={false}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </ChartCard>


              <ChartCard title="Historical Battery & Temperature">

                <ResponsiveContainer width="100%" height="100%">

                  <LineChart data={historyChartData}>

                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="battery"
                      name="Battery %"
                      stroke="#34d399"
                      strokeWidth={3}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Temperature °C"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={false}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </ChartCard>

            </section>


            <section style={styles.historyTableCard}>

              <div style={styles.rowBetween}>

                <div>
                  <span style={styles.blueLabel}>
                    STORED SENSOR DATA
                  </span>

                  <h2 style={styles.cardHeading}>
                    Recent Readings
                  </h2>

                  <p style={styles.muted}>
                    Latest readings received from the HeliosSync IoT simulator and stored in MongoDB.
                  </p>
                </div>

                <div style={styles.exportActions}>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={exportSensorDataCSV}
                  >
                    Export CSV
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={exportSensorDataJSON}
                  >
                    Export JSON
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={printAnalyticsReport}
                  >
                    Print Report
                  </button>

                  <span style={styles.badge}>
                    {historyAnalytics.totalReadings} readings
                  </span>

                </div>

              </div>


              {historyAnalytics.readings.length > 0 ? (

                <div style={styles.tableWrapper}>

                  <table style={styles.historyTable}>

                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Time</th>
                        <th style={styles.tableHeader}>Solar</th>
                        <th style={styles.tableHeader}>Load</th>
                        <th style={styles.tableHeader}>Battery</th>
                        <th style={styles.tableHeader}>Temperature</th>
                        <th style={styles.tableHeader}>Voltage</th>
                        <th style={styles.tableHeader}>Current</th>
                      </tr>
                    </thead>

                    <tbody>

                      {historyAnalytics.readings
                        .slice(0, 20)
                        .map((sensor, index) => (

                          <tr key={`${sensor.timestamp}-${index}`}>

                            <td style={styles.tableCell}>
                              {new Date(
                                sensor.timestamp
                              ).toLocaleString()}
                            </td>

                            <td style={styles.tableCell}>
                              {sensor.solarGeneration.toFixed(2)} kW
                            </td>

                            <td style={styles.tableCell}>
                              {sensor.loadConsumption.toFixed(2)} kW
                            </td>

                            <td style={styles.tableCell}>
                              {sensor.batteryLevel.toFixed(1)}%
                            </td>

                            <td style={styles.tableCell}>
                              {sensor.temperature.toFixed(1)} °C
                            </td>

                            <td style={styles.tableCell}>
                              {sensor.voltage.toFixed(2)} V
                            </td>

                            <td style={styles.tableCell}>
                              {sensor.current.toFixed(2)} A
                            </td>

                          </tr>

                        ))}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div style={styles.noAlertBox}>
                  No historical sensor readings are available yet.
                  Start the IoT simulator to populate the history.
                </div>

              )}

            </section>

          </>

        )}


        {/* ==============================================
            ROUTE OPTIMIZATION
        =============================================== */}

        {activeTab === "route" && (

          <>

            <SectionHeader
              title="Route Optimization"
              text="Plan routes using available battery energy and graph algorithms."
            />


            <section
              style={styles.metricGrid}
            >

              <MetricCard
                label="Current Battery"
                value={`${latestSensor.batteryLevel.toFixed(
                  1
                )}%`}
              />


              <MetricCard
                label="Available Energy"
                value={`${(
                  (
                    latestSensor.batteryLevel /
                    100
                  ) *
                  BATTERY_CAPACITY_KWH
                ).toFixed(2)} kWh`}
              />


              <MetricCard
                label="Battery Capacity"
                value={`${BATTERY_CAPACITY_KWH} kWh`}
              />

            </section>


            <div
              style={styles.actionRow}
            >

              <button
                style={
                  styles.primaryButton
                }

                onClick={
                  runRouteOptimization
                }

                disabled={
                  routeLoading
                }
              >

                {routeLoading
                  ? "Optimizing Route..."
                  : "Run Route Optimization"}

              </button>

            </div>


            {/* ROUTE LOCATIONS */}

            <section
              style={
                styles.routeList
              }
            >

              {routePreview.map(
                (
                  location,
                  index
                ) => (

                  <div
                    key={
                      location.name
                    }

                    style={
                      styles.locationCard
                    }
                  >

                    <div
                      style={
                        styles.locationNumber
                      }
                    >
                      {index + 1}
                    </div>


                    <div
                      style={{
                        flex: 1,
                      }}
                    >

                      <h3
                        style={
                          styles.locationTitle
                        }
                      >
                        {location.name}
                      </h3>


                      <p
                        style={
                          styles.muted
                        }
                      >
                        Distance:{" "}
                        {location.distance} km
                        {" • "}
                        Energy Required:{" "}
                        {location.energyRequired} kWh
                      </p>


                      <div
                        style={
                          styles.progressBackground
                        }
                      >

                        <div
                          style={{
                            ...styles.progressBar,

                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                location.batteryPercentage
                              )
                            )}%`,
                          }}
                        />

                      </div>


                      <small
                        style={
                          styles.muted
                        }
                      >
                        Remaining Battery:{" "}
                        {location.remainingBattery.toFixed(
                          2
                        )}{" "}
                        kWh
                      </small>

                    </div>

                  </div>

                )
              )}

            </section>


            {/* GRAPH OPTIMIZATION */}

            <section
              style={
                styles.graphCard
              }
            >

              <div
                style={
                  styles.rowBetween
                }
              >

                <div>

                  <h3
                    style={
                      styles.cardHeading
                    }
                  >
                    Graph Route Optimization
                  </h3>


                  <p
                    style={
                      styles.muted
                    }
                  >
                    Dijkstra's algorithm finds the minimum-energy path through the HeliosSync route graph.
                  </p>

                </div>


                <button
                  style={
                    styles.primaryButton
                  }

                  onClick={
                    runGraphOptimization
                  }

                  disabled={
                    graphLoading
                  }
                >

                  {graphLoading
                    ? "Finding Shortest Path..."
                    : "Run Graph Optimization"}

                </button>

              </div>


              {/* INTERACTIVE GRAPH VISUALIZATION */}

              <div
                style={
                  styles.graphCanvas
                }
              >

                <div
                  style={
                    styles.graphCanvasHeader
                  }
                >
                  <div>
                    <strong>Energy-Weighted Route Graph</strong>
                    <span style={styles.graphCanvasHint}>
                      Each connection shows energy cost and distance.
                    </span>
                  </div>

                  <div
                    style={
                      styles.graphLegend
                    }
                  >
                    <div
                      style={
                        styles.graphLegendItem
                      }
                    >
                      <span
                        style={{
                          ...styles.graphLegendSwatch,
                          background: "#22d3ee",
                        }}
                      />
                      Available connection
                    </div>

                    <div
                      style={
                        styles.graphLegendItem
                      }
                    >
                      <span
                        style={{
                          ...styles.graphLegendSwatch,
                          background: "#34d399",
                        }}
                      />
                      Dijkstra shortest path
                    </div>
                  </div>
                </div>

                <div
                  style={
                    styles.graphSvgWrapper
                  }
                >
                  <svg
                    viewBox="0 0 700 360"
                    role="img"
                    aria-label="HeliosSync Dijkstra route graph"
                    style={
                      styles.graphSvg
                    }
                  >
                    <defs>
                      <marker
                        id="graphArrow"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path
                          d="M 0 0 L 10 5 L 0 10 z"
                          fill="#94a3b8"
                        />
                      </marker>

                      <marker
                        id="graphPathArrow"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="7"
                        markerHeight="7"
                        orient="auto-start-reverse"
                      >
                        <path
                          d="M 0 0 L 10 5 L 0 10 z"
                          fill="#34d399"
                        />
                      </marker>
                    </defs>

                    {/* Graph connections */}
                    {graphEdges.map((edge) => {
                      const from = graphNodePositions[edge.from];
                      const to = graphNodePositions[edge.to];

                      if (!from || !to) {
                        return null;
                      }

                      const highlighted = isGraphPathEdge(edge);
                      const midX = (from.x + to.x) / 2;
                      const midY = (from.y + to.y) / 2;

                      return (
                        <g
                          key={`${edge.from}-${edge.to}`}
                        >
                          <line
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke={
                              highlighted
                                ? "#34d399"
                                : "#94a3b8"
                            }
                            strokeWidth={
                              highlighted ? 7 : 4
                            }
                            strokeLinecap="round"
                            markerEnd={
                              highlighted
                                ? "url(#graphPathArrow)"
                                : "url(#graphArrow)"
                            }
                            opacity={
                              highlighted ? 1 : 0.9
                            }
                          />

                          <rect
                            x={midX - 42}
                            y={midY - 23}
                            width="84"
                            height="46"
                            rx="10"
                            fill="rgba(255,255,255,0.045)"
                            stroke={
                              highlighted
                                ? "#86efac"
                                : "rgba(148,163,184,0.16)"
                            }
                            strokeWidth="1.5"
                          />

                          <text
                            x={midX}
                            y={midY - 3}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="800"
                            fill={
                              highlighted
                                ? "#34d399"
                                : "#c7d2e1"
                            }
                          >
                            {edge.energy} kWh
                          </text>

                          <text
                            x={midX}
                            y={midY + 13}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="600"
                            fill="#8ea0b8"
                          >
                            {edge.distance} km
                          </text>
                        </g>
                      );
                    })}

                    {/* Graph nodes */}
                    {graphNodes.map((node) => {
                      const position =
                        graphNodePositions[node];

                      if (!position) {
                        return null;
                      }

                      const isStart =
                        node === "Solar Plant";

                      const isDestination =
                        node === "Location C";

                      const isOnPath =
                        graphPath.includes(node);

                      const nodeFill =
                        isStart
                          ? "#22d3ee"
                          : isDestination
                            ? "#f97316"
                            : isOnPath
                              ? "#34d399"
                              : "#06101d";

                      return (
                        <g
                          key={node}
                        >
                          <circle
                            cx={position.x}
                            cy={position.y}
                            r="34"
                            fill={nodeFill}
                            stroke="rgba(255,255,255,0.045)"
                            strokeWidth="5"
                          />

                          <circle
                            cx={position.x}
                            cy={position.y}
                            r="41"
                            fill="none"
                            stroke={
                              isOnPath
                                ? "#86efac"
                                : "#94a3b8"
                            }
                            strokeWidth="2"
                            opacity={
                              isOnPath ? 1 : 0.6
                            }
                          />

                          <text
                            x={position.x}
                            y={position.y + 4}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="800"
                            fill="rgba(255,255,255,0.045)"
                          >
                            {node === "Solar Plant"
                              ? "SOLAR"
                              : node.replace("Location ", "")}
                          </text>

                          <text
                            x={position.x}
                            y={position.y + 61}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="800"
                            fill="#06101d"
                          >
                            {node}
                          </text>

                          {isStart && (
                            <text
                              x={position.x}
                              y={position.y - 54}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="800"
                              fill="#22d3ee"
                            >
                              START
                            </text>
                          )}

                          {isDestination && (
                            <text
                              x={position.x}
                              y={position.y - 54}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="800"
                              fill="#ea580c"
                            >
                              DESTINATION
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {!graphResult && !graphLoading && (
                  <div
                    style={
                      styles.graphInstruction
                    }
                  >
                    Run Graph Optimization to highlight the minimum-energy Dijkstra path.
                  </div>
                )}
              </div>

              {graphError && (
                <div
                  style={
                    styles.errorBox
                  }
                >
                  {graphError}
                </div>
              )}


              {/* GRAPH RESULT */}

              {graphResult && (

                <div
                  style={
                    styles.smallMetricGrid
                  }
                >

                  <SmallMetric
                    label="Shortest Path"
                    value={
                      Array.isArray(
                        graphResult.path
                      )
                        ? graphResult.path.join(
                            " → "
                          )
                        : "-"
                    }
                  />


                  <SmallMetric
                    label="Total Energy"
                    value={`${getNumber(
                      graphResult.totalEnergy
                    ).toFixed(
                      2
                    )} kWh`}
                  />


                  <SmallMetric
                    label="Total Distance"
                    value={`${getNumber(
                      graphResult.totalDistance
                    ).toFixed(
                      2
                    )} km`}
                  />


                  <SmallMetric
                    label="Battery After Route"
                    value={`${getNumber(
                      graphResult.batteryAfterPercentage
                    ).toFixed(
                      1
                    )}%`}
                  />

                </div>

              )}

            </section>


            {/* ROUTE RESULT */}

            {routeResult && (

              <section
                style={styles.card}
              >

                <h3
                  style={
                    styles.cardHeading
                  }
                >
                  Route Optimization Result
                </h3>


                <pre
                  style={styles.resultPre}
                >
                  {JSON.stringify(
                    routeResult,
                    null,
                    2
                  )}
                </pre>

              </section>

            )}

          </>

        )}

      </main>


      {/* FOOTER */}

      <footer
        style={styles.footer}
      >
        HeliosSync • Intelligent Renewable Energy Management
      </footer>

    </div>
  );
}


// =====================================================
// SECTION HEADER
// =====================================================

function SectionHeader({
  title,
  text,
}) {

  return (

    <section
      style={
        styles.sectionHeader
      }
    >

      <h2
        style={
          styles.pageTitle
        }
      >
        {title}
      </h2>


      <p style={styles.muted}>
        {text}
      </p>

    </section>

  );
}


// =====================================================
// METRIC CARD
// =====================================================

function MetricCard({
  label,
  value,
}) {

  return (

    <div
      style={
        styles.metricCard
      }
    >

      <span
        style={
          styles.metricLabel
        }
      >
        {label}
      </span>


      <strong
        style={
          styles.metricValue
        }
      >
        {value}
      </strong>

    </div>

  );
}


// =====================================================
// SMALL METRIC
// =====================================================

function SmallMetric({
  label,
  value,
}) {

  return (

    <div
      style={
        styles.smallMetric
      }
    >

      <span
        style={
          styles.metricLabel
        }
      >
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </div>

  );
}


// =====================================================
// CHART CARD
// =====================================================

function ChartCard({
  title,
  children,
}) {

  return (

    <div
      style={
        styles.chartCard
      }
    >

      <h3
        style={
          styles.cardHeading
        }
      >
        {title}
      </h3>


      <div
        style={
          styles.chartContainer
        }
      >
        {children}
      </div>

    </div>

  );
}


// =====================================================
// OPTIMIZATION CARD
// =====================================================

function OptimizationCard({
  title,
  result,
}) {

  return (

    <div
      style={styles.card}
    >

      <h3
        style={
          styles.cardHeading
        }
      >
        {title}
      </h3>


      {!result ? (

        <p style={styles.muted}>
          Waiting for optimization result...
        </p>

      ) : (

        <div
          style={
            styles.resultList
          }
        >

          <ResultRow
            label="Solar Used"
            value={`${result.solarUsed.toFixed(
              2
            )} kWh`}
          />


          <ResultRow
            label="Battery Used"
            value={`${result.batteryUsed.toFixed(
              2
            )} kWh`}
          />


          <ResultRow
            label="Battery Charged"
            value={`${result.batteryCharged.toFixed(
              2
            )} kWh`}
          />


          <ResultRow
            label="Grid Used"
            value={`${result.gridUsed.toFixed(
              2
            )} kWh`}
          />


          <ResultRow
            label="Final Battery"
            value={`${result.finalBatteryLevel.toFixed(
              1
            )}%`}
          />

        </div>

      )}

    </div>

  );
}


// =====================================================
// RESULT ROW
// =====================================================

function ResultRow({
  label,
  value,
}) {

  return (

    <div
      style={
        styles.resultRow
      }
    >

      <span
        style={
          styles.metricLabel
        }
      >
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </div>

  );
}


// =====================================================
// STYLES
// =====================================================

const styles = {
  app: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 12% 12%, rgba(34,211,238,.13), transparent 25%), radial-gradient(circle at 88% 20%, rgba(59,130,246,.12), transparent 25%), radial-gradient(circle at 50% 85%, rgba(16,185,129,.08), transparent 30%), linear-gradient(180deg,#04101d 0%,#061625 48%,#071522 100%)",
    color: "#e8f1f7",
    fontFamily: "Space Grotesk, Manrope, ui-sans-serif, system-ui, sans-serif",
  },

  authPage: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 15% 20%, rgba(14,165,233,.24), transparent 32%), radial-gradient(circle at 85% 80%, rgba(34,197,94,.16), transparent 30%), linear-gradient(135deg, #04101d, #0b1f35 55%, #0b3a52)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px", boxSizing: "border-box",
  },
  authPanel: { width: "100%", maxWidth: "480px" },
  authLoadingCard: { width: "100%", maxWidth: "420px", background: "rgba(255,255,255,.96)", border: "1px solid rgba(255,255,255,.5)", borderRadius: "28px", padding: "44px", textAlign: "center", boxShadow: "0 30px 90px rgba(0,0,0,.35)", boxSizing: "border-box" },
  authBrand: { display: "flex", alignItems: "center", gap: "14px", color: "#fff", marginBottom: "18px", padding: "0 6px" },
  authLogoMark: { width: "54px", height: "54px", borderRadius: "18px", background: "linear-gradient(135deg,#fbbf24,#22c55e)", color: "#07111f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 900, flexShrink: 0, boxShadow: "0 12px 30px rgba(34,197,94,.2)" },
  authBrandTitle: { margin: 0, fontSize: "27px", fontWeight: 900, letterSpacing: "-.5px" },
  authBrandText: { margin: "4px 0 0", color: "rgba(255,255,255,.68)", fontSize: "13px" },
  authCard: { background: "rgba(255,255,255,.97)", border: "1px solid rgba(255,255,255,.65)", borderRadius: "28px", padding: "34px", boxShadow: "0 30px 90px rgba(0,0,0,.35)", boxSizing: "border-box" },
  authCardHeader: { marginBottom: "24px" },
  authTitle: { margin: 0, fontSize: "30px", fontWeight: 900, color: "#07111f", letterSpacing: "-.7px" },
  authSubtitle: { margin: "8px 0 0", color: "#8ea0b8", lineHeight: 1.6 },
  authForm: { display: "grid", gap: "16px" },
  authLabel: { display: "grid", gap: "8px", color: "#c7d2e1", fontSize: "13px", fontWeight: 800 },
  authInput: { width: "100%", boxSizing: "border-box", padding: "14px 15px", border: "1px solid #d5e0e8", borderRadius: "14px", outline: "none", fontSize: "15px", color: "#07111f", background: "#f8fbfd" },
  authSubmitButton: { border: "none", borderRadius: "14px", padding: "14px 18px", background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", fontWeight: 900, fontSize: "15px", cursor: "pointer", marginTop: "4px", boxShadow: "0 12px 28px rgba(14,165,233,.25)" },
  authSwitch: { marginTop: "22px", paddingTop: "20px", borderTop: "1px solid #e5edf2", display: "flex", justifyContent: "center", gap: "7px", flexWrap: "wrap", color: "#8ea0b8", fontSize: "14px" },
  authSwitchButton: { border: "none", background: "transparent", color: "#0284c7", fontWeight: 900, cursor: "pointer", padding: 0 },
  authError: { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3", borderRadius: "12px", padding: "11px 13px", marginBottom: "18px", fontSize: "14px", fontWeight: 700 },
  authSuccess: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "11px 13px", marginBottom: "18px", fontSize: "14px", fontWeight: 700 },
  authSpinner: { marginTop: "20px", color: "#0284c7", fontWeight: 800 },
  authFooter: { textAlign: "center", color: "rgba(255,255,255,.6)", fontSize: "12px", margin: "16px 0 0" },

  header: { position: "relative", background: "linear-gradient(135deg,#06111f 0%,#0b2136 58%,#063b50 100%)", color: "#fff", padding: "22px 6%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", overflow: "hidden" },
  logo: { margin: 0, fontSize: "29px", fontWeight: 900, letterSpacing: "-.7px", background: "linear-gradient(90deg,#fff,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  subtitle: { margin: "5px 0 0", color: "#a9c1d1", fontSize: "13px" },
  status: { display: "flex", alignItems: "center", gap: "9px", fontWeight: 800, fontSize: "13px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", padding: "9px 13px", borderRadius: "999px", backdropFilter: "blur(12px)" },
  statusDot: { width: "9px", height: "9px", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 12px currentColor" },
  headerActions: { display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "flex-end" },
  userBadge: { display: "flex", alignItems: "center", gap: "9px" },
  userAvatar: { width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg,#22d3ee,#3b82f6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  userInfo: { display: "flex", flexDirection: "column", gap: "2px", minWidth: "120px" },
  userInfoSpan: { fontSize: "11px", color: "#a9c1d1" },
  logoutButton: { border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.07)", color: "#fff", borderRadius: "12px", padding: "9px 13px", cursor: "pointer", fontWeight: 800 },

  nav: { position: "sticky", top: 0, zIndex: 20, background: "rgba(7,17,31,.9)", borderBottom: "1px solid rgba(148,163,184,.15)", padding: "0 6%", display: "flex", gap: "5px", overflowX: "auto", backdropFilter: "blur(18px)" },
  navButton: { border: "none", borderBottom: "2px solid transparent", background: "transparent", padding: "15px 17px", cursor: "pointer", color: "#9fb5c4", fontWeight: 800, whiteSpace: "nowrap" },
  activeNavButton: { borderTop: "none", borderRight: "none", borderLeft: "none", borderBottom: "2px solid #22d3ee", background: "rgba(34,211,238,.08)", padding: "15px 17px", cursor: "pointer", color: "#67e8f9", fontWeight: 900, whiteSpace: "nowrap", borderRadius: "10px 10px 0 0" },

  main: { width: "88%", maxWidth: "1450px", margin: "0 auto", padding: "34px 0 48px", color: "#eaf7ff" },
  sectionHeader: { marginBottom: "24px", padding: "2px 2px" },
  pageTitle: { margin: 0, fontSize: "clamp(30px,3vw,46px)", fontWeight: 900, letterSpacing: "-1.4px", color: "#f4fbff", textShadow: "0 0 30px rgba(34,211,238,.10)" },
  muted: { color: "#8caabd", lineHeight: 1.6 },
  blueLabel: { color: "#67e8f9", fontSize: "11px", fontWeight: 900, letterSpacing: "1.8px", textTransform: "uppercase" },
  errorBox: { background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", padding: "13px 16px", borderRadius: "14px", marginBottom: "18px", fontWeight: 700 },
  loadingBox: { background: "#ecfeff", border: "1px solid #a5f3fc", color: "#0e7490", padding: "13px 16px", borderRadius: "14px", marginBottom: "18px", fontWeight: 700 },

  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "15px", marginBottom: "22px" },
  metricCard: { position: "relative", overflow: "hidden", background: "linear-gradient(145deg,rgba(13,35,55,.88),rgba(7,24,40,.76))", border: "1px solid rgba(103,232,249,.16)", borderRadius: "20px", padding: "20px", boxShadow: "0 18px 45px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.035)", backdropFilter: "blur(18px)" },
  metricLabel: { display: "block", color: "#8fb0c2", fontSize: "12px", fontWeight: 800, marginBottom: "8px", letterSpacing: ".3px" },
  metricValue: { display: "block", fontSize: "27px", fontWeight: 900, color: "#eafaff", letterSpacing: "-.7px", textShadow: "0 0 18px rgba(103,232,249,.12)" },

  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(390px,1fr))", gap: "18px" },
  chartCard: { background: "linear-gradient(145deg,rgba(9,28,46,.92),rgba(6,20,34,.82))", border: "1px solid rgba(103,232,249,.14)", borderRadius: "22px", padding: "21px", boxShadow: "0 20px 55px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.035)", backdropFilter: "blur(18px)" },
  chartContainer: { height: "320px", marginTop: "15px" },
  card: { background: "rgba(8, 22, 38, 0.72)", border: "1px solid rgba(86, 211, 255, 0.16)", borderRadius: "22px", padding: "23px", marginTop: "20px", boxShadow: "0 14px 35px rgba(15,35,50,.06)" },
  graphCard: { background: "linear-gradient(145deg,rgba(9,30,48,.94),rgba(6,20,34,.88))", border: "1px solid rgba(103,232,249,.15)", borderRadius: "22px", padding: "23px", marginTop: "20px", boxShadow: "0 20px 55px rgba(0,0,0,.28)" },
  cardHeading: { margin: 0, fontSize: "19px", fontWeight: 900, color: "#eafaff", letterSpacing: "-.3px" },

  comparisonStatusGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "14px" },
  comparisonStatusCard: { border: "1px solid rgba(103,232,249,.14)", borderRadius: "16px", padding: "16px", background: "rgba(12,35,54,.72)" },
  comparisonStatusHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },

  systemHealthCard: { background: "rgba(8, 22, 38, 0.72)", border: "1px solid rgba(86, 211, 255, 0.16)", borderRadius: "22px", padding: "23px", marginTop: "20px", boxShadow: "0 14px 35px rgba(15,35,50,.06)" },
  healthBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "7px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 900, whiteSpace: "nowrap" },
  healthHealthy: { background: "#dcfce7", color: "#34d399" },
  healthAttention: { background: "#fef3c7", color: "#92400e" },
  healthCritical: { background: "#fee2e2", color: "#991b1b" },
  healthGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "15px", marginTop: "20px" },
  healthMetric: { background: "rgba(12,35,54,.76)", border: "1px solid rgba(103,232,249,.13)", borderRadius: "16px", padding: "18px" },
  healthMetricValue: { display: "block", fontSize: "26px", fontWeight: 900, marginBottom: "9px", color: "#eafaff" },
  healthProgressTrack: { width: "100%", height: "8px", background: "rgba(148,163,184,.16)", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" },
  healthProgressBar: { height: "100%", background: "linear-gradient(90deg,#22c55e,#06b6d4)", borderRadius: "999px", transition: "width .4s ease" },
  healthHint: { color: "#708594", fontSize: "12px", lineHeight: 1.5 },
  serviceHealthSection: { marginTop: "20px", padding: "17px", borderRadius: "16px", background: "rgba(6,24,40,.72)", border: "1px solid rgba(103,232,249,.12)" },
  serviceHealthTitle: { display: "block", marginTop: "4px", fontSize: "18px", color: "#eaf7ff" },
  serviceHealthChecking: { color: "#708594", fontSize: "12px", fontWeight: 700 },
  serviceHealthGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "10px", marginTop: "14px", marginBottom: "12px" },
  serviceHealthItem: { display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px", borderRadius: "13px", background: "rgba(13,39,59,.7)", border: "1px solid rgba(103,232,249,.10)" },
  serviceHealthDot: { color: "#34d399", fontSize: "14px", lineHeight: 1.4 },
  serviceHealthName: { display: "block", color: "#eaf7ff", fontSize: "13px", fontWeight: 800 },
  serviceHealthValue: { display: "block", marginTop: "3px", color: "#708594", fontSize: "12px" },
  serviceHealthError: { marginTop: "10px", padding: "10px 12px", borderRadius: "10px", background: "#fff1f2", border: "1px solid #fecdd3", color: "#991b1b", fontSize: "12px", fontWeight: 600 },

  alertList: { display: "grid", gap: "10px", marginTop: "17px" },
  alertItem: { display: "flex", flexDirection: "column", gap: "4px", padding: "13px 15px", borderRadius: "13px", border: "1px solid", fontSize: "13px" },
  alertCritical: { background: "#fff1f2", borderColor: "#fecdd3", color: "#991b1b" },
  alertWarning: { background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" },
  alertInfo: { background: "#ecfeff", borderColor: "#a5f3fc", color: "#0e7490" },
  noAlertBox: { marginTop: "17px", padding: "13px 15px", borderRadius: "13px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#34d399", fontWeight: 800, fontSize: "13px" },

  recommendationCard: { background: "linear-gradient(135deg,rgba(7,37,55,.94),rgba(7,24,40,.86) 58%,rgba(7,44,39,.72))", border: "1px solid #bce7ef", borderRadius: "22px", padding: "23px", marginTop: "20px", boxShadow: "0 14px 35px rgba(14,116,144,.07)" },
  rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" },
  badge: { background: "linear-gradient(135deg,#0284c7,#06b6d4)", color: "#fff", borderRadius: "999px", padding: "7px 12px", fontWeight: 900, fontSize: "12px" },
  smallMetricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "11px", marginTop: "17px" },
  smallMetric: { background: "rgba(12,35,54,.72)", border: "1px solid rgba(103,232,249,.12)", borderRadius: "14px", padding: "14px", minHeight: "62px" },
  actionRow: { display: "flex", gap: "11px", flexWrap: "wrap", marginBottom: "18px" },
  exportActions: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" },
  secondaryButton: { border: "1px solid rgba(103,232,249,.18)", background: "rgba(255,255,255,.05)", color: "#bcefff", padding: "10px 14px", borderRadius: "12px", cursor: "pointer", fontWeight: 800 },
  primaryButton: { border: "none", background: "linear-gradient(135deg,#0284c7,#06b6d4)", color: "#fff", padding: "11px 17px", borderRadius: "12px", cursor: "pointer", fontWeight: 900, boxShadow: "0 9px 20px rgba(2,132,199,.2)" },
  twoColumn: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "18px" },
  resultList: { marginTop: "14px" },
  resultRow: { display: "flex", justifyContent: "space-between", gap: "20px", padding: "12px 0", borderBottom: "1px solid rgba(103,232,249,.09)" },

  tableWrapper: { overflowX: "auto", marginTop: "17px", borderRadius: "14px", border: "1px solid rgba(86, 211, 255, 0.16)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px", background: "rgba(12,35,54,.9)", borderBottom: "1px solid rgba(103,232,249,.10)", color: "#8fb0c2" },
  td: { padding: "12px", borderBottom: "1px solid rgba(86, 211, 255, 0.08)" },

  routeList: { display: "grid", gap: "13px" },
  locationCard: { background: "linear-gradient(145deg,rgba(13,35,55,.88),rgba(7,24,40,.78))", border: "1px solid rgba(86, 211, 255, 0.16)", borderRadius: "18px", padding: "17px", display: "flex", gap: "14px", alignItems: "flex-start", boxShadow: "0 8px 22px rgba(15,35,50,.04)" },
  locationNumber: { width: "35px", height: "35px", borderRadius: "12px", background: "linear-gradient(135deg,#0284c7,#06b6d4)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0 },
  locationTitle: { margin: 0, fontSize: "17px", color: "#eafaff" },
  progressBackground: { height: "8px", background: "rgba(148,163,184,.16)", borderRadius: "99px", overflow: "hidden", margin: "11px 0 7px" },
  progressBar: { height: "100%", background: "linear-gradient(90deg,#22c55e,#06b6d4)", borderRadius: "99px" },

  graphCanvas: { marginTop: "20px", padding: "17px", background: "rgba(4,18,31,.82)", border: "1px solid rgba(86, 211, 255, 0.16)", borderRadius: "17px" },
  graphCanvasHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "10px" },
  graphCanvasHint: { display: "block", marginTop: "4px", color: "#708594", fontSize: "12px" },
  graphLegend: { display: "flex", gap: "13px", flexWrap: "wrap" },
  graphLegendItem: { display: "flex", alignItems: "center", gap: "6px", color: "#86a8bb", fontSize: "11px", fontWeight: 800 },
  graphLegendSwatch: { width: "10px", height: "10px", borderRadius: "50%", display: "inline-block" },
  graphSvgWrapper: { width: "100%", overflowX: "auto", borderRadius: "13px", background: "rgba(5,19,32,.9)" },
  graphSvg: { width: "100%", minWidth: "620px", height: "auto", display: "block" },
  graphInstruction: { marginTop: "10px", padding: "10px 12px", borderRadius: "10px", background: "#ecfeff", color: "#0e7490", fontSize: "12px", fontWeight: 800 },
  graphPreview: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "20px", padding: "17px", background: "rgba(4,18,31,.82)", border: "1px solid rgba(86, 211, 255, 0.16)", borderRadius: "14px" },
  graphItem: { display: "flex", alignItems: "center", gap: "8px" },
  graphNode: { background: "#0b1b2b", color: "#fff", padding: "9px 12px", borderRadius: "10px", fontWeight: 800, fontSize: "12px" },
  graphArrow: { fontSize: "20px", color: "#06b6d4", fontWeight: 900 },
  resultPre: { marginTop: "14px", background: "#07111f", color: "#c9f7ff", padding: "17px", borderRadius: "13px", overflowX: "auto", fontSize: "12px", lineHeight: 1.6 },

  analyticsSummaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px", marginBottom: "20px" },
  analyticsCard: { background: "linear-gradient(145deg,rgba(13,35,55,.88),rgba(7,24,40,.76))", border: "1px solid rgba(86, 211, 255, 0.16)", borderRadius: "18px", padding: "19px", boxShadow: "0 10px 25px rgba(15,35,50,.05)" },
  analyticsValue: { display: "block", fontSize: "25px", fontWeight: 900, margin: "8px 0 5px", color: "#eaf7ff" },
  historyTableCard: { background: "rgba(8, 22, 38, 0.72)", border: "1px solid rgba(86, 211, 255, 0.16)", borderRadius: "20px", padding: "22px", marginTop: "20px", boxShadow: "0 20px 60px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.035)" },
  historyTable: { width: "100%", minWidth: "850px", borderCollapse: "collapse", fontSize: "13px" },
  tableHeader: { textAlign: "left", padding: "12px", background: "rgba(16, 39, 60, 0.78)", color: "#86a8bb", borderBottom: "1px solid rgba(103,232,249,.10)", fontWeight: 900, whiteSpace: "nowrap" },
  tableCell: { padding: "12px", borderBottom: "1px solid rgba(86, 211, 255, 0.08)", color: "#b8d0df", whiteSpace: "nowrap" },

  footer: { textAlign: "center", padding: "28px", color: "#7192a5", borderTop: "1px solid rgba(103,232,249,.10)", marginTop: "10px", background: "rgba(4,15,27,.58)" },
};


// =====================================================
// DEFAULT EXPORT
// =====================================================

export default App;