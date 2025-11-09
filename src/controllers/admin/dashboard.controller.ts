import { CountTotalUserPage, GetAllUser } from "services/admin/user.service";
import { Request, Response } from "express";
import { CountTotalProductPage, GetAllProduct } from "services/admin/Product.service";
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
    const { Page } = req.query;
    let CurrentPage = Page ? Number(Page) : 0;
    if (CurrentPage < 0) CurrentPage = 0;
    const Order = await GetAllOrder(CurrentPage);
    const ordersWithReviews = await Promise.all(Order.map(async order => {
        const review = await GetReviewById(order.id); 
        return { ...order, statusReview: review ? true : false };
    }));
    return res.render('admin/order/show.ejs', {
        orders: ordersWithReviews,
        totalPages: await CountTotalOrderPage(),
        currentPage: CurrentPage
    });
}
const getAdminProductPage = async (req: Request, res: Response) => {
    const { Page } = req.query;
    let CurrentPage = Page ? Number(Page) : 0;
    if (CurrentPage < 0) CurrentPage = 0;
    const product = await GetAllProduct(CurrentPage);
    return res.render('admin/product/show.ejs',
        {
            products: product,
            totalPages: await CountTotalProductPage(),
            currentPage: CurrentPage
        }
    );
}

export { getAdminPage, getAdminUserPage, getAdminOrderPage, getAdminProductPage };