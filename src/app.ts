// const Express = require('express');
import express from 'express';
import 'dotenv/config';
import webroutes from 'routes/web';
import initDatabase from 'config/seed';
import passport from 'passport';
import configPassportLocal from 'middleware/passport.local';
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { PrismaClient } from '@prisma/client';
import apiRouters from 'routes/api';
import cors from 'cors';



const app = express(); //khởi tạo express với biến là app
const port = process.env.PORT;

//config cors (phải nằm ở trên cùng trước các route khác do middleware này can thiệp vào request trước tiên)
app.use(cors());

//config view engine
app.set('view engine', 'ejs'); //video 32 có giải thích
app.set('views', __dirname + '/views'); //__dirname chính là đường link tuyệt đối tại vị trí đang đứng của file app.ts

//config req.body
app.use(express.json()); // cấu hình để nhận dữ liệu json
app.use(express.urlencoded({ extended: true })); // cấu hình để nhận dữ liệu từ form
// app.use(express.raw()); // cấu hình để nhận dữ liệu dạng raw


//config file static
app.use(express.static('public')); // cấu hình thư mục chứa file tĩnh đễ dự án luôn nhìn thấy khi chạy

//config session
app.use(session({
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000 // ms thời gian tồn tại là 7 ngày
  },
  secret: 'a santa at nasa', //độ khó mã hóa cookie lưu trên client

  resave: false, // nếu không có thay đổi gì thì (nếu là true thì sẽ lưu lại session) còn false thì không
  saveUninitialized: false, // nếu session không có gì thì sẽ lưu lại session nếu nó là true còn false thì không
  store: new PrismaSessionStore(
    new PrismaClient(),
    {
      checkPeriod: 1 * 24 * 60 * 60 * 1000,  //thời gian kiểm tra session khi nó hết hạn, ở đây là 1 ngày
      dbRecordIdIsSessionId: true, //id của bản ghi trong db sẽ là id của session
      dbRecordIdFunction: undefined, //hàm để lấy id của bản ghi trong db
    }
  )
}))

//configuration middleware
app.use(passport.initialize()); //khởi tạo passport
app.use(passport.authenticate('session')); //xác thực session đã lưu trữ ở phía client có hợp lệ hay không
configPassportLocal() // cấu hình passport local

//middleware global
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
})


//configuration api routes
apiRouters(app);
//configuration routes
webroutes(app);



//seed database
initDatabase();

app.listen(port, () => {
  console.log(__dirname + '/views');
  console.log(`Server is running on http://localhost:${port}`);
});

