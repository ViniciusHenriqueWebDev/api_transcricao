'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('AuditLogs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
      userName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ip: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      goalId: {
        type: Sequelize.INTEGER,
        references: { model: 'Goals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
      goalName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      employeeId: {
        type: Sequelize.INTEGER,
        references: { model: 'Employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        allowNull: true,
      },
      employeeName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      oldValue: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      newValue: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      changeType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      justification: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metricType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      individualTarget: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      companyId: {
        type: Sequelize.INTEGER,
        references: { model: 'Companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('AuditLogs');
  },
};