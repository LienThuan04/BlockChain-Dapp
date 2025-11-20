import { GetRevenueWithFilter, GetBestSellProducts, GetTopContributors } from "controllers/admin/Revenue.controller";
import { createUserApi, DelUserByIdApi, getAllUserApi, GetUserByIdApi, PutUpdateUserByIDApi } from "controllers/AdminAPI/user.controller";
import { PostAddProductToCartAPI } from "controllers/client/api.controller";
import { fetchAccountAPI, LoginAPI } from "controllers/ClientAPI/Client.controller";
import { getAdminWallet, confirmCryptoPayment } from "controllers/ClientAPI/crypto-payment.controller";
import { getActiveCryptocurrencyPrice } from "controllers/admin/cryptocurrency-management.controller";
import { Express, Router } from 'express';

const router = Router();

const apiRouters = (app: Express) => {

    router.post('/add-product-to-cart', PostAddProductToCartAPI);



    //admin revenue with filter----------------------------------------------
    router.get('/admin/revenue/:filter', GetRevenueWithFilter);
    // API lấy top 5 sản phẩm bán chạy nhất
    router.get('/admin/best-sell-products', GetBestSellProducts);
    // API lấy top 8 người dùng mua nhiều nhất
    router.get('/admin/top-contributors', GetTopContributors);

    //API Login
    router.post('/login', LoginAPI);
    router.get('/account', fetchAccountAPI);

    //user management APIs

    router.get('/users', getAllUserApi);
    router.get('/users/:id', GetUserByIdApi);
    router.post('/users', createUserApi);
    router.put('/users/:id', PutUpdateUserByIDApi);
    router.delete('/users/:id', DelUserByIdApi);

    // Cryptocurrency APIs
    router.get('/cryptocurrency/active-price', getActiveCryptocurrencyPrice);
    router.get('/crypto/admin-wallet', getAdminWallet);
    router.post('/crypto/confirm-payment', confirmCryptoPayment);

    // router.



    app.use('/api', router);

};


export default apiRouters;