// Build-time configuration. FUTURE: apiBaseUrl points at the AWS API Gateway URL in prod.
export const environment = {
  production: false,
  apiBaseUrl: 'https://erp-backend-8pu6.onrender.com',
  useMocks: false,
  logLevel: 'debug' as 'debug' | 'info' | 'warn' | 'error' | 'silent'
};
