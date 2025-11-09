import { Request, Response } from 'express';
import { getRevenueProd_DELIVERED, getRevenueWithFilter, getRevenueAboutProdBestSell, getRevenueAboutTopContributors } from 'services/admin/Revenue.service';
const GetTopContributors = async (req: Request, res: Response) => {
    const data = await getRevenueAboutTopContributors();
    if (!data || data.length === 0) {
        res.json([]);
        return;
    }
    res.json(data);
};

const GetRevenue = async (req: Request, res: Response) => {
    const revenueData = await getRevenueProd_DELIVERED(); // Fetch revenue data from your database or service
    if (!revenueData) {
        return res.render('admin/Revenue/show.ejs', { revenueData: [] });
    }
    return res.render('admin/Revenue/show.ejs', { revenueData });
}

const GetRevenueWithFilter = async (req: Request, res: Response) => {
    const { filter } = req.params;
    const revenueData = await getRevenueWithFilter(filter as string);
    if (!revenueData || Object.keys(revenueData).length === 0) {
        res.json({});
        return;
    }
    res.json(revenueData);
};

const GetBestSellProducts = async (req: Request, res: Response) => {
    const data = await getRevenueAboutProdBestSell();
    if (!data || data.length === 0) {
        res.json([]);
        return;
    }
    res.json(data);
};

export { GetRevenue, GetRevenueWithFilter, GetBestSellProducts, GetTopContributors };