import { Request, Response } from "express";
import { GetAllUser, GetUserById } from "services/admin/user.service";
import { DelUserById, UpdateUserByID } from "services/admin/userApi.service";
import { PostRegisterUser } from "services/client/auth.service";
import { registerSchema, TRegisterSchemaType } from "validation/register.schema";

const getAllUserApi = async (req: Request, res: Response) => {
    const users = await GetAllUser();
    const user = req.user;
    console.log("User from session:", user);
    if (!users) {
        res.status(404).json({ message: 'No users found' });
        return;
    }
    res.status(200).json({ message: 'Lấy danh sách người dùng thành công', data: users });

};

const GetUserByIdApi = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = Number(id);
    if (isNaN(userId)) {
        res.status(400).json({ message: 'Invalid user ID' });
        return;
    }

    const user = await GetUserById(userId);
    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }
    res.status(200).json({ message: 'Lấy thông tin người dùng thành công', data: user });
};


const createUserApi = async (req: Request, res: Response) => {
    const { username, email, password } = req.body as TRegisterSchemaType;
        const validate = await registerSchema.safeParseAsync(req.body);
        if (!validate.success) {
            const errorsZob = validate.error.issues;
            const errors = errorsZob.map((error) => `${error.message} (${error.path.join('.')})`);
            res.status(400).json({ message: 'Validation errors', errors });
            return;
        }
    
        await PostRegisterUser({ username, email, password });
        res.status(201).json({ message: 'Tạo người dùng thành công' });
        return;
};

const PutUpdateUserByIDApi = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = Number(id);
    if (isNaN(userId) || userId <= 0) {
        res.status(400).json({ message: 'Invalid user ID' });
        return;
    };
    const { username, address, phone } = req.body as TRegisterSchemaType;

    const user = await UpdateUserByID(userId, username, address, phone);
    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }
    res.status(200).json({ message: 'Cập nhật người dùng thành công', data: user });
};

const DelUserByIdApi = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = Number(id);
    if (isNaN(userId) || userId <= 0) {
        res.status(400).json({ message: 'Invalid user ID' });
        return;
    };

    await DelUserById(userId);
    res.status(200).json({ message: 'Xóa người dùng thành công' });
    return;
}

export { getAllUserApi, GetUserByIdApi, createUserApi, PutUpdateUserByIDApi, DelUserByIdApi };