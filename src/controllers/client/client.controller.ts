import { Request, Response } from "express";
import { GetAllFactoryForClient, GetAllTargetForClient, GetNewProducts, GetProductByIdForClient, GetRecommendedProducts } from "services/client/item.service";
import { UserRole } from "types/index.dt";
import 'dotenv/config';
import { AddProductToCart, CancelOrderById, ChangeUserPassword, DelProductFromCart, FindCartForUserId, GetDetailHistoryById, GetOrderHistoryForUser, GetProductByCartDetail, GetReviewedFormUser, PostClientToUpdateAcc, PostReviewProductToHistory, UpdateQuantityBeforeCheckout } from "services/client/user.service";
import { GetCountFactoryProduct, GetProductWithFilter } from "services/client/products.filter";
import { PAGE_SIZE_REVIEW } from "config/constant";
import { getActiveCryptoInfo, convertVndToCrypto } from 'services/crypto/crypto.service';


const GetProductPage = async (req: Request, res: Response) => {
    const { id } = req.params;
    const Page = req.query?.Page as string || '0';
    const CurrentPage = Number(Page) >= 0 ? Number(Page) : 0;
    const DetailProduct = await GetProductByIdForClient(Number(id));
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient();
    let QuantityProductFactory = [];
    if(Factory.length > 0){
        for(const factory of Factory){
            const count = await GetCountFactoryProduct(factory.id);
            QuantityProductFactory.push({ ...factory, quantityProduct: count });
        };
    };
    const RecommendedProducts = await GetRecommendedProducts(Number(id), CurrentPage, PAGE_SIZE_REVIEW);
    const StartTotal = RecommendedProducts.length > 0 ? RecommendedProducts.reduce((acc, item) => acc + item.rating, 0) : 0;
    const AverageRating = RecommendedProducts.length > 0 ? (StartTotal / RecommendedProducts.length) : 0; 
    const NewProducts = await GetNewProducts(8);
    // attach crypto price for product detail
    try {
        const crypto = await getActiveCryptoInfo();
        if (DetailProduct) {
            const basePrice = Number(DetailProduct.price || 0);
            const firstVariantMore = Number(DetailProduct.productVariants && DetailProduct.productVariants[0] ? (DetailProduct.productVariants[0].priceMore || 0) : 0);
            const displayVnd = basePrice + firstVariantMore;
            const productCrypto = convertVndToCrypto(displayVnd, crypto.priceVND, crypto.decimals, 8);
            return res.render('client/product/detail.ejs', { product: DetailProduct, targets: Target, factories: Factory, quantityProductFactory: QuantityProductFactory, recommendedProducts: RecommendedProducts, averageRating: AverageRating, newProducts: NewProducts, cryptoActive: crypto, productCrypto });
        }
        return res.render('client/product/detail.ejs', { product: DetailProduct, targets: Target, factories: Factory, quantityProductFactory: QuantityProductFactory, recommendedProducts: RecommendedProducts, averageRating: AverageRating, newProducts: NewProducts });
    } catch (e) {
        console.warn('Unable to fetch crypto info for product detail', e);
        return res.render('client/product/detail.ejs', { product: DetailProduct, targets: Target, factories: Factory, quantityProductFactory: QuantityProductFactory, recommendedProducts: RecommendedProducts, averageRating: AverageRating, newProducts: NewProducts });
    }
};

const PostAddProductToCart = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity, productVariantId } = req.body;
    const user = req?.user as UserRole;
    const redirectUrl = req.get('Referer') || '/';
    if (user) {
        const pvId = (productVariantId === undefined || productVariantId === null || productVariantId === '') ? undefined : Number(productVariantId);
        await AddProductToCart(user, quantity ? Number(quantity) : 1, Number(id), pvId); // pvId may be undefined
        return res.redirect(redirectUrl);
    } else {
        return res.redirect('/login');
    };
};

