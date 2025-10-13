"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("TicketTraking", "queueId", {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Queues", key: "id" },
                allowNull: true,
                defaultValue: null
            }),
            queryInterface.addColumn("TicketTraking", "contactId", {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Contacts", key: "id" },
                allowNull: true,
                defaultValue: null
            }),
            queryInterface.addColumn("TicketTraking", "status", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
                defaultValue: null
            }),
            queryInterface.addColumn("TicketTraking", "lastMessage", {
                type: sequelize_1.DataTypes.STRING,
                allowNull: true,
                defaultValue: null
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("TicketTraking", "queueId"),
            queryInterface.removeColumn("TicketTraking", "contactId"),
            queryInterface.removeColumn("TicketTraking", "status"),
            queryInterface.removeColumn("TicketTraking", "lastMessage")
        ]);
    }
};
