import express from 'express';
import appConfig from '../app.config';
import { guildService } from '../services/guild.service';
import { messageManagerService } from '../services/messageManager.service';

export const requiresOnline = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const { requester, proof } = req.headers;

    if (!requester || typeof requester !== 'string') {
        res.status(401).json({ error: 'Requester ID was not provided in the header', expectedFormat: 'requester: number' });
        return;
    }
    if (!proof || typeof proof !== 'string') {
        res.status(401).json({ error: 'Proof of requester auth was not provided in the header', expectedFormat: 'proof: string' });
        return;
    }

    const requesterPublicKey = guildService.users.find(user => user.id === Number(requester))?.public_key;
    if (!requesterPublicKey) {
        res.status(401).json({ error: 'Invalid requester ID, or more likely that you are not connected (via Websocket)' });
        return;
    }

    const unlocked = messageManagerService.unlockAndVerifySignedMessage(requesterPublicKey, proof);
    if (!unlocked.message) {
        res.status(400).json({ error: unlocked.error });
        return;
    }
    const serverId = unlocked.message;

    if (serverId !== appConfig.serverId) {
        res.status(400).json({ error: `Expected a server identifier within signed proof. Looking for "${appConfig.serverId}", instead got "${serverId}". Format is timestamp|serverId.` });
        return;
    }

    return next();
};