const GetCartPage = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    }
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    // Assuming you have a service to get the cart details
    const detailCart = await GetProductByCartDetail(user.id);
    if (detailCart && detailCart.length > 0) {
        const TotalPrice = detailCart.reduce((acc, item) => acc + (item.price * (item.quantityProduct ? item.quantityProduct : 0)), 0);
        
        console.log(detailCart, TotalPrice);
        // Get active crypto info and convert total
        try {
            const crypto = await getActiveCryptoInfo();
            // Attach cryptoPrice for each item (per item total in crypto)
            const cartWithCrypto = detailCart.map((item: any) => {
                const itemTotalVND = Number(item.price || 0) * Number(item.quantityProduct || 0);
                const cryptoAmount = convertVndToCrypto(itemTotalVND, crypto.priceVND, crypto.decimals, 8);
                return { ...item, cryptoAmount }; 
            });
            const cryptoTotal = convertVndToCrypto(TotalPrice, crypto.priceVND, crypto.decimals, 8);
            return res.render('client/product/cart.ejs', { cartDetails: cartWithCrypto, TotalPrice: TotalPrice, cryptoTotal, cryptoActive: crypto, targets: Target, factories: Factory });
        } catch (e) {
            console.warn('Could not compute crypto price for cart', e);
            return res.render('client/product/cart.ejs', { cartDetails: detailCart, TotalPrice: TotalPrice, targets: Target, factories: Factory, cryptoActive: null });
        }
    }
    return res.render('client/product/cart.ejs', { cartDetails: [], TotalPrice: 0, targets: Target, factories: Factory, cryptoActive: null });

    // const cartDetails = await GetCartDetailsForUser(user.id); // Implement this service function

};

const PostDelProductInCart = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req?.user as UserRole;
    if (user) {
        const DelProduct = await DelProductFromCart(user, Number(id));
        if (DelProduct) {
            // Xóa sản phẩm thành công
            return res.redirect('/cart');
        } else {
            return res.render('status/500.ejs');
        }

    } else {
        return res.redirect('/login');
    }
};

const GetPageCheckOut = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    }
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    return res.render('client/product/checkout.ejs', { cartDetails: [], TotalPrice: 0, targets: Target, factories: Factory });
};

const PostAddQuantityToCart = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    } else {
        console.log(req.body);
        // Nhận thêm variantId từ form
        const rawCart: Array<{ id: number, quantity: number, selectedItems: boolean, variantId: number }> = req.body?.cartDetails ?? [];
        const CurrentCart: Array<{ id: number, quantity: number, selectedItems: boolean, variantId: number }> = rawCart.map(item => ({
            id: Number(item.id),
            quantity: Number(item.quantity),
            selectedItems: item.selectedItems ? true : false,
            variantId: item.variantId, 
        }));
        const result = await UpdateQuantityBeforeCheckout(user, CurrentCart);
        if (result) {
            const detailCart = await GetProductByCartDetail(user.id);
            const CartUserId = await FindCartForUserId(user.id) ?? null;
            const UserQuantityCart = {...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };
            if (detailCart && detailCart.length > 0) {
                // Tính tổng đúng: (base price + priceMore của variant) * quantity
                const TotalPrice = detailCart.reduce((acc, item) => {
                    const cartItem = CurrentCart.find(c => c.id === item.id && c.selectedItems === true);
                    if (cartItem) {
                        let priceMore = 0;
                        let basePrice = 0;
                        if (item.product) {
                            basePrice = Number(item.product.price) || 0;
                            if (item.product.productVariants && item.product.productVariants.length > 0 && cartItem.variantId) {
                                const selectedVariant = item.product.productVariants.find((v: { id: number; priceMore?: number | null }) => v.id == cartItem.variantId);
                                priceMore = selectedVariant && selectedVariant.priceMore ? Number(selectedVariant.priceMore) : 0;
                            }
                        }
                        const quantity = Number(cartItem.quantity) || 1;
                        return acc + ((basePrice + priceMore) * quantity);
                    }
                    return acc;
                }, 0);
                const CustomDetailCart = detailCart.map(item => {
                    const cartItem = CurrentCart.find(cartItem => cartItem.id === item.id);
                    const isSelected = !!(cartItem && cartItem.selectedItems);
                    // Trả ra luôn variantId đã chọn cho từng item
                    const selectedVariantId = cartItem ? cartItem.variantId : item.productVariantId;
                    return { ...item, isSelected, selectedVariantId };
                });
                return res.render('client/product/checkout.ejs', { cartDetails: CustomDetailCart, TotalPrice: TotalPrice, user: UserQuantityCart, targets: [], factories: [] });
            }
            return res.render('client/product/checkout.ejs', { cartDetails: [], TotalPrice: 0, user: UserQuantityCart, targets: [], factories: [] });
        } else {
            return res.render('status/500.ejs');
        }
    };
};

const GetPageMyAccount = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    }
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    return res.render('client/accountClient/managerAcc.ejs', { user, targets: Target, factories: Factory });
};

