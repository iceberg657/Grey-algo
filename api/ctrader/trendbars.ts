import { Request, Response } from 'express';
import { ctraderTrendbarsHandler } from './marketData.js';

export default async function handler(req: Request, res: Response) {
    return ctraderTrendbarsHandler(req, res);
}
