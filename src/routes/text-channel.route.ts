import express from 'express';
import { DB } from '../types/database.namespace';
import { dbConnectionPool } from '../startup';
import { channelPermission } from '../middleware/channelPermission.middleware';
const route = express.Router();

route.get('/text-channel/:id', channelPermission, async (req, res): Promise<express.Response | void> => {
    const channelId = req.params.id;
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
    if (!messages) return res.status(500).json({ error: `Could not fetch messages from database. Channel: ${channelId}` });

    return res.json(messages);
});

export default route;
