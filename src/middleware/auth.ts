import { Request, Response, NextFunction } from "express";
import { UserRole } from "src/types/index.dt";


const islogin = (req: Request, res: Response, next: NextFunction) => {
    const isAuthenticated = req.isAuthenticated(); //nếu người dùng đã đăng nhập
    if (isAuthenticated) { // nếu đã đăng nhập thì biến isAuthenticated sẽ là true
        return res.redirect('/'); // chuyển hướng về trang chủ
    } else {
        return next(); // nếu chưa đăng nhập thì tiếp tục với request tiếp theo
    }
};


const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as UserRole; // lấy thông tin người dùng từ request
    if (req.path.startsWith('/admin')) {
        if (user?.role?.name === 'ADMIN') {
            return next();
        } else {
            return res.status(403).render('status/403.ejs');
        }
    };
    return next();
};

const isAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (req.isAuthenticated()) {
        next();
        return;
    }
    res.status(401).json({ error: 'Unauthorized' });
    return;
};

export { islogin, isAdmin, isAuth };