import { ErrorRequestHandler } from 'express';

export const errorRequestHandler: ErrorRequestHandler = (err, req, res, next) => {
  return res.status(500).send(err.message);
}