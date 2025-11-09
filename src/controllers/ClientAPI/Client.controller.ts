import { Request, Response } from "express";
import { handleUserLogin } from "services/client/auth.service";
import { LoginSchema, TLoginSchema } from "src/validation/Auth.chema";

const LoginAPI = async (req: Request, res: Response) => {
    const { username, password } = req.body as TLoginSchema;
    const validate = await LoginSchema.safeParseAsync(req.body);
    if (!validate.success) {
        const errorsZod = validate.error.issues;
        const errors = errorsZod.map((error) => `${error.message} (${error.path.join('.')})`);
        res.status(400).json({ message: 'Validation errors', data: errors });
        return;
    }
    try {
        const accessToken = await handleUserLogin(username, password);
        res.status(200).json({ message: 'Đăng nhập thành công', data: { email: username }, access_token: accessToken });
    } catch (error: any) {
        res.status(401).json({ message: error.message, data: null, access_token: null });
    }
};

const fetchAccountAPI = async (req: Request, res: Response) => {
    const user = req.user;
    if (user) {
        res.status(200).json({ message: 'Lấy thông tin tài khoản thành công', data: user });
    } else {
        res.status(401).json({ message: 'Bạn chưa đăng nhập', data: null });
    };

}
export { LoginAPI , fetchAccountAPI };