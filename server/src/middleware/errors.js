import { ZodError } from 'zod';
import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Parses req[source] with a zod schema and replaces it with the clean value. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const parsed = schema.parse(req[source]);
  if (source === 'query') req.validQuery = parsed;
  else req[source] = parsed;
  next();
};

export const notFound = (req, _res, next) => next(new HttpError(404, `No route for ${req.method} ${req.path}`));

// One place that turns every error into a consistent JSON response.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const details = err.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: details[0]?.message || 'Invalid request.', details });
  }
  if (err instanceof mongoose.Error.CastError) return res.status(404).json({ error: 'Not found.' });
  if (err?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side.' : err.message, details: err.details });
}
