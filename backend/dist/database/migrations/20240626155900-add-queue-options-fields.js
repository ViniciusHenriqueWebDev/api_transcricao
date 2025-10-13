"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn("QueueOptions", "forwardQueueId", {
                type: sequelize_1.DataTypes.INTEGER,
                references: { model: "Queues", key: "id" },
                allowNull: true,
            });
            await queryInterface.addColumn("QueueOptions", "closeTicket", {
                type: sequelize_1.DataTypes.BOOLEAN,
                defaultValue: false,
            });
            await transaction.commit();
        }
        catch (err) {
            await transaction.rollback();
            throw err;
        }
    },
    down: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeColumn("QueueOptions", "forwardQueueId");
            await queryInterface.removeColumn("QueueOptions", "closeTicket");
            await transaction.commit();
        }
        catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
};
