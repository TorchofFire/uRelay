import express, { Router } from 'express';
import https from 'https';
import http from 'http';
import appConfig from './app.config';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { WebSocketServer } from 'ws';
import { guildService } from './services/guild.service';
import { connectionManagerService } from './services/connectionManager.service';

// eslint-disable-next-line import/no-mutable-exports
export let expressApp: express.Express;
// eslint-disable-next-line import/no-mutable-exports
export let dbConnectionPool: mysql.Pool;

const registerExpressRoutes = async (): Promise<void> => {
    const routesPath = path.join(__dirname, 'routes');
    const routes = fs.readdirSync(routesPath);
    if (appConfig.debug) console.log('\x1b[90mLoading routes...');
    if (appConfig.debug) process.stdout.write('|');
    await Promise.all(routes.map(async (route: string) => {
        const routeFile = path.join(routesPath, route);

        const { default: config } = await import(routeFile);
        const routeConfig = config as Router;

        expressApp.use(routeConfig);
        if (appConfig.debug) process.stdout.write(` ${route.replace(/\.(js|ts)$/, '')} |`);
    }));
    if (appConfig.debug) console.log('\x1b[0m');
    if (appConfig.debug) console.log(`Loaded ${routes.length} Routes`);
};

let server: http.Server | https.Server;

const startWebSocket = (): void => {
    const wss = new WebSocketServer({ server });
    wss.on('connection', ws => { connectionManagerService.handleConnection(ws); });
    console.log('\x1b[36mWebSocketServer is online\x1b[0m');
};

const startExpress = async (): Promise<void> => {
    expressApp = express();
    expressApp.use(express.urlencoded({ extended: true }));
    await registerExpressRoutes();

    const port = appConfig.appPort;

    if (!appConfig.secureProtocol) {
        server = http.createServer(expressApp).listen(port, () => {
            console.log(`\x1b[36mExpress is online and listening on \x1b[33mhttp://localhost:${port}\x1b[0m`);
        });
        return;
    }

    const certPath = appConfig.certPath;
    if (!certPath) throw new Error('No certificate path was given!!');

    const serverOptions: https.ServerOptions = {
        key: fs.readFileSync(path.join(certPath, 'privkey.pem')),
        cert: fs.readFileSync(path.join(certPath, 'fullchain.pem'))
    };

    server = https.createServer(serverOptions, expressApp).listen(port, () => {
        console.log(`\x1b[36mExpress is \x1b[33msecurely\x1b[36m online and listening on port \x1b[33m${port}\x1b[0m`);
    });
};

const initDbConnectionPool = (): void => {
    dbConnectionPool = mysql.createPool({
        host: appConfig.dbHost,
        user: appConfig.dbUser,
        database: 'freedom',
        password: appConfig.dbPassword
    });
    console.log('\x1b[36mDatabase Connection Pool initialized\x1b[0m');
};

export const startup = async (): Promise<void> => {
    console.log('Server is starting...');

    initDbConnectionPool();

    await guildService.init();

    await startExpress();

    server.on('listening', () => {
        startWebSocket();
    });
};
