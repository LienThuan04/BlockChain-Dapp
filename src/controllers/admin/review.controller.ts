import { Request, Response } from 'express';
import { CountTotalReviewPage, GetAllReview } from 'services/admin/Review.service';

const GetReviewPageForAdmin = async (req: Request, res: Response) => {
    const { Page } = req.query;
    let CurrentPage = Page ? Number(Page) : 0;
    if (CurrentPage < 0) CurrentPage = 0;
    const review = await GetAllReview(CurrentPage);
    res.render('admin/review/show.ejs', {
        reviews: review,
        totalPages: await CountTotalReviewPage(),
        currentPage: CurrentPage
    });
};


export { GetReviewPageForAdmin };