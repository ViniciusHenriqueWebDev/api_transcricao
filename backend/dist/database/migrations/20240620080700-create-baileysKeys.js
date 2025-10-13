"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return queryInterface.createTable("BaileysKeys", {
            whatsappId: {
                type: sequelize_1.DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                references: { model: "Whatsapps", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },
            type: {
                type: sequelize_1.DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            key: {
                type: sequelize_1.DataTypes.STRING,
                primaryKey: true,
                allowNull: false
            },
            value: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false
            },
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable("BaileysKeys");
    }
};
