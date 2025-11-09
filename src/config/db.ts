import mysql from 'mysql2/promise';

// Create the connection to database
const GetConnection = async () => {
    const connection = await mysql.createConnection({
        port: 3306,
        host: '127.0.0.1',
        user: 'root',
        password: 'thuan2004',
        database: 'NodeJS_Pro',
    });

    // A simple SELECT query
    // try {
    //     const [results, fields] = await connection.query(
    //         'SELECT * FROM `Users`'
    //     );

    //     console.log(results); // results contains rows returned by server
    //     console.log(fields); // fields contains extra meta data about results, if available
    // } catch (err) {
    //     console.log(err);
    // }

    return connection;
};

export default GetConnection;