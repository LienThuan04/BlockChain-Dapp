import { z } from 'zod';

export const LoginSchema = z.object({
    username: z.string().min(1, { message: "Tên đăng nhập là bắt buộc" }).refine((value) => value.trim() !== '', { message: "Tên đăng nhập không được để trống" }),
    password: z.string().min(1, { message: "Mật khẩu là bắt buộc" }).refine((value) => value.trim() !== '', { message: "Mật khẩu không được để trống" }).refine((value) => !/\s/.test(value), { message: "Mật khẩu không được chứa khoảng trắng" }),
});
export type TLoginSchema = z.infer<typeof LoginSchema>;