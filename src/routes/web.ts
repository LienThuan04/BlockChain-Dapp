import express, { Express, Response, Request } from 'express';
import { getCreateUserPage, getHomePage, PostCreateUser, PostDelUser, GetEditUser, PostUpdateUser } from 'controllers/admin/user.controller';
import { getAdminOrderPage, getAdminPage, getAdminProductPage, getAdminUserPage } from 'controllers/admin/dashboard.controller';
import { FileUploadFields, fileUploadMiddleware } from 'middleware/multer';
import { GetAllProductsforClient, GetCartPage, GetDetailHistory, GetOrderHistory, GetPageCheckOut, GetPageMyAccount, GetProductPage, GetReviewPage, PostAddProductToCart, PostAddQuantityToCart, PostCancelOrder, PostChangePassword, PostClientUpdateAcc, PostDelProductInCart, PostReviewProduct } from 'controllers/client/client.controller';
import { DelProduct, getAdminCreateProductPage, GetEditProduct, PostAdminCreateProduct, PostEditProduct } from 'controllers/admin/product.controller';
import { getLoginPage, GetPageWithRoleUser, PostLogout, postRegister } from 'controllers/client/auth.controller';
import passport from 'passport';
import { isAdmin, islogin } from 'middleware/auth';
import { GetDetailOrder, PostUpdateOrderById } from 'controllers/admin/order.controller';
import { GetPageCreateTarget, GetPageTarget, GetViewTarget, PostCreateTarget, PostDelTarget, PostUpdateTarget } from 'controllers/admin/target.controller';
import { GetPageCreateFactory, GetPageFactory, GetViewFactory, PostCreateFactory, PostDelFactory, PostUpdateFactory } from 'controllers/admin/factory.controller';
import { createPaypalOrder, PaypalSuccess, PostPlaceOrder, DebugPaypal } from 'controllers/client/Payment.controller';
import { GetReviewPageForAdmin } from 'controllers/admin/review.controller';
import { GetRevenue } from 'controllers/admin/Revenue.controller';
import { getCryptoWalletPage, exportCryptoTransactions, getTransactionDetails } from 'controllers/admin/crypto-wallet.controller';
import { getWalletManagementPage, addNewWallet, switchActiveWallet, deleteWallet, getWalletDetails } from 'controllers/admin/crypto-wallet-management.controller';
import { getCryptocurrencyManagementPage, addCryptocurrency, setActiveCryptocurrency, updateCryptocurrency, deleteCryptocurrency, getActiveCryptocurrency, getCryptocurrencyDetails, getEditPage } from 'controllers/admin/cryptocurrency-management.controller';
import cryptoRoutes from './crypto.routes';


const router = express.Router();

