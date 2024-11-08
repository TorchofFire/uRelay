import express from 'express';
import { guildService } from '../services/guild.service';
import { connectionManagerService } from '../services/connectionManager.service';
const route = express.Router();

route.get('/guild-info', async (_req, res): Promise<express.Response | void> => {
    const guildInfo = {
        name: '', // TODO: add guild name, version and image links
        version: '',
        logo: '',
        banner: '',
        user_count: guildService.users.length,
        online_user_count: connectionManagerService.connections.length
    };
    return res.json(guildInfo);
});

export default route;