export interface HealthResponse {
  status: "ok";
  service: string;
  env: string;
  timestamp: string;
}
