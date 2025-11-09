import { prisma } from "config/client";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from 'bcrypt';
import { GetQuantityCart, GetUserWithRoleById } from "services/client/auth.service";
import { UserRole } from "src/types/index.dt";

const comparePassword = async (plainPassword: string, hashedPassword: string) => { //kiểm tra mật khẩu đã mã hóa có đúng không
    return await bcrypt.compare(plainPassword, hashedPassword);
};

const configPassportLocal = () => {
    passport.use(new LocalStrategy({//option ghi đè cho passport local
        usernameField: 'email', //ghi đè trường username thành email
        passwordField: 'password',
        passReqToCallback: true, //cho phép truyền req vào callback
    },
        async function verify(req, email, password, callback) {
            console.log("email:", email, "password:", password);

            const { session } = req as any;
            if(session?.messages?.length) {
                session.messages = []; //reset messages in session
            }
            const CheckUser = await prisma.user.findUnique({
                where: {
                    email: email,
                },
            });
            if (!CheckUser) {
                // throw new Error(`User:${username} not found`);
                return callback(null, false, { message: `User/password not found.` });
            }
            const isMatch = await comparePassword(password, CheckUser.password);
            if (!isMatch) {
                // throw new Error(`Invalid password for user:${username}`);
                return callback(null, false, { message: `Invalid password for user:${email}` });
            }
            // return CheckUser;
            return callback(null, CheckUser as UserRole);
        }));

    passport.serializeUser(function (user: UserRole, callback) {//session phía database lưu trữ id và email và trả về cho server
        process.nextTick(function () {
            callback(null, { id: user.id, email: user.email }); // giá trị trả ra ở đây sẽ được lưu trữ ở phía session database
        });
    });

    passport.deserializeUser(function (user: UserRole, callback) {//session phía người dùng lưu trữ id và email và quantity cart và trả về cho server
        process.nextTick(async function () {
            const { id } = user;
            const GetUserInDB = await GetUserWithRoleById(id);
            const QuantityCartByUser = await GetQuantityCart(id);
            return callback(null, {...GetUserInDB, quantityCart: QuantityCartByUser} as UserRole);// còn giá trị ở đây sẽ được gọi mỗi lần req ở phía server
        });
    });
}

export default configPassportLocal;