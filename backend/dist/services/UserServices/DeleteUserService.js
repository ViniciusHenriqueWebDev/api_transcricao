"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const UpdateDeletedUserOpenTicketsStatus_1 = __importDefault(require("../../helpers/UpdateDeletedUserOpenTicketsStatus"));
const DeleteUserService = async (id, requestUserId) => {
    const user = await User_1.default.findOne({
        where: { id }
    });
    const requestUser = await User_1.default.findByPk(requestUserId);
    if (requestUser.super === false && user.companyId !== requestUser.companyId) {
        throw new AppError_1.default("ERR_FORBIDDEN", 403);
    }
    if (user.companyId !== requestUser.companyId) {
        throw new AppError_1.default("ERR_FORBIDDEN", 403);
    }
    if (!user) {
        throw new AppError_1.default("ERR_NO_USER_FOUND", 404);
    }
    const userOpenTickets = await user.$get("tickets", {
        where: { status: "open" }
    });
    if (userOpenTickets.length > 0) {
        (0, UpdateDeletedUserOpenTicketsStatus_1.default)(userOpenTickets, user.companyId);
    }
    await user.destroy();
};
exports.default = DeleteUserService;
