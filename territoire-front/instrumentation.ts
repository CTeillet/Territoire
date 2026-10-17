import { registerOTel } from "@vercel/otel";

export function register() {
  // Export OTLP vers le collector si OTEL_EXPORTER_OTLP_ENDPOINT est défini (cf. docker-compose.yml)
  registerOTel({ serviceName: "territoire-front" });
}
