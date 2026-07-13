import { Request, Response } from 'express';
import { ctraderStreamHandler } from './marketData.js';

export default async function handler(req: Request, res: Response) {
    return ctraderStreamHandler(req, res);
}
