'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("Tickets");
    if (!tableInfo.channel) {
      return queryInterface.addColumn("Tickets", "channel", {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Tickets", "channel");
  }
};