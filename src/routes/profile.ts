import express from 'express';
import { guildService } from '../services/guild.service';
import { requiresOnline } from '../middleware/requiresOnline.middleware';
const route = express.Router();

route.get('/profile/:id', requiresOnline, (req, res): express.Response => {
    const userIdParam = req.params.id;
    if (!userIdParam) return res.status(400).json({ error: 'User ID is required in params. Csv accepted.' });
    const userIds = userIdParam.split(',');
    if (userIds.length > 15) return res.status(400).json({ error: 'Too many user IDs! Please no more than 15 at a time.' });

    const profiles = guildService.users.filter(user => userIds.includes(user.id.toString())).map(user => ({
        id: user.id,
        name: user.name,
        public_key: user.public_key,
        join_date: user.join_date
    }));
    return res.json(profiles);
});

export default route;
