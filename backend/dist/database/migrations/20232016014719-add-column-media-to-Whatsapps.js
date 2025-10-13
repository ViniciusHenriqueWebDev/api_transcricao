"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
module.exports = {
    up: (queryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Whatsapps", "mediaPath", {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            }),
            queryInterface.addColumn("Whatsapps", "mediaName", {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            })
        ]);
    },
    down: (queryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Whatsapps", "mediaName"),
            queryInterface.removeColumn("Whatsapps", "mediaPath")
        ]);
    }
};
