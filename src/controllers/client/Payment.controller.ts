import { Request, Response } from "express";
import { UserRole } from "types/index.dt";
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
        // Don't create order here - only create after payment success
        // For PayPal: order created in PaypalSuccess callback
        // For Crypto: order created after blockchain transaction
        // Just save order info to session
        
        if (req.session) {
            req.session.orderInfo = {
                receiverName,
                receiverPhone,
                receiverAddress,
                receiverEmail,
                receiverNote,
                paymentMethod,
                ListIdDetailOrder: ListIdDetailOrder
            };
            console.log('💾 Order info saved to session, ready for payment processing');
        }

        // If the chosen payment method is an immediate on-site method (COD/BANK/TRANSFER)
        // create the order on the server now and redirect to the thank-you page so
        // the browser doesn't end up showing raw JSON.
        const immediateMethods = ['COD', 'BANK', 'TRANSFER'];
        if (immediateMethods.includes(String(paymentMethod))) {
            try {
                // Save order immediately (no external payment required)
                const Target = await GetAllTargetForClient();
                const Factory = await GetAllFactoryForClient();

                const orderResult = await PlaceOrder(user, {
                    receiverName: receiverName || '',
                    receiverPhone: receiverPhone || '',
                    receiverAddress: receiverAddress || '',
                    receiverEmail: receiverEmail || null,
                    receiverNote: receiverNote || null,
                    paymentMethod: paymentMethod,
                    paymentRef: null,
                    paymentStatus: 'PENDING',
                    ListIdCartDetail: ListIdDetailOrder
                });

                // Clear session orderInfo now that we've created the order
                if (req.session) delete req.session.orderInfo;

                const CartUserId = await FindCartForUserId(user.id) ?? null;
                const UserQuantityCart = { ...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };

                // Render thanks page (status Success if orderResult truthy)
                const resultStatus = orderResult ? 'Success' : 'Failed';
                return res.render('client/product/thanksOrder.ejs', {
                    status: resultStatus,
                    totalVND: Number(req.body.totalPrice) || 0,
                    user: UserQuantityCart,
                    targets: Target,
                    factories: Factory
                });
            } catch (err) {
                console.error('Error creating immediate order:', err);
                return res.render('status/500.ejs');
            }
        }

        // Return success for client-side flows (PayPal/Crypto) - client will handle next steps
        return res.json({
            success: true,
            message: 'Order info saved, ready for payment',
            paymentMethod: paymentMethod
        });
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
            console.error('❌ [PAYPAL] Missing PayPal environment variables:', missing.join(', '));
            return res.status(500).json({ error: 'Tạo đơn PayPal thất bại', message: `Missing environment variables: ${missing.join(', ')}` });
        }

        // Log credentials info (without values) for debugging
        console.log('✅ [PAYPAL] PAYPAL_CLIENT_ID length:', process.env.PAYPAL_CLIENT_ID?.length || 0);
        console.log('✅ [PAYPAL] PAYPAL_CLIENT_SECRET length:', process.env.PAYPAL_CLIENT_SECRET?.length || 0);

        // Lấy tổng tiền từ form hoặc session/cart
        console.log('📥 [PAYPAL] req.body:', req.body);
        // Ensure totalPrice is parsed even if it contains thousand separators or is a string
        const rawTotal = req.body.totalPrice;
        const parsedTotal = rawTotal == null ? 0 : Number(String(rawTotal).replace(/[^0-9.-]+/g, ''));
        const totalVND = Number.isFinite(parsedTotal) ? parsedTotal : 0; // hoặc lấy từ DB/cart
        console.log('💰 [PAYPAL] Total VND:', totalVND);
        
        const totalUSD = convertVNDToUSD(totalVND);
        console.log('💵 [PAYPAL] Total USD:', totalUSD);
        
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
        console.log('📦 [PAYPAL] ListIdDetailOrder:', ListIdDetailOrder);
        
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
            console.log('💾 [PAYPAL] Order info saved to session');
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
        console.log('📝 [PAYPAL] Request body:', JSON.stringify(paypalRequestBody, null, 2));
        request.requestBody(paypalRequestBody);

        console.log('🚀 [PAYPAL] Executing PayPal order creation...');
        const order = await client.execute(request);
        console.log('📨 [PAYPAL] PayPal response received');
        console.log('📨 [PAYPAL] Full response:', JSON.stringify(order, null, 2));
        
        const approvalUrl = order?.result?.links?.find((link: { rel: string; href: string }) => link.rel === 'approve')?.href
            || order?.result?.links?.find((link: { rel: string; href: string }) => link.rel === 'approval_url')?.href
            || null;
        console.log('🔗 [PAYPAL] Approval URL:', approvalUrl);
        
        if (!approvalUrl) {
            // If no approval URL, return details to help debugging
            console.error('❌ [PAYPAL] No approval URL found in response');
            console.error('❌ [PAYPAL] Response links:', order?.result?.links);
            return res.status(500).json({ error: 'No approval URL returned by PayPal', paypalResult: order?.result });
        }

        console.log('✅ [PAYPAL] Order created successfully:', order?.result?.id);
        return res.json({ approvalUrl, orderId: order?.result?.id });
    } catch (err: any) {
        console.error('❌ [PAYPAL] Error creating PayPal order');
        console.error('❌ [PAYPAL] Error message:', err?.message || String(err));
        console.error('❌ [PAYPAL] Error stack:', err?.stack);
        console.error('❌ [PAYPAL] Full error object:', err);
        
        // Try to extract more details from PayPal API error
        if (err?.statusCode) {
            console.error('❌ [PAYPAL] HTTP Status Code:', err.statusCode);
        }
        if (err?.headers) {
            console.error('❌ [PAYPAL] Response headers:', err.headers);
        }
        
        // Return helpful error info for debugging (avoid leaking secrets in production)
        return res.status(500).json({ 
            error: 'Tạo đơn PayPal thất bại', 
            message: err?.message || String(err),
            statusCode: err?.statusCode,
            details: process.env.NODE_ENV === 'development' ? err : undefined
        });
    }
};

// Controller cho route paypal-success
const PaypalSuccess = async (req: Request, res: Response) => {
    const user = req?.user as UserRole;
    const Target = await GetAllTargetForClient();
    const Factory = await GetAllFactoryForClient(); 
    const { orderInfo } = req?.session;
    console.log('✅ [PAYPAL] PayPal Success callback - Query parameters:', req.query);
    console.log('✅ [PAYPAL] Order info from session:', orderInfo ? 'Found' : 'Not found');
    
    if(!user) {
        console.warn('⚠️ [PAYPAL] No user in session, redirecting to login');
        return res.redirect('/login');
    }
    
    // Handle both PayPal and Crypto payments
    if (orderInfo) {
        // Xử lý thông tin đơn hàng ở đây - for PayPal
        // Verify PayPal order status before placing the order on our side
        try {
            const token = String(req.query.token || req.query.token || '');
            console.log('🔍 [PAYPAL] Token:', token ? `${token.substring(0, 20)}...` : 'EMPTY');
            
            let paypalOrder: any = null;
            if (token) {
                try {
                    console.log('📡 [PAYPAL] Fetching PayPal order details...');
                    const getRequest = new paypal.orders.OrdersGetRequest(token);
                    const getResp = await client.execute(getRequest);
                    paypalOrder = getResp?.result;
                    console.log('✅ [PAYPAL] PayPal order fetched, status:', paypalOrder?.status);
                    console.log('✅ [PAYPAL] Full order details:', JSON.stringify(paypalOrder, null, 2));
                } catch (err) {
                    console.warn('⚠️ [PAYPAL] Could not fetch PayPal order with token, will attempt capture if possible:', err instanceof Error ? err.message : err);
                }
            }

            // If PayPal order exists and is APPROVED or COMPLETED, we can proceed.
            // Otherwise, attempt to capture the order to finalize payment.
            let paymentRef = '';
            let paymentStatus = 'PENDING';
            let isPaymentSuccessful = false;
            
            if (paypalOrder && (paypalOrder.status === 'COMPLETED' || paypalOrder.status === 'APPROVED')) {
                paymentRef = `PayPalOrder:${paypalOrder.id}`;
                paymentStatus = 'PAYMENT_PAID';
                isPaymentSuccessful = true;
                console.log('✅ [PAYPAL] Order already APPROVED/COMPLETED');
            } else if (token) {
                try {
                    console.log('💳 [PAYPAL] Attempting to capture PayPal order...');
                    const captureReq = new paypal.orders.OrdersCaptureRequest(token);
                    // typings require a RequestData but PayPal SDK allows an empty body for capture; cast to any to avoid TS error
                    (captureReq as any).requestBody({});
                    const captureResp = await client.execute(captureReq);
                    console.log('✅ [PAYPAL] Capture response status:', captureResp?.result?.status);
                    console.log('✅ [PAYPAL] Capture response:', JSON.stringify(captureResp?.result, null, 2));
                    
                    if (captureResp?.result?.status === 'COMPLETED') {
                        paymentRef = `PayPalCapture:${captureResp?.result?.id || token}`;
                        paymentStatus = 'PAYMENT_PAID';
                        isPaymentSuccessful = true;
                    } else {
                        console.error('❌ [PAYPAL] Capture did not complete, status:', captureResp?.result?.status);
                        paymentRef = `PayPalCapture:${captureResp?.result?.id || token}`;
                        paymentStatus = 'PENDING';
                        isPaymentSuccessful = false;
                    }
                } catch (capErr) {
                    console.error('❌ [PAYPAL] Error capturing PayPal order:', capErr instanceof Error ? capErr.message : capErr);
                    // PAYMENT FAILED - don't create order
                    paymentRef = `TokenPaypal:${token}`;
                    paymentStatus = 'FAILED';
                    isPaymentSuccessful = false;
                }
            } else {
                console.error('❌ [PAYPAL] No token provided and no PayPal order - payment failed');
                isPaymentSuccessful = false;
                paymentStatus = 'FAILED';
            }

            console.log('🔖 [PAYPAL] Payment Status:', paymentStatus, 'IsSuccessful:', isPaymentSuccessful);
            
            // ONLY CREATE ORDER IF PAYMENT WAS SUCCESSFUL
            if (isPaymentSuccessful && paymentStatus === 'PAYMENT_PAID') {
                const orderResult = await PlaceOrder(user, {
                    receiverName: orderInfo.receiverName || '',
                    receiverPhone: orderInfo.receiverPhone || '',
                    receiverAddress: orderInfo.receiverAddress || '',
                    receiverEmail: orderInfo.receiverEmail || null,
                    receiverNote: orderInfo.receiverNote || null,
                    paymentMethod: orderInfo.paymentMethod || '',
                    paymentRef: paymentRef,
                    paymentStatus: paymentStatus,
                    ListIdCartDetail: orderInfo.ListIdDetailOrder
                });
                console.log('📋 [PAYPAL] Order created:', orderResult ? 'Success' : 'Failed');
            } else {
                console.error('❌ [PAYPAL] Payment not successful - order NOT created. Status:', paymentStatus);
            }
            
        const CartUserId = await FindCartForUserId(user.id) ?? null;
        const UserQuantityCart = {...user, quantityCart: CartUserId ? CartUserId.quantity : 0 };
        
        // Clear session after use
        if (req.session) {
            delete req.session.orderInfo;
        }
        
        const resultStatus = isPaymentSuccessful ? 'Success' : 'Failed';
        console.log(`✅ [PAYPAL] PayPal flow complete, rendering page with status: ${resultStatus}`);
        return res.render('client/product/thanksOrder.ejs', { 
            status: resultStatus, 
            totalVND: orderInfo.totalVND, 
            user: UserQuantityCart, 
            targets: Target, 
            factories: Factory 
        });

        } catch (err) {
            console.error('❌ [PAYPAL] Error processing PayPal success callback:', err instanceof Error ? err.message : err);
            console.error('❌ [PAYPAL] Full error:', err);
            
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
        console.log('ℹ️ [PAYPAL] No order info in session - likely crypto payment');
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
        console.log('🔧 [PAYPAL-DEBUG] Starting debug check...');
        
        const missing: string[] = [];
        if (!process.env.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
        if (!process.env.PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
        if (!process.env.URL) missing.push('URL');
        
        if (missing.length) {
            console.error('🔧 [PAYPAL-DEBUG] Missing env variables:', missing.join(', '));
            return res.status(500).json({ ok: false, error: 'Missing env', missing });
        }

        console.log('🔧 [PAYPAL-DEBUG] Credentials found:');
        console.log('  - PAYPAL_CLIENT_ID length:', process.env.PAYPAL_CLIENT_ID?.length);
        console.log('  - PAYPAL_CLIENT_SECRET length:', process.env.PAYPAL_CLIENT_SECRET?.length);
        console.log('  - URL:', process.env.URL);

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
        console.log('🔧 [PAYPAL-DEBUG] Request body:', JSON.stringify(body, null, 2));
        
        request.requestBody(body);
        console.log('🔧 [PAYPAL-DEBUG] Executing request...');
        
        const order = await client.execute(request);
        
        console.log('🔧 [PAYPAL-DEBUG] Success! Response:', JSON.stringify(order?.result, null, 2));
        return res.json({ 
            ok: true, 
            result: order?.result,
            message: 'PayPal credentials are valid and API is accessible'
        });
    } catch (err: any) {
        console.error('🔧 [PAYPAL-DEBUG] Error:', err?.message || String(err));
        console.error('🔧 [PAYPAL-DEBUG] Error stack:', err?.stack);
        console.error('🔧 [PAYPAL-DEBUG] Status code:', err?.statusCode);
        console.error('🔧 [PAYPAL-DEBUG] Full error:', err);
        
        return res.status(500).json({ 
            ok: false, 
            error: err?.message || String(err),
            statusCode: err?.statusCode,
            hint: 'Check PayPal credentials and ensure they match your sandbox/live environment',
            details: process.env.NODE_ENV === 'development' ? {
                message: err?.message,
                statusCode: err?.statusCode,
                httpStatusCode: err?.httpStatusCode
            } : undefined
        });
    }
};

export { DebugPaypal };