'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('EmployeeGoals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      employeeId: {
        type: Sequelize.INTEGER,
        references: { model: 'Employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false,
      },
      goalId: {
        type: Sequelize.INTEGER,
        references: { model: 'Goals', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false,
      },
      individualTarget: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      individualCurrent: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      progress: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      productName: {
        type: Sequelize.STRING,
        allowNull: true,
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
    return queryInterface.dropTable('EmployeeGoals');
  },
};