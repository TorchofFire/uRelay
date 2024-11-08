import express from 'express';
import { guildService } from '../services/guild.service';
import { permission } from '../middleware/permission.middleware';
const route = express.Router();

route.get('/users', permission, async (_req, res): Promise<express.Response | void> => {
    const users = guildService.users.map(user => {
        return {
            id: user.id,
            name: user.name
        };
    });
    return res.json(users);
});

export default route;
