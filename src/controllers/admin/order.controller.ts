import { Request, Response } from 'express';
import { GetDetailOrderForAdmin, UpdateOrderById } from 'services/admin/Order.service';


const GetDetailOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { success } = req.query;
    const detailOrder = await GetDetailOrderForAdmin(Number(id));
    if (!detailOrder) {
        return res.status(404).render('status/404NotFound.ejs');
    }
    return res.render('admin/order/detailOrder.ejs', {
        detailOrder: detailOrder.detailOrder,
        order: detailOrder.order,
        cryptoTx: detailOrder.cryptoTx || null,
        success: success === '1'
    });
};


const PostUpdateOrderById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updatedData = req.body;
    const result = await UpdateOrderById(Number(id), updatedData);
    if (!result) {
        return res.status(404).render('status/404NotFound.ejs');
    }
    // Redirect kèm query success=1 để hiển thị thông báo
    return res.redirect(`/admin/view_order/${id}?success=1`);
};

export {
    GetDetailOrder,
    PostUpdateOrderById
};