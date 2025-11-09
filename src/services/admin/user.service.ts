import { prisma } from "config/client";
import { ACCOUNT_TYPE, PAGE_SIZE_WITH_ADMIN } from "config/constant";
import bcrypt from 'bcrypt';


const hashPassword = async (password: string) => {
    const saltRounds = 10;
    if (!password) {
        throw new Error("Password is required");
    }
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
}


const handleCreateUser = async (name: string, email: string, address: string, phone: string, avatar: string | null, role: string) => {

    const DefaultPassword = await hashPassword("123456");
    const newuser = await prisma.user.create({
        data: {
            fullName: name,
            email: email,
            address: address,
            password: DefaultPassword,
            accountType: ACCOUNT_TYPE.SYSTEM,
            avatar: avatar,
            phone: phone,
            roleId: Number(role)
        }
    });
    return newuser;
};

const PostDeleteUser = async (id: string) => {
    const DelUser = await prisma.user.delete({
        where: {
            id: Number(id)
        }
    });
    return DelUser;
};

const GetAllUser = async (Page?: number) => {
    if(!Page || Page <= 0) {
        const users = await prisma.user.findMany();
        return users;
    }
    const PageSize = PAGE_SIZE_WITH_ADMIN;
    const Skip = Page * PageSize;
    const users = await prisma.user.findMany({
        skip: Skip,
        take: PageSize
    });
    return users;
};

const CountTotalUserPage = async () => {
    const count = await prisma.user.count();
    return Math.ceil(count / PAGE_SIZE_WITH_ADMIN);
};

const GetAllRole = async () => {
    const roles = await prisma.role.findMany();
    return roles;
};

const GetUserById = async (id: number) => {
    const user = await prisma.user.findUnique({
        where: {
            id: Number(id)
        }
    });
    return user;
};

const PostUpdateUserbyid = async (id: number, name: string, address: string, phone: string, avatar: string | null, role: string) => {
    const UpdateUser = await prisma.user.update({
        where: {
            id: Number(id)
        },
        data: {
            fullName: name,
            // email: email,
            address: address,
            ...(avatar ? { avatar: avatar } : null),
            phone: phone,
            roleId: Number(role)
        }
    });
    return UpdateUser;
}
export { 
    handleCreateUser, GetAllUser, PostDeleteUser, 
    GetUserById, PostUpdateUserbyid, GetAllRole, 
    hashPassword, CountTotalUserPage
 };