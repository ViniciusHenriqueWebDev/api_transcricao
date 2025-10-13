"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicShow = exports.update = exports.index = void 0;
const socket_1 = require("../libs/socket");
const UpdateSettingService_1 = __importDefault(require("../services/SettingServices/UpdateSettingService"));
const ListSettingsService_1 = __importDefault(require("../services/SettingServices/ListSettingsService"));
const GetPublicSettingService_1 = __importDefault(require("../services/SettingServices/GetPublicSettingService"));
const index = async (req, res) => {
    const { companyId } = req.user;
    // if (req.user.profile !== "admin") {
    //   throw new AppError("ERR_NO_PERMISSION", 403);
    // }
    const settings = await (0, ListSettingsService_1.default)({ companyId });
    return res.status(200).json(settings);
};
exports.index = index;
const update = async (req, res) => {
    // if (req.user.profile !== "admin") {
    //   throw new AppError("ERR_NO_PERMISSION", 403);
    // }
    const { settingKey: key } = req.params;
    const { value } = req.body;
    const { companyId } = req.user;
    const setting = await (0, UpdateSettingService_1.default)({
        key,
        value,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-settings`, {
        action: "update",
        setting
    });
    return res.status(200).json(setting);
};
exports.update = update;
const publicShow = async (req, res) => {
    const { settingKey: key } = req.params;
    const settingValue = await (0, GetPublicSettingService_1.default)({ key });
    return res.status(200).json(settingValue);
};
exports.publicShow = publicShow;
