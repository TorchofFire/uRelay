import express from 'express';
import { guildService } from '../services/guild.service';
import { requiresOnline } from '../middleware/requiresOnline.middleware';
const route = express.Router();

route.get('/channels', requiresOnline, (_req, res): express.Response => {
    const channels = guildService.channels.map(channel => {
        return {
            id: channel.id,
            name: channel.name
        };
    });
    return res.json(channels);
});

export default route;
