export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const message = err.errors?.[0]?.message || 'Invalid request payload';
      return res.status(400).json({
        data: null,
        error: message
      });
    }
  };
}
