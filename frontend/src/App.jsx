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

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

const WS_BASE =
  API_BASE.replace(/^http/, "ws");

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
          WS_BASE
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
      <div style={styles.authPage}>
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

    <div style={styles.app}>

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
                    ? "#22c55e"
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
                      stroke="#22c55e"
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
                      stroke="#22c55e"
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
                          background: "#2563eb",
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
                          background: "#22c55e",
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
                          fill="#22c55e"
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
                                ? "#22c55e"
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
                            fill="#ffffff"
                            stroke={
                              highlighted
                                ? "#86efac"
                                : "#e2e8f0"
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
                                ? "#15803d"
                                : "#334155"
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
                            fill="#64748b"
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
                          ? "#2563eb"
                          : isDestination
                            ? "#f97316"
                            : isOnPath
                              ? "#22c55e"
                              : "#0f172a";

                      return (
                        <g
                          key={node}
                        >
                          <circle
                            cx={position.x}
                            cy={position.y}
                            r="34"
                            fill={nodeFill}
                            stroke="#ffffff"
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
                                : "#cbd5e1"
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
                            fill="#ffffff"
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
                            fill="#0f172a"
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
                              fill="#2563eb"
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

    background:
      "#f8fafc",

    color:
      "#0f172a",

    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },


  authPage: {
    minHeight:
      "100vh",

    background:
      "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    padding:
      "30px 20px",

    boxSizing:
      "border-box",
  },


  authPanel: {
    width:
      "100%",

    maxWidth:
      "460px",
  },


  authLoadingCard: {
    width:
      "100%",

    maxWidth:
      "420px",

    background:
      "#ffffff",

    borderRadius:
      "24px",

    padding:
      "42px",

    textAlign:
      "center",

    boxShadow:
      "0 25px 70px rgba(15, 23, 42, 0.35)",

    boxSizing:
      "border-box",
  },


  authBrand: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "14px",

    color:
      "#ffffff",

    marginBottom:
      "20px",

    padding:
      "0 8px",
  },


  authLogoMark: {
    width:
      "52px",

    height:
      "52px",

    borderRadius:
      "16px",

    background:
      "#ffffff",

    color:
      "#2563eb",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontSize:
      "28px",

    fontWeight:
      900,

    flexShrink:
      0,
  },


  authBrandTitle: {
    margin:
      0,

    fontSize:
      "26px",

    fontWeight:
      900,
  },


  authBrandText: {
    margin:
      "4px 0 0",

    opacity:
      0.78,

    fontSize:
      "13px",
  },


  authCard: {
    background:
      "#ffffff",

    borderRadius:
      "24px",

    padding:
      "34px",

    boxShadow:
      "0 25px 70px rgba(15, 23, 42, 0.35)",

    boxSizing:
      "border-box",
  },


  authCardHeader: {
    marginBottom:
      "24px",
  },


  authTitle: {
    margin:
      0,

    fontSize:
      "28px",

    fontWeight:
      900,

    color:
      "#0f172a",
  },


  authSubtitle: {
    margin:
      "8px 0 0",

    color:
      "#64748b",

    lineHeight:
      1.6,
  },


  authForm: {
    display:
      "grid",

    gap:
      "17px",
  },


  authLabel: {
    display:
      "grid",

    gap:
      "8px",

    color:
      "#334155",

    fontSize:
      "14px",

    fontWeight:
      800,
  },


  authInput: {
    width:
      "100%",

    boxSizing:
      "border-box",

    padding:
      "13px 14px",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "11px",

    outline:
      "none",

    fontSize:
      "15px",

    color:
      "#0f172a",

    background:
      "#ffffff",
  },


  authSubmitButton: {
    border:
      "none",

    borderRadius:
      "11px",

    padding:
      "14px 18px",

    background:
      "#2563eb",

    color:
      "#ffffff",

    fontWeight:
      900,

    fontSize:
      "15px",

    cursor:
      "pointer",

    marginTop:
      "4px",
  },


  authSwitch: {
    marginTop:
      "22px",

    paddingTop:
      "20px",

    borderTop:
      "1px solid #e2e8f0",

    display:
      "flex",

    justifyContent:
      "center",

    gap:
      "7px",

    flexWrap:
      "wrap",

    color:
      "#64748b",

    fontSize:
      "14px",
  },


  authSwitchButton: {
    border:
      "none",

    background:
      "transparent",

    color:
      "#2563eb",

    fontWeight:
      900,

    cursor:
      "pointer",

    padding:
      0,
  },


  authError: {
    background:
      "#fef2f2",

    color:
      "#b91c1c",

    border:
      "1px solid #fecaca",

    borderRadius:
      "10px",

    padding:
      "11px 13px",

    marginBottom:
      "18px",

    fontSize:
      "14px",

    fontWeight:
      700,
  },


  authSuccess: {
    background:
      "#f0fdf4",

    color:
      "#15803d",

    border:
      "1px solid #bbf7d0",

    borderRadius:
      "10px",

    padding:
      "11px 13px",

    marginBottom:
      "18px",

    fontSize:
      "14px",

    fontWeight:
      700,
  },


  authSpinner: {
    marginTop:
      "20px",

    color:
      "#2563eb",

    fontWeight:
      800,
  },


  authFooter: {
    textAlign:
      "center",

    color:
      "rgba(255,255,255,0.7)",

    fontSize:
      "12px",

    margin:
      "16px 0 0",
  },


  headerActions: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "16px",

    flexWrap:
      "wrap",

    justifyContent:
      "flex-end",
  },


  userBadge: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "9px",
  },


  userAvatar: {
    width:
      "38px",

    height:
      "38px",

    borderRadius:
      "50%",

    background:
      "#2563eb",

    color:
      "#ffffff",

    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "center",

    fontWeight:
      900,
  },


  userInfo: {
    display:
      "flex",

    flexDirection:
      "column",

    gap:
      "2px",

    minWidth:
      "120px",
  },


  userInfoSpan: {
    fontSize:
      "11px",

    opacity:
      0.65,
  },


  logoutButton: {
    border:
      "1px solid rgba(255,255,255,0.25)",

    background:
      "rgba(255,255,255,0.08)",

    color:
      "#ffffff",

    borderRadius:
      "9px",

    padding:
      "9px 13px",

    cursor:
      "pointer",

    fontWeight:
      800,
  },


  header: {
    background:
      "#0f172a",

    color:
      "#ffffff",

    padding:
      "24px 6%",

    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    gap:
      "20px",
  },


  logo: {
    margin:
      0,

    fontSize:
      "30px",

    fontWeight:
      800,
  },


  subtitle: {
    margin:
      "5px 0 0",

    color:
      "#cbd5e1",

    fontSize:
      "14px",
  },


  status: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "8px",

    fontWeight:
      700,
  },


  statusDot: {
    width:
      "10px",

    height:
      "10px",

    borderRadius:
      "50%",

    display:
      "inline-block",
  },


  nav: {
    background:
      "#ffffff",

    borderBottom:
      "1px solid #e2e8f0",

    padding:
      "0 6%",

    display:
      "flex",

    gap:
      "8px",

    overflowX:
      "auto",
  },


  navButton: {
    border:
      "none",

    borderBottom:
      "3px solid transparent",

    background:
      "transparent",

    padding:
      "16px 18px",

    cursor:
      "pointer",

    color:
      "#64748b",

    fontWeight:
      700,

    whiteSpace:
      "nowrap",
  },


  activeNavButton: {
    borderTop:
      "none",

    borderRight:
      "none",

    borderLeft:
      "none",

    borderBottom:
      "3px solid #2563eb",

    background:
      "transparent",

    padding:
      "16px 18px",

    cursor:
      "pointer",

    color:
      "#2563eb",

    fontWeight:
      800,

    whiteSpace:
      "nowrap",
  },


  main: {
    width:
      "88%",

    maxWidth:
      "1400px",

    margin:
      "0 auto",

    padding:
      "40px 0",
  },


  sectionHeader: {
    marginBottom:
      "28px",
  },


  pageTitle: {
    margin:
      0,

    fontSize:
      "30px",

    fontWeight:
      800,
  },


  muted: {
    color:
      "#64748b",

    lineHeight:
      1.6,
  },


  blueLabel: {
    color:
      "#2563eb",

    fontSize:
      "12px",

    fontWeight:
      800,

    letterSpacing:
      "1px",
  },


  errorBox: {
    background:
      "#fef2f2",

    border:
      "1px solid #fecaca",

    color:
      "#b91c1c",

    padding:
      "14px 18px",

    borderRadius:
      "10px",

    marginBottom:
      "20px",

    fontWeight:
      600,
  },


  loadingBox: {
    background:
      "#eff6ff",

    border:
      "1px solid #bfdbfe",

    color:
      "#1d4ed8",

    padding:
      "14px 18px",

    borderRadius:
      "10px",

    marginBottom:
      "20px",

    fontWeight:
      600,
  },


  metricGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",

    gap:
      "18px",

    marginBottom:
      "24px",
  },


  metricCard: {
    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "14px",

    padding:
      "22px",

    boxShadow:
      "0 4px 14px rgba(15, 23, 42, 0.05)",
  },


  metricLabel: {
    display:
      "block",

    color:
      "#64748b",

    fontSize:
      "13px",

    fontWeight:
      700,

    marginBottom:
      "8px",
  },


  metricValue: {
    display:
      "block",

    fontSize:
      "25px",

    fontWeight:
      800,
  },


  chartGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(400px, 1fr))",

    gap:
      "20px",
  },


  chartCard: {
    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "14px",

    padding:
      "20px",
  },


  chartContainer: {
    height:
      "320px",

    marginTop:
      "15px",
  },


  card: {
    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "14px",

    padding:
      "24px",

    marginTop:
      "24px",
  },


  graphCard: {
    background:
      "#ffffff",

    border:
      "1px solid #bfdbfe",

    borderRadius:
      "16px",

    padding:
      "24px",

    marginTop:
      "24px",
  },


  cardHeading: {
    margin:
      0,

    fontSize:
      "20px",

    fontWeight:
      800,
  },


  comparisonStatusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },

  comparisonStatusCard: {
    border: "1px solid #dbe4f0",
    borderRadius: "14px",
    padding: "16px",
    background: "#f8fafc",
  },

  comparisonStatusHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  systemHealthCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    marginTop: "24px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
  },


  healthBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },


  healthHealthy: {
    background: "#dcfce7",
    color: "#166534",
  },


  healthAttention: {
    background: "#fef3c7",
    color: "#92400e",
  },


  healthCritical: {
    background: "#fee2e2",
    color: "#991b1b",
  },


  healthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
    marginTop: "22px",
  },


  healthMetric: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "18px",
  },


  healthMetricValue: {
    display: "block",
    fontSize: "26px",
    fontWeight: 800,
    marginBottom: "10px",
  },


  healthProgressTrack: {
    width: "100%",
    height: "9px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
    marginBottom: "9px",
  },


  healthProgressBar: {
    height: "100%",
    background: "#22c55e",
    borderRadius: "999px",
    transition: "width 0.4s ease",
  },


  healthHint: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.5,
  },


  serviceHealthSection: {
    marginTop: "22px",
    padding: "18px",
    borderRadius: "12px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
  },


  serviceHealthTitle: {
    display: "block",
    marginTop: "4px",
    fontSize: "18px",
    color: "#0f172a",
  },


  serviceHealthChecking: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
  },


  serviceHealthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "10px",
    marginTop: "14px",
    marginBottom: "12px",
  },


  serviceHealthItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px",
    borderRadius: "10px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },


  serviceHealthDot: {
    color: "#16a34a",
    fontSize: "14px",
    lineHeight: 1.4,
  },


  serviceHealthName: {
    display: "block",
    color: "#0f172a",
    fontSize: "13px",
  },


  serviceHealthValue: {
    display: "block",
    marginTop: "3px",
    color: "#64748b",
    fontSize: "12px",
  },


  serviceHealthError: {
    marginTop: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontSize: "12px",
    fontWeight: 600,
  },


  alertList: {
    display: "grid",
    gap: "10px",
    marginTop: "18px",
  },


  alertItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "13px 15px",
    borderRadius: "10px",
    border: "1px solid",
    fontSize: "13px",
  },


  alertCritical: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#991b1b",
  },


  alertWarning: {
    background: "#fffbeb",
    borderColor: "#fde68a",
    color: "#92400e",
  },


  alertInfo: {
    background: "#eff6ff",
    borderColor: "#bfdbfe",
    color: "#1d4ed8",
  },


  noAlertBox: {
    marginTop: "18px",
    padding: "14px 16px",
    borderRadius: "10px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontWeight: 700,
    fontSize: "13px",
  },


  recommendationCard: {
    background:
      "linear-gradient(135deg, #eff6ff, #ffffff)",

    border:
      "1px solid #bfdbfe",

    borderRadius:
      "16px",

    padding:
      "24px",

    marginTop:
      "24px",
  },


  rowBetween: {
    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "flex-start",

    gap:
      "20px",

    flexWrap:
      "wrap",
  },


  badge: {
    background:
      "#2563eb",

    color:
      "#ffffff",

    borderRadius:
      "999px",

    padding:
      "8px 14px",

    fontWeight:
      800,
  },


  smallMetricGrid: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",

    gap:
      "12px",

    marginTop:
      "18px",
  },


  smallMetric: {
    background:
      "#f8fafc",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "10px",

    padding:
      "15px",

    minHeight:
      "65px",
  },


  actionRow: {
    display:
      "flex",

    gap:
      "12px",

    flexWrap:
      "wrap",

    marginBottom:
      "20px",
  },


  exportActions: {
    display:
      "flex",

    alignItems:
      "center",

    justifyContent:
      "flex-end",

    gap:
      "8px",

    flexWrap:
      "wrap",
  },


  secondaryButton: {
    border:
      "1px solid #cbd5e1",

    background:
      "#ffffff",

    color:
      "#1e3a8a",

    padding:
      "10px 14px",

    borderRadius:
      "10px",

    cursor:
      "pointer",

    fontWeight:
      800,
  },


  primaryButton: {
    border:
      "none",

    background:
      "#2563eb",

    color:
      "#ffffff",

    padding:
      "12px 18px",

    borderRadius:
      "10px",

    cursor:
      "pointer",

    fontWeight:
      800,
  },


  twoColumn: {
    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",

    gap:
      "20px",
  },


  resultList: {
    marginTop:
      "15px",
  },


  resultRow: {
    display:
      "flex",

    justifyContent:
      "space-between",

    gap:
      "20px",

    padding:
      "13px 0",

    borderBottom:
      "1px solid #e2e8f0",
  },


  tableWrapper: {
    overflowX:
      "auto",

    marginTop:
      "18px",
  },


  table: {
    width:
      "100%",

    borderCollapse:
      "collapse",
  },


  th: {
    textAlign:
      "left",

    padding:
      "12px",

    background:
      "#f8fafc",

    borderBottom:
      "1px solid #e2e8f0",
  },


  td: {
    padding:
      "12px",

    borderBottom:
      "1px solid #e2e8f0",
  },


  routeList: {
    display:
      "grid",

    gap:
      "14px",
  },


  locationCard: {
    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "14px",

    padding:
      "18px",

    display:
      "flex",

    gap:
      "15px",

    alignItems:
      "flex-start",
  },


  locationNumber: {
    width:
      "36px",

    height:
      "36px",

    borderRadius:
      "50%",

    background:
      "#2563eb",

    color:
      "#ffffff",

    display:
      "grid",

    placeItems:
      "center",

    fontWeight:
      800,

    flexShrink:
      0,
  },


  locationTitle: {
    margin:
      0,

    fontSize:
      "18px",
  },


  progressBackground: {
    height:
      "9px",

    background:
      "#e2e8f0",

    borderRadius:
      "99px",

    overflow:
      "hidden",

    margin:
      "12px 0 7px",
  },


  progressBar: {
    height:
      "100%",

    background:
      "#22c55e",

    borderRadius:
      "99px",
  },


  graphCanvas: {
    marginTop:
      "22px",

    padding:
      "18px",

    background:
      "#f8fafc",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "14px",
  },


  graphCanvasHeader: {
    display:
      "flex",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    gap:
      "16px",

    flexWrap:
      "wrap",

    marginBottom:
      "10px",
  },


  graphCanvasHint: {
    display:
      "block",

    marginTop:
      "4px",

    color:
      "#64748b",

    fontSize:
      "12px",
  },


  graphLegend: {
    display:
      "flex",

    gap:
      "14px",

    flexWrap:
      "wrap",
  },


  graphLegendItem: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "6px",

    color:
      "#475569",

    fontSize:
      "11px",

    fontWeight:
      700,
  },


  graphLegendSwatch: {
    width:
      "10px",

    height:
      "10px",

    borderRadius:
      "50%",

    display:
      "inline-block",
  },


  graphSvgWrapper: {
    width:
      "100%",

    overflowX:
      "auto",

    borderRadius:
      "12px",

    background:
      "#ffffff",
  },


  graphSvg: {
    width:
      "100%",

    minWidth:
      "620px",

    height:
      "auto",

    display:
      "block",
  },


  graphInstruction: {
    marginTop:
      "10px",

    padding:
      "10px 12px",

    borderRadius:
      "9px",

    background:
      "#eff6ff",

    color:
      "#1d4ed8",

    fontSize:
      "12px",

    fontWeight:
      700,
  },


  graphPreview: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "8px",

    flexWrap:
      "wrap",

    marginTop:
      "22px",

    padding:
      "18px",

    background:
      "#f8fafc",

    borderRadius:
      "12px",
  },


  graphItem: {
    display:
      "flex",

    alignItems:
      "center",

    gap:
      "8px",
  },


  graphNode: {
    background:
      "#0f172a",

    color:
      "#ffffff",

    padding:
      "10px 13px",

    borderRadius:
      "9px",

    fontWeight:
      700,

    fontSize:
      "13px",
  },


  graphArrow: {
    fontSize:
      "22px",

    color:
      "#2563eb",

    fontWeight:
      800,
  },


  resultPre: {
    marginTop:
      "15px",

    background:
      "#0f172a",

    color:
      "#e2e8f0",

    padding:
      "18px",

    borderRadius:
      "10px",

    overflowX:
      "auto",

    fontSize:
      "13px",

    lineHeight:
      1.6,
  },



  analyticsSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },


  analyticsCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },


  analyticsValue: {
    display: "block",
    fontSize: "25px",
    fontWeight: 800,
    margin: "8px 0 5px",
  },


  historyTableCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    marginTop: "24px",
  },


  historyTable: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse",
    fontSize: "13px",
  },


  tableHeader: {
    textAlign: "left",
    padding: "13px 12px",
    background: "#f8fafc",
    color: "#475569",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },


  tableCell: {
    padding: "13px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#334155",
    whiteSpace: "nowrap",
  },


  footer: {
    textAlign:
      "center",

    padding:
      "28px",

    color:
      "#64748b",

    borderTop:
      "1px solid #e2e8f0",

    marginTop:
      "20px",
  },

};


// =====================================================
// DEFAULT EXPORT
// =====================================================

export default App;