### tự học NodeJS!! 
- video 32 success

# 📄 Copyright

All content in the LianHarman repository is copyrighted by the author.  

© 2025 [...] — All rights reserved.
- You are allowed to use this source code for personal or educational purposes.
- Commercial use or redistribution is not allowed without explicit written permission from the author.




## 🔗 Links contact me

[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/thuan.lien.79/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/LienThuan9697)
[![Email](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:lienthuan2004@gmail.com)
[![X (Twitter)](https://img.shields.io/badge/X-000000?style=for-the-badge&logo=twitter&logoColor=white)](https://x.com/harmanlian?s=21)


## Deployment

To project setup

```bash
  npm install
```

To deploy this project run

```bash
  npm start
```


## 📌Git code documentation i have with Vietnamese language
`lưu ý: -m kiểm tra trước mới thực hiện trong khi -M thực hiện mà không cần kiểm tra bằng cách ghi đè trực tiếp !!!`

    -m  # Dùng để thêm thông điệp commit
    -M  # Ghi đè nhánh cũ, sử dụng cẩn thận!
    -u  # Thiết lập upstream khi push/pull
    -v  # Hiện chi tiết quá trình thực hiện
    -b  # Tạo nhánh mới và chuyển ngay sang nhánh đó

___

**`# clone dự án về từ github có sẳn:`**
```bash
    git clone https://github.com/username/repository.git
```
___

**`# Điều hướng đến thư mục dự án`**
```bash
    cd path/to/your/project
```
___

**`# Khởi tạo kho lưu trữ Git `**
```bash
    git add .
```
___

**`# Cam kết các thay đổi`**
```bash
    git commit -m "Initial commit"
```
___

**`# Thêm kho lưu trữ GitHub làm remote repository(kết nối với dự án có trên git)`**
```bash
    git remote add origin ”https://github.com/username/repository.git”
```
___

**`# kiểm tra nhánh hiện tại`**
```bash
    git branch
```
___

**`# nếu tên nhánh của bạn là master thay vì main, bạn cần đổi tên nhánh thành main`**
```bash
    git branch -M main
```
___


**`# Xóa Nhánh `**  
**`Ví dụ: xóa nhánh master`**
```bash
    git push origin --delete master
```
___

**`# Đẩy mã lên GitHub`**
```bash
    'git push -u origin main' hoặc 'git push origin main' nếu muốn ghi đè hoặc thay thế tất cả thêm '--force' vào sau chữ 'main'
```
___

**`# Đổi tên nhánh từ master sang main`**
```bash
    git branch -M <tên_cũ> <tên_mới>  -> "ví dụ: git branch -M master main"
```
___

**`# Tạo nhánh mới nhanh và chuyển sang nhánh đó luôn`**
```bash
    git checkout -b ‘tên nhánh mới’  ==> `-b là branch tức là tạo nhánh mới`
```
___

**`# Check code tại qua tên nhánh đó`**
```bash
    git checkout  ‘tên nhánh check’
```
___

**`# quay lại code cũ với một commit bằng mã commit hash-ID`**
```bash
    git checkout ‘HashID‘
```
___

**`# Để quay lại commit cũ ta có`**  
1 xem lịch sử commit: 
```bash
    git log
```
2 Chọn commit muốn quay lại mà không xóa các commit khác:
```bash
    git revert [id-commit]
```
`Hoặc` quay lại và xóa commit khác:
```bash
    git revert --hard [id-commit]
```
**`- lưu ý: quay lại commit không đồng nghĩa remote trên git cũng quay lại theo, nó vẫn nằm ở đó bạn chỉ có thể thực hiện thủ công !!`**

___

**`# Coming soon 🧠`**
```bash
    let's wait 🚀
```
___

## Tạo BackEnd cơ bản:
**`tạo package quản lý npm`**
```bash
    npm init
```
___

## Tải thư viện:
**`Tải thư viện Express cho Backend`**
```bash
    npm i --save-exact express
```

- để chạy dự án này dùng câu lệnh: `node app.js`
___

## Setup TypeScript cho dự án Node.js:
**`Bản chất của việc setup TypeScript`**  
1. Bạn coding bằng cú pháp của TypeScript: mục đích là code được gợi ý, và code ít lỗi hơn  
2. Bạn cần sử dụng thư viện để dịch code từ typescript sang javascript  
3. Node.js sẽ thực thi code đã dịch (javascript)  

`Bước 1: Cài đặt thư viện:`
```bash
    npm i --save-exact --save-dev typescript @types/express @types/node
```
Thư viện typescript, giúp dịch code typescript, sang code javascript  
Thư viện @types/express, giúp bạn coding Express được gợi ý code  
Thư viện @types/node giúp bạn coding nodejs được gợi ý code  

và đổi đuôi file app.js thành .ts

`Bước 2: Cấu hình typescript:`
```bash
    npx tsc --init
```
tạo file: `tsconfig.json` tại root
```bash
    {
        "compilerOptions": {
            "module": "commonjs",
            "esModuleInterop": true,
            "target": "es6",
            "sourceMap": true,
            "skipLibCheck": true,
            "outDir": "dist"
        }
    }
```

//giải thích ý nghĩa
🔗 [Chi tiết, tham khảo](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)

`Bước 3: Dịch code TypeScript sang JavaScript`
```bash
    npx tsc
```

`Bước 4: Chạy dự án`
```bash
    node dist/app.js
```
___


## Setup Typescript
**`setup thêm cho dự án`**

Update `tsconfig.json`
```bash
    "rootDir": "src",
```

update `package.json`
```bash
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "start": "tsc && node dist/app.js",
        "dev": "tsc && node dist/app.js"
    }
```

Chạy dự án với câu lệnh:
```bash
    npm run dev
```
hoặc 
```bash 
    npm start
```
___


## Setup DevTool:
**`Mục tiêu: chạy project tại chế độ ‘watch’. Mỗi lần có file thay đổi, project sẽ tự động chạy lại`**
//Tài liệu:  
🔗 [tham khảo 1](https://www.npmjs.com/package/nodemon)  

Cài đặt thư viện
```bash
    npm i --save-exact --save-dev nodemon ts-node dotenv
    npm i --save-exact dotenv
```

thêm cấu hình này sao khi cài thư viện cho Backend vào file `package.json`:
```bash
    "nodemonConfig": {
        "watch": ["src"],
        "ext": "ts",
        "exec": "ts-node ./src/app.ts",
        "ignore": ["dist", "node_modules"]
    },
```
và đổi scripts trong file `package.json` thành như sau:
```bash 
    "scripts": {
        "test": "echo \"Error: no test specified\" && exit 1",
        "start": "nodemon",
        "dev": "nodemon"
    },
```

tạo file `.env` và cấu hình trong file app.ts thêm thư viện này vô 
___

## Cấu hình EJS cho project (tức giao diện cho backend để chạy mô hình SSR)
**`Template: tức là bộ khung định hình sẵn ví dụ template wedding chẳng hạn, người bán hàng đưa sẵn template, bạn chỉ cần chọn và fill tên vào thôi.`**

🔗 [tham khảo](https://expressjs.com/en/guide/using-template-engines.html)  

cài đặt EJS cho backend:
```bash
    npm i --save-exact ejs
    npm i --save-exact --save-dev @types/ejs

```
tạo thêm folder cho views và file với tên mong muốn:
để hiển thị nội dung file đó lên giao diện web cần khai báo tên file và nguồn của file!
nó sẽ được hiển bằng phương thức get của express qua res:
```bash 
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');

    app.get('/', (req,res) => {
        res.render('home.ejs');
    });
```
___

# Mô hình MVC và File static
**`MVC là viết tắt của Model - View - Controlle`**
giúp viết code theo tổ chức, dễ dàng bảo trì (maintain) và mở rộng (scale) ứng dụng.  

- Tổ chức thư mục cho dự án  
`Tạo controllers`  
`Tạo models`  
`Tạo services`  
`Tạo routes`  

(tạo route)[https://expressjs.com/en/guide/routing.html]  

Tạo thêm các thư mục như models, routes, controllers và services để cấu hình dự án theo MVC.  
Trong folder routes tạo 1 file `web.ts` cho dự án với các url của trang web.
```bash
    import express, {Express} from 'express';

    const router = express.Router();

    const webroutes = (app: Express) => {

        router.get('/', (req, res) => {
            res.render('home.ejs');
        });

        router.get('/about', (req, res) => {
            res.send('About page this BackEnd !');
        });

        app.use('/' , router);
    }
    export default webroutes;

```
thay vì phải rander trực tiếp trong file `app.ts` ta chỉ cần rander các url của nó trong file này giúp ta dễ dàng quản lí hơn !

1. Sửa lại nội dung trong file `app.ts`:  
`thay nội dung dưới này`
```bash 
    router.get('/', (req, res) => {
        res.render('home.ejs');
    });
```
2. thành như này
```bash
    webroutes(app);
```
3. và import file `web.ts` vào trong `app.ts`:
```bash
    import webroutes from './routes/web';
```
Sau các bước trên ta tạo thêm thư mục `public` để làm nơi lưu static File.  
bên trong code `app.ts` cần thêm dòng code bên dưới để nó có thể đọc được các file của thư mục `public`:  
```bash 
    app.use(express.static('public'));
```
___

## Tải thư viên Tsconfig_paths
**`dùng thư viện này để thay đổi đường link absolute paths thành Relative Path `**

tải thư viện bằng code bên dưới:
```bash
    npm i --save-dev --save-exact tsconfig-paths
```
bổ sung thêm các dòng lệnh bên dưới để có thể lấy được có file theo đường dẫn khi khai báo cho các file.

```bash 
    "baseUrl": ".", 
    "paths": {
      "config/*":["./src/config/*"],
      "controllers/*" : ["./src/controllers/*"],
      "models/*" : ["./src/models/*"],
      "routes/*" : ["./src/routes/*"], 
      "services/*" : ["./src/services/*"],
      "views/*" : ["./src/views/*"],    
    },
```

và bổ sung thêm code cho file `package.jon`:
```bash 
    "exec": "ts-node -r tsconfig-paths/register ./src/app.ts",
```


___

## Thêm thư viện SQL2
**`thao tác với database mysql`**

cài thư viện sql2:
```bash 
    npm i --save-exact mysql2
```
tạo thêm thư mục `config` và file `db.ts` để kết nối với database   
trong file `db.ts` có các thông tin sau để kết nối với database:
```bash
    import mysql from 'mysql2/promise'

    const GetConnection = async () =>{
        const connection = await mysql.createConnection({
            port: 3306,
            host: 'your host ',
            user: ' name user ',
            password: ' your password',
            database:' your database',
        });
        // A simple SELECT query
        try {
            const [results, fields] = await connection.query(
                'SELECT * FROM `User`'
            );

            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available
        } catch (err) {
            console.log(err);
        };
        return connection;
    };

    export default GetConnection;
```

### Cài ORM Prisma cho môi trường.

- 1 cài thư viện prima cho dự án:
```bash
    npm i --save-dev --save-exact prisma
```
- 2 cài luôn extention prisma cho IDE visual code để được gợi ý code trong quá trình coding

- 3 sau các bước trên ta tiến hành setup prisma cho dự án cá nhân:
để xem tất cả các câu lệnh mà prisma hỗ trợ:
    ```bash 
        npx prisma
    ```
    để prisma tạo 1 file lưu code database để quản lý database, dùng cứu pháp sau:
    ```bash
        npx prisma init
    ```
    nó sẽ tạo ra 1 folder prisma có file schema và 1 file .env để lưu đường dẫn đến database kết nối.
    trong file schema lấy tên database theo cứu pháp prisma đưa "[prisma](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project/relational-databases/connect-your-database-typescript-mysql)"

    ```bash
        // This is your Prisma schema file,
        // learn more about it in the docs: https://pris.ly/d/prisma-schema

        // Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
        // Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

        generator client {
        provider = "prisma-client-js"
        }

        datasource db {
        provider = "mysql"
        url      = env("DATABASE_URL")
        }
    ```
    và file .env setup như tài liệu của "[prisma](https://www.prisma.io/docs/getting-started/setup-prisma/add-to-existing-project/relational-databases/connect-your-database-typescript-mysql)"

    ```bash
        NODE_ENV=development
        PORT = 8080
        # This was inserted by `prisma init`:
        # Environment variables declared in this file are automatically made available to Prisma.
        # See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

        # Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
        # See the documentation for all the connection string options: https://pris.ly/d/connection-strings

        DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
    ```

- 4 sau khi setup tất cả các bước trên thì cần cái prisma client để nó thao tác với database:
    ```bash
        npm i @prisma/client
    ```
# các mối quan hệ trong "[Prisma](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/one-to-one-relations)"
  

# Cập nhật code cho typescript của prisma:
- 1 để được gợi ý code khi cập nhật lại database có câu lệnh sao:
    ```bash
        npx prisma generate
    ```
- 2 để đưa code trong file `schema.prisma` để tạo bảng vào database:
    ```bash
        npx prisma db push
    ```
- 3 kéo các bảng( hoặc lấy cấu trúc bảng đang có trong database để ghi vào file `schema.prisma` để tạo thành code khung. ) về file `schema.prisma`
    ```bash
        npx prisma db pull
    ```

- 4 đưa code đó vào database đồng thời tạo migrate cho prisma để lưu lại lịch sử cập nhật code của database ( lưu ý: code khung số 2 phải có trước mới chạy được lệnh này ).
    ```bash
        npx prisma migrate dev --name "tên phần cập nhật đó"
    ```

# Pagination with "[Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)":
  

- prisma it take keyword 'limit' and 'offset' replace with limit->take, offset->skip
- recipe take number skip: " Page * PageSize "
- With take you pass in as much as you want.


### Middleware của multer.ts
```bash
    import multer from 'multer'
    import path from 'path'
    import { v4 } from 'uuid';


    const fileUploadMiddleware = (fieldName: string /* tên trường file */, dir: string = 'images' /* thư mục lưu trữ */) => {
        return multer({
            storage: multer.diskStorage({
                destination: 'public/' + dir,// cấu hình nới lưu trữ file với thư mục public và dir là thư mục con
                filename: (req, file, cb) => {
                    const extension = path.extname(file.originalname); // lấy phần mở rộng của file
                    cb(null, v4() + extension); // tạo tên file duy nhất bằng cách sử dụng uuid
                }
            }),
            limits: {
                fileSize: 1024 * 1024 * 3 //3MB - giới hạn kích thước file
            },
            fileFilter: (req: Express.Request, file: Express.Multer.File, cb: Function) => {
                if (
                    file.mimetype === 'image/png' ||
                    file.mimetype === 'image/jpg' ||
                    file.mimetype === 'image/jpeg' // kiểm tra loại file
                ) {
                    cb(null, true); // cho phép file nếu loại hợp lệ
                } else {
                    cb(new Error('Only JPEG and PNG images are allowed.'), false);
                }
            }
        }).single(fieldName); // sử dụng single để upload một file duy nhất


    }
    export default fileUploadMiddleware;
```

# Cài thư viện Json Web Token cho sever hỗ trợ xác thực người dùng.
```bash
    npm i --save-exact jsonwebtoken @types/jsonwebtoken
```
and
```bash
    npm i --save-exact --save-dev @types/jsonwebtoken
```
tài liệu tham khảo [JsonWebToken](https://www.npmjs.com/package/jsonwebtoken)
- jwt.sign(payload, secretOrPrivateKey, [options, callback])
  - payload: là dữ liệu gửi lên kèm request.
  - secretOrPrivateKey: là chữ ký mà sever ký để chỉ sever đó giải mã được token này
  - [options, callback]: ở đây có thể chuyền vào thời gian hết hạn của key token đó { expiresIn: "1d" } 1d ở đây được ghi theo cú pháp của thư viện vercel được ghi rõ trong tài liệu trên.

# Tạo 1 middleware để xác thực thông tin người dùng với token gửi lên header của req
- file middleware có tên **[jwt.middleware.ts](https://gitlab.com/LienThuan9697/nodejs_express/-/blob/master/src/middleware/jwt.middleware.ts?ref_type=heads)** có nội dung như sau:
    ```bash
        import { Request, Response, NextFunction } from "express";
        import jwt from 'jsonwebtoken';
        import "dotenv/config"; // Load environment variables from .env file

        const checkValidJWT = (req: Request, res: Response, next: NextFunction) => {
            const path = req.path; // Lấy đường dẫn của request hiện tại
            const whitelistPaths = [ // Thêm các endpoint công khai khác để không cần check JWT vào đây nếu cần
                '/add-product-to-cart',
                '/login',
            ];
            const isWhitelisted = whitelistPaths.includes(path);
            console.log(`Request path: ${path}, isWhitelisted: ${isWhitelisted}`);
            if (isWhitelisted === true) {
                next(); // Nếu đường dẫn nằm trong whitelist, bỏ qua kiểm tra JWT
                return;
            };

            const token = req.headers.authorization; // Lấy token từ header Authorization của request
            if (!token || !token.startsWith('Bearer ')) { // Kiểm tra token có tồn tại và đúng định dạng Bearer không
                res.status(401).json({ message: 'Unauthorized: No token provided' });
                return;
            } else {
                try {
                    const jwtToken = token.split(' ')[1]; // Lấy phần token sau "Bearer "
                    const dataDecoded: any = jwt.verify(jwtToken, process.env.JWT_SECRET_KEY as string); // Giải mã token sử dụng secret key từ biến môi trường .env
                    console.log("Decoded JWT data:", dataDecoded);
                    req.UserJWT = { //UserJWT này được định nghĩa trong src/types/index.dt.ts 
                        id: dataDecoded.id ?? dataDecoded.userId ?? 0,
                        fullName: dataDecoded.fullName ?? '',
                        email: dataDecoded.email ?? '',
                        avatar: dataDecoded.avatar ?? '',
                        roleId: dataDecoded.roleId ?? 0,
                        roleName: dataDecoded.roleName ?? '',
                        accountType: dataDecoded.accountType ?? '',
                    };
                    next(); // Tiếp tục xử lý request 
                } catch (error) {
                    console.error("JWT verification error:", error instanceof Error ? error.message : ''); // Ghi log lỗi xác thực JWT cụ thể
                    res.status(401).json({ message: 'Unauthorized: Invalid token', error: error instanceof Error ? error.message : '', data: null }); // Phản hồi lỗi xác thực JWT
                };
            };
        };

        export { checkValidJWT };
    ```
tài liệu tham khảo [JsonWebToken](https://www.npmjs.com/package/jsonwebtoken)
- jwt.verify(token, secretOrPublicKey, [options, callback])
  - token là key lúc đầu mã hóa dữ liệu.
  - secretOrPrivateKey là chữ ký mà sever ký để chỉ sever đó giải mã được token này

- Để định nghĩa được biến UserJWT như trên ta có code tham khảo sau:
Tạo kiểu dữ liệu mới và định nghĩa nó để dùng được trong phần req của express
    ```bash
        type UserJWT = { // Định nghĩa kiểu cho dữ liệu UserJWT
            id: number;
            fullName: string;
            email: string;
            avatar: string;
            roleId: number;
            accountType: string;
        };
        export type { UserJWT }; // Xuất kiểu UserRole và UserJWT
        declare global {
        namespace Express {
                interface Request { // Mở rộng Request để bao gồm UserJWT
                    UserJWT: UserJWT; // UserJWT này được định nghĩa ở trên
                }
            }
        };
    ```
    Chi tiết có thể tham khảo file ở **[src/types/index.dt.ts](https://gitlab.com/LienThuan9697/nodejs_express/-/blob/master/src/types/index.dt.ts?ref_type=heads)**

# Build docker compose với mysql:
- viết file docker-compose.yaml để build database bằng docker như sau:
```bash
version: '3.8' # phiên bản docker-compose
services: # định nghĩa các dịch vụ
  db: # tên dịch vụ
    image: mysql:8.0 # sử dụng image mysql phiên bản 8.0
    container_name: DbMysql_LaptopShop_blockchain # tên container
    restart: unless-stopped # tự động khởi động lại trừ khi bị dừng thủ công
    environment: # thiết lập biến môi trường
      MYSQL_ROOT_PASSWORD: LianHarman2049 # pass của user root
      MYSQL_DATABASE: LaptopShopDB # tên database muốn tạo
      MYSQL_USER: LianHarman # biến này đặt để tạo user mới và cấp quyền cho user đó
      MYSQL_PASSWORD: LianHarman2049 # pass của user mới tạo
    ports: # ánh xạ cổng
      - "3307:3306" # ánh xạ cổng 3306 trong container ra cổng 3307 trên host
    # volumes: # gắn volume để lưu trữ dữ liệu
    #   - db_data:/var/lib/mysql # lưu dữ liệu mysql vào volume db_data
    # networks: # Specify the network
    #   - mysql_network
```
- Sau đó chạy lệnh sau để build cơ sở dữ liệu từ file này(nhớ mở cmd ở file này !):
```bash
docker compose -p ~this_name_container~ up -d
```
docker compose: Đây là lệnh dùng để chạy docker-compose.yml. Nó sẽ tạo và quản lý nhiều container cùng 1 lúc theo cấu hình trong file.

-p: Nó dùng để đặt tên chung cho tất cả những thứ mà compose tạo ra từ Tên container,Tên network, Tên volume (nếu có).

up: Tạo container và chạy chúng, Nếu container chưa tồn tại → Docker sẽ build và chạy, Nếu container đã tồn tại → Docker chạy lại.

-d: detached mode (chạy ngầm) không chiếm cmd hiện tại đang gõ lệnh này.

 - Sau khi build có thể kiểm tra container có chạy hay chưa bằng lệnh:
 ```bash
 docker ps
```
hoặc vào docker để xem.

- Build Dockerfile cho dự án như thế nào có thể xem Docker file của dự án này [Dockerfile](https://github.com/LienThuan04/BlockChain-Dapp/blob/master/Dockerfile).

- cách tạo compose dự án backend này cùng với database mysql nằm ở đây: [docker-compose.yaml](https://github.com/LienThuan04/BlockChain-Dapp/blob/master/docker/nodejs/docker-compose.yaml).




































## <h3 align="left">Languages and Tools:</h3>

<p align="left"> <a href="https://getbootstrap.com" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/bootstrap/bootstrap-plain-wordmark.svg" alt="bootstrap" width="40" height="40"/> </a> <a href="https://www.w3schools.com/css/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original-wordmark.svg" alt="css3" width="40" height="40"/> </a> <a href="https://www.docker.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original-wordmark.svg" alt="docker" width="40" height="40"/> </a> <a href="https://git-scm.com/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg" alt="git" width="40" height="40"/> </a> <a href="https://www.w3.org/html/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original-wordmark.svg" alt="html5" width="40" height="40"/> </a> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="javascript" width="40" height="40"/> </a> <a href="https://www.mysql.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original-wordmark.svg" alt="mysql" width="40" height="40"/> </a> <a href="https://www.postgresql.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original-wordmark.svg" alt="postgresql" width="40" height="40"/> </a> <a href="https://postman.com" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/getpostman/getpostman-icon.svg" alt="postman" width="40" height="40"/> </a> <a href="https://reactjs.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="react" width="40" height="40"/> </a> <a href="https://redux.js.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redux/redux-original.svg" alt="redux" width="40" height="40"/> </a> <a href="https://sass-lang.com" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/sass/sass-original.svg" alt="sass" width="40" height="40"/> </a> <a href="https://tailwindcss.com/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/tailwindcss/tailwindcss-icon.svg" alt="tailwind" width="40" height="40"/> </a> </p>