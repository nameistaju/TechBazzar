// Centralized error handler
export function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.isPublic ? err.message : (statusCode === 500 ? 'An unexpected server error occurred' : err.message);

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('Server Internal Error:', err);
  }

  res.status(statusCode).json({
    data: null,
    error: message
  });
}
