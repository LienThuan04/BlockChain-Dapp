import { prisma } from "config/client";
import { PAGE_SIZE_WITH_ADMIN } from "config/constant";

const getRevenueProd_DELIVERED = async () => {
  const orders = await prisma.order.findMany({
    where: {
      statusOrder: "DELIVERED"
    },
    include: {
      orderDetails: true,
    },
  });

  const revenueByMonth: { [key: string]: number } = {};

  orders.forEach((ord) => {
    // chuẩn hóa tháng & năm
    const month = String(ord.createdAt.getMonth() + 1).padStart(2, "0"); 
    const year = ord.createdAt.getFullYear();
    const monthYearKey = `${year}-${month}`; // VD: 2025-09

    // tính doanh thu từ orderDetails để chắc chắn
    const revenueOrder = ord.orderDetails.reduce(
      (sum, od) => sum + od.price * od.quantity,
      0
    );

    revenueByMonth[monthYearKey] = (revenueByMonth[monthYearKey] || 0) + revenueOrder;
  });

  return revenueByMonth;
};

const getRevenueWithFilter = async (filter: string) => {

  const allRevenue = await getRevenueProd_DELIVERED();
  // Chuyển key về mảng ngày thực tế
  // Để lọc chính xác, cần lấy ra tất cả ngày của các đơn hàng
  // Ta sẽ lấy lại dữ liệu từ orders để có ngày chính xác
  const orders = await prisma.order.findMany({
    where: {
      statusOrder: "DELIVERED"
    },
    include: {
      orderDetails: true,
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (filter === "today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Tìm đơn hàng có ngày gần nhất là hôm nay
    const todayOrders = orders.filter(ord => {
      const ordDate = new Date(ord.createdAt);
      ordDate.setHours(0, 0, 0, 0);
      return ordDate.getTime() === today.getTime();
    });
    if (todayOrders.length === 0) return {};
    // Tính doanh thu hôm nay
    const revenueToday = todayOrders.reduce((sum, ord) => {
      return sum + ord.orderDetails.reduce((s, od) => s + od.price * od.quantity, 0);
    }, 0);
    return { [today.toISOString().slice(0, 10)]: revenueToday };
  }

  if (filter === "last7days") {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6); // lấy 7 ngày gần nhất (bao gồm hôm nay)
    // Lọc đơn hàng trong 7 ngày gần nhất
    const days: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const dayStr = d.toISOString().slice(0, 10);
      days[dayStr] = 0;
    }
    orders.forEach(ord => {
      const ordDate = new Date(ord.createdAt);
      ordDate.setHours(0, 0, 0, 0);
      const dayStr = ordDate.toISOString().slice(0, 10);
      if (days.hasOwnProperty(dayStr)) {
        days[dayStr] += ord.orderDetails.reduce((s, od) => s + od.price * od.quantity, 0);
      }
    });
    // Chỉ trả về ngày có doanh thu > 0
    const result: { [key: string]: number } = {};
    Object.keys(days).forEach(day => {
      if (days[day] > 0) result[day] = days[day];
    });
    return result;
  }

  if (filter === "last30days") {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29); // lấy 30 ngày gần nhất (bao gồm hôm nay)
    const days: { [key: string]: number } = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(thirtyDaysAgo.getDate() + i);
      const dayStr = d.toISOString().slice(0, 10);
      days[dayStr] = 0;
    }
    orders.forEach(ord => {
      const ordDate = new Date(ord.createdAt);
      ordDate.setHours(0, 0, 0, 0);
      const dayStr = ordDate.toISOString().slice(0, 10);
      if (days.hasOwnProperty(dayStr)) {
        days[dayStr] += ord.orderDetails.reduce((s, od) => s + od.price * od.quantity, 0);
      }
    });
    const result: { [key: string]: number } = {};
    Object.keys(days).forEach(day => {
      if (days[day] > 0) result[day] = days[day];
    });
    return result;
  }

  if (filter === "last6months") {
    // Lấy 6 tháng gần nhất có dữ liệu
    const monthsSet = new Set<string>();
    orders.forEach(ord => {
      const month = String(ord.createdAt.getMonth() + 1).padStart(2, "0");
      const year = ord.createdAt.getFullYear();
      const key = `${year}-${month}`;
      monthsSet.add(key);
    });
    // Sắp xếp các tháng giảm dần
    const monthsArr = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    const last6Months = monthsArr.slice(0, 6);
    const result: { [key: string]: number } = {};
    last6Months.forEach(monthKey => {
      if (allRevenue[monthKey]) result[monthKey] = allRevenue[monthKey];
    });
    return result;
  }

  // Mặc định trả về tất cả theo tháng
  return allRevenue;
};

const getRevenueAboutProdBestSell = async () => {
  // Lấy tất cả order DELIVERED kèm orderDetails
  const orders = await prisma.order.findMany({
    where: {
      statusOrder: "DELIVERED"
    },
    include: {
      orderDetails: true,
      // Lấy luôn thông tin sản phẩm
      // Nếu cần chi tiết sản phẩm, có thể join thêm product
    }
  });

  // Gom số lượng bán theo productId
  const productSales: { [productId: number]: { quantity: number, productId: number } } = {};
  orders.forEach(order => {
    order.orderDetails.forEach(od => {
      if (!productSales[od.productId]) {
        productSales[od.productId] = { quantity: 0, productId: od.productId };
      }
      productSales[od.productId].quantity += od.quantity;
    });
  });

  // Sắp xếp giảm dần theo quantity và lấy top 5
  const top5 = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Lấy thông tin sản phẩm từ productId
  const productIds = top5.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds }
    }
  });

  // Ghép thông tin sản phẩm với số lượng bán
  const result = top5.map(item => {
    const prod = products.find(p => p.id === item.productId);
    return {
      productId: item.productId,
      quantitySold: item.quantity,
      product: prod || null
    };
  });
  return result;
};

const getRevenueAboutTopContributors = async () => {
  // Lấy tất cả order DELIVERED kèm orderDetails
  const orders = await prisma.order.findMany({
    where: {
      statusOrder: "DELIVERED"
    },
    include: {
      orderDetails: true,
    }
  });

  // Gom số lượng sản phẩm đã mua theo userId
  const userSales: { [userId: number]: { quantity: number, userId: number } } = {};
  orders.forEach(order => {
    const userId = order.userId;
    const totalQuantity = order.orderDetails.reduce((sum, od) => sum + od.quantity, 0);
    if (!userSales[userId]) {
      userSales[userId] = { quantity: 0, userId };
    }
    userSales[userId].quantity += totalQuantity;
  });

  // Sắp xếp giảm dần theo quantity và lấy top 8
  const top8 = Object.values(userSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // Lấy thông tin user từ userId
  const userIds = top8.map(item => item.userId);
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds }
    }
  });

  // Ghép thông tin user với số lượng đã mua
  const result = top8.map(item => {
    const user = users.find(u => u.id === item.userId);
    return {
      userId: item.userId,
      quantityBought: item.quantity,
      user: user || null
    };
  });
  return result;
};

export { getRevenueProd_DELIVERED, getRevenueWithFilter, getRevenueAboutProdBestSell, getRevenueAboutTopContributors };
