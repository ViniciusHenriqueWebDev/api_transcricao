'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Companies', 'document', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn('Companies', 'acceptTerms', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      }),
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Companies', 'document'),
      queryInterface.removeColumn('Companies', 'acceptTerms'),
    ]);
  },
};