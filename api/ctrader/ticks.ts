import { Request, Response } from 'express';
import { ctraderTickHistoryHandler } from './marketData.js';

export default async function handler(req: Request, res: Response) {
    return ctraderTickHistoryHandler(req, res);
}
