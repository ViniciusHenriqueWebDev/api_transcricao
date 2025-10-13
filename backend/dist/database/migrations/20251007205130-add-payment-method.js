'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("Invoices");
    if (!tableInfo.paymentMethod) {
      return queryInterface.addColumn("Invoices", "paymentMethod", {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Invoices", "paymentMethod");
  }
};