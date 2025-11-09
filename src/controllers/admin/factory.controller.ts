import { Request, Response } from "express";
import { GetViewFactoryById, PostCreateNewFactory, PostUpdateFactoryById, PostDelFactoryById } from "services/admin/Factory&Target.service";
import { CountTotalFactoryPage, GetAllFactory } from 'services/admin/Product.service';


const GetPageFactory = async (req: Request, res: Response) => {
    const { Page } = req.query;
    const CurrentPage = Page ? Number(Page) : 0;
    const GetFactoryForAdmin = await GetAllFactory(CurrentPage);
    if(GetFactoryForAdmin){
        return res.render('admin/factory/show.ejs', { 
            factories: GetFactoryForAdmin, 
            currentPage: CurrentPage, 
            totalPages: await CountTotalFactoryPage() 
        });
    }
    return res.render('admin/factory/show.ejs', { factories: [], currentPage: 0, totalPages: 0 });
};

const GetPageCreateFactory = async (req: Request, res: Response) => {
    return res.render('admin/factory/create.ejs');
};

const PostCreateFactory = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const create = await PostCreateNewFactory(name, description);
    if(create){
        return res.redirect('/admin/factory');
    }
    return res.render('admin/factory/create.ejs', { error: 'Failed to create factory' });
};

const GetViewFactory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const DetailFactoryById = await GetViewFactoryById(Number(id));
    if(DetailFactoryById){
        return res.render('admin/factory/view.ejs', { factory: DetailFactoryById });
    };
    return res.render('admin/factory/view.ejs', { factory: null });
};

const PostUpdateFactory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const Update = await PostUpdateFactoryById(Number(id), name, description);
    if(Update){
        return res.redirect('/admin/factory');
    };
    return res.render('admin/factory/edit.ejs', { error: 'Failed to update factory' });

};

const PostDelFactory = async(req: Request, res: Response) => {
    const { id } = req.params;
    const result = await PostDelFactoryById(Number(id));
    if (!result.success) {
        const GetFactoryForAdmin = await GetAllFactory();
        return res.render('admin/factory/show.ejs', {
            factories: GetFactoryForAdmin,
            error: `This Factory is already associated with the product with id: ${result.productIds?.join(', ')}, you cannot delete the Factory while the product is still associated with this Factory`
        });
    }
    return res.redirect('/admin/factory');
}

export { GetPageFactory, GetPageCreateFactory, PostCreateFactory, GetViewFactory, PostUpdateFactory, PostDelFactory }