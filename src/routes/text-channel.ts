import express from 'express';
import { DB } from '../types/database.namespace';
import { dbConnectionPool } from '../startup';
import { requiresOnline } from '../middleware/requiresOnline.middleware';
const route = express.Router();

route.get('/text-channel/:id', requiresOnline, async (req, res): Promise<void> => {
    const channelId = req.params.id;
    if (!channelId) {
        res.status(400).json({ error: 'Channel ID is required in params' });
        return;
    }
    // TODO: add perms to check if user can GET for this *specific* channel id

    const fetchFromMsgId = req.query.msg;

    const queryParams = [channelId];
    let messagesQuery = `
        SELECT * 
        FROM guild_messages 
        WHERE channel_id = ?
    `;
    if (typeof fetchFromMsgId === 'string' && !Number.isNaN(Number(fetchFromMsgId))) {
        messagesQuery += ' AND id >= ?';
        queryParams.push(fetchFromMsgId);
    }
    messagesQuery += ' ORDER BY id ASC LIMIT 15';
    const messages = (await dbConnectionPool.query(messagesQuery, queryParams))[0] as DB.guild_messages[] | undefined;
    if (!messages) {
        res.status(500).json({ error: `Could not fetch messages from database. Channel: ${channelId}` });
        return;
    }

    res.json(messages);
});

export default route;
