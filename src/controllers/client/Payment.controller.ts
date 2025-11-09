import { Request, Response } from "express";
import { UserRole } from "src/types/index.dt";
import * as paypal from '@paypal/checkout-server-sdk';
import 'dotenv/config';
import { client } from "config/paypal";
import { FindCartForUserId, PlaceOrder } from "services/client/user.service";
import { GetAllFactoryForClient, GetAllTargetForClient } from "services/client/item.service";

const PostPlaceOrder = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    const { receiverName, receiverPhone, receiverAddress, receiverEmail, receiverNote, paymentMethod, ListIdDetailCartPay } = req?.body;
    const ListIdDetailOrder: { id: number, productVariantId: number }[] = ListIdDetailCartPay.map((item: { id: number, productVariantId: number }) =>{
        return { id: Number(item.id), productVariantId: Number(item.productVariantId) };
    }) ?? [];
    if (!user) {
        return res.redirect('/login');
    } else {
        // Logic to place the order
        const orderResult = await PlaceOrder(user, {
            receiverName,
            receiverPhone,
            receiverAddress,
            receiverEmail,
            receiverNote,
            paymentMethod,
            ListIdCartDetail: ListIdDetailOrder
        });
        if (orderResult) {
            const CartUserId = await FindCartForUserId(user.id) ?? null;
            const UserQuantityCart = {...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };
            return res.render('client/product/thanksOrder.ejs', { status: 'Pending', user: UserQuantityCart, targets: await GetAllTargetForClient(), factories: await GetAllFactoryForClient() });
        } else {
            console.error('Error placing order:', orderResult);
            return res.render('status/500.ejs');
        }
    }
};
//config PayPal

const convertVNDToUSD = (amountVND: number): string => {
    const VND_TO_USD = 25000; // Tỉ giá mẫu
    // Kiểm tra đầu vào hợp lệ
    if (!amountVND || isNaN(amountVND) || amountVND <= 0) return "0.01";
    const usd = amountVND / VND_TO_USD;
    // PayPal không cho phép giá trị 0 hoặc nhỏ hơn 0
    return usd < 0.01 ? "0.01" : usd.toFixed(2);
};

const createPaypalOrder = async (req: Request, res: Response) => {
    try {
        // Lấy tổng tiền từ form hoặc session/cart
        console.log('req.body:', req.body);
        const totalVND = Number(req.body.totalPrice); // hoặc lấy từ DB/cart
        const totalUSD = convertVNDToUSD(totalVND);
        const receiverName = req.body.receiverName || 'Khách hàng';
        const { receiverPhone, receiverAddress, receiverNote, paymentMethod, receiverEmail, ListIdDetailCartPay } = req?.body;
        const ListIdDetailOrder: { 
            id: number, 
            productVariantId: number 
        }[] = ListIdDetailCartPay.map((item: { id: number, productVariantId: number }) => {
            return { 
                id: Number(item.id), 
                productVariantId: Number(item.productVariantId) 
            };
        }) ?? [];
        if (req.session) {
            req.session.orderInfo = {
                receiverName,
                receiverPhone,
                receiverAddress,
                receiverNote,
                paymentMethod,
                receiverEmail,
                totalVND,
                ListIdDetailOrder: ListIdDetailOrder
            };
        };
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        const paypalRequestBody = {
            intent: "CAPTURE" as "CAPTURE" | "AUTHORIZE", // Hoặc "AUTHORIZE"
            purchase_units: [{
                amount: { currency_code: 'USD', value: totalUSD },
                description: `Đơn hàng của ${receiverName}`,
                // Thêm thông tin sản phẩm vào đây nếu cần
            }],
            application_context: {
                return_url: process.env.URL + '/paypal-success',
                cancel_url: process.env.URL + '/checkout',
            }
        };
        console.log('PayPal request body:', JSON.stringify(paypalRequestBody, null, 2));
        request.requestBody(paypalRequestBody);

        const order = await client.execute(request);
        const approvalUrl = order.result.links.find((link: { rel: string; href: string }) => link.rel === 'approve')?.href;
        console.log('PayPal approval URL:', approvalUrl);
        
        res.json({ approvalUrl });
    } catch (err) {
        res.status(500).json({ error: 'Tạo đơn PayPal thất bại' });
    }
};

// Controller cho route paypal-success
const PaypalSuccess = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    const { orderInfo } = req?.session;
    console.log('Query parameters:', req.query, orderInfo);
    if(!user) return res.redirect('/login');
    if (orderInfo) {
        // Xử lý thông tin đơn hàng ở đây
        const orderResult = await PlaceOrder(user, {
            receiverName: orderInfo.receiverName || '',
            receiverPhone: orderInfo.receiverPhone || '',
            receiverAddress: orderInfo.receiverAddress || '',
            receiverEmail: orderInfo.receiverEmail || null,
            receiverNote: orderInfo.receiverNote || null,
            paymentMethod: orderInfo.paymentMethod || '',
            paymentRef: `TokenPaypal:${req.query.token}, PayerID:${req.query.PayerID}`,
            paymentStatus: 'PAYMENT_PAID',
            ListIdCartDetail: orderInfo.ListIdDetailOrder
        });
        const CartUserId = await FindCartForUserId(user.id) ?? null;
        const UserQuantityCart = {...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };
        return res.render('client/product/thanksOrder.ejs', { status: 'Success', totalVND: orderInfo.totalVND, user: UserQuantityCart, targets: Target, factories: Factory });

    } else {
        return res.render('client/product/thanksOrder.ejs', { status: 'Failed', totalVND: 0, user: user, targets: Target, factories: Factory });
    }
};


export { PostPlaceOrder, createPaypalOrder, PaypalSuccess }