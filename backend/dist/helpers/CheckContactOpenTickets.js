"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../models/Ticket"));
// Agora fecha todos os tickets abertos do contato antes de criar um novo
const CheckContactOpenTickets = async (contactId) => {
    const openTickets = await Ticket_1.default.findAll({
        where: {
            contactId,
            status: { [sequelize_1.Op.or]: ["open", "pending"] }
        }
    });
    for (const ticket of openTickets) {
        await ticket.update({ status: "closed" });
    }
};
exports.default = CheckContactOpenTickets;
