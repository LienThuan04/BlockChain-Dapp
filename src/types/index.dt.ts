import { User, Role } from "@prisma/client"; // Import kiểu User và Role từ Prisma Client

type UserRole = User & { role?: Role } & { quantityCart?: number }; // Mở rộng User để bao gồm Role và quantityCart

export type { UserRole }; // Xuất kiểu UserRole

// Mở rộng Express Request
declare global {
  namespace Express {
    interface User extends UserRole {
      // Thêm các thuộc tính mở rộng cho User ở đây, nếu đã định nghĩa trong UserRole thì không cần thêm nữa
    }
  }
};

declare module 'express-session' { // Mở rộng module express-session
  interface SessionData { // Mở rộng SessionData để bao gồm orderInfo
    orderInfo?: {
      receiverName?: string;
      receiverPhone?: string;
      receiverAddress?: string;
      receiverNote?: string;
      paymentMethod?: string;
      receiverEmail?: string;
      totalVND?: number;
      ListIdDetailOrder: Array<{ id: number, productVariantId: number }>;
    };
  }
}