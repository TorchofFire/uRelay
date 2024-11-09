import express from 'express';
import { guildService } from '../services/guild.service';
import { requiresOnline } from '../middleware/requiresOnline.middleware';
const route = express.Router();

route.get('/profile/:id', requiresOnline, (req, res): void => {
    const userIdParam = req.params.id;
    if (!userIdParam) {
        res.status(400).json({ error: 'User ID is required in params. Csv accepted.' });
        return;
    }
    const userIds = userIdParam.split(',');
    if (userIds.length > 15) {
        res.status(400).json({ error: 'Too many user IDs! Please no more than 15 at a time.' });
        return;
    }

    const profiles = guildService.users.filter(user => userIds.includes(user.id.toString())).map(user => ({
        id: user.id,
        name: user.name,
        public_key: user.public_key,
        join_date: user.join_date
    }));
    res.json(profiles);
});

export default route;