const webroutes = (app: Express) => {
    // Sử dụng crypto routes
    app.use('/api', cryptoRoutes);

    // Home route
    router.get('/', getHomePage);
    //User routes
    router.get('/product/:id', GetProductPage);
    // router.get('/products', GetAllProductforClient);
    router.get('/products', GetAllProductsforClient);

    //Auth
    router.get('/login', islogin, getLoginPage);
    // router.post('/login', postLogin);
    router.post('/login', passport.authenticate('local', {
        successRedirect: '/PageWithRoleUserAfterLogin', //nếu đăng nhập thành công
        failureRedirect: '/login', //nếu đăng nhập thất bại
        failureMessage: true // bật hiển thị thông báo khi có lỗi
    }));
    router.post('/register',islogin, postRegister);
    router.post('/logout', PostLogout);

    router.get('/PageWithRoleUserAfterLogin', GetPageWithRoleUser );

    //Client
    router.post('/add-product-to-cart/:id', PostAddProductToCart);
    router.get('/cart', GetCartPage);
    router.post('/cart/remove/:id', PostDelProductInCart);
    router.get('/checkout',GetPageCheckOut);
    router.post('/handle-add-to-cart', PostAddQuantityToCart);
    router.get('/My-Account', GetPageMyAccount);
    router.post('/client/Update-Account', fileUploadMiddleware('avatar', 'images/avatars'), PostClientUpdateAcc);
    router.get('/order-history', GetOrderHistory);
    router.get('/order-history/:id', GetDetailHistory);
    router.get('/review/:id', GetReviewPage);
    router.post('/review-product/:id', PostReviewProduct);
    router.post('/My-Account/change-password', PostChangePassword);
    router.post('/cancel-order/:id', PostCancelOrder);

    //Payment for client
    router.post('/place-order', PostPlaceOrder);
    // Wrap async handler to satisfy TypeScript overloads and ensure errors are passed to next()
    router.post('/api/paypal/create-order', (req: Request, res: Response, next) => {
        // call the async controller and forward errors to express error handler
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve(createPaypalOrder(req, res)).catch(next);
    });
    //paypal url complete payment
    router.get('/paypal-success', PaypalSuccess);
    // Debug endpoint to test PayPal connectivity (returns PayPal SDK response). Remove/secure in production.
    router.get('/debug/paypal', (req: Request, res: Response, next) => {
        // call DebugPaypal async and forward errors to express
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve(DebugPaypal(req, res)).catch(next);
    });


    //admin routes
    router.get('/admin' ,getAdminPage);
    router.get('/admin/user', getAdminUserPage);
    router.get('/admin/order', getAdminOrderPage);
    router.get('/admin/product', getAdminProductPage);
    router.get('/admin/factory', GetPageFactory);
    router.get('/admin/target', GetPageTarget);
    router.get('/admin/revenue', GetRevenue);

    router.get('/admin/create-user', getCreateUserPage);
    router.post('/admin/handle-create-user', fileUploadMiddleware('avatar', 'images/avatars'), PostCreateUser);
    router.post('/admin/delete_user/:id', PostDelUser);
    router.get('/admin/view_user/:id', GetEditUser);
    router.post('/admin/create-user', fileUploadMiddleware('avatar', 'images/avatars'), PostUpdateUser);

    router.get('/admin/create-product', getAdminCreateProductPage);
    router.post('/admin/create-product', 
        FileUploadFields([
            { name: 'image', maxCount: 1 }, 
            { name: 'images', maxCount: 10 }
        ])
        , PostAdminCreateProduct);
    router.post('/admin/delete_product/:id', DelProduct);
    router.get('/admin/view_product/:id', GetEditProduct);
    router.post('/admin/view_product/:id', FileUploadFields([
            { name: 'image', maxCount: 1 }, 
            { name: 'images', maxCount: 10 }
        ])
        , PostEditProduct);

    router.get('/admin/view_order/:id', GetDetailOrder);
    router.post('/admin/UpdateOrderById/:id', PostUpdateOrderById);

    router.get('/admin/create-factory', GetPageCreateFactory);
    router.post('/admin/create-factory', PostCreateFactory);
    router.get('/admin/view_factory/:id', GetViewFactory);
    router.post('/admin/view_factory/:id', PostUpdateFactory);
    router.post('/admin/delete_factory/:id', PostDelFactory);

    router.get('/admin/create-target', GetPageCreateTarget);
    router.post('/admin/create-target', PostCreateTarget);
    router.get('/admin/view_target/:id', GetViewTarget);
    router.post('/admin/view_target/:id', PostUpdateTarget);
    router.post('/admin/delete_target/:id', PostDelTarget);

        router.get('/admin/review', GetReviewPageForAdmin);

    // Crypto Wallet Admin Routes
    router.get('/admin/crypto-wallet', getCryptoWalletPage);
    router.get('/admin/crypto-wallet/export', exportCryptoTransactions);
    router.get('/admin/crypto-wallet/transaction/:orderId', getTransactionDetails);
    
    // Crypto Wallet Management Routes
    router.get('/admin/crypto-wallet/management', getWalletManagementPage);
    router.post('/admin/crypto-wallet/management/add', addNewWallet);
    router.post('/admin/crypto-wallet/management/switch', switchActiveWallet);
    router.post('/admin/crypto-wallet/management/delete', deleteWallet);
    router.get('/admin/crypto-wallet/management/details/:walletId', getWalletDetails);

    // Cryptocurrency Management Routes
    router.get('/admin/cryptocurrency', getCryptocurrencyManagementPage);
    router.get('/admin/cryptocurrency/edit/:id', getEditPage);
    router.post('/admin/cryptocurrency/add', addCryptocurrency);
    router.post('/admin/cryptocurrency/activate', setActiveCryptocurrency);
    router.post('/admin/cryptocurrency/update', updateCryptocurrency);
    router.post('/admin/cryptocurrency/delete', deleteCryptocurrency);
    router.get('/api/cryptocurrency/active', getActiveCryptocurrency);
    router.get('/api/cryptocurrency/:cryptoId', getCryptocurrencyDetails);

    

     // Use the router

    // Crypto Wallet Admin Routes
    router.get('/admin/crypto-wallet', getCryptoWalletPage);
    router.get('/admin/crypto-wallet/export', exportCryptoTransactions);
    router.get('/admin/crypto-wallet/transaction/:orderId', getTransactionDetails);

    

     // Use the router

    

     // Use the router





    app.use('/',isAdmin , router);
    // Handle 404 errors
    app.use((req: Request, res: Response) => {
        res.status(404).render('status/404NotFound.ejs');
    });


}
export default webroutes;