const PostClientUpdateAcc = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    };
    const { fullName, address, phone } = req.body;
    const file = req.file;
    const avatarFile = file ? file.filename : null;
    const result = await PostClientToUpdateAcc(user.id, { fullName, address, phone, avatar: avatarFile });
    if (!result) {
        return res.render('status/500.ejs');
    };
    return res.redirect('/My-Account');
};

const GetAllProductsforClient = async (req: Request, res: Response) => {
    const { Page, sort = '', factory = '', target = '', priceRange = '' } 
    = req.query as { 
        Page?: string, 
        sort: string, 
        factory: string, 
        target: string, 
        priceRange: string, 
    };
    let CurrentPage = Page ? Number(Page) : 0;
    if (CurrentPage < 0) CurrentPage = 0; 
    // const totalPages = await CountTotalProductPage(PAGE_SIZE_WITH_CLIENT);
    // const GetAllProduct = await GetAllProductforClient(CurrentPage, 9);
    const Factory = await GetAllFactoryForClient();
    const Target = await GetAllTargetForClient();
    // Lọc sản phẩm theo yêu cầu
    const productWithFilter = await GetProductWithFilter( CurrentPage, 9, factory, target, priceRange, sort );
    try {
        const crypto = await getActiveCryptoInfo();
        const productsWithCrypto = (productWithFilter.product || []).map((p: any) => {
            const base = Number(p.price || 0);
            const more = Number(p.productVariants && p.productVariants[0] ? (p.productVariants[0].priceMore || 0) : 0);
            const displayVnd = base + more;
            const cryptoAmount = convertVndToCrypto(displayVnd, crypto.priceVND, crypto.decimals, 8);
            return { ...p, cryptoAmount };
        });
        return res.render('client/product/products.ejs', { products: productsWithCrypto, currentPage: CurrentPage, totalPages: productWithFilter.totalPages, factories: Factory, targets: Target, cryptoActive: crypto });
    } catch (e) {
        console.warn('Unable to fetch crypto info for product list', e);
        return res.render('client/product/products.ejs', { products: productWithFilter.product, currentPage: CurrentPage, totalPages: productWithFilter.totalPages, factories: Factory, targets: Target });
    }
};

const GetOrderHistory = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    }
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    // Fetch order history for the user
    const orderHistory = await GetOrderHistoryForUser(user);
    if (!orderHistory) {
        return res.render('status/500.ejs');
    };
    const checkReviewed = await GetReviewedFormUser(0, user); // Lấy tất cả đánh giá của user
    // attach crypto info per order
    try {
        const crypto = await getActiveCryptoInfo();
        const ordersWithCrypto = (orderHistory || []).map((order: any) => {
            const cryptoTotal = convertVndToCrypto(Number(order.totalPrice || 0), crypto.priceVND, crypto.decimals, 8);
            // attach per-line crypto for orderDetails
            const details = (order.orderDetails || []).map((item: any) => {
                const variantPriceMore = (item.productVariant && item.productVariant.priceMore) ? item.productVariant.priceMore : 0;
                const unitPrice = (item.product && item.product.price ? item.product.price : 0) + variantPriceMore;
                const lineVnd = unitPrice * (item.quantity || 0);
                const lineCrypto = convertVndToCrypto(Number(lineVnd || 0), crypto.priceVND, crypto.decimals, 8);
                return { ...item, lineCrypto };
            });
            return { ...order, cryptoTotal, orderDetails: details };
        });
        return res.render('client/accountClient/history.ejs', { orderHistory: ordersWithCrypto, checkReviewed, targets: Target, factories: Factory, cryptoActive: crypto });
    } catch (e) {
        console.warn('Could not attach crypto info to order history', e);
        return res.render('client/accountClient/history.ejs', { orderHistory: orderHistory, checkReviewed, targets: Target, factories: Factory });
    }
};

