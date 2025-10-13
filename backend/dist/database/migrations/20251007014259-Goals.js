'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Goals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metricType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      target: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      current: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      reward: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rewardValue: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      rewardStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'pending',
      },
      multiEmployee: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      dividedGoal: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      originalTarget: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      totalEmployees: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      employees: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true,
        defaultValue: [],
      },
      productConfig: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      performanceCampaignId: {
        type: Sequelize.INTEGER,
        references: { model: 'PerformanceCampaigns', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: false,
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
    return queryInterface.dropTable('Goals');
  },
};