import { NextFunction, Request, Response } from "express";
import { PostRegisterUser } from "services/client/auth.service";
import { UserRole } from "types/index.dt";
import { registerSchema, TRegisterSchemaType } from "validation/register.schema";

const getLoginPage = (req: Request, res: Response) => {
    // const errors: string[] = [];
    const { session } = req as any;
    const message = session?.messages ?? [];
    const oldData = {
        email: '',
        password: '',
        terms:false
    };
    const wrapperClass = '';
    res.render('client/auth/login.ejs', { errors: message, oldData, wrapperClass });
};


const postRegister = async (req: Request, res: Response) => {
    // Handle registration logic
    const wrapperClass = 'active-popup active'
    const { username, email, password } = req.body as TRegisterSchemaType;
    const { terms } = req.body;
    const validate = await registerSchema.safeParseAsync(req.body);
    if (!validate.success) {
        const errorsZob = validate.error.issues;
        const errors = errorsZob.map((error) => `${error.message} (${error.path.join('.')})`);
        const oldData = {
            username,
            email,
            password,
            terms: terms
        };
        return res.render('client/auth/login.ejs', {
            errors,
            oldData,
            wrapperClass,
        });
    }

    await PostRegisterUser({ username, email, password });
    return res.redirect('/login');
};

const PostLogout = (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        // Nếu đang ở /admin hoặc các route con của admin thì về trang đăng nhập
        if (req.headers.referer && req.headers.referer.includes('/admin')) {
            return res.redirect('/login');
        }
        // Nếu url hiện tại là /admin/logout thì cũng về login
        if (req.originalUrl.startsWith('/admin')) {
            return res.redirect('/login');
        }
        // Ngược lại về trang chủ
        return res.redirect('/');
    });
};



const GetPageWithRoleUser = (req: Request, res: Response) => {
    const user = req.user as UserRole;
    if (user?.role?.name === 'ADMIN') {
       return res.redirect('/admin');
    } else {
        return res.redirect('/');
    }
    
};



export { getLoginPage, postRegister, PostLogout, GetPageWithRoleUser };