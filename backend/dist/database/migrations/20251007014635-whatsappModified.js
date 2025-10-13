'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('Whatsapps', 'facebookUserId', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn('Whatsapps', 'facebookUserToken', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn('Whatsapps', 'facebookPageUserId', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn('Whatsapps', 'tokenMeta', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn('Whatsapps', 'channel', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('Whatsapps', 'facebookUserId'),
      queryInterface.removeColumn('Whatsapps', 'facebookUserToken'),
      queryInterface.removeColumn('Whatsapps', 'facebookPageUserId'),
      queryInterface.removeColumn('Whatsapps', 'tokenMeta'),
      queryInterface.removeColumn('Whatsapps', 'channel'),
    ]);
  },
};