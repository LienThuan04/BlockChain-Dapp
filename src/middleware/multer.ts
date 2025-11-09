import multer from 'multer'
import path from 'path'
import { v4 } from 'uuid';


const fileUploadMiddleware = (fieldName: string /* tên trường file */, dir: string = 'images' /* thư mục lưu trữ */) => {
    return multer({
        storage: multer.diskStorage({
            destination: 'public/' + dir,// cấu hình nới lưu trữ file với thư mục public và dir là thư mục con
            filename: (req, file, cb) => {
                const extension = path.extname(file.originalname); // lấy phần mở rộng của file
                cb(null, v4() + extension); // tạo tên file duy nhất bằng cách sử dụng uuid
            }
        }),
        limits: {
            fileSize: 1024 * 1024 * 20 //20MB - giới hạn kích thước file
        },
        fileFilter: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
            if (
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/jpg' ||
                file.mimetype === 'image/jpeg' // kiểm tra loại file
            ) {
                cb(null, true); // cho phép file nếu loại hợp lệ
            } else {
                cb(new Error('Only JPEG and PNG images are allowed.'), false);
            }
        }
    }).single(fieldName); // sử dụng single để upload một file duy nhất
};

const FileUploadFields = (fields: {name: string, maxCount: number}[], dir?: string) => {
    return multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                if (file.fieldname === 'image') {
                    cb(null, 'public/images/products');
                } else if (file.fieldname === 'images') {
                    cb(null, 'public/images/products/ImagesProductMore');
                } else if (dir) {
                    cb(null, 'public/' + dir);
                } else {
                    cb(null, 'public/images');
                }
            },
            filename: (req, file, cb) => {
                const extension = path.extname(file.originalname);
                cb(null, v4() + extension);
            }
        }),
        limits: {
            fileSize: 1024 * 1024 * 20 //10MB - giới hạn kích thước file
        },
        fileFilter: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
            if (
                file.mimetype === 'image/png' ||
                file.mimetype === 'image/jpg' ||
                file.mimetype === 'image/jpeg'
            ) {
                cb(null, true);
            } else {
                cb(new Error('Only JPEG and PNG images are allowed.'), false);
            }
        }
    }).fields(fields);
};

export { fileUploadMiddleware, FileUploadFields };