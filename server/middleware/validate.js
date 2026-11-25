export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const issue = err.issues?.[0] || err.errors?.[0];
      const message = issue?.message || 'Invalid request payload';
      return res.status(400).json({
        data: null,
        error: message
      });
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (err) {
      const issue = err.issues?.[0] || err.errors?.[0];
      const message = issue?.message || 'Invalid query parameters';
      return res.status(400).json({
        data: null,
        error: message
      });
    }
  };
}
