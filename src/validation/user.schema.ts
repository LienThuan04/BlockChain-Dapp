import { z, number } from 'zod';

export const ProductSchema = z.object({
    name: z.string().min(1, "Tên sản phẩm là bắt buộc").max(255, { message: "Tên sản phẩm phải ít hơn 255 ký tự" }),

    price: z.string().transform((value) => {
        if(value === '') {
            return 0; // Hoặc giá trị mặc định khác nếu cần
        }
        return Number(value);
    }).refine((num)=>{
        if(num > 0){
            return true;
        } else if (num < 2147483647){
            return true;
        }
        return false;
    }, { message: "Giá sản phẩm phải lớn hơn 0, và phải nhỏ hơn 2147483647" }),

    quantity: z.string().transform((value) => {
        if(value === '') {
            return 0; // Hoặc giá trị mặc định khác nếu cần
        }
        return Number(value);
    }).refine((num)=>{
        if(num >= 0){
            return true;
        } else if(num < 2147483647){
            return true;
        }
        return false;
    }, { message: "Số lượng phải lớn hơn hoặc bằng 0, và phải nhỏ hơn 2147483647" }),

    status: z.enum([
        'ACTIVE',
        'INACTIVE',
        'OUT_OF_STOCK',
        'DISCONTINUED',
        'DRAFT',
        'PENDING',
        'DELETED',
    ], { message: "Trạng thái sản phẩm không hợp lệ" }),

    shortDesc: z.string().refine((value) => {
        if (value.trim() === '') {
            return false; // Mô tả ngắn không được để trống
        } else if (value.length > 255) {
            return false; // Mô tả ngắn phải ít hơn 255 ký tự
        }
        return true;
    }, { message: "Mô tả ngắn là bắt buộc" }),
    detailDesc: z.string().refine((value) => {
        if (value.trim() === '') {
            return false; 
        }
        return true;
    }, { message: "Mô tả chi tiết là bắt buộc và phải ít hơn 255 ký tự" }),
    factory: z.string().min(1, { message: "Nhà sản xuất là bắt buộc" }).max(255, { message: "Nhà sản xuất phải ít hơn 255 ký tự" }),
    target: z.string().min(1, "Đối tượng là bắt buộc").max(255, "Đối tượng phải ít hơn 255 ký tự"),
    // imageFile: z.instanceof(File).optional(),

});
export type TProductSchemaType = z.infer<typeof ProductSchema>;