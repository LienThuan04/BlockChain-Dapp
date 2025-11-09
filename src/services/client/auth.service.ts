import { prisma } from "config/client";
import { ACCOUNT_TYPE } from "config/constant";
import { hashPassword } from 'services/admin/user.service';
import bcrypt from 'bcrypt';
import "dotenv/config";

const comparePassword = async (plainPassword: string, hashedPassword: string) => { //kiểm tra mật khẩu đã mã hóa có đúng không
    return await bcrypt.compare(plainPassword, hashedPassword);
};

const isEmailExist = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: {
            email: email,
        },
    });
    return user !== null;
};

const PostRegisterUser = async (data: { username: string; email: string; password: string }) => {
    const userRole = await prisma.role.findUnique({ where: { name: "user" } });
    const Password = await hashPassword(data.password);
    const DefaultAvatar = "default-avatar.jpg";
    if (userRole) {
        await prisma.user.create({
            data: {
                fullName: data.username,
                email: data.email,
                password: Password,
                accountType: ACCOUNT_TYPE.SYSTEM,
                roleId: userRole.id,
                avatar: DefaultAvatar
            },
        });
    } else {
        throw new Error("User role not found");
    }
};

const GetUserWithRoleById = async (id: number) => {
    const user = await prisma.user.findUnique({
        where: {
            id: Number(id)
        }, include: { //join thêm dữ liệu từ bảng role
            role: true
        },
        omit: { //loại bỏ trường
            password: true
        }
    });
    return user;
};

const GetQuantityCart = async (userId: number) => {
    const cart = await prisma.cart.findUnique({
        where: {
            userId: userId
        },
    });
    return cart?.quantity ?? 0;
};


const handleUserLogin = async (username: string, password: string) => {
    const user = await prisma.user.findUnique({
        where: {
            email: username,
        },
        include:{
            role: true
        }
    });
    if (!user) {
        throw new Error(`User ${username} and password ${password} not found`);
    };

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        throw new Error(`Invalid password for user ${username}`);
    };
    // Đăng nhập thành công, trả về user
    return user;
};

export { isEmailExist, PostRegisterUser, GetUserWithRoleById, GetQuantityCart, handleUserLogin };