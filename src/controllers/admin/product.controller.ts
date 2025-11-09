import { Request, Response } from 'express';
import { GetAllFactory, GetAllTarget, handleCreateProduct, PostDelProduct, getProductWithVariantsById, handleUpdateProductWithVariants } from 'services/admin/Product.service';
import { ProductSchema, TProductSchemaType } from 'validation/user.schema';

const getAdminCreateProductPage = async (req: Request, res: Response) => {
    const errors: string[] = [];
    const oldData = {
        name: '',
        price: '',
        quantity: '',
        shortDesc: '',
        detailDesc: '',
        factory: '',
        target: '',
    }
    const factories = await GetAllFactory();
    const targets = await GetAllTarget();
    return res.render('admin/product/create.ejs', { errors, oldData, factories, targets });
};

const PostAdminCreateProduct = async (req: Request, res: Response) => {
    const { name, price, quantity, shortDesc, detailDesc, factory, target, status } = req.body as TProductSchemaType & { status: string };
    const imagesFile = req?.files ?? null;

    const variants: Array<{cpu: string, memory: string, color: string, priceMore: number, quantity: number}> = req.body.variants;

    // Validate product fields
    const validatedData = ProductSchema.safeParse(req.body);
    let errors: string[] = [];
    if (!validatedData.success) {
        const errorsZod = validatedData.error.issues;
        errors = errorsZod?.map(issue => `${issue.message} (${issue.path[0]})`);
    }

    // Validate variants: phải có ít nhất 1 variant hợp lệ
    let variantArr: Array<{cpu: string, memory: string, color: string, priceMore: number, quantity: number}> = variants;
    // Lọc các variant hợp lệ (có chip, memory, color, priceMore, quantity)
    variantArr = variantArr.filter(v => v.cpu && v.memory && v.color && v.priceMore !== undefined && v.quantity !== undefined && v.quantity !== null && v.priceMore !== null );
    if (variantArr.length === 0) {
        errors.push('Phải thêm ít nhất 1 phiên bản sản phẩm (chip, bộ nhớ, màu sắc, giá cộng thêm, số lượng)!');
    }

    if (errors.length > 0) {
        const oldData = { name, price, quantity, shortDesc, detailDesc, factory, target };
        return res.render('admin/product/create.ejs', {
            errors,
            oldData
        });
    }

    const CreateProduct = await handleCreateProduct(name, Number(price), Number(quantity), shortDesc, detailDesc, Number(factory), Number(target), imagesFile , variantArr, status);
    if (!CreateProduct) {
        return res.render('admin/product/create.ejs', {
            errors: ['Lỗi khi tạo sản phẩm, vui lòng thử lại!'],
            oldData: { name, price, quantity, shortDesc, detailDesc, factory, target }
        });
    }
    return res.redirect('/admin/product');
};

const DelProduct = async(req: Request, res: Response) => {
    const {id} = req.params;
    const result = await PostDelProduct(Number(id));
    
    if (result.success) {
        // Product deleted successfully
        return res.redirect('/admin/product?success=product_deleted');
    } else if (result.error) {
        // Product cannot be deleted due to related data
        const encodedError = encodeURIComponent(result.error);
        const stepsJson = encodeURIComponent(JSON.stringify(result.remainingSteps || []));
        return res.redirect(`/admin/product?error=delete_failed&message=${encodedError}&steps=${stepsJson}`);
    } else {
        // Other error
        return res.redirect('/admin/product?error=unknown_error');
    }
};


const GetEditProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const errors: string[] = [];
    const product = await getProductWithVariantsById(Number(id));
    if (!product) {
        return res.status(404).render('status/404NotFound.ejs');
    }
    const Factory = await GetAllFactory();
    const Target = await GetAllTarget();
    return res.render('admin/product/view.ejs', { product: product, errors: errors, factories: Factory, targets: Target });
};


