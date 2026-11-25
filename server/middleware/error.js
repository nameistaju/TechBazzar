// Centralized error handler (PII-free structured logging)
export function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.isPublic ? err.message : (statusCode === 500 ? 'An unexpected server error occurred' : err.message);

  if (statusCode >= 500) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      method: req.method,
      path: req.path,
      status: statusCode,
      message: err?.message || 'Internal error'
    }));
  }

  res.status(statusCode).json({
    data: null,
    error: message
  });
}
