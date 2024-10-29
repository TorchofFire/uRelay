import express from 'express';
import appConfig from '../app.config';
import { guildService } from '../services/guild.service';
import { messageManagerService } from '../services/messageManager.service';

export const channelPermission = (req: express.Request, res: express.Response, next: express.NextFunction): express.Response | void => {
    const { requester, proof } = req.headers;
    const channelId = req.params.id;

    if (!channelId) return res.status(400).json({ error: 'Channel ID is required in params' });
    if (!requester || typeof requester !== 'string') return res.status(401).json({ error: 'Requester ID was not provided in the header', expectedFormat: 'requester: number' });
    if (!proof || typeof proof !== 'string') return res.status(401).json({ error: 'Proof of requester auth was not provided in the header', expectedFormat: 'proof: string' });

    const requesterPublicKey = guildService.users.find(user => user.id === Number(requester))?.public_key;
    if (!requesterPublicKey) return res.status(401).json({ error: 'Invalid requester ID, or more likely that you are not connected (via Websocket)' });

    const unlocked = messageManagerService.unlockAndVerifySignedMessage(requesterPublicKey, proof);
    if (!unlocked.message) return res.status(400).json({ error: unlocked.error });
    const serverId = unlocked.message;

    if (serverId !== appConfig.serverName) return res.status(400).json({ error: `Expected a server identifier within signed proof. Looking for "${appConfig.serverName}", instead got "${serverId}". Format is timestamp|serverId.` });

    // TODO: add perms to check if user can GET for this specific channel id

    return next();
};