const PostEditProduct = async (req: Request, res: Response) => {
    const { id } = req.body
    const { name, price, quantity, shortDesc, detailDesc, factory, target, status } = req.body as TProductSchemaType & { status: string };
    const imageFiles: any = req?.files ?? null;
    const validatedData = ProductSchema.safeParse(req.body);
    if (!validatedData.success) {
        const errorsZod = validatedData.error.issues;
        const errors = errorsZod?.map(issue => `${issue.message} (${issue.path[0]})`);
        const product = {
            id,
            name,
            price,
            quantity,
            shortDesc,
            detailDesc,
            factory,
            target,
            status,
            ...(imageFiles && { image: imageFiles?.image.filename, images: imageFiles?.images.map((img: any) => img.filename) }) // Include image only if it exists
        };
        return res.render('admin/product/view.ejs', {
            errors: errors || ['Dữ liệu không hợp lệ, vui lòng kiểm tra lại!'],
            product: product
        });
    }

    // Gom variants và ép kiểu từng trường về string/number
    const variants = req.body?.variants;
    let variantArr: any[] = [];
    if (variants) {
        if (Array.isArray(variants)) {
            variantArr = variants;
        } else if (typeof variants === 'object') {
            variantArr = Object.values(variants);
        }
    }
    // Ép kiểu từng trường, loại bỏ các trường là mảng (lấy phần tử đầu nếu là mảng), đồng thời lọc undefined/null/trống
    variantArr = variantArr
        .filter(v => v && typeof v === 'object')
        .map(v => ({
            id: v.id ? (Array.isArray(v.id) ? v.id[0] : v.id) : undefined,
            cpu: v.cpu ? (Array.isArray(v.cpu) ? v.cpu[0] : v.cpu) : '',
            memory: v.memory ? (Array.isArray(v.memory) ? v.memory[0] : v.memory) : '',
            color: v.color ? (Array.isArray(v.color) ? v.color[0] : v.color) : '',
            priceMore: v.priceMore !== undefined ? Number(Array.isArray(v.priceMore) ? v.priceMore[0] : v.priceMore) : 0,
            quantity: v.quantity !== undefined ? Number(Array.isArray(v.quantity) ? v.quantity[0] : v.quantity) : 0
        }))
    .filter(v => v.cpu && v.memory && v.quantity !== undefined && v.quantity !== null && v.priceMore !== undefined && v.priceMore !== null); // Lọc các variant hợp lệ
    // Lấy danh sách id variant bị xóa (nếu có)
    let ListVariantsDel: Array<number> = req.body?.variantsToDelete ?? [];
    if (ListVariantsDel) {
        if (Array.isArray(ListVariantsDel)) {
            ListVariantsDel = ListVariantsDel.map(Number);
        } else if (typeof ListVariantsDel === 'string' || typeof ListVariantsDel === 'number') {
            ListVariantsDel = [Number(ListVariantsDel)];
        };
    };
    //lấy danh sách id ảnh sản phẩm thêm để xóa (nếu có)
    let ListImagesDel: Array<number> = req.body?.deletedImageIds ?? [];
    if (ListImagesDel) {
        if(Array.isArray(ListImagesDel)){
            ListImagesDel = ListImagesDel.map(Number);
        } else if (typeof ListImagesDel === 'string' || typeof ListImagesDel === 'number') {
            ListImagesDel = [Number(ListImagesDel)];
        };
    };

    const PostupdatedProduct = await handleUpdateProductWithVariants(
        Number(id), name, Number(price), Number(quantity), shortDesc, detailDesc, Number(factory), Number(target), variantArr, ListVariantsDel, status, imageFiles, ListImagesDel
    );
    if(PostupdatedProduct){
        return res.redirect('/admin/product');
    } else{
        return console.log("error:",PostupdatedProduct);
    }
}

export { getAdminCreateProductPage, PostAdminCreateProduct, DelProduct, GetEditProduct, PostEditProduct };