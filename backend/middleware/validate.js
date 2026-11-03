function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    // Express 5 exposes req.query as a getter; assign defensively.
    try {
      req[source] = result.data;
    } catch {
      Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    }
    return next();
  };
}

module.exports = { validate };
