import { PAGE_SIZE_WITH_CLIENT } from "config/constant";
import {Request, Response} from "express"
import { GetAllRole, GetUserById, handleCreateUser, PostDeleteUser, PostUpdateUserbyid } from "services/admin/user.service";
import { CountTotalProductPage, GetAllFactoryForClient, GetAllProductforClient, GetAllTargetForClient } from "services/client/item.service";
import { getActiveCryptoInfo, convertVndToCrypto } from 'services/crypto/crypto.service';

const getHomePage = async (req: Request, res: Response) => {
    let Factory: Array<{id: number, name: string }> = [];
    let Target: Array<{id: number, name: string }> = [];
    const { page } = req.query;
    let CurrentPage = page ? Number(page) : 0;
    if(CurrentPage < 0) CurrentPage = 0;
    const totalPages = await CountTotalProductPage(PAGE_SIZE_WITH_CLIENT);
    const GetAllProduct = await GetAllProductforClient(CurrentPage, PAGE_SIZE_WITH_CLIENT);
    if(page) {
        console.log("Current query:", page);
    }
    // GetAllProduct.forEach((item) => {
    //     if(item.factory && !Factory.some(factory => factory.name === item.factory.name )) {
    //         Factory.push({ id: item.factory.id, name: item.factory.name });
    //     };
    //     if(item.target && !Target.some(target => target.name === item.target.name )) {
    //         Target.push({ id: item.target.id, name: item.target.name });
    //     };
    // });
    Factory = await GetAllFactoryForClient();
    Target = await GetAllTargetForClient();

    try {
        const crypto = await getActiveCryptoInfo();
        const productsWithCrypto = (GetAllProduct || []).map((p: any) => {
            const base = Number(p.price || 0);
            const more = Number(p.productVariants && p.productVariants[0] ? (p.productVariants[0].priceMore || 0) : 0);
            const displayVnd = base + more;
            const cryptoAmount = convertVndToCrypto(displayVnd, crypto.priceVND, crypto.decimals, 8);
            return { ...p, cryptoAmount };
        });
        return res.render('./client/home/show.ejs', { products: productsWithCrypto, factories: Factory, targets: Target, currentPage: CurrentPage, totalPages: totalPages, cryptoActive: crypto});
    } catch (e) {
        console.warn('Unable to attach crypto info to home products', e);
        return res.render('./client/home/show.ejs', { products: GetAllProduct, factories: Factory, targets: Target, currentPage: CurrentPage, totalPages: totalPages});
    }
};

const getCreateUserPage = async (req: Request, res: Response) => {
    const roles = await GetAllRole();
    return res.render('admin/user/create.ejs', {
        roles: roles
    });
}


const PostCreateUser = async (req: Request, res: Response) => {
    const { FullName, email, phone, address, role  } = req.body;
    const file = req.file;
    const avatar = file ? file.filename : null;
    const check = await handleCreateUser(FullName, email, address, phone, avatar, role);
    if(!check){
        return console.log("error:", check)
    };
    return res.redirect('/admin/user');
    
};

const PostDelUser = async (req: Request, res:Response) => {
    const { id } = req.params;
    const check = await PostDeleteUser(id);
    if(check){
        return res.redirect('/admin/user');
    } else {
        return console.log('error:', id)
    }
    
};

const GetEditUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await GetUserById(Number(id));
    const roles = await GetAllRole();
    return res.render('admin/user/view.ejs',{
        id:id,
        CurrentUser: user,
        roles: roles
    });
};


const PostUpdateUser = async (req: Request, res: Response) => {
    const { id, FullName, address, phone, role } = req.body;
    const file = req.file;
    const avatarFile = file ? file.filename : null;
    const user = await PostUpdateUserbyid(Number(id), FullName, address, phone, avatarFile, role);
    if(!user){
        return console.log("error:", user);
    }
    return res.redirect('/admin/user');
    
};

export { getHomePage, getCreateUserPage, PostCreateUser, PostDelUser, GetEditUser, PostUpdateUser };