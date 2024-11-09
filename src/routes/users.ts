import express from 'express';
import { guildService } from '../services/guild.service';
import { requiresOnline } from '../middleware/requiresOnline.middleware';
const route = express.Router();

route.get('/users', requiresOnline, (_req, res): void => {
    const users = guildService.users.map(user => {
        return {
            id: user.id,
            name: user.name
        };
    });
    res.json(users);
});

export default route;
