import { prisma } from "config/client";

const UpdateUserByID = async (id: number, username?: string, address?: string, phone?: string) => {
    const user = await prisma.user.update({
        where: { id },
        data: {
            fullName: username,
            address,
            phone
        }
    });
    return user;
};

const DelUserById = async (id: number) => {
    const user = await prisma.user.delete({
        where: { id }
    });
    return user;
};

export { UpdateUserByID, DelUserById };
