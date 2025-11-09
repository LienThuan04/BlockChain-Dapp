import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import "dotenv/config"; // Load environment variables from .env file

const checkValidJWT = (req: Request, res: Response, next: NextFunction) => {
    const path = req.path; // Lấy đường dẫn của request hiện tại
    const whitelistPaths = [ // Thêm các endpoint công khai khác để không cần check JWT vào đây nếu cần
        '/add-product-to-cart',
        '/login',
    ];
    const isWhitelisted = whitelistPaths.includes(path);
    console.log(`Request path: ${path}, isWhitelisted: ${isWhitelisted}`);
    if (isWhitelisted === true) {
        next(); // Nếu đường dẫn nằm trong whitelist, bỏ qua kiểm tra JWT
        return;
    };

    const token = req.headers.authorization; // Lấy token từ header Authorization của request
    if (!token || !token.startsWith('Bearer ')) { // Kiểm tra token có tồn tại và đúng định dạng Bearer không
        res.status(401).json({ message: 'Unauthorized: No token provided' });
        return;
    } else {
        try {
            const jwtToken = token.split(' ')[1]; // Lấy phần token sau "Bearer "
            const dataDecoded: any = jwt.verify(jwtToken, process.env.JWT_SECRET_KEY as string); // Giải mã token sử dụng secret key từ biến môi trường .env
            console.log("Decoded JWT data:", dataDecoded);
            (req as any).UserJWT = { //UserJWT này được định nghĩa trong src/types/index.dt.ts 
                id: dataDecoded.id ?? dataDecoded.userId ?? 0,
                fullName: dataDecoded.fullName ?? '',
                email: dataDecoded.email ?? '',
                avatar: dataDecoded.avatar ?? '',
                roleId: dataDecoded.roleId ?? 0,
                roleName: dataDecoded.roleName ?? '',
                accountType: dataDecoded.accountType ?? '',
            };
            next(); // Tiếp tục xử lý request 
        } catch (error) {
            console.error("JWT verification error:", error instanceof Error ? error.message : ''); // Ghi log lỗi xác thực JWT cụ thể
            res.status(401).json({ message: 'Unauthorized: Invalid token', error: error instanceof Error ? error.message : '', data: null }); // Phản hồi lỗi xác thực JWT
        };
    };
};

export { checkValidJWT };