const GetDetailHistory = async (req: Request, res: Response) => {
    const IdHistory = req.params?.id;
    const user = req?.user as UserRole;
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    if (!user) {
        return res.redirect('/login');
    };
    const result = await GetDetailHistoryById(Number(IdHistory), user);
    if (!result) {
        return res.render('status/500.ejs');
    }
    // attach crypto info for detail view
    try {
        const crypto = await getActiveCryptoInfo();
        const details = (result.orderDetails || []).map((item: any) => {
            const variantPriceMore = (item.productVariant && item.productVariant.priceMore) ? item.productVariant.priceMore : 0;
            const unitPrice = (item.product && item.product.price ? item.product.price : 0) + variantPriceMore;
            const lineVnd = unitPrice * (item.quantity || 0);
            const lineCrypto = convertVndToCrypto(Number(lineVnd || 0), crypto.priceVND, crypto.decimals, 8);
            return { ...item, lineCrypto };
        });
        const cryptoTotal = convertVndToCrypto(Number(result.totalPrice || 0), crypto.priceVND, crypto.decimals, 8);
        const historyWithCrypto = { ...result, orderDetails: details, cryptoTotal };
        return res.render('client/accountClient/detailHistory.ejs', { history: historyWithCrypto, targets: Target, factories: Factory, cryptoActive: crypto });
    } catch (e) {
        console.warn('Could not attach crypto info to detail history', e);
        return res.render('client/accountClient/detailHistory.ejs', { history: result, targets: Target, factories: Factory });
    }
};

const GetReviewPage = async (req: Request, res: Response) => {
    const IdHistory = req.params?.id;
    const user = req?.user as UserRole;
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    if (!user) {
        return res.redirect('/login');
    };
    const result = await GetDetailHistoryById(Number(IdHistory), user);
    if (!result) {
        return res.render('status/500.ejs');
    };
    const checkReviewed = await GetReviewedFormUser(Number(IdHistory), user);
    return res.render('client/product/review.ejs', { history: result, checkReviewed, targets: Target, factories: Factory });
};

const PostReviewProduct = async (req: Request, res: Response) => {
    const IdHistory = req.params?.id ? Number(req.params.id) : 0;
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    };
    if (IdHistory === 0) {
        return res.render('status/500.ejs');
    };
    const { rating, content, productIds } = req.body;
    let RatingNumber = 0;
    if (!rating) {
        RatingNumber = 5; // Mặc định 5 sao nếu không chọn
    } else {
        RatingNumber = Number(rating);
    };
    const ProductIds = (Array.isArray(productIds) ? productIds.map((item) => {
            return { 
                productId: Number(item.ProductId),
                variantId: Number(item.VariantId)
            };
        }) : []
    ); //convert sang kiểu của

    const result = await PostReviewProductToHistory(IdHistory, user, RatingNumber, content, ProductIds);
    if (!result) {
        return res.render('status/500.ejs');
    }
    return res.redirect(`/review/${IdHistory}`);
};

const PostChangePassword = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
        return res.redirect('/My-Account');
    };
    const result = await ChangeUserPassword(user.id, currentPassword, newPassword);
    if (result === false) {
        // Sai mật khẩu hiện tại
        return res.render('client/accountClient/managerAcc.ejs', { user, targets: [], factories: [], passwordError: 'Mật khẩu hiện tại bạn nhập không đúng!' });
    }
    // Đổi thành công, hiển thị thông báo
    return res.render('client/accountClient/managerAcc.ejs', { user, targets: [], factories: [], passwordSuccess: 'Đổi mật khẩu thành công!' });
};

const PostCancelOrder = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    if (!user) {
        return res.redirect('/login');
    };
    const { id } = req.params;
    const IdToNumber = Number(id);
    if (isNaN(IdToNumber) || IdToNumber <= 0) {
        return res.render('status/500.ejs');
    };
    
    try {
        const result = await CancelOrderById(IdToNumber, user);
        if (!result) {
            // If AJAX request, return JSON
            if (req.headers['accept']?.includes('application/json')) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Hủy đơn hàng thất bại' 
                });
            }
            return res.render('status/500.ejs');
        };
        
        // If AJAX request, return JSON with success message
        if (req.headers['accept']?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Hủy đơn hàng và hoàn tiền thành công!',
                orderId: IdToNumber
            });
        }
        
        // Otherwise redirect as before
        return res.redirect(`/order-history/${IdToNumber}?refund=success`);
    } catch (error) {
        console.error('Error in PostCancelOrder:', error);
        if (req.headers['accept']?.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Lỗi hệ thống khi hủy đơn hàng' 
            });
        }
        return res.render('status/500.ejs');
    }
};

export {
    GetProductPage, PostAddProductToCart, GetCartPage,
    PostDelProductInCart, GetPageCheckOut, PostAddQuantityToCart,
    GetPageMyAccount, PostClientUpdateAcc, GetOrderHistory,
    GetDetailHistory, PostChangePassword, GetAllProductsforClient,
    GetReviewPage, PostReviewProduct, PostCancelOrder

};