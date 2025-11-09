import { Request, Response } from "express";
import { AddProductToCart } from "services/client/user.service";
import { UserRole } from "src/types/index.dt";
import 'dotenv/config';

const PostAddProductToCartAPI = async (req: Request, res: Response)=> {
    const { quantity, productVariantId, productId } = req.body;
    const user = req?.user as UserRole;
    const newSum = (req?.user?.quantityCart) ? ((req.user.quantityCart) + (quantity ? Number(quantity) : 1)) : (quantity ? Number(quantity) : 1);
    if (user) {
        // Normalize productVariantId: allow undefined when not provided
        const pvId = (productVariantId === undefined || productVariantId === null || productVariantId === '') ? undefined : Number(productVariantId);
        await AddProductToCart(user, quantity ? Number(quantity) : 1, Number(productId), pvId); // pvId may be undefined
        res.status(200).json({ message: 'Thêm sản phẩm vào giỏ hàng thành công', data: { quantityCart: newSum } });
    } else {
        res.status(401).json({ message: 'Chưa đăng nhập' , data: { quantityCart: 0 } });
    };
}

export { PostAddProductToCartAPI };