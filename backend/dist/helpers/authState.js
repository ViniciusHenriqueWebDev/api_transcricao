"use strict";
/*

   NÃO REMOVER

   Fornecido por Claudemir Todo Bom
   Licenciado para Raphael Batista / Equipechat
   
   Licença vitalícia e exclusiva. Não pode ser sublicenciado a terceiros

 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = require("@whiskeysockets/baileys");
const BaileysKeys_1 = __importDefault(require("../models/BaileysKeys"));
const logger_1 = require("../utils/logger");
const authState = async (whatsapp) => {
    let creds;
    const whatsappId = whatsapp.id;
    const saveKey = async (type, key, value) => {
        logger_1.logger.debug(`Storing key whatsappId: ${whatsappId} type: ${type} key: ${key}`);
        return BaileysKeys_1.default.upsert({ whatsappId, type, key, value: JSON.stringify(value) });
    };
    const getKey = async (type, key) => {
        const baileysKey = await BaileysKeys_1.default.findOne({
            where: {
                whatsappId,
                type,
                key,
            }
        });
        logger_1.logger.debug(`${baileysKey ? "Successfull" : "Failed"} recover of key whatsappId: ${whatsappId} type: ${type} key: ${key}`);
        return baileysKey?.value ? JSON.parse(baileysKey.value) : null;
    };
    const removeKey = async (type, key) => {
        logger_1.logger.debug({ type, key }, "Deleting key");
        return BaileysKeys_1.default.destroy({
            where: {
                whatsappId,
                type,
                key,
            }
        });
    };
    const saveState = async () => {
        try {
            await whatsapp.update({
                session: JSON.stringify({ creds, keys: {} }, baileys_1.BufferJSON.replacer, 0)
            });
        }
        catch (error) {
            console.log(error);
        }
    };
    if (whatsapp.session && whatsapp.session !== null) {
        const result = JSON.parse(whatsapp.session, baileys_1.BufferJSON.reviver);
        creds = result.creds;
        const { keys } = result;
    }
    else {
        creds = (0, baileys_1.initAuthCreds)();
    }
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    // eslint-disable-next-line no-restricted-syntax
                    for await (const id of ids) {
                        try {
                            let value = await getKey(type, id);
                            if (value && type === "app-state-sync-key") {
                                value = baileys_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                        catch (error) {
                            logger_1.logger.error(`authState (69) -> error: ${error.message}`);
                            logger_1.logger.error(`authState (72) -> stack: ${error.stack}`);
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    // eslint-disable-next-line no-restricted-syntax, guard-for-in
                    for (const category in data) {
                        // eslint-disable-next-line no-restricted-syntax, guard-for-in
                        for (const id in data[category]) {
                            const value = data[category][id];
                            tasks.push(value ? saveKey(category, id, value) : removeKey(category, id));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveState
    };
};
exports.default = authState;
