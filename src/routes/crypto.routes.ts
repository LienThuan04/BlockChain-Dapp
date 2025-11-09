import express, { Router } from 'express';
import { getAdminWallet, confirmCryptoPayment } from '../controllers/ClientAPI/crypto-payment.controller';
import { isAuth } from '../middleware/auth';

const router: Router = express.Router();

// Route để lấy địa chỉ ví admin - công khai (không cần đăng nhập)
router.get('/get-admin-wallet', getAdminWallet as express.RequestHandler);

// Route để xác nhận thanh toán crypto - yêu cầu đăng nhập
router.post('/orders/confirm-crypto-payment', isAuth, confirmCryptoPayment as express.RequestHandler);

export default router;