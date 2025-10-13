'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("Tickets");
    const promises = [];

    if (!tableInfo.createdAt) {
      promises.push(
        queryInterface.addColumn("Tickets", "createdAt", {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        })
      );
    }

    if (!tableInfo.updatedAt) {
      promises.push(
        queryInterface.addColumn("Tickets", "updatedAt", {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        })
      );
    }

    return Promise.all(promises);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn("Tickets", "createdAt"),
      queryInterface.removeColumn("Tickets", "updatedAt")
    ]);
  }
};