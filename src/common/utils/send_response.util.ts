import { Request, Response } from 'express';
import { RESPONSE_STATUS } from 'src/common/constants/status.constants';

export default {
  sendSuccess(req: Request, res: Response, data: any, status_code: null | number, message: string) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return res.status(status_code).json({
      status: RESPONSE_STATUS.SUCCESS,
      data: data,
      message: message,
    });
  },
  sendError: function (req: Request, res: Response, error: any) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    console.log(error);
    error.status_code = error.status_code ? error.status_code : 500;
    if (req.method === 'OPTIONS') {
      return res.status(error.status_code).end();
    }

    return res.status(error.status_code).json({
      status: RESPONSE_STATUS.ERROR,
      message: error.message,
      code: error.code,
      error: error,
    });
  },
};
