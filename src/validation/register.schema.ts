import { isEmailExist } from 'services/client/auth.service';
import { z } from 'zod';

const EmailSchema = z.string().email({ message: "Email không hợp lệ" })
    .refine(async (email) => {
        const exists = await isEmailExist(email);
        return !exists;
    }, {
        message: "Email đã tồn tại",
        // path: ['email'],
    });

const PasswordSchema = z.string().min(3, { message: "Mật khẩu phải có ít nhất 3 ký tự" })
    .max(20, { message: "Mật khẩu không được vượt quá 20 ký tự" });

const addressSchema = z.string().min(5, { message: "Địa chỉ phải có ít nhất 5 ký tự" })
    .max(100, { message: "Địa chỉ không được vượt quá 100 ký tự" });

const phoneSchema = z.string().min(10, { message: "Số điện thoại phải có ít nhất 10 ký tự" })
    .max(15, { message: "Số điện thoại không được vượt quá 15 ký tự" })
    .regex(/^\+?[0-9]+$/, { message: "Số điện thoại không hợp lệ" });

export const registerSchema = z.object({
    username: z.string().min(1, { message: "Họ tên là bắt buộc" }),
    email: EmailSchema,
    password: PasswordSchema,
    address: addressSchema.optional(),
    phone: phoneSchema.optional(),

});


export type TRegisterSchemaType = z.infer<typeof registerSchema>;