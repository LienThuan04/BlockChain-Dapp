import { prisma } from 'config/client';
import bcrypt from 'bcrypt';
import { hashPassword } from 'services/admin/user.service';
import { ACCOUNT_TYPE } from 'config/constant';


const initDatabase = async () => {
    const CountUser = await prisma.user.count();
    const CountRole = await prisma.role.count();
    const countProduct = await prisma.product.count();

    if (CountRole === 0) {
        const db = await prisma.role.createMany({
            data: [
                {
                    name: 'ADMIN',
                    description: 'Administrator role with full access',
                },
                {
                    name: 'USER',
                    description: 'Regular user role with limited access',
                },
            ],
        });
    }
    if (CountUser === 0) {
        const password = await hashPassword('admin123');
        const role = await prisma.role.findFirst({
            where: {
                name: 'ADMIN',
            },
        });
        if (role) {
            const db = await prisma.user.createMany({
                data: [
                    {
                        fullName: 'Admin',
                        email: 'admin@gmail.com',
                        password: password,
                        accountType: ACCOUNT_TYPE.SYSTEM,
                        roleId: Number(role.id),
                    },
                ],
            });
        };

    };

    if (countProduct === 0) {
        // 1. Gather all unique factories and targets
        const products = [
            { name: "Laptop Asus TUF Gaming", price: 17490000, detailDesc: "ASUS TUF Gaming F15 FX506HF HN017W là chiếc laptop gaming giá rẻ nhưng vô cùng mạnh mẽ. Không chỉ bộ vi xử lý Intel thế hệ thứ 11, card đồ họa RTX 20 series mà điểm mạnh còn đến từ việc trang bị sẵn 16GB RAM, cho bạn hiệu năng xuất sắc mà không cần nâng cấp máy.", shortDesc: " Intel, Core i5, 11400H", quantity: 100, factory: "ASUS", target: "GAMING", image: "1711078092373-asus-01.png" },
            { name: "Laptop Dell Inspiron 15", price: 15490000, detailDesc: "Khám phá sức mạnh tối ưu từ Dell Inspiron 15 N3520, chiếc laptop có cấu hình cực mạnh với bộ vi xử lý Intel Core i5 1235U thế hệ mới và dung lượng RAM lên tới 16GB. Bạn có thể thoải mái xử lý nhiều tác vụ, nâng cao năng suất trong công việc mà không gặp bất kỳ trở ngại nào.", shortDesc: "i5 1235U/16GB/512GB/15.6\"FHD", quantity: 200, factory: "DELL", target: "SINHVIEN-VANPHONG", image: "1711078452562-dell-01.png" },
            { name: "Lenovo IdeaPad Gaming 3", price: 19500000, detailDesc: "Mới đây, Lenovo đã tung ra thị trường một sản phẩm gaming thế hệ mới với hiệu năng mạnh mẽ, thiết kế tối giản, lịch lãm phù hợp cho những game thủ thích sự đơn giản. Tản nhiệt mát mẻ với hệ thống quạt kép kiểm soát được nhiệt độ máy luôn mát mẻ khi chơi game.", shortDesc: " i5-10300H, RAM 8G", quantity: 150, factory: "LENOVO", target: "GAMING", image: "1711079073759-lenovo-01.png" },
            { name: "Asus K501UX", price: 11900000, detailDesc: "Tận hưởng cảm giác mát lạnh sành điệu với thiết kế kim loại. Được thiết kế để đáp ứng những nhu cầu điện toán hàng ngày của bạn, dòng máy tính xách tay ASUS K Series sở hữu thiết kế tối giản, gọn nhẹ và cực mỏng với một lớp vỏ họa tiết vân kim loại phong cách.", shortDesc: "VGA NVIDIA GTX 950M- 4G", quantity: 99, factory: "ASUS", target: "THIET-KE-DO-HOA", image: "1711079496409-asus-02.png" },
            { name: "MacBook Air 13", price: 17690000, detailDesc: "Chiếc MacBook Air có hiệu năng đột phá nhất từ trước đến nay đã xuất hiện. Bộ vi xử lý Apple M1 hoàn toàn mới đưa sức mạnh của MacBook Air M1 13 inch 2020 vượt xa khỏi mong đợi người dùng, có thể chạy được những tác vụ nặng và thời lượng pin đáng kinh ngạc.", shortDesc: "Apple M1 GPU 7 nhân", quantity: 99, factory: "APPLE", target: "GAMING", image: "1711079954090-apple-01.png" },
            { name: "Laptop LG Gram Style", price: 31490000, detailDesc: "14.0 Chính: inch, 2880 x 1800 Pixels, OLED, 90 Hz, OLED", shortDesc: "Intel Iris Plus Graphics", quantity: 99, factory: "LG", target: "DOANH-NHAN", image: "1711080386941-lg-01.png" },
            { name: "MacBook Air 13", price: 24990000, detailDesc: "Không chỉ khơi gợi cảm hứng qua việc cách tân thiết kế, MacBook Air M2 2022 còn chứa đựng nguồn sức mạnh lớn lao với chip M2 siêu mạnh, thời lượng pin chạm  ngưỡng 18 giờ, màn hình Liquid Retina tuyệt đẹp và hệ thống camera kết hợp cùng âm thanh tân tiến.", shortDesc: "Apple M2 GPU 8 nhân", quantity: 99, factory: "APPLE", target: "MONG-NHE", image: "1711080787179-apple-02.png" },
            { name: "Laptop Acer Nitro", price: 23490000, detailDesc: "Là chiếc laptop gaming thế hệ mới nhất thuộc dòng Nitro 5 luôn chiếm được rất nhiều cảm tình của game thủ trước đây, Acer Nitro Gaming AN515-58-769J nay còn ấn tượng hơn nữa với bộ vi xử lý Intel Core i7 12700H cực khủng và card đồ họa RTX 3050, sẵn sàng cùng bạn chinh phục những đỉnh cao.", shortDesc: "AN515-58-769J i7 12700H", quantity: 99, factory: "ACER", target: "SINHVIEN-VANPHONG", image: "1711080948771-acer-01.png" },
            { name: "Laptop Acer Nitro V", price: 26999000, detailDesc: "15.6 inch, FHD (1920 x 1080), IPS, 144 Hz, 250 nits, Acer ComfyView LED-backlit", shortDesc: "NVIDIA GeForce RTX 4050", quantity: 99, factory: "ASUS", target: "MONG-NHE", image: "1711081080930-asus-03.png" },
            { name: "Laptop Dell Latitude 3420", price: 21399000, detailDesc: "Dell Inspiron N3520 là chiếc laptop lý tưởng cho công việc hàng ngày. Bộ vi xử lý Intel Core i5 thế hệ thứ 12 hiệu suất cao, màn hình lớn 15,6 inch Full HD 120Hz mượt mà, thiết kế bền bỉ sẽ giúp bạn giải quyết công việc nhanh chóng mọi lúc mọi nơi.", shortDesc: "Intel Iris Xe Graphics", quantity: 99, factory: "DELL", target: "MONG-NHE", image: "1711081278418-dell-02.png" }
        ];

        // Gather unique factories and targets
        const factoryNames = [...new Set(products.map(p => p.factory))];
        const targetNames = [...new Set(products.map(p => p.target))];

        // Create factories and targets
        const factoryRecords = await Promise.all(factoryNames.map(async name => {
            return prisma.factory.upsert({
                where: { name },
                update: {},
                create: { name, description: name }
            });
        }));
        const targetRecords = await Promise.all(targetNames.map(async name => {
            return prisma.target.upsert({
                where: { name },
                update: {},
                create: { name, description: name }
            });
        }));

        // Map for quick lookup
        const factoryMap = Object.fromEntries(factoryRecords.map(f => [f.name, f.id]));
        const targetMap = Object.fromEntries(targetRecords.map(t => [t.name, t.id]));

        // Create products with correct foreign keys
        await prisma.product.createMany({
            data: products.map(p => ({
                name: p.name,
                price: p.price,
                detailDesc: p.detailDesc,
                shortDesc: p.shortDesc,
                quantity: p.quantity,
                image: p.image,
                status: "ACTIVE",
                factoryId: factoryMap[p.factory],
                targetId: targetMap[p.target],
            }))
        });

        // Lấy lại danh sách sản phẩm vừa tạo
    const allProducts = await prisma.product.findMany({ select: { id: true, name: true, quantity: true, price: true } });

        // Hàm fake cpu, memory, color cho từng sản phẩm
    function getFakeVariant(product: { name: string; price: number; quantity: number }) {
            const name = product.name.toLowerCase();
            let cpu = "Intel Core i5";
            let memory = "8GB/512GB";
            let color = "Black";
            if (name.includes("asus tuf")) {
                cpu = "Intel Core i5-11400H";
                color = "Black";
            } else if (name.includes("dell inspiron")) {
                cpu = "Intel Core i5-1235U";
                color = "Silver";
            } else if (name.includes("lenovo ideapad")) {
                cpu = "Intel Core i5-10300H";
                color = "Black";
            } else if (name.includes("asus k501ux")) {
                cpu = "Intel Core i7-6500U";
                color = "Gray";
            } else if (name.includes("macbook air") && product.price < 20000000) {
                cpu = "Apple M1";
                color = "Silver";
            } else if (name.includes("macbook air") && product.price >= 20000000) {
                cpu = "Apple M2";
                color = "Silver";
            } else if (name.includes("lg gram")) {
                cpu = "Intel Core i7-1360P";
                color = "White";
            } else if (name.includes("acer nitro v")) {
                cpu = "Intel Core i5-12500H";
                color = "Black";
            } else if (name.includes("acer nitro")) {
                cpu = "Intel Core i7-12700H";
                color = "Black";
            } else if (name.includes("dell latitude")) {
                cpu = "Intel Core i5-1235U";
                color = "Black";
            } else if (name.includes("apple")) {
                cpu = "Apple M1";
                color = "Silver";
            } else if (name.includes("asus")) {
                cpu = "Intel Core i5";
                color = "Black";
            } else if (name.includes("dell")) {
                cpu = "Intel Core i5";
                color = "Silver";
            } else if (name.includes("lenovo")) {
                cpu = "Intel Core i5";
                color = "Black";
            } else if (name.includes("acer")) {
                cpu = "Intel Core i5";
                color = "Black";
            } else if (name.includes("lg")) {
                cpu = "Intel Core i7";
                color = "White";
            }
            return {
                cpu,
                memory,
                color,
                priceMore: 0,
                quantity: product.quantity
            };
        }

        // Tạo 1 variant cho mỗi sản phẩm
        await prisma.productVariant.createMany({
            data: allProducts.map(product => ({
                productId: product.id,
                ...getFakeVariant(product)
            }))
        });
    }

    // Seed default cryptocurrency (SGB)
    const countCrypto = await (prisma as any).cryptocurrency.count();
    if (countCrypto === 0) {
        await (prisma as any).cryptocurrency.create({
            data: {
                name: 'Songbird',
                code: 'SGB',
                symbol: '⚡',
                priceVND: 8750,
                chainName: 'Flare Coston Testnet',
                rpcUrl: 'https://coston-api.flare.network/ext/bc/C/rpc',
                chainId: '0x10',
                contractAddress: null,
                decimals: 18,
                description: 'Songbird - Flare Network native token',
                isActive: true
            }
        });
        console.log('✅ Created default cryptocurrency: SGB');
    }

    // Seed default wallet
    const countWallet = await (prisma as any).cryptoWallet.count();
    if (countWallet === 0) {
        await (prisma as any).cryptoWallet.create({
            data: {
                walletAddress: process.env.ADMIN_WALLET_ADDRESS || '0xeee8ba2b2774168aa7042cbd93ecde8d8cc7720f',
                privateKey: process.env.ADMIN_PRIVATE_KEY || '8c86cad740757db1169d111a5529d55452074315094fcafa273a1e06d9e6933f',
                isActive: true
            }
        });
        console.log('✅ Created default wallet: Admin Wallet');
    }

    if (CountUser !== 0 && CountRole !== 0 && countProduct !== 0) {
        console.log('Database already seeded with admin user.');
        return;
    }

}
export default initDatabase;