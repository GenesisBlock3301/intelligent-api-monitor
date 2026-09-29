const monitorUrl = process.env.MONITOR_API_URL ?? "http://localhost:4000/monitor";

const scenarios = [
  { api_name: "PatientDataAPI", response_time_ms: 400, status_code: 200, records_returned: 50 },
  { api_name: "ClaimsAPI", response_time_ms: 5000, status_code: 200, records_returned: 18 },
  { api_name: "BillingAPI", response_time_ms: 800, status_code: 500, records_returned: 20 },
  { api_name: "SchedulingAPI", response_time_ms: 500, status_code: 200, records_returned: 0 },
  { api_name: "AppointmentAPI", response_time_ms: 5500, status_code: 500, records_returned: 0 },
  { api_name: "AppointmentAPI", response_time_ms: 5500, status_code: 500, records_returned: 0 },
];

async function simulate(): Promise<void> {
  const response = await fetch(monitorUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scenarios),
  });

  if (!response.ok) {
    throw new Error(`Monitor API responded with ${response.status}: ${await response.text()}`);
  }

  console.log(JSON.stringify(await response.json(), null, 2));
}

simulate().catch((error: unknown) => {
  console.error("Event simulation failed", error);
  process.exit(1);
});
