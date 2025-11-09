import { Request, Response } from "express";
import { GetViewTargetById, PostCreateNewTarget, PostDelTargetById, PostUpdateTargetById } from "services/admin/Factory&Target.service";
import { CountTotalTargetPage, GetAllTarget } from "services/admin/Product.service";


const GetPageTarget = async (req: Request, res: Response) => {
    const { Page } = req.query;
    const CurrentPage = Page ? Number(Page) : 0;
    const GetTargetForAdmin = await GetAllTarget(CurrentPage);
    if(GetTargetForAdmin){
        return res.render('admin/target/show.ejs', { 
            targets: GetTargetForAdmin, 
            currentPage: CurrentPage, 
            totalPages: await CountTotalTargetPage(), 
        });
    }
    return res.render('admin/target/show.ejs', { targets: [], currentPage: 0, totalPages: 0 });
};

const GetPageCreateTarget = async (req: Request, res: Response) => {
    return res.render('admin/target/create.ejs');
};

const PostCreateTarget = async (req: Request, res: Response) => {
    const { name, description} = req.body;
    const create = await PostCreateNewTarget(name, description);
    if(create){
        return res.redirect('/admin/target');
    }
    return res.render('admin/target/create.ejs', { error: 'Failed to create target' });

};

const GetViewTarget = async (req: Request, res: Response) => {
    const { id } = req.params;
    const DetailTargetById = await GetViewTargetById(Number(id));
    if(DetailTargetById){
        return res.render('admin/target/view.ejs', { target: DetailTargetById });
    }
    return res.render('admin/target/view.ejs', { target: null });
};


const PostUpdateTarget = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const Update = await PostUpdateTargetById(Number(id), name, description);
    if(Update){
        return res.redirect('/admin/target');
    }
    return res.render('admin/target/edit.ejs', { error: 'Failed to update target' });
};

const PostDelTarget = async(req: Request, res: Response) => {
    const { id } = req.params;
    const result = await PostDelTargetById(Number(id));
    if(!result.success){
       const GetTargetForAdmin = await GetAllTarget();
       return res.render('admin/target/show.ejs', { targets: GetTargetForAdmin, error: `This Target is already associated with the product with id: ${result.productIds?.join(', ')}, you cannot delete the Target while the product is still associated with this Target` });
    }
    return res.redirect('/admin/target');
}

export { GetPageTarget, GetPageCreateTarget, PostCreateTarget, GetViewTarget, PostUpdateTarget, PostDelTarget }