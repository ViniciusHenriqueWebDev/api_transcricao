'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable("Schedules");
    const promises = [];

    if (!tableInfo.recurrence) {
      promises.push(queryInterface.addColumn("Schedules", "recurrence", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }));
    }
    if (!tableInfo.recurrenceInterval) {
      promises.push(queryInterface.addColumn("Schedules", "recurrenceInterval", {
        type: Sequelize.STRING,
        allowNull: true
      }));
    }
    if (!tableInfo.recurrenceValue) {
      promises.push(queryInterface.addColumn("Schedules", "recurrenceValue", {
        type: Sequelize.INTEGER,
        allowNull: true
      }));
    }
    if (!tableInfo.recurrenceCount) {
      promises.push(queryInterface.addColumn("Schedules", "recurrenceCount", {
        type: Sequelize.INTEGER,
        allowNull: true
      }));
    }
    if (!tableInfo.recurrenceDayOptions) {
      promises.push(queryInterface.addColumn("Schedules", "recurrenceDayOptions", {
        type: Sequelize.STRING,
        allowNull: true
      }));
    }
    if (!tableInfo.sendSignature) {
      promises.push(queryInterface.addColumn("Schedules", "sendSignature", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }));
    }
    if (!tableInfo.whatsappData) {
      promises.push(queryInterface.addColumn("Schedules", "whatsappData", {
        type: Sequelize.JSON,
        allowNull: true
      }));
    }
    if (!tableInfo.queueData) {
      promises.push(queryInterface.addColumn("Schedules", "queueData", {
        type: Sequelize.JSON,
        allowNull: true
      }));
    }
    if (!tableInfo.userData) {
      promises.push(queryInterface.addColumn("Schedules", "userData", {
        type: Sequelize.JSON,
        allowNull: true
      }));
    }
    if (!tableInfo.processedPreview) {
      promises.push(queryInterface.addColumn("Schedules", "processedPreview", {
        type: Sequelize.TEXT,
        allowNull: true
      }));
    }
    if (!tableInfo.openTicket) {
      promises.push(queryInterface.addColumn("Schedules", "openTicket", {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }));
    }
    if (!tableInfo.ticketStatus) {
      promises.push(queryInterface.addColumn("Schedules", "ticketStatus", {
        type: Sequelize.STRING,
        allowNull: true
      }));
    }
    if (!tableInfo.whatsappId) {
      promises.push(queryInterface.addColumn("Schedules", "whatsappId", {
        type: Sequelize.INTEGER,
        allowNull: true
      }));
    }
    if (!tableInfo.queueId) {
      promises.push(queryInterface.addColumn("Schedules", "queueId", {
        type: Sequelize.INTEGER,
        allowNull: true
      }));
    }

    return Promise.all(promises);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn("Schedules", "recurrence"),
      queryInterface.removeColumn("Schedules", "recurrenceInterval"),
      queryInterface.removeColumn("Schedules", "recurrenceValue"),
      queryInterface.removeColumn("Schedules", "recurrenceCount"),
      queryInterface.removeColumn("Schedules", "recurrenceDayOptions"),
      queryInterface.removeColumn("Schedules", "sendSignature"),
      queryInterface.removeColumn("Schedules", "whatsappData"),
      queryInterface.removeColumn("Schedules", "queueData"),
      queryInterface.removeColumn("Schedules", "userData"),
      queryInterface.removeColumn("Schedules", "processedPreview"),
      queryInterface.removeColumn("Schedules", "openTicket"),
      queryInterface.removeColumn("Schedules", "ticketStatus"),
      queryInterface.removeColumn("Schedules", "whatsappId"),
      queryInterface.removeColumn("Schedules", "queueId"),
    ]);
  }
};