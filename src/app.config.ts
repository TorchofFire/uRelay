import 'dotenv/config';

const appConfig = {
    debug: process.env.DEBUG === 'true',
    secureProtocol: process.env.SECURE_PROTOCOL === 'true',
    certPath: process.env.SSL_PATH,
    appPort: Number(process.env.APP_PORT || 8079),

    dbHost: process.env.DB_HOST,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD
};

export default appConfig;
