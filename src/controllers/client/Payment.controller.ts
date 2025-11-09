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
    const rawListForPost = Array.isArray(ListIdDetailCartPay) ? ListIdDetailCartPay : [];
    const ListIdDetailOrder: { id: number, productVariantId: number }[] = rawListForPost.map((item: { id: any, productVariantId: any }) =>{
        return { id: Number(item.id), productVariantId: Number(item.productVariantId) };
    });
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
        // Quick env validation to provide helpful error messages
        const missing: string[] = [];
        if (!process.env.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
        if (!process.env.PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
        if (!process.env.URL) missing.push('URL');
        if (missing.length) {
            console.error('Missing PayPal environment variables:', missing.join(', '));
            return res.status(500).json({ error: 'Tạo đơn PayPal thất bại', message: `Missing environment variables: ${missing.join(', ')}` });
        }

        // Lấy tổng tiền từ form hoặc session/cart
        console.log('req.body:', req.body);
    // Ensure totalPrice is parsed even if it contains thousand separators or is a string
    const rawTotal = req.body.totalPrice;
    const parsedTotal = rawTotal == null ? 0 : Number(String(rawTotal).replace(/[^0-9.-]+/g, ''));
    const totalVND = Number.isFinite(parsedTotal) ? parsedTotal : 0; // hoặc lấy từ DB/cart
        const totalUSD = convertVNDToUSD(totalVND);
        const receiverName = req.body.receiverName || 'Khách hàng';
        const { receiverPhone, receiverAddress, receiverNote, paymentMethod, receiverEmail, ListIdDetailCartPay } = req?.body;
        const rawList = Array.isArray(ListIdDetailCartPay) ? ListIdDetailCartPay : [];
        const ListIdDetailOrder: { 
            id: number, 
            productVariantId: number 
        }[] = rawList.map((item: { id: any, productVariantId: any }) => {
            return { 
                id: Number(item.id), 
                productVariantId: Number(item.productVariantId) 
            };
        });
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
        console.log('PayPal raw response:', JSON.stringify(order, null, 2));
        const approvalUrl = order?.result?.links?.find((link: { rel: string; href: string }) => link.rel === 'approve')?.href
            || order?.result?.links?.find((link: { rel: string; href: string }) => link.rel === 'approval_url')?.href
            || null;
        console.log('PayPal approval URL:', approvalUrl);
        if (!approvalUrl) {
            // If no approval URL, return details to help debugging
            return res.status(500).json({ error: 'No approval URL returned by PayPal', paypalResult: order?.result });
        }

        return res.json({ approvalUrl, orderId: order?.result?.id });
    } catch (err: any) {
        console.error('Error creating PayPal order:', err?.stack || err);
        // Return helpful error info for debugging (avoid leaking secrets in production)
        return res.status(500).json({ error: 'Tạo đơn PayPal thất bại', message: err?.message || String(err) });
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
    
    // Handle both PayPal and Crypto payments
    if (orderInfo) {
        // Xử lý thông tin đơn hàng ở đây - for PayPal
        // Verify PayPal order status before placing the order on our side
        try {
            const token = String(req.query.token || req.query.token || '');
            let paypalOrder: any = null;
            if (token) {
                try {
                    const getRequest = new paypal.orders.OrdersGetRequest(token);
                    const getResp = await client.execute(getRequest);
                    paypalOrder = getResp?.result;
                    console.log('PayPal order fetched at return:', JSON.stringify(paypalOrder, null, 2));
                } catch (err) {
                    console.warn('Could not fetch PayPal order with token, will attempt capture if possible', err);
                }
            }

            // If PayPal order exists and is APPROVED or COMPLETED, we can proceed.
            // Otherwise, attempt to capture the order to finalize payment.
            let paymentRef = '';
            let paymentStatus = 'PENDING';
            if (paypalOrder && (paypalOrder.status === 'COMPLETED' || paypalOrder.status === 'APPROVED')) {
                paymentRef = `PayPalOrder:${paypalOrder.id}`;
                paymentStatus = 'PAYMENT_PAID';
            } else if (token) {
                try {
                    const captureReq = new paypal.orders.OrdersCaptureRequest(token);
                    // typings require a RequestData but PayPal SDK allows an empty body for capture; cast to any to avoid TS error
                    (captureReq as any).requestBody({});
                    const captureResp = await client.execute(captureReq);
                    console.log('PayPal capture response:', JSON.stringify(captureResp?.result, null, 2));
                    paymentRef = `PayPalCapture:${captureResp?.result?.id || token}`;
                    paymentStatus = captureResp?.result?.status === 'COMPLETED' ? 'PAYMENT_PAID' : 'PENDING';
                } catch (capErr) {
                    console.error('Error capturing PayPal order:', capErr);
                    // proceed but mark payment as pending
                    paymentRef = `TokenPaypal:${token}`;
                    paymentStatus = 'PENDING';
                }
            }

            const orderResult = await PlaceOrder(user, {
                receiverName: orderInfo.receiverName || '',
                receiverPhone: orderInfo.receiverPhone || '',
                receiverAddress: orderInfo.receiverAddress || '',
                receiverEmail: orderInfo.receiverEmail || null,
                receiverNote: orderInfo.receiverNote || null,
                paymentMethod: orderInfo.paymentMethod || '',
                paymentRef: paymentRef || `TokenPaypal:${req.query.token}, PayerID:${req.query.PayerID}`,
                paymentStatus: paymentStatus,
                ListIdCartDetail: orderInfo.ListIdDetailOrder
            });

        const CartUserId = await FindCartForUserId(user.id) ?? null;
        const UserQuantityCart = {...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };
        
        // Clear session after use
        if (req.session) {
            delete req.session.orderInfo;
        }
        
        return res.render('client/product/thanksOrder.ejs', { 
            status: 'Success', 
            totalVND: orderInfo.totalVND, 
            user: UserQuantityCart, 
            targets: Target, 
            factories: Factory 
        });

        } catch (err) {
            console.error('Error processing PayPal success callback:', err);
            // Render a failure page or show pending status
            const CartUserId = await FindCartForUserId(user.id) ?? null;
            const UserQuantityCart = {...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };
            return res.render('client/product/thanksOrder.ejs', { 
                status: 'Pending', 
                totalVND: orderInfo.totalVND, 
                user: UserQuantityCart, 
                targets: Target, 
                factories: Factory 
            });
        }

    } else {
        // For crypto payments - order already created on client side
        // Just show success page with Pending status
        const CartUserId = await FindCartForUserId(user.id) ?? null;
        const UserQuantityCart = {...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };
        
        return res.render('client/product/thanksOrder.ejs', { 
            status: 'Pending', 
            totalVND: 0, 
            user: UserQuantityCart, 
            targets: Target, 
            factories: Factory 
        });
    }
};


export { PostPlaceOrder, createPaypalOrder, PaypalSuccess }

// Debug endpoint to test PayPal credentials/connectivity
const DebugPaypal = async (req: Request, res: Response) => {
    try {
        const missing: string[] = [];
        if (!process.env.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
        if (!process.env.PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
        if (!process.env.URL) missing.push('URL');
        if (missing.length) {
            return res.status(500).json({ ok: false, error: 'Missing env', missing });
        }

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        const body = {
            intent: 'CAPTURE',
            purchase_units: [{ amount: { currency_code: 'USD', value: '0.01' }, description: 'Debug order' }],
            application_context: {
                return_url: process.env.URL + '/paypal-success',
                cancel_url: process.env.URL + '/checkout'
            }
        } as any;
        request.requestBody(body);
        const order = await client.execute(request);
        return res.json({ ok: true, result: order?.result });
    } catch (err: any) {
        console.error('Debug PayPal error:', err?.stack || err);
        return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
};

export { DebugPaypal };