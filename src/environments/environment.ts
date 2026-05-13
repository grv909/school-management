// Build-time configuration. FUTURE: apiBaseUrl points at the AWS API Gateway URL in prod.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8081',
  useMocks: true,
  logLevel: 'debug' as 'debug' | 'info' | 'warn' | 'error' | 'silent'
};
