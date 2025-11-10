export function getImagePrefix() {
  const dev = process.env.PROD_IMG_HTTP_PREFIX_DEV;
  const prod = process.env.PROD_IMG_HTTP_PREFIX;
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  return env.startsWith('prod') ? (prod || dev || '') : (dev || prod || '');
}