import { CountTotalUserPage, GetAllUser } from "services/admin/user.service";
import { Request, Response } from "express";
import { CountTotalProductPage, GetAllProduct, GetAllFactory } from "services/admin/Product.service";
import { CountTotalOrderPage, GetAllOrder } from "services/admin/Order.service";
import { DashBoardData } from "services/admin/DashBoard.service";
import { GetReviewById } from "services/admin/Review.service";
import { getRevenueProd_DELIVERED } from "services/admin/Revenue.service";

const getAdminPage = async (req: Request, res: Response) => {
    const GetDashboardData = await DashBoardData();
    const GetRevanueData = await getRevenueProd_DELIVERED();
    return res.render('admin/dashboard/show.ejs', {
        dashboard: GetDashboardData,
        revenue: GetRevanueData
    });
};

const getAdminUserPage = async (req: Request, res: Response) => {
    const { Page } = req.query;
    let CurrentPage = Page ? Number(Page) : 0;
    if (CurrentPage < 0) CurrentPage = 0;
    const User = await GetAllUser(CurrentPage);
    return res.render('admin/user/show.ejs', {
        ListUser: User,
        totalPages: await CountTotalUserPage(),
        currentPage: CurrentPage
    });
};
const getAdminOrderPage = async (req: Request, res: Response) => {
    const { Page, status, paymentMethod, paymentStatus, searchUser } = req.query;
    let CurrentPage = Page ? Number(Page) : 0;
    if (CurrentPage < 0) CurrentPage = 0;
    
    // Build filter object
    const filters: any = {};
    if (status) filters.status = status;
    if (paymentMethod) filters.paymentMethod = paymentMethod;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (searchUser) filters.searchUser = searchUser;
    
    const Order = await GetAllOrder(CurrentPage, filters);
    const ordersWithReviews = await Promise.all(Order.map(async order => {
        const review = await GetReviewById(order.id); 
        return { ...order, statusReview: review ? true : false };
    }));
    
    return res.render('admin/order/show.ejs', {
        orders: ordersWithReviews,
        totalPages: await CountTotalOrderPage(filters),
        currentPage: CurrentPage,
        // Pass filter values for form
        filters: {
            status: status || '',
            paymentMethod: paymentMethod || '',
            paymentStatus: paymentStatus || '',
            searchUser: searchUser || ''
        }
    });
}
const getAdminProductPage = async (req: Request, res: Response) => {
    const { Page, name, status, factory } = req.query;
    let CurrentPage = Page ? Number(Page) : 0;
    if (CurrentPage < 0) CurrentPage = 0;
    
    // Build filters object
    const filters: any = {};
    if (name) filters.name = String(name);
    if (status) filters.status = String(status);
    if (factory) filters.factory = String(factory);
    
    const product = await GetAllProduct(CurrentPage, filters);
    const totalPages = await CountTotalProductPage(filters);
    const factories = await GetAllFactory();
    
    return res.render('admin/product/show.ejs',
        {
            products: product,
            totalPages: totalPages,
            currentPage: CurrentPage,
            factories: factories,
            filters: {
                name: name || '',
                status: status || '',
                factory: factory || ''
            }
        }
    );
}

export { getAdminPage, getAdminUserPage, getAdminOrderPage, getAdminProductPage